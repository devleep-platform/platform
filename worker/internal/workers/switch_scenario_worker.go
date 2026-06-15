package workers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"devops-lab/worker/internal/jobs"
	"devops-lab/worker/internal/scenario"
)

type SwitchScenarioWorker struct {
	river.WorkerDefaults[jobs.SwitchScenarioArgs]
	dbPool           *pgxpool.Pool
	durableObjectURL string
	httpClient       *http.Client
}

// Retry configuration for scenario switching
const (
	maxRetries     = 3
	initialBackoff = 3 * time.Second // Increased from 2s to account for slow tunnel/EC2 startup
	maxBackoff     = 15 * time.Second // Increased from 10s
)

func NewSwitchScenarioWorker(dbPool *pgxpool.Pool, durableObjectURL string) *SwitchScenarioWorker {
	return &SwitchScenarioWorker{
		dbPool:           dbPool,
		durableObjectURL: durableObjectURL,
		httpClient:       &http.Client{Timeout: 30 * time.Second},
	}
}

// Timeout overrides River's default 1-minute job timeout. Each SSH operation
// can take up to 90s (cloudflared cold-start + banner exchange), and we allow
// up to 4 internal retries before River retries the whole job.
func (w *SwitchScenarioWorker) Timeout(_ *river.Job[jobs.SwitchScenarioArgs]) time.Duration {
	return 10 * time.Minute
}

// retryWithBackoff executes fn with exponential backoff retry logic
func (w *SwitchScenarioWorker) retryWithBackoff(ctx context.Context, name string, fn func() error) error {
	var lastErr error
	backoff := initialBackoff

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			log.Printf("[scenario_retry] %s attempt %d/%d, waiting %v...", name, attempt, maxRetries, backoff)
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return fmt.Errorf("%s cancelled: %w", name, ctx.Err())
			}
			// Exponential backoff up to maxBackoff
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
		}

		log.Printf("[scenario] %s attempt %d/%d...", name, attempt+1, maxRetries+1)
		err := fn()
		if err == nil {
			log.Printf("[scenario] ✓ %s succeeded on attempt %d", name, attempt+1)
			return nil
		}

		lastErr = err
		log.Printf("[scenario] %s attempt %d failed: %v", name, attempt+1, err)
	}

	return fmt.Errorf("%s failed after %d attempts: %w", name, maxRetries+1, lastErr)
}

func (w *SwitchScenarioWorker) Work(ctx context.Context, job *river.Job[jobs.SwitchScenarioArgs]) error {
	args := job.Args
	log.Printf("[scenario_switch_start] env=%s session=%s %s -> %s",
		args.EnvironmentID, args.SessionID, args.FromScenarioID, args.ToScenarioID)

	// Guard against retrying a session that was already marked failed by a prior attempt.
	var currentStatus string
	err := w.dbPool.QueryRow(ctx,
		`SELECT status FROM lab_sessions WHERE id = $1`, args.SessionID,
	).Scan(&currentStatus)
	if err != nil || currentStatus == "failed" || currentStatus == "completed" {
		log.Printf("[scenario_switch] session %s is in terminal state '%s', skipping", args.SessionID, currentStatus)
		return nil
	}

	_ = updateSessionStatus(ctx, w.dbPool, args.SessionID, "scenario_switching")
	w.notify(args, "progress", "Preparing your lab environment...", nil)

	tunnelHostname := args.TunnelHostname
	if tunnelHostname == "" {
		_, tunnelHostname, _ = getEnvironmentTunnel(ctx, w.dbPool, args.EnvironmentID)
	}

	if tunnelHostname == "" {
		errMsg := "Tunnel not available for scenario switching"
		w.notify(args, "error", errMsg, nil)
		_ = updateSessionStatus(ctx, w.dbPool, args.SessionID, "failed")
		return fmt.Errorf("%s", errMsg)
	}

	// Skip pre-flight health check - SSH operations have built-in retry logic that handles
	// tunnel/EC2 startup timing. Health checks add complexity and false failures.
	// If tunnel hostname exists, proceed to scenario operations with retries.
	log.Printf("[scenario_switch] tunnel ready: %s (using operation-level retries)", tunnelHostname)

	sshPrivateKey, err := getEnvironmentSSHKey(ctx, w.dbPool, args.EnvironmentID)
	if err != nil {
		log.Printf("[WARNING] could not fetch SSH key for env %s: %v", args.EnvironmentID, err)
		sshPrivateKey = ""
	} else if sshPrivateKey == "" {
		log.Printf("[WARNING] ssh_private_key not in terraform_outputs for env %s — SSH auth may fail", args.EnvironmentID)
	} else {
		log.Printf("[DEBUG] ssh_private_key loaded for env %s (%d bytes)", args.EnvironmentID, len(sshPrivateKey))
	}

	scenarioRunner := scenario.NewRunner(scenario.HostConfig{
		TunnelHostname: tunnelHostname,
		SSHPrivateKey:  sshPrivateKey,
	})

	// Cleanup old scenario with retry logic
	if args.FromScenarioID != "" {
		w.notify(args, "progress", "Cleaning up previous environment...", nil)
		log.Printf("[scenario_switch] starting cleanup for scenario: %s", args.FromScenarioID)

		if err := w.retryWithBackoff(ctx, "scenario_cleanup", func() error {
			return scenarioRunner.RunCleanup(ctx, args.FromScenarioID)
		}); err != nil {
			// Cleanup failures are non-fatal but should be logged and reported
			errMsg := fmt.Sprintf("Warning: Cleanup had issues (will continue): %v", err)
			w.notify(args, "progress", errMsg, nil)
			log.Printf("[scenario_switch_warning] cleanup failed but continuing: %v", err)
			// Don't return error - cleanup failures shouldn't block setup of new scenario
		}
	}

	// Setup new scenario with retry logic
	if args.ToScenarioID != "" {
		w.notify(args, "progress", "Setting up your lab scenario...", nil)
		log.Printf("[scenario_switch] starting setup for scenario: %s", args.ToScenarioID)

		if err := w.retryWithBackoff(ctx, "scenario_setup", func() error {
			return scenarioRunner.RunSetup(ctx, args.ToScenarioID)
		}); err != nil {
			errMsg := fmt.Sprintf("Scenario setup failed: %v", err)
			w.notify(args, "error", errMsg, nil)
			_ = updateSessionStatus(ctx, w.dbPool, args.SessionID, "failed")
			log.Printf("[scenario_switch_error] setup failed: %v", err)
			return err
		}

		// Update environment with new scenario
		if err := updateEnvironmentScenario(ctx, w.dbPool, args.EnvironmentID, args.ToScenarioID); err != nil {
			log.Printf("[scenario_switch_warning] failed to update scenario in DB: %v", err)
			// Non-fatal - continue anyway
		}
	}

	// Mark session as active and ready
	_ = updateSessionStatus(ctx, w.dbPool, args.SessionID, "active")
	w.notify(args, "complete", "Your lab is ready.", map[string]interface{}{
		"status": "ready",
		"mode":   "scenario_switch",
	})

	log.Printf("[scenario_switch_complete] ✓ session %s ready with scenario %s", args.SessionID, args.ToScenarioID)
	return nil
}

func (w *SwitchScenarioWorker) notify(args jobs.SwitchScenarioArgs, eventType, message string, details map[string]interface{}) {
	event := map[string]interface{}{
		"type":      eventType,
		"message":   message,
		"timestamp": time.Now().UnixMilli(),
	}
	if details != nil {
		event["details"] = details
	}
	notifyDurableObject(w.httpClient, w.durableObjectURL, args.SessionID, args.DurableObjectID, event)
}
