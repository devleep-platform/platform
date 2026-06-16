package workers

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"devops-lab/worker/internal/jobs"
)

type ExpireSessionWorker struct {
	river.WorkerDefaults[jobs.ExpireSessionArgs]
	dbPool *pgxpool.Pool
}

func NewExpireSessionWorker(dbPool *pgxpool.Pool) *ExpireSessionWorker {
	return &ExpireSessionWorker{dbPool: dbPool}
}

func (w *ExpireSessionWorker) Work(ctx context.Context, job *river.Job[jobs.ExpireSessionArgs]) error {
	args := job.Args
	log.Printf("expire_session: session=%s", args.SessionID)

	var status string
	err := w.dbPool.QueryRow(ctx,
		`SELECT status FROM lab_sessions WHERE id = $1`,
		args.SessionID,
	).Scan(&status)
	if err != nil {
		return err
	}

	if status != "active" && status != "provisioning" && status != "scenario_switching" && status != "validating" {
		log.Printf("session %s already %s, skip expire", args.SessionID, status)
		return nil
	}

	_, err = w.dbPool.Exec(ctx,
		`UPDATE lab_sessions SET status = 'expired', destroyed_at = NOW() WHERE id = $1`,
		args.SessionID,
	)
	if err != nil {
		return err
	}

	log.Printf("expire_session: session=%s marked expired", args.SessionID)
	return nil
}
