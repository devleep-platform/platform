package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"devops-lab/worker/internal/awsclient"
)

type terraformRunConfig struct {
	Workdir         string
	ModulePath      string
	SessionID       string
	SessionToken    string
	Region          string
	CFTunnelToken   string
	Creds           *awsclient.TemporaryCredentials
}

func copyTerraformModule(workdir, modulePath string) error {
	if err := os.MkdirAll(workdir, 0755); err != nil {
		return err
	}

	entries, err := os.ReadDir(modulePath)
	if err != nil {
		return fmt.Errorf("read module %s: %w", modulePath, err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		src := filepath.Join(modulePath, entry.Name())
		dst := filepath.Join(workdir, entry.Name())
		content, err := os.ReadFile(src)
		if err != nil {
			return err
		}
		if err := os.WriteFile(dst, content, 0644); err != nil {
			return err
		}
	}
	return nil
}

func writeTerraformVars(workdir, region, sessionID, cfTunnelToken string) error {
	tfvars := fmt.Sprintf(`
region          = "%s"
session_id      = "%s"
cf_tunnel_token = "%s"
`, region, sessionID, cfTunnelToken)
	return os.WriteFile(filepath.Join(workdir, "terraform.tfvars"), []byte(tfvars), 0644)
}

func createTerraformVars(cfg terraformRunConfig) error {
	tfvars := fmt.Sprintf(`region          = "%s"
session_id      = "%s"
cf_tunnel_token = "%s"
session_token   = "%s"
`, cfg.Region, cfg.SessionID, cfg.CFTunnelToken, cfg.SessionToken)

	tfvarsPath := filepath.Join(cfg.Workdir, "terraform.tfvars")
	if err := os.WriteFile(tfvarsPath, []byte(tfvars), 0644); err != nil {
		return fmt.Errorf("write tfvars: %w", err)
	}
	log.Printf("Created terraform.tfvars for session: %s", cfg.SessionID)
	return nil
}

func runTofuInit(ctx context.Context, cfg terraformRunConfig) error {
	// Create terraform.tfvars before init
	if err := createTerraformVars(cfg); err != nil {
		return err
	}

	// Use background context with 5 minute timeout for init (provider downloads)
	tofuCtx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	
	cmd := exec.CommandContext(tofuCtx, "tofu", "init", "-no-color")
	cmd.Dir = cfg.Workdir
	cmd.Env = awsclient.BuildOpenTofuEnv(cfg.Region, cfg.Creds)
	out, err := cmd.CombinedOutput()
	log.Printf("tofu init:\n%s", string(out))
	if err != nil {
		return fmt.Errorf("tofu init: %w", err)
	}
	return nil
}

func runTofuPlan(ctx context.Context, cfg terraformRunConfig) error {
	// Use background context with 5 minute timeout for plan
	tofuCtx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	
	cmd := exec.CommandContext(tofuCtx, "tofu", "plan", "-no-color", "-out=tfplan")
	cmd.Dir = cfg.Workdir
	cmd.Env = awsclient.BuildOpenTofuEnv(cfg.Region, cfg.Creds)
	out, err := cmd.CombinedOutput()
	log.Printf("tofu plan:\n%s", string(out))
	if err != nil {
		return fmt.Errorf("tofu plan: %w", err)
	}
	return nil
}

func runTofuApply(ctx context.Context, cfg terraformRunConfig) (map[string]interface{}, error) {
	// Use background context with 15 minute timeout for apply (EC2 creation, tunnel setup, etc)
	tofuCtx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()
	
	cmd := exec.CommandContext(tofuCtx, "tofu", "apply", "-no-color", "-auto-approve", "tfplan")
	cmd.Dir = cfg.Workdir
	cmd.Env = awsclient.BuildOpenTofuEnv(cfg.Region, cfg.Creds)
	out, err := cmd.CombinedOutput()
	log.Printf("tofu apply:\n%s", string(out))
	if err != nil {
		return nil, fmt.Errorf("tofu apply: %w", err)
	}

	outputCmd := exec.CommandContext(context.Background(), "tofu", "output", "-json")
	outputCmd.Dir = cfg.Workdir
	outputCmd.Env = awsclient.BuildOpenTofuEnv(cfg.Region, cfg.Creds)
	outputJSON, err := outputCmd.Output()
	if err != nil {
		return map[string]interface{}{}, nil
	}

	var outputs map[string]interface{}
	if err := json.Unmarshal(outputJSON, &outputs); err != nil {
		return map[string]interface{}{}, nil
	}
	return outputs, nil
}

func runTofuDestroy(ctx context.Context, cfg terraformRunConfig) error {
	if _, err := os.Stat(filepath.Join(cfg.Workdir, ".terraform")); os.IsNotExist(err) {
		return nil
	}
	
	// Use background context with 10 minute timeout for destroy
	tofuCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	
	cmd := exec.CommandContext(tofuCtx, "tofu", "destroy", "-no-color", "-auto-approve")
	cmd.Dir = cfg.Workdir
	cmd.Env = awsclient.BuildOpenTofuEnv(cfg.Region, cfg.Creds)
	out, err := cmd.CombinedOutput()
	log.Printf("tofu destroy:\n%s", string(out))
	if err != nil {
		return fmt.Errorf("tofu destroy: %w", err)
	}
	return nil
}

// persistTerraformState reads terraform.tfstate and terraform.tfvars from the workdir
// and saves them to the database so teardown can proceed after a container restart.
func persistTerraformState(ctx context.Context, db *pgxpool.Pool, environmentID string, cfg terraformRunConfig) error {
	stateData, err := os.ReadFile(filepath.Join(cfg.Workdir, "terraform.tfstate"))
	if err != nil {
		return fmt.Errorf("read terraform.tfstate: %w", err)
	}
	varsData, err := os.ReadFile(filepath.Join(cfg.Workdir, "terraform.tfvars"))
	if err != nil {
		return fmt.Errorf("read terraform.tfvars: %w", err)
	}
	return saveEnvironmentTerraformState(ctx, db, environmentID, string(stateData), string(varsData))
}

// restoreTerraformWorkdir reconstructs a lost workdir from DB-saved state so that
// tofu destroy can run. Called when /tmp/labs/{id}/.terraform is missing at teardown time.
func restoreTerraformWorkdir(ctx context.Context, db *pgxpool.Pool, environmentID, tfWorkdir string, cfg terraformRunConfig) error {
	state, vars, err := loadEnvironmentTerraformState(ctx, db, environmentID)
	if err != nil {
		return fmt.Errorf("load state from db: %w", err)
	}
	if state == "" {
		return fmt.Errorf("no terraform state in database for environment %s", environmentID)
	}

	if cfg.ModulePath == "" {
		module, err := loadEnvironmentTerraformModule(ctx, db, environmentID)
		if err != nil || module == "" {
			return fmt.Errorf("load terraform_module: %w", err)
		}
		cfg.ModulePath = resolveModulePath(module)
	}

	if err := copyTerraformModule(tfWorkdir, cfg.ModulePath); err != nil {
		return fmt.Errorf("copy module: %w", err)
	}
	if err := os.WriteFile(filepath.Join(tfWorkdir, "terraform.tfstate"), []byte(state), 0644); err != nil {
		return fmt.Errorf("write state file: %w", err)
	}
	if vars != "" {
		if err := os.WriteFile(filepath.Join(tfWorkdir, "terraform.tfvars"), []byte(vars), 0644); err != nil {
			return fmt.Errorf("write vars file: %w", err)
		}
	}

	// Re-init to restore the .terraform provider cache directory.
	if err := runTofuInit(ctx, cfg); err != nil {
		return fmt.Errorf("tofu init on restore: %w", err)
	}
	return nil
}

func resolveModulePath(terraformModule string) string {
	return filepath.Join("/app/terraform/modules", terraformModule)
}

func extractPrivateIP(outputs map[string]interface{}) string {
	if nodes, ok := outputs["nodes"]; ok {
		if arr, ok := nodes.([]interface{}); ok && len(arr) > 0 {
			if node, ok := arr[0].(map[string]interface{}); ok {
				if ip, ok := node["private_ip"].(string); ok {
					return ip
				}
			}
		}
	}
	if v, ok := outputs["ec2_private_ip"]; ok {
		if s, ok := v.(string); ok {
			return s
		}
		if m, ok := v.(map[string]interface{}); ok {
			if val, ok := m["value"].(string); ok {
				return val
			}
		}
	}
	return ""
}

func setSSHHostFromOutputs(outputs map[string]interface{}) {
	ip := extractPrivateIP(outputs)
	if ip != "" {
		os.Setenv("LAB_SSH_HOST", ip)
	}
}

func cleanEnvPrefix() []string {
	env := os.Environ()
	clean := make([]string, 0, len(env))
	for _, e := range env {
		if strings.HasPrefix(e, "AWS_") || strings.HasPrefix(e, "TF_") {
			continue
		}
		clean = append(clean, e)
	}
	return clean
}
