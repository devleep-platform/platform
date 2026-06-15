package workers

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"devops-lab/worker/internal/jobs"
)

type ExpireEnvironmentWorker struct {
	river.WorkerDefaults[jobs.ExpireEnvironmentArgs]
	dbPool *pgxpool.Pool
}

func NewExpireEnvironmentWorker(dbPool *pgxpool.Pool) *ExpireEnvironmentWorker {
	return &ExpireEnvironmentWorker{dbPool: dbPool}
}

func (w *ExpireEnvironmentWorker) Work(ctx context.Context, job *river.Job[jobs.ExpireEnvironmentArgs]) error {
	args := job.Args
	log.Printf("expire_environment: env=%s", args.EnvironmentID)

	var status string
	var durableObjectID string
	err := w.dbPool.QueryRow(ctx, `
		SELECT status FROM lab_environments WHERE id = $1 AND user_id = $2
	`, args.EnvironmentID, args.UserID).Scan(&status)
	if err != nil {
		return err
	}

	if status != "active" && status != "provisioning" {
		log.Printf("environment %s already %s, skip expire", args.EnvironmentID, status)
		return nil
	}

	_ = w.dbPool.QueryRow(ctx, `
		SELECT durable_object_id FROM lab_sessions
		WHERE environment_id = $1 AND status = 'active'
		ORDER BY created_at DESC LIMIT 1
	`, args.EnvironmentID).Scan(&durableObjectID)

	teardownArgs := jobs.TeardownEnvironmentArgs{
		EnvironmentID:   args.EnvironmentID,
		UserID:          args.UserID,
		DurableObjectID: durableObjectID,
		Reason:          "expired",
		Timestamp:       time.Now().UnixMilli(),
	}

	return enqueueRiverJob(ctx, w.dbPool, teardownArgs.Kind(), teardownArgs)
}
