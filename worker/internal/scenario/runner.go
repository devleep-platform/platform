package scenario

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"devops-lab/worker/internal/labssh"
)

const defaultSetupTimeout = 60 * time.Second

// HostConfig identifies how to reach a lab VM through Cloudflare Tunnel.
type HostConfig struct {
	TunnelHostname string
	SSHUser        string
	SSHPrivateKey  string // PEM-encoded ED25519 private key (ephemeral, per-session)
}

// Runner executes scenario setup/cleanup scripts on a lab host via tunnel SSH.
type Runner struct {
	ScenariosRoot string
	Host          HostConfig
	SSH           *labssh.Client
}

func NewRunner(host HostConfig) *Runner {
	user := host.SSHUser
	if user == "" {
		user = labssh.DefaultUser()
	}
	return &Runner{
		ScenariosRoot: envOrDefault("SCENARIOS_ROOT", "/app/scenarios"),
		Host: HostConfig{
			TunnelHostname: host.TunnelHostname,
			SSHUser:        user,
			SSHPrivateKey:  host.SSHPrivateKey,
		},
		SSH: labssh.NewClient(),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func (r *Runner) RunSetup(ctx context.Context, scenarioID string) error {
	return r.runScript(ctx, scenarioID, "setup.sh")
}

func (r *Runner) RunCleanup(ctx context.Context, scenarioID string) error {
	if scenarioID == "" {
		return nil
	}
	return r.runScript(ctx, scenarioID, "cleanup.sh")
}

func (r *Runner) runScript(ctx context.Context, scenarioID, scriptName string) error {
	if scenarioID == "" {
		return nil
	}

	scenarioDir := filepath.Join(r.ScenariosRoot, scenarioID)
	scriptPath := filepath.Join(scenarioDir, scriptName)
	if _, err := os.Stat(scriptPath); err != nil {
		log.Printf("[scenario] %s/%s not found at %s — skipping (no setup needed)", scenarioID, scriptName, scriptPath)
		return nil
	}

	if r.Host.TunnelHostname == "" {
		log.Printf("[scenario] %s/%s skipped (no tunnel hostname — set CLOUDFLARE_TUNNEL_* on API)", scenarioID, scriptName)
		return nil
	}

	timeout := r.scenarioTimeout(scenarioDir)
	remoteDir := fmt.Sprintf("/tmp/scenario-%s", scenarioID)
	target := labssh.Target{
		Hostname:   r.Host.TunnelHostname,
		User:       r.Host.SSHUser,
		PrivateKey: r.Host.SSHPrivateKey,
	}

	if err := r.SSH.RunScript(ctx, target, scenarioDir, remoteDir, scriptName, timeout); err != nil {
		return err
	}

	log.Printf("[scenario] %s/%s completed via %s", scenarioID, scriptName, r.Host.TunnelHostname)
	return nil
}

func (r *Runner) scenarioTimeout(scenarioDir string) time.Duration {
	metaPath := filepath.Join(scenarioDir, "metadata.json")
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return defaultSetupTimeout
	}
	var meta struct {
		SetupTimeoutSeconds int `json:"setup_timeout_seconds"`
	}
	if err := json.Unmarshal(data, &meta); err != nil || meta.SetupTimeoutSeconds <= 0 {
		return defaultSetupTimeout
	}
	return time.Duration(meta.SetupTimeoutSeconds) * time.Second
}
