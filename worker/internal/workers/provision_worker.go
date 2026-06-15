package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"devops-lab/worker/internal/awsclient"
	"devops-lab/worker/internal/jobs"

	"github.com/riverqueue/river"
)

type AWSCredentials struct {
	AccessKeyID     string
	SecretAccessKey string
	SessionToken    string
}

type ProvisionWorker struct {
	river.WorkerDefaults[jobs.ProvisionArgs]
	durableObjectURL string
	httpClient       *http.Client
	awsRegion        string
	workDir          string
}

// NewProvisionWorker creates a legacy provision worker (prefer provision_environment).
func NewProvisionWorker(durableObjectURL string, awsRegion string) *ProvisionWorker {
	workDir := "/tmp/labs"
	if err := os.MkdirAll(workDir, 0755); err != nil {
		log.Fatal("Failed to create work directory:", err)
	}

	return &ProvisionWorker{
		durableObjectURL: durableObjectURL,
		httpClient:       &http.Client{Timeout: 30 * time.Second},
		awsRegion:        awsRegion,
		workDir:          workDir,
	}
}

// Work implements the River worker interface
func (w *ProvisionWorker) Work(ctx context.Context, job *river.Job[jobs.ProvisionArgs]) error {
	return w.processJob(ctx, job.Args)
}

// NextRetry returns the retry backoff
func (w *ProvisionWorker) NextRetry(job *river.Job[jobs.ProvisionArgs]) time.Time {
	// Exponential backoff: 2s, 4s, 6s, etc
	backoffSeconds := job.Attempt * 2
	return time.Now().Add(time.Duration(backoffSeconds) * time.Second)
}

func (w *ProvisionWorker) processJob(ctx context.Context, args jobs.ProvisionArgs) error {
	log.Printf("Processing provision job: %s for session %s", args.JobID, args.SessionID)

	tfWorkdir := filepath.Join(w.workDir, args.SessionID)

	// Generate session token for ttyd authentication
	sessionToken := generateSessionToken()
	log.Printf("Generated session token for session %s", args.SessionID)

	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "progress",
		"message":   "Starting lab provisioning...",
		"timestamp": time.Now().UnixMilli(),
	})

	// Step 1: Assume AWS role
	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "progress",
		"message":   fmt.Sprintf("Assuming IAM role: %s", args.AWSRoleArn),
		"timestamp": time.Now().UnixMilli(),
	})

	credentials, err := w.assumeAWSRole(ctx, args)
	if err != nil {
		log.Printf("✗ Failed to assume role for job %s: %v", args.JobID, err)
		w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
			"type":      "error",
			"message":   fmt.Sprintf("Failed to assume role: %v", err),
			"timestamp": time.Now().UnixMilli(),
		})
		os.RemoveAll(tfWorkdir)
		return err
	}

	log.Printf("✓ Successfully assumed role for session %s", args.SessionID)

	// Step 2: Initialize OpenTofu
	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "progress",
		"message":   "Initializing OpenTofu...",
		"timestamp": time.Now().UnixMilli(),
	})

	if err := w.initOpenTofu(ctx, tfWorkdir, args, credentials, sessionToken); err != nil {
		log.Printf("✗ OpenTofu init failed for job %s: %v", args.JobID, err)
		w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
			"type":      "error",
			"message":   fmt.Sprintf("OpenTofu init failed: %v", err),
			"timestamp": time.Now().UnixMilli(),
		})
		w.destroyInfrastructure(ctx, tfWorkdir, credentials)
		os.RemoveAll(tfWorkdir)
		return err
	}

	// Step 3: Run Terraform plan
	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "progress",
		"message":   "Running infrastructure plan...",
		"timestamp": time.Now().UnixMilli(),
	})

	if err := w.runTerraformPlan(ctx, tfWorkdir, args, credentials); err != nil {
		log.Printf("✗ Terraform plan failed for job %s: %v", args.JobID, err)
		w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
			"type":      "error",
			"message":   fmt.Sprintf("Terraform plan failed: %v", err),
			"timestamp": time.Now().UnixMilli(),
		})
		w.destroyInfrastructure(ctx, tfWorkdir, credentials)
		os.RemoveAll(tfWorkdir)
		return err
	}

	// Step 4: Run Terraform apply
	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "progress",
		"message":   "Provisioning infrastructure...",
		"timestamp": time.Now().UnixMilli(),
	})

	if err := w.runTerraformApply(ctx, tfWorkdir, args, credentials); err != nil {
		log.Printf("✗ Terraform apply failed for job %s: %v", args.JobID, err)
		w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
			"type":      "error",
			"message":   fmt.Sprintf("Terraform apply failed: %v", err),
			"timestamp": time.Now().UnixMilli(),
		})
		w.destroyInfrastructure(ctx, tfWorkdir, credentials)
		os.RemoveAll(tfWorkdir)
		return err
	}

	// Step 5: Execute scenario injection if configured
	if args.ScenarioID != "" {
		w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
			"type":      "progress",
			"message":   fmt.Sprintf("Configuring lab environment: %s...", args.ScenarioID),
			"timestamp": time.Now().UnixMilli(),
		})

		if err := w.executeScenario(ctx, args); err != nil {
			log.Printf("✗ Scenario execution failed for job %s: %v", args.JobID, err)
			w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
				"type":      "error",
				"message":   fmt.Sprintf("Failed to configure lab environment: %v", err),
				"timestamp": time.Now().UnixMilli(),
			})
			w.destroyInfrastructure(ctx, tfWorkdir, credentials)
			os.RemoveAll(tfWorkdir)
			return err
		}

		log.Printf("✓ Scenario executed successfully for session %s", args.SessionID)
	}

	// Success
	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "complete",
		"message":   "Lab provisioning complete!",
		"timestamp": time.Now().UnixMilli(),
		"details": map[string]interface{}{
			"status": "ready",
		},
	})

	log.Printf("✓ Job completed successfully: %s", args.JobID)

	// Cleanup on success
	if err := os.RemoveAll(tfWorkdir); err != nil {
		log.Printf("Warning: failed to cleanup working directory: %v", err)
	}

	return nil
}

func (w *ProvisionWorker) assumeAWSRole(ctx context.Context, args jobs.ProvisionArgs) (*AWSCredentials, error) {
	if args.AWSRoleArn == "" {
		return &AWSCredentials{}, nil
	}

	integration := awsclient.Integration{
		RoleARN:    args.AWSRoleArn,
		ExternalID: args.AWSExternalID,
		Region:     args.AWSRegion,
	}
	creds, err := awsclient.AssumeStudentRole(ctx, integration, "provision", args.SessionID)
	if err != nil {
		return nil, err
	}
	return &AWSCredentials{
		AccessKeyID:     creds.AccessKeyID,
		SecretAccessKey: creds.SecretAccessKey,
		SessionToken:    creds.SessionToken,
	}, nil
}

func (w *ProvisionWorker) initOpenTofu(ctx context.Context, workdir string, args jobs.ProvisionArgs, creds *AWSCredentials, sessionToken string) error {
	if err := os.MkdirAll(workdir, 0755); err != nil {
		return fmt.Errorf("failed to create workdir: %w", err)
	}

	awsRegion := args.AWSRegion
	if awsRegion == "" {
		awsRegion = w.awsRegion
	}

	// Copy Terraform module from container filesystem
	// Module path: labs/linux-ec2, labs/docker-ec2, labs/kubernetes-eks
	// Resolves to: /app/terraform/modules/labs/{module_name}
	modulePath := filepath.Join("/app/terraform/modules", args.TerraformModule)

	log.Printf("Copying Terraform module from: %s", modulePath)

	// Copy all files from module directory
	entries, err := os.ReadDir(modulePath)
	if err != nil {
		return fmt.Errorf("failed to read module directory %s: %w", modulePath, err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue // Skip subdirectories for now
		}

		srcFile := filepath.Join(modulePath, entry.Name())
		dstFile := filepath.Join(workdir, entry.Name())

		content, err := os.ReadFile(srcFile)
		if err != nil {
			return fmt.Errorf("failed to read module file %s: %w", srcFile, err)
		}

		if err := os.WriteFile(dstFile, content, 0644); err != nil {
			return fmt.Errorf("failed to write file %s: %w", dstFile, err)
		}

		log.Printf("Copied module file: %s", entry.Name())
	}

	// Create terraform.tfvars with session variables
	tfvars := fmt.Sprintf(`
region          = "%s"
session_id      = "%s"
cf_tunnel_token = "%s"
session_token   = "%s"
`, awsRegion, args.SessionID, args.CFTunnelToken, sessionToken)

	tfvarsPath := filepath.Join(workdir, "terraform.tfvars")
	if err := os.WriteFile(tfvarsPath, []byte(tfvars), 0644); err != nil {
		return fmt.Errorf("failed to write terraform.tfvars: %w", err)
	}

	log.Printf("Created terraform.tfvars for session: %s", args.SessionID)

	cmd := exec.CommandContext(ctx, "tofu", "init", "-no-color")
	cmd.Dir = workdir
	cmd.Env = w.buildEnv(awsRegion, creds)
	cmd.Env = append(cmd.Env, "TF_LOG=DEBUG")

	cmd.Stdout = streamLogger{prefix: "[TOFU-OUT]"}
	cmd.Stderr = streamLogger{prefix: "[TOFU-ERR]"}

	// 2. Execute inline
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("tofu apply failed: %w", err)
	}

	return nil
}

// Custom writer to force OpenTofu streams into the Go logger
type streamLogger struct {
	prefix string
}

func (s streamLogger) Write(p []byte) (n int, err error) {
	// Trim the bytes and force them through Go's standard logger
	log.Printf("%s %s", s.prefix, bytes.TrimSpace(p))
	return len(p), nil
}

func (w *ProvisionWorker) runTerraformPlan(ctx context.Context, workdir string, args jobs.ProvisionArgs, creds *AWSCredentials) error {
	awsRegion := args.AWSRegion
	if awsRegion == "" {
		awsRegion = w.awsRegion
	}

	cmd := exec.CommandContext(ctx, "tofu", "plan", "-no-color", "-out=tfplan")
	cmd.Dir = workdir
	cmd.Env = w.buildEnv(awsRegion, creds)
	cmd.Env = append(cmd.Env, "TF_LOG=DEBUG")

	// 1. Force all output through our custom Go logger
	cmd.Stdout = streamLogger{prefix: "[TOFU-OUT]"}
	cmd.Stderr = streamLogger{prefix: "[TOFU-ERR]"}

	// 2. Execute inline
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("tofu apply failed: %w", err)
	}

	return nil
}

func (w *ProvisionWorker) runTerraformApply(ctx context.Context, workdir string, args jobs.ProvisionArgs, creds *AWSCredentials) error {
	awsRegion := args.AWSRegion
	if awsRegion == "" {
		awsRegion = w.awsRegion
	}

	// 1. Define a physical log file inside the container
	logPath := filepath.Join(workdir, "tofu-debug.log")

	cmd := exec.CommandContext(ctx, "tofu", "apply", "-no-color", "-auto-approve", "tfplan")
	cmd.Dir = workdir
	cmd.Env = w.buildEnv(awsRegion, creds)

	// 2. Instruct OpenTofu to dump the massive debug output directly to the file
	cmd.Env = append(cmd.Env, "TF_LOG=DEBUG")
	cmd.Env = append(cmd.Env, "TF_LOG_PATH="+logPath)

	// Prevent OpenTofu from hanging on invisible input prompts
	cmd.Stdin = nil
	cmd.Stdout = log.Writer()
	cmd.Stderr = log.Writer()

	// 3. Run the command (it will likely hang until Riverqueue kills it)
	err := cmd.Run()

	// 4. THE MAGIC: When the process dies, read the end of the file and print it!
	if logData, readErr := os.ReadFile(logPath); readErr == nil {
		strData := string(logData)
		if len(strData) > 3000 {
			strData = strData[len(strData)-3000:] // Grab only the last 3000 chars
		}
		log.Printf("\n========== TOFU CRASH LOG ==========\n%s\n====================================\n", strData)
	}

	if err != nil {
		return fmt.Errorf("tofu apply failed: %w", err)
	}

	// Read Terraform outputs in JSON format
	outputCmd := exec.CommandContext(ctx, "tofu", "output", "-json")
	outputCmd.Dir = workdir
	outputCmd.Env = w.buildEnv(awsRegion, creds)

	outputJSON, err := outputCmd.Output()
	if err != nil {
		log.Printf("Warning: failed to read terraform outputs: %v", err)
		return nil
	}

	var outputs map[string]interface{}
	if err := json.Unmarshal(outputJSON, &outputs); err != nil {
		log.Printf("Warning: failed to parse terraform outputs: %v", err)
		return nil
	}

	log.Printf("Terraform outputs: %+v", outputs)
	return nil
}

func (w *ProvisionWorker) destroyInfrastructure(ctx context.Context, workdir string, creds *AWSCredentials) {
	tfplanPath := filepath.Join(workdir, ".terraform")
	if _, err := os.Stat(tfplanPath); err != nil {
		return
	}

	log.Printf("Running terraform destroy for workdir: %s", workdir)

	cmd := exec.CommandContext(ctx, "tofu", "destroy", "-no-color", "-auto-approve")
	cmd.Dir = workdir
	cmd.Env = w.buildEnv(w.awsRegion, creds)

	output, err := cmd.CombinedOutput()
	log.Printf("tofu destroy output:\n%s", string(output))

	if err != nil {
		log.Printf("Warning: tofu destroy failed: %v", err)
	}
}

func (w *ProvisionWorker) buildEnv(awsRegion string, creds *AWSCredentials) []string {
	var tc *awsclient.TemporaryCredentials
	if creds != nil && creds.AccessKeyID != "" {
		tc = &awsclient.TemporaryCredentials{
			AccessKeyID:     creds.AccessKeyID,
			SecretAccessKey: creds.SecretAccessKey,
			SessionToken:    creds.SessionToken,
		}
	}
	return awsclient.BuildOpenTofuEnv(awsRegion, tc)
}

// executeScenario injects operational state into the provisioned infrastructure
// by copying scenario files via SCP through the Cloudflare Tunnel and executing setup.sh
func (w *ProvisionWorker) executeScenario(ctx context.Context, args jobs.ProvisionArgs) error {
	scenarioPath := filepath.Join("/app/scenarios", args.ScenarioID)

	// Verify scenario directory exists
	if _, err := os.Stat(scenarioPath); err != nil {
		return fmt.Errorf("scenario directory not found: %s: %w", scenarioPath, err)
	}

	log.Printf("Executing scenario: %s from path: %s", args.ScenarioID, scenarioPath)

	// TODO: The following steps require:
	// 1. Retrieve EC2 private IP from terraform outputs (stored in lab_sessions.terraform_outputs)
	// 2. Establish SSH connection through Cloudflare Tunnel (tunnel details in args.CFTunnelToken)
	// 3. Copy scenario files via SCP: /app/scenarios/{id}/* → /tmp/scenario on EC2
	// 4. Execute /tmp/scenario/setup.sh with timeout
	// 5. Check exit code - if non-zero, return error
	//
	// For now, this is a placeholder that logs the scenario was processed.
	// Full implementation requires:
	// - SSH client configuration (parse args.CFTunnelToken for tunnel connection details)
	// - SCP/SFTP file transfer
	// - Remote command execution with timeout
	// - Proper error handling and logging

	log.Printf("✓ Scenario %s prepared (file copy and setup.sh execution pending full tunnel integration)", args.ScenarioID)

	return nil
}

func (w *ProvisionWorker) notifyDurableObject(sessionID, durableObjectID string, event map[string]interface{}) {
	event["sessionId"] = sessionID

	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal event: %v", err)
		return
	}

	url := fmt.Sprintf("%s/labs/%s/webhook", w.durableObjectURL, durableObjectID)
	resp, err := w.httpClient.Post(
		url,
		"application/json",
		bytes.NewReader(payload),
	)

	if err != nil {
		log.Printf("Failed to notify Durable Object: %v", err)
		return
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Durable Object returned status %d", resp.StatusCode)
	}
}
