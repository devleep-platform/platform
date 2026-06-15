package workers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"devops-lab/worker/internal/awsclient"
	cf "devops-lab/worker/internal/cloudflare"
	"devops-lab/worker/internal/jobs"
)

type TeardownEnvironmentWorker struct {
	river.WorkerDefaults[jobs.TeardownEnvironmentArgs]
	dbPool           *pgxpool.Pool
	durableObjectURL string
	httpClient       *http.Client
	workDir          string
}

func NewTeardownEnvironmentWorker(dbPool *pgxpool.Pool, durableObjectURL string) *TeardownEnvironmentWorker {
	workDir := "/tmp/labs"
	_ = os.MkdirAll(workDir, 0755)
	return &TeardownEnvironmentWorker{
		dbPool:           dbPool,
		durableObjectURL: durableObjectURL,
		httpClient:       &http.Client{Timeout: 30 * time.Second},
		workDir:          workDir,
	}
}

// NextRetry enables automatic retries for teardown jobs with exponential backoff
// Teardown failures are critical - must retry until AWS resources are cleaned up
func (w *TeardownEnvironmentWorker) NextRetry(job *river.Job[jobs.TeardownEnvironmentArgs]) time.Time {
	// Use River's default retry policy with exponential backoff
	// Default: 1 minute first retry, doubles each time, up to ~24 hours
	// This allows time for transient AWS API failures to resolve
	return time.Time{}  // Return zero value = use default River retry policy
}

func (w *TeardownEnvironmentWorker) Work(ctx context.Context, job *river.Job[jobs.TeardownEnvironmentArgs]) error {
	return runTeardownEnvironment(ctx, w.dbPool, w.durableObjectURL, w.httpClient, w.workDir, job.Args)
}

func runTeardownEnvironment(
	ctx context.Context,
	db *pgxpool.Pool,
	durableObjectURL string,
	httpClient *http.Client,
	workDir string,
	args jobs.TeardownEnvironmentArgs,
) error {
	log.Printf("teardown_environment: env=%s reason=%s", args.EnvironmentID, args.Reason)

	integration, err := awsclient.FetchIntegration(ctx, db, args.UserID)
	if err != nil {
		return err
	}

	sessionID := args.SessionID
	if sessionID == "" {
		_ = db.QueryRow(ctx,
			`SELECT id FROM lab_sessions WHERE environment_id = $1 ORDER BY created_at DESC LIMIT 1`,
			args.EnvironmentID,
		).Scan(&sessionID)
	}

	creds, err := awsclient.AssumeStudentRole(ctx, *integration, "teardown", sessionID)
	if err != nil {
		return err
	}

	tfWorkdir := getEnvironmentWorkdir(workDir, args.EnvironmentID)
	cfg := terraformRunConfig{
		Workdir:   tfWorkdir,
		SessionID: args.EnvironmentID,
		Region:    integration.Region,
		Creds:     creds,
	}

	if args.DurableObjectID != "" && sessionID != "" {
		notifyDurableObject(httpClient, durableObjectURL, sessionID, args.DurableObjectID, map[string]interface{}{
			"type": "progress", "message": "Releasing AWS resources...",
			"timestamp": time.Now().UnixMilli(),
		})
	}

	// If workdir was wiped (container restart/redeploy), restore from DB-persisted state.
	if _, err := os.Stat(filepath.Join(tfWorkdir, ".terraform")); os.IsNotExist(err) {
		log.Printf("[INFO] Workdir missing for env %s — restoring terraform state from database", args.EnvironmentID)
		if err := restoreTerraformWorkdir(ctx, db, args.EnvironmentID, tfWorkdir, cfg); err != nil {
			log.Printf("[ERROR] Cannot restore terraform state for env %s: %v — AWS resources may be orphaned", args.EnvironmentID, err)
			// State is unrecoverable; skip destroy but still clean up DB + tunnel.
		} else {
			log.Printf("[INFO] Terraform state restored from database — proceeding with destroy")
		}
	}

	if err := runTofuDestroy(ctx, cfg); err != nil {
		log.Printf("[ERROR] ✗ Teardown destroy failed: %v - will retry", err)
		return fmt.Errorf("teardown destroy failed (will retry): %w", err)
	}
	log.Printf("[SUCCESS] ✓ Terraform destroy completed")

	_ = os.RemoveAll(tfWorkdir)

	tunnelID, _, _ := getEnvironmentTunnel(ctx, db, args.EnvironmentID)
	if tunnelID != "" {
		if err := cf.DeleteTunnel(ctx, tunnelID); err != nil {
			log.Printf("[WARNING] Failed to delete Cloudflare tunnel %s: %v (non-fatal)", tunnelID, err)
		} else {
			log.Printf("[SUCCESS] ✓ Cloudflare tunnel deleted: %s", tunnelID)
		}
	}

	_ = expireActiveSessionsForEnvironment(ctx, db, args.EnvironmentID)
	if err := markEnvironmentDestroyed(ctx, db, args.EnvironmentID); err != nil {
		log.Printf("[ERROR] Failed to mark environment destroyed: %v", err)
		return err
	}
	log.Printf("[SUCCESS] ✓ Environment marked as destroyed in database")

	if args.DurableObjectID != "" && sessionID != "" {
		notifyDurableObject(httpClient, durableObjectURL, sessionID, args.DurableObjectID, map[string]interface{}{
			"type": "complete", "message": "Lab environment ended.",
			"timestamp": time.Now().UnixMilli(),
			"details":   map[string]interface{}{"status": "destroyed"},
		})
	}

	log.Printf("✓ teardown_environment complete: %s", args.EnvironmentID)
	return nil
}
