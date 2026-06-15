package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func updateSessionStatus(ctx context.Context, db *pgxpool.Pool, sessionID, status string) error {
	_, err := db.Exec(ctx,
		`UPDATE lab_sessions SET status = $1, last_activity = NOW() WHERE id = $2`,
		status, sessionID,
	)
	return err
}

func updateSessionOutputs(ctx context.Context, db *pgxpool.Pool, sessionID string, outputs map[string]interface{}) error {
	data, err := json.Marshal(outputs)
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx,
		`UPDATE lab_sessions SET terraform_outputs = $1, last_activity = NOW() WHERE id = $2`,
		data, sessionID,
	)
	return err
}

func updateSessionTerminalToken(ctx context.Context, db *pgxpool.Pool, sessionID, terminalToken string) error {
	_, err := db.Exec(ctx,
		`UPDATE lab_sessions SET terminal_token = $1, last_activity = NOW() WHERE id = $2`,
		terminalToken, sessionID,
	)
	return err
}

func updateEnvironmentStatus(ctx context.Context, db *pgxpool.Pool, environmentID, status string) error {
	_, err := db.Exec(ctx,
		`UPDATE lab_environments SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, environmentID,
	)
	return err
}

func updateEnvironmentOutputs(ctx context.Context, db *pgxpool.Pool, environmentID string, outputs map[string]interface{}, tunnelID string) error {
	data, err := json.Marshal(outputs)
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx, `
		UPDATE lab_environments
		SET terraform_outputs = $1,
		    tunnel_id = COALESCE(NULLIF($2, ''), tunnel_id),
		    updated_at = NOW()
		WHERE id = $3
	`, data, tunnelID, environmentID)
	return err
}

func updateEnvironmentTunnel(ctx context.Context, db *pgxpool.Pool, environmentID, tunnelID, tunnelHostname string) error {
	_, err := db.Exec(ctx, `
		UPDATE lab_environments
		SET tunnel_id = $1, tunnel_hostname = $2, updated_at = NOW()
		WHERE id = $3
	`, tunnelID, tunnelHostname, environmentID)
	return err
}

func getEnvironmentTunnel(ctx context.Context, db *pgxpool.Pool, environmentID string) (tunnelID, tunnelHostname string, err error) {
	err = db.QueryRow(ctx, `
		SELECT COALESCE(tunnel_id, ''), COALESCE(tunnel_hostname, '')
		FROM lab_environments WHERE id = $1
	`, environmentID).Scan(&tunnelID, &tunnelHostname)
	return
}

func updateEnvironmentScenario(ctx context.Context, db *pgxpool.Pool, environmentID, scenarioID string) error {
	_, err := db.Exec(ctx,
		`UPDATE lab_environments SET current_scenario = $1, updated_at = NOW() WHERE id = $2`,
		scenarioID, environmentID,
	)
	return err
}

func markEnvironmentDestroyed(ctx context.Context, db *pgxpool.Pool, environmentID string) error {
	_, err := db.Exec(ctx, `
		UPDATE lab_environments
		SET status = 'destroyed', destroyed_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, environmentID)
	return err
}

func expireActiveSessionsForEnvironment(ctx context.Context, db *pgxpool.Pool, environmentID string) error {
	_, err := db.Exec(ctx, `
		UPDATE lab_sessions
		SET status = 'expired', completed_at = NOW()
		WHERE environment_id = $1 AND status IN ('active', 'provisioning', 'scenario_switching')
	`, environmentID)
	return err
}

func getEnvironmentWorkdir(baseDir, environmentID string) string {
	return fmt.Sprintf("%s/%s", baseDir, environmentID)
}

func parseTerraformOutputsJSON(raw []byte) map[string]interface{} {
	if len(raw) == 0 {
		return map[string]interface{}{}
	}
	var outputs map[string]interface{}
	if err := json.Unmarshal(raw, &outputs); err != nil {
		return map[string]interface{}{}
	}
	return outputs
}

// extractOutputValue reads a value from the `tofu output -json` format:
// {"key": {"sensitive": true, "type": "string", "value": "..."}}
func extractOutputValue(outputs map[string]interface{}, key string) string {
	raw, ok := outputs[key]
	if !ok {
		return ""
	}
	m, ok := raw.(map[string]interface{})
	if !ok {
		return ""
	}
	val, _ := m["value"].(string)
	return val
}

// getEnvironmentSSHKey reads the ephemeral SSH private key stored in terraform_outputs
// for the given environment. Returns empty string if not found (pre-key-pattern envs).
func getEnvironmentSSHKey(ctx context.Context, db *pgxpool.Pool, environmentID string) (string, error) {
	var raw []byte
	err := db.QueryRow(ctx,
		`SELECT terraform_outputs FROM lab_environments WHERE id = $1`,
		environmentID,
	).Scan(&raw)
	if err != nil {
		return "", fmt.Errorf("fetch terraform_outputs: %w", err)
	}
	outputs := parseTerraformOutputsJSON(raw)
	return extractOutputValue(outputs, "ssh_private_key"), nil
}

func environmentExpiresIn(hours int) time.Time {
	return time.Now().Add(time.Duration(hours) * time.Hour)
}

func saveEnvironmentTerraformState(ctx context.Context, db *pgxpool.Pool, environmentID, state, vars string) error {
	_, err := db.Exec(ctx,
		`UPDATE lab_environments SET terraform_state = $1, terraform_vars = $2, updated_at = NOW() WHERE id = $3`,
		state, vars, environmentID,
	)
	return err
}

func loadEnvironmentTerraformState(ctx context.Context, db *pgxpool.Pool, environmentID string) (state, vars string, err error) {
	err = db.QueryRow(ctx,
		`SELECT COALESCE(terraform_state, ''), COALESCE(terraform_vars, '') FROM lab_environments WHERE id = $1`,
		environmentID,
	).Scan(&state, &vars)
	return
}

func loadEnvironmentTerraformModule(ctx context.Context, db *pgxpool.Pool, environmentID string) (string, error) {
	var module string
	err := db.QueryRow(ctx,
		`SELECT terraform_module FROM lab_environments WHERE id = $1`,
		environmentID,
	).Scan(&module)
	return module, err
}

func enqueueRiverJob(ctx context.Context, db *pgxpool.Pool, kind string, args interface{}) error {
	data, err := json.Marshal(args)
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx, `
		INSERT INTO river_job (kind, state, args, max_attempts, queue, priority, scheduled_at, metadata, tags)
		VALUES ($1, 'available', $2, 3, 'default', 1, NOW(), '{}', '{}')
	`, kind, data)
	return err
}

func enqueueScheduledRiverJob(ctx context.Context, db *pgxpool.Pool, kind string, args interface{}, runAt time.Time) error {
	data, err := json.Marshal(args)
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx, `
		INSERT INTO river_job (kind, state, args, max_attempts, queue, priority, scheduled_at, metadata, tags)
		VALUES ($1, 'available', $2, 3, 'default', 1, $3, '{}', '{}')
	`, kind, data, runAt)
	return err
}
