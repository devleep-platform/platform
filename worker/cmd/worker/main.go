package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"
	"devops-lab/worker/internal/workers"
)

func validatePlatformCredentials() error {
	required := []string{
		"AWS_PLATFORM_ACCESS_KEY_ID",
		"AWS_PLATFORM_SECRET_ACCESS_KEY",
		"AWS_REGION",
		"DATABASE_URL",
	}
	for _, key := range required {
		if os.Getenv(key) == "" {
			return fmt.Errorf("required environment variable %s is not set", key)
		}
	}
	return nil
}

func main() {
	// Validate all required credentials and config before doing anything
	if err := validatePlatformCredentials(); err != nil {
		log.Fatalf("STARTUP FAILED — missing config: %v", err)
	}

	// Load configuration from environment
	dbURL := os.Getenv("DATABASE_URL")
	durableObjectURL := os.Getenv("DURABLE_OBJECT_URL")
	awsRegion := os.Getenv("AWS_REGION")
	port := os.Getenv("PORT")
	logLevel := os.Getenv("LOG_LEVEL")

	if dbURL == "" {
		log.Fatal("Missing required env var: DATABASE_URL")
	}
	if durableObjectURL == "" {
		log.Fatal("Missing required env var: DURABLE_OBJECT_URL")
	}
	if awsRegion == "" {
		awsRegion = "us-east-1"
	}
	if port == "" {
		port = "8080"
	}
	if logLevel == "" {
		logLevel = "info"
	}

	// Connect to PostgreSQL
	ctx := context.Background()
	dbPool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to create database pool: %v", err)
	}
	defer dbPool.Close()

	// Test connection
	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Printf("✓ Connected to PostgreSQL")

	// Create worker instances - they implement river.Worker interface
	provisionWorker := workers.NewProvisionWorker(durableObjectURL, awsRegion)
	provisionEnvWorker := workers.NewProvisionEnvironmentWorker(dbPool, durableObjectURL)
	switchScenarioWorker := workers.NewSwitchScenarioWorker(dbPool, durableObjectURL)
	validationWorker := workers.NewValidationWorker(durableObjectURL, nil, dbPool)
	teardownWorker := workers.NewTeardownWorker(dbPool, durableObjectURL)
	teardownEnvWorker := workers.NewTeardownEnvironmentWorker(dbPool, durableObjectURL)
	expireEnvWorker := workers.NewExpireEnvironmentWorker(dbPool)
	expireSessionWorker := workers.NewExpireSessionWorker(dbPool)

	// Register workers into a bundle
	riverWorkers := river.NewWorkers()
	river.AddWorker(riverWorkers, provisionWorker)
	river.AddWorker(riverWorkers, provisionEnvWorker)
	river.AddWorker(riverWorkers, switchScenarioWorker)
	river.AddWorker(riverWorkers, validationWorker)
	river.AddWorker(riverWorkers, teardownWorker)
	river.AddWorker(riverWorkers, teardownEnvWorker)
	river.AddWorker(riverWorkers, expireEnvWorker)
	river.AddWorker(riverWorkers, expireSessionWorker)

	// Run River database migrations automatically
	log.Printf("Running River database migrations...")
	migrator, err := rivermigrate.New(riverpgxv5.New(dbPool), nil)
	if err != nil {
		log.Fatalf("Failed to create River migrator: %v", err)
	}
	if _, err := migrator.Migrate(ctx, rivermigrate.DirectionUp, nil); err != nil {
		log.Fatalf("Failed to run river migrations: %v", err)
	}
	log.Printf("✓ River schema migrations complete")

	// Initialize River client with both Queues AND Workers
	riverClient, err := river.NewClient(riverpgxv5.New(dbPool), &river.Config{
		Queues: map[string]river.QueueConfig{
			river.QueueDefault: {MaxWorkers: 10},
		},
		Workers: riverWorkers,
	})
	if err != nil {
		log.Fatalf("Failed to create River client: %v", err)
	}
	log.Printf("✓ Registered workers: provision, provision_environment, switch_scenario, validation, teardown, teardown_environment, expire_environment, expire_session")

	defer riverClient.Stop(ctx)

	// Start River worker pool in background
	go func() {
		if err := riverClient.Start(ctx); err != nil {
			log.Fatalf("River failed to start: %v", err)
		}
	}()
	log.Printf("✓ River worker pool started")

	// Setup HTTP handlers - only health check for Container Apps liveness probe
	// Job enqueuing is now done directly by API via PostgreSQL River inserts
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/", notFoundHandler)

	// Start HTTP server (listening on IPv4 explicitly)
	listener, err := net.Listen("tcp4", fmt.Sprintf("0.0.0.0:%s", port))
	if err != nil {
		log.Fatalf("Failed to create listener: %v", err)
	}
	
	server := &http.Server{
		Handler:      http.DefaultServeMux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)
		<-sigChan
		log.Println("Shutdown signal received, gracefully stopping...")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			log.Printf("HTTP server shutdown error: %v", err)
		}
	}()

	log.Printf("✓ Worker service started on 0.0.0.0:%s (IPv4)", port)
	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "healthy",
		"timestamp": time.Now().UnixMilli(),
	})
}

func notFoundHandler(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not found", http.StatusNotFound)
}
