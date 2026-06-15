package workers

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"devops-lab/worker/internal/awsclient"
	"devops-lab/worker/internal/cloudflare"
	"devops-lab/worker/internal/jobs"
	"devops-lab/worker/internal/labssh"
	"devops-lab/worker/internal/scenario"
)

type ProvisionEnvironmentWorker struct {
	river.WorkerDefaults[jobs.ProvisionEnvironmentArgs]
	dbPool           *pgxpool.Pool
	durableObjectURL string
	httpClient       *http.Client
	workDir          string
}

func NewProvisionEnvironmentWorker(dbPool *pgxpool.Pool, durableObjectURL string) *ProvisionEnvironmentWorker {
	workDir := "/tmp/labs"
	_ = os.MkdirAll(workDir, 0755)
	return &ProvisionEnvironmentWorker{
		dbPool:           dbPool,
		durableObjectURL: durableObjectURL,
		httpClient:       &http.Client{Timeout: 30 * time.Second},
		workDir:          workDir,
	}
}

// Timeout tells River this job may legitimately run for up to 30 minutes.
// Tofu ops use context.Background() internally so River's ctx doesn't limit them,
// but this prevents River from marking the job as stuck after its default period.
func (w *ProvisionEnvironmentWorker) Timeout(_ *river.Job[jobs.ProvisionEnvironmentArgs]) time.Duration {
	return 30 * time.Minute
}

// generateSessionToken creates a random hex token for ttyd authentication
func generateSessionToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b) // 32-char random hex
}

// NextRetry disables automatic retries for provisioning jobs
// Infrastructure operations should fail fast, not retry and create duplicate resources
func (w *ProvisionEnvironmentWorker) NextRetry(job *river.Job[jobs.ProvisionEnvironmentArgs]) time.Time {
	// Return far future date = no retry (effectively disabled)
	return time.Now().Add(time.Hour * 24 * 365 * 100)
}

func (w *ProvisionEnvironmentWorker) Work(ctx context.Context, job *river.Job[jobs.ProvisionEnvironmentArgs]) error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[PANIC] provision_environment recovered: %v", r)
		}
	}()

	args := job.Args
	log.Printf("provision_environment: env=%s session=%s", args.EnvironmentID, args.SessionID)
	log.Printf("[DEBUG] Job args - UserID: %s, LabID: %s, StudentRegion: %s", args.UserID, args.LabID, args.StudentRegion)

	notify := func(msg string, details map[string]interface{}) {
		w.notify(args.SessionID, args.DurableObjectID, "progress", msg, details)
	}

	notify("Connecting to your AWS account...", nil)
	log.Printf("[DEBUG] About to fetch AWS integration for user: %s", args.UserID)

	integration, err := awsclient.FetchIntegration(ctx, w.dbPool, args.UserID)
	if err != nil {
		log.Printf("[ERROR] FetchIntegration failed: %v", err)
		w.fail(args, fmt.Sprintf("AWS integration: %v", err))
		return err
	}
	log.Printf("[DEBUG] FetchIntegration succeeded - Region from DB: %s", integration.Region)

	log.Printf("[DEBUG] About to call AssumeStudentRole with RoleARN=%s, region=%s", integration.RoleARN, integration.Region)
	creds, err := awsclient.AssumeStudentRole(ctx, *integration, "provision", args.SessionID)
	if err != nil {
		log.Printf("[ERROR] AssumeStudentRole failed: %v", err)
		w.fail(args, fmt.Sprintf("AssumeRole failed: %v", err))
		return err
	}
	log.Printf("[DEBUG] AssumeStudentRole succeeded - got temporary credentials")

	_ = updateEnvironmentStatus(ctx, w.dbPool, args.EnvironmentID, "provisioning")
	_ = updateSessionStatus(ctx, w.dbPool, args.SessionID, "provisioning")

	if args.TunnelID != "" && args.TunnelHostname != "" {
		_ = updateEnvironmentTunnel(ctx, w.dbPool, args.EnvironmentID, args.TunnelID, args.TunnelHostname)
	}

	tfWorkdir := getEnvironmentWorkdir(w.workDir, args.EnvironmentID)
	modulePath := resolveModulePath(args.TerraformModule)

	notify("Creating isolated network environment...", nil)
	log.Printf("[DEBUG] About to copy Terraform module from %s to %s", modulePath, tfWorkdir)

	if err := copyTerraformModule(tfWorkdir, modulePath); err != nil {
		log.Printf("[ERROR] copyTerraformModule failed: %v", err)
		w.fail(args, err.Error())
		return err
	}
	log.Printf("[DEBUG] copyTerraformModule succeeded")

	region := integration.Region
	log.Printf("[DEBUG] Region resolution: integration.Region='%s', args.StudentRegion='%s'", integration.Region, args.StudentRegion)
	
	if region == "" && args.StudentRegion != "" {
		region = args.StudentRegion
		log.Printf("[DEBUG] Using StudentRegion fallback: %s", region)
	}
	if region == "" {
		region = "ap-south-1"
		log.Printf("[DEBUG] Using hardcoded default region: ap-south-1")
	}
	
	log.Printf("[DEBUG] Final selected region: %s", region)
	notify(fmt.Sprintf("Using AWS region: %s", region), nil)
	
	if err := writeTerraformVars(tfWorkdir, region, args.EnvironmentID, args.CFTunnelToken); err != nil {
		log.Printf("[ERROR] Failed to write Terraform vars: %v", err)
		w.fail(args, err.Error())
		return err
	}

	// Generate session token for ttyd authentication
	sessionToken := generateSessionToken()
	
	cfg := terraformRunConfig{
		Workdir:       tfWorkdir,
		ModulePath:    modulePath,
		SessionID:     args.EnvironmentID,
		SessionToken:  sessionToken,
		Region:        region,
		CFTunnelToken: args.CFTunnelToken,
		Creds:         creds,
	}

	notify("Initializing OpenTofu...", nil)
	log.Printf("[DEBUG] Starting tofu init for environment: %s, region: %s", args.EnvironmentID, region)
	if err := runTofuInit(ctx, cfg); err != nil {
		log.Printf("[ERROR] tofu init failed: %v", err)
		w.rollback(ctx, cfg, args)
		w.fail(args, fmt.Sprintf("OpenTofu init failed: %v", err))
		return err
	}

	notify("Planning infrastructure...", nil)
	log.Printf("[DEBUG] Starting tofu plan for environment: %s", args.EnvironmentID)
	if err := runTofuPlan(ctx, cfg); err != nil {
		log.Printf("[ERROR] tofu plan failed: %v", err)
		w.rollback(ctx, cfg, args)
		w.fail(args, fmt.Sprintf("OpenTofu plan failed: %v", err))
		return err
	}

	notify("Launching your lab instance...", nil)
	log.Printf("[DEBUG] Starting tofu apply for environment: %s", args.EnvironmentID)
	outputs, err := runTofuApply(ctx, cfg)
	if err != nil {
		log.Printf("[ERROR] tofu apply failed: %v", err)
		w.rollback(ctx, cfg, args)
		w.fail(args, fmt.Sprintf("OpenTofu apply failed: %v", err))
		return err
	}
	log.Printf("[DEBUG] tofu apply completed successfully, got outputs: %+v", outputs)

	_ = updateEnvironmentOutputs(ctx, w.dbPool, args.EnvironmentID, outputs, args.TunnelID)
	_ = updateSessionOutputs(ctx, w.dbPool, args.SessionID, outputs)

	// Persist terraform state+vars to DB so teardown survives container restarts.
	// Without this, /tmp/labs/ is wiped on restart and tofu destroy silently skips.
	if err := persistTerraformState(ctx, w.dbPool, args.EnvironmentID, cfg); err != nil {
		log.Printf("[WARNING] Failed to persist terraform state to DB: %v — teardown may leak resources", err)
	} else {
		log.Printf("[DEBUG] Terraform state persisted to database")
	}
	
	// Use fresh context for database updates (ctx may have expired)
	dbCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := updateSessionTerminalToken(dbCtx, w.dbPool, args.SessionID, sessionToken); err != nil {
		log.Printf("[ERROR] Failed to update session terminal token: %v", err)
		w.fail(args, fmt.Sprintf("Failed to save terminal token: %v", err))
		return err
	}
	log.Printf("[DEBUG] Session terminal token saved")

	tunnelHostname := args.TunnelHostname
	if args.TunnelID != "" && tunnelHostname != "" {
		if err := updateEnvironmentTunnel(dbCtx, w.dbPool, args.EnvironmentID, args.TunnelID, tunnelHostname); err != nil {
			log.Printf("[WARNING] Failed to update environment tunnel: %v", err)
		}
	}
	log.Printf("[DEBUG] TunnelID: %s, TunnelHostname: %s, ScenarioID: %s", args.TunnelID, tunnelHostname, args.ScenarioID)
	
	if args.TunnelID != "" {
		notify("Tunnel configured successfully", nil)
		log.Printf("[DEBUG] Tunnel created: %s with hostname: %s", args.TunnelID, tunnelHostname)
		// Tunnel health will be verified once cloudflared connects during scenario setup
	} else {
		log.Printf("[DEBUG] No TunnelID provided, skipping tunnel setup")
	}

	sshPrivateKey := extractOutputValue(outputs, "ssh_private_key")
	if sshPrivateKey == "" {
		log.Printf("[WARNING] ssh_private_key not found in tofu outputs — SSH auth may fail")
	} else {
		log.Printf("[DEBUG] ssh_private_key extracted from tofu outputs (%d bytes)", len(sshPrivateKey))
	}

	scenarioRunner := scenario.NewRunner(scenario.HostConfig{
		TunnelHostname: tunnelHostname,
		SSHPrivateKey:  sshPrivateKey,
	})

	if args.ScenarioID != "" {
		notify(fmt.Sprintf("Configuring lab environment: %s...", args.ScenarioID), nil)

		// Fresh context: River's ctx is expired after a multi-minute tofu apply.
		setupCtx, setupCancel := context.WithTimeout(context.Background(), 15*time.Minute)
		defer setupCancel()

		// Poll SSH connectivity instead of a hard sleep. EC2 kernel boot takes
		// ~30s, cloudflared download ~60s, tunnel edge connection ~30s — so the
		// tunnel is typically reachable ~90s after tofu apply returns. We wait a
		// minimum of 30s before the first probe (avoids wasting a cloudflared
		// proxy spawn before sshd is even up) then poll every 10s up to 150s max.
		log.Printf("[DEBUG] Polling SSH tunnel readiness (max 150s)...")
		notify("Waiting for lab instance to be ready...", nil)

		sshClient := labssh.NewClient()
		pollTarget := labssh.Target{
			Hostname:   tunnelHostname,
			User:       labssh.DefaultUser(),
			PrivateKey: sshPrivateKey,
		}

		const (
			pollInitialWait = 30 * time.Second
			pollInterval    = 10 * time.Second
			pollMaxWait     = 150 * time.Second
		)
		pollStart := time.Now()

		select {
		case <-time.After(pollInitialWait):
		case <-setupCtx.Done():
			w.fail(args, fmt.Sprintf("Scenario setup cancelled during boot wait: %v", setupCtx.Err()))
			return setupCtx.Err()
		}

		for {
			elapsed := time.Since(pollStart)
			probeCtx, probeCancel := context.WithTimeout(setupCtx, 15*time.Second)
			err := sshClient.CheckTunnelReachable(probeCtx, pollTarget)
			probeCancel()
			if err == nil {
				log.Printf("[DEBUG] Tunnel reachable after %.0fs", elapsed.Seconds())
				break
			}
			if elapsed >= pollMaxWait {
				log.Printf("[DEBUG] Tunnel not reachable after %.0fs, continuing anyway", elapsed.Seconds())
				break
			}
			log.Printf("[DEBUG] Tunnel not ready (%.0fs elapsed): %v", elapsed.Seconds(), err)
			select {
			case <-time.After(pollInterval):
			case <-setupCtx.Done():
				w.fail(args, fmt.Sprintf("Scenario setup cancelled during tunnel poll: %v", setupCtx.Err()))
				return setupCtx.Err()
			}
		}

		maxAttempts := 8
		backoff := 20 * time.Second

		for attempt := 0; attempt < maxAttempts; attempt++ {
			if attempt > 0 {
				log.Printf("[DEBUG] Scenario setup retry %d/%d, waiting %v...", attempt, maxAttempts-1, backoff)
				select {
				case <-time.After(backoff):
				case <-setupCtx.Done():
					w.fail(args, fmt.Sprintf("Scenario setup cancelled: %v", setupCtx.Err()))
					return setupCtx.Err()
				}
				if backoff < 30*time.Second {
					backoff *= 2
				}
			}

			err := scenarioRunner.RunSetup(setupCtx, args.ScenarioID)
			if err == nil {
				log.Printf("[DEBUG] Scenario setup complete (attempt %d)", attempt+1)
				_ = updateEnvironmentScenario(setupCtx, w.dbPool, args.EnvironmentID, args.ScenarioID)
				break
			}

			if attempt == maxAttempts-1 {
				log.Printf("[ERROR] Scenario setup failed after %d attempts: %v", maxAttempts, err)
				w.rollback(ctx, cfg, args)
				w.fail(args, fmt.Sprintf("Scenario setup failed after retries: %v", err))
				return err
			}

			log.Printf("[WARNING] Scenario setup attempt %d failed: %v (will retry)", attempt+1, err)
		}
	} else {
		log.Printf("[DEBUG] No ScenarioID, skipping scenario setup")
	}

	// Use fresh context for final status updates (River context may have expired)
	statusCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := updateEnvironmentStatus(statusCtx, w.dbPool, args.EnvironmentID, "active"); err != nil {
		log.Printf("[ERROR] Failed to update environment status to active: %v", err)
		w.fail(args, fmt.Sprintf("Failed to mark environment as active: %v", err))
		return err
	}
	log.Printf("[DEBUG] Environment marked as active")
	
	if err := updateSessionStatus(statusCtx, w.dbPool, args.SessionID, "active"); err != nil {
		log.Printf("[ERROR] Failed to update session status to active: %v", err)
		w.fail(args, fmt.Sprintf("Failed to mark session as active: %v", err))
		return err
	}
	log.Printf("[DEBUG] Session marked as active")

	w.notify(args.SessionID, args.DurableObjectID, "complete", "Your lab is ready.", map[string]interface{}{
		"status": "ready",
		"mode":   "full_provision",
	})

	log.Printf("✓ provision_environment complete: %s", args.EnvironmentID)
	return nil
}

func (w *ProvisionEnvironmentWorker) rollback(ctx context.Context, cfg terraformRunConfig, args jobs.ProvisionEnvironmentArgs) {
	_ = runTofuDestroy(ctx, cfg)
	
	// Use fresh context for database updates (original ctx may be expired)
	rollbackCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	_ = updateEnvironmentStatus(rollbackCtx, w.dbPool, args.EnvironmentID, "failed")
	_ = updateSessionStatus(rollbackCtx, w.dbPool, args.SessionID, "failed")
	_ = os.RemoveAll(cfg.Workdir)
	if args.TunnelID != "" {
		_ = cloudflare.DeleteTunnel(rollbackCtx, args.TunnelID)
	}
}

func (w *ProvisionEnvironmentWorker) fail(args jobs.ProvisionEnvironmentArgs, message string) {
	ctx := context.Background()
	_ = updateEnvironmentStatus(ctx, w.dbPool, args.EnvironmentID, "failed")
	_ = updateSessionStatus(ctx, w.dbPool, args.SessionID, "failed")
	w.notify(args.SessionID, args.DurableObjectID, "error", message, nil)
	log.Printf("[FAILED] Session %s marked as failed: %s", args.SessionID, message)
}

func (w *ProvisionEnvironmentWorker) notify(sessionID, durableObjectID, eventType, message string, details map[string]interface{}) {
	event := map[string]interface{}{
		"type":      eventType,
		"message":   message,
		"timestamp": time.Now().UnixMilli(),
	}
	if details != nil {
		event["details"] = details
	}
	notifyDurableObject(w.httpClient, w.durableObjectURL, sessionID, durableObjectID, event)
}

func notifyDurableObject(client *http.Client, baseURL, sessionID, durableObjectID string, event map[string]interface{}) {
	event["sessionId"] = sessionID
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("❌ notify DO marshal error: %v", err)
		return
	}
	url := fmt.Sprintf("%s/labs/%s/webhook", baseURL, durableObjectID)
	log.Printf("📤 Webhook POST to %s", url)
	resp, err := client.Post(url, "application/json", bytes.NewReader(payload))
	if err != nil {
		log.Printf("❌ notify DO POST error: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("✓ Webhook sent, status: %d", resp.StatusCode)
}
