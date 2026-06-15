package workers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"devops-lab/worker/internal/awsclient"
	"devops-lab/worker/internal/jobs"
)

// TeardownWorker handles legacy per-session teardown (prefer teardown_environment).
type TeardownWorker struct {
	river.WorkerDefaults[jobs.TeardownArgs]
	dbPool           *pgxpool.Pool
	durableObjectURL string
	httpClient       *http.Client
	workDir          string
}

func NewTeardownWorker(dbPool *pgxpool.Pool, durableObjectURL string) *TeardownWorker {
	workDir := "/tmp/labs"
	_ = os.MkdirAll(workDir, 0755)
	return &TeardownWorker{
		dbPool:           dbPool,
		durableObjectURL: durableObjectURL,
		httpClient:       &http.Client{Timeout: 30 * time.Second},
		workDir:          workDir,
	}
}

func (w *TeardownWorker) Work(ctx context.Context, job *river.Job[jobs.TeardownArgs]) error {
	args := job.Args

	var environmentID string
	err := w.dbPool.QueryRow(ctx,
		`SELECT environment_id FROM lab_sessions WHERE id = $1`,
		args.SessionID,
	).Scan(&environmentID)
	if err == nil && environmentID != "" {
		teardownArgs := jobs.TeardownEnvironmentArgs{
			EnvironmentID:   environmentID,
			UserID:          args.UserID,
			SessionID:       args.SessionID,
			DurableObjectID: args.DurableObjectID,
			Reason:          "session_stop",
			Timestamp:       time.Now().UnixMilli(),
		}
		return runTeardownEnvironment(ctx, w.dbPool, w.durableObjectURL, w.httpClient, w.workDir, teardownArgs)
	}

	return w.legacySessionTeardown(ctx, args)
}

func (w *TeardownWorker) legacySessionTeardown(ctx context.Context, args jobs.TeardownArgs) error {
	log.Printf("legacy teardown session=%s", args.SessionID)

	integration, err := awsclient.FetchIntegration(ctx, w.dbPool, args.UserID)
	if err != nil {
		return err
	}

	creds, err := awsclient.AssumeStudentRole(ctx, *integration, "teardown", args.SessionID)
	if err != nil {
		return err
	}

	tfWorkdir := fmt.Sprintf("%s/%s", w.workDir, args.SessionID)
	cfg := terraformRunConfig{
		Workdir:   tfWorkdir,
		SessionID: args.SessionID,
		Region:    integration.Region,
		Creds:     creds,
	}

	notifyDurableObject(w.httpClient, w.durableObjectURL, args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":    "progress",
		"message": "Releasing infrastructure...",
	})

	if err := runTofuDestroy(ctx, cfg); err != nil {
		log.Printf("[ERROR] ✗ Teardown destroy failed: %v - will retry", err)
		return fmt.Errorf("teardown destroy failed (will retry): %w", err)
	}
	log.Printf("[SUCCESS] ✓ Terraform destroy completed")

	_ = os.RemoveAll(tfWorkdir)
	_, _ = w.dbPool.Exec(ctx,
		`UPDATE lab_sessions SET status = 'destroyed', destroyed_at = NOW() WHERE id = $1`,
		args.SessionID,
	)

	notifyDurableObject(w.httpClient, w.durableObjectURL, args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":    "complete",
		"message": "Infrastructure teardown completed",
	})

	return nil
}
