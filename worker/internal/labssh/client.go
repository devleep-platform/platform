package labssh

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Target is a lab host reachable via Cloudflare Tunnel ingress.
type Target struct {
	Hostname   string // e.g. lab-abc123.devleep.com
	User       string // e.g. ubuntu
	PrivateKey string // PEM-encoded ED25519 private key (ephemeral, per-session)
}

// Client runs commands and copies files through cloudflared access tcp proxy.
type Client struct {
	CloudflaredPath string
}

func NewClient() *Client {
	path, err := exec.LookPath("cloudflared")
	if err != nil {
		path = "/usr/local/bin/cloudflared"
	}
	return &Client{CloudflaredPath: path}
}

// sshTunnelHostname maps the ttyd tunnel hostname to the SSH-specific hostname.
// The tunnel has two ingress routes: lab-xxx (ttyd) and ssh-xxx (SSH port 22).
// Connecting to lab-xxx would reach ttyd (HTTP) — we must use ssh-xxx.
func sshTunnelHostname(tunnelHostname string) string {
	return strings.Replace(tunnelHostname, "lab-", "ssh-", 1)
}

func (c *Client) proxyCommand(hostname string) string {
	return fmt.Sprintf("%s access tcp --hostname %s", c.CloudflaredPath, sshTunnelHostname(hostname))
}

// writeKeyFile writes the private key to a temp file with 0600 permissions.
// Returns the file path. Caller must os.Remove it when done.
func writeKeyFile(key string) (string, error) {
	f, err := os.CreateTemp("", "lab-ssh-key-*.pem")
	if err != nil {
		return "", fmt.Errorf("create key temp file: %w", err)
	}
	defer f.Close()
	if err := f.Chmod(0600); err != nil {
		os.Remove(f.Name())
		return "", fmt.Errorf("chmod key file: %w", err)
	}
	if _, err := f.WriteString(key); err != nil {
		os.Remove(f.Name())
		return "", fmt.Errorf("write key file: %w", err)
	}
	return f.Name(), nil
}

func (c *Client) sshBaseArgs(hostname, keyFile string) []string {
	args := []string{
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "BatchMode=yes",
		"-o", fmt.Sprintf("ProxyCommand=%s", c.proxyCommand(hostname)),
	}
	if keyFile != "" {
		args = append(args, "-i", keyFile)
	}
	return args
}

// RunScript copies a local directory to the host and executes a script.
//
// Each SSH/SCP call spawns its own cloudflared proxy process. connTimeout
// covers cloudflared auth + tunnel establishment + SSH banner exchange.
// BatchMode=yes prevents SSH from hanging on keyboard-interactive auth.
func (c *Client) RunScript(ctx context.Context, target Target, localDir, remoteDir, scriptName string, scriptTimeout time.Duration) error {
	if target.Hostname == "" {
		return fmt.Errorf("tunnel hostname is not configured")
	}

	// 90s covers cloudflared cold-start (~20-30s) + SSH handshake.
	const connTimeout = 90 * time.Second

	// Write ephemeral private key to a temp file for this operation.
	keyFile := ""
	if target.PrivateKey != "" {
		var err error
		keyFile, err = writeKeyFile(target.PrivateKey)
		if err != nil {
			return err
		}
		defer os.Remove(keyFile)
	}

	remoteParent := filepath.Dir(remoteDir)
	sshBase := c.sshBaseArgs(target.Hostname, keyFile)

	// Step 1: ensure remote directory exists
	mkdirCtx, mkdirCancel := context.WithTimeout(ctx, connTimeout)
	defer mkdirCancel()
	mkdirCmd := exec.CommandContext(mkdirCtx, "ssh", append(sshBase,
		fmt.Sprintf("%s@%s", target.User, target.Hostname),
		fmt.Sprintf("mkdir -p %s", remoteParent),
	)...)
	if out, err := mkdirCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("mkdir on remote: %w\n%s", err, string(out))
	}

	// Step 2: copy scenario files
	scpCtx, scpCancel := context.WithTimeout(ctx, connTimeout)
	defer scpCancel()
	scpArgs := []string{"-r",
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "BatchMode=yes",
		"-o", fmt.Sprintf("ProxyCommand=%s", c.proxyCommand(target.Hostname)),
	}
	if keyFile != "" {
		scpArgs = append(scpArgs, "-i", keyFile)
	}
	scpArgs = append(scpArgs, localDir, fmt.Sprintf("%s@%s:%s", target.User, target.Hostname, remoteDir))
	scpCmd := exec.CommandContext(scpCtx, "scp", scpArgs...)
	if out, err := scpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("scp scenario: %w\n%s", err, string(out))
	}

	// Step 3: execute the script — uses the full scenario timeout on top of conn budget
	scriptCtx, scriptCancel := context.WithTimeout(ctx, connTimeout+scriptTimeout)
	defer scriptCancel()
	scriptRemote := filepath.Join(remoteDir, scriptName)
	scriptRemote = strings.ReplaceAll(scriptRemote, "\\", "/")
	// restore-sudo runs first: it's a SUID root binary installed during provisioning
	// that restores sudo's ownership and setuid bit if a student broke it during a lab.
	// It's a no-op when sudo is already healthy. Silently ignored on older instances
	// that pre-date the binary (|| true).
	sshCmd := exec.CommandContext(scriptCtx, "ssh", append(sshBase,
		fmt.Sprintf("%s@%s", target.User, target.Hostname),
		fmt.Sprintf("chmod +x %s/%s && (/usr/local/bin/restore-sudo 2>/dev/null || true) && sudo bash %s", remoteDir, scriptName, scriptRemote),
	)...)
	if out, err := sshCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("run %s: %w\n%s", scriptName, err, string(out))
	}

	return nil
}

// RunCommand executes a single command and returns combined output.
func (c *Client) RunCommand(ctx context.Context, target Target, command string, timeout time.Duration) (string, error) {
	keyFile := ""
	if target.PrivateKey != "" {
		var err error
		keyFile, err = writeKeyFile(target.PrivateKey)
		if err != nil {
			return "", err
		}
		defer os.Remove(keyFile)
	}

	runCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	sshCmd := exec.CommandContext(runCtx, "ssh",
		append(c.sshBaseArgs(target.Hostname, keyFile),
			fmt.Sprintf("%s@%s", target.User, target.Hostname),
			command,
		)...,
	)
	out, err := sshCmd.CombinedOutput()
	return string(out), err
}

// CheckTunnelReachable verifies SSH connectivity through the tunnel.
func (c *Client) CheckTunnelReachable(ctx context.Context, target Target) error {
	_, err := c.RunCommand(ctx, target, "echo tunnel_ok", 90*time.Second)
	return err
}

// CopyToRemote copies a single file (utility).
func (c *Client) CopyToRemote(ctx context.Context, target Target, localPath, remotePath string) error {
	keyFile := ""
	if target.PrivateKey != "" {
		var err error
		keyFile, err = writeKeyFile(target.PrivateKey)
		if err != nil {
			return err
		}
		defer os.Remove(keyFile)
	}

	scpArgs := []string{
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "BatchMode=yes",
		"-o", fmt.Sprintf("ProxyCommand=%s", c.proxyCommand(target.Hostname)),
	}
	if keyFile != "" {
		scpArgs = append(scpArgs, "-i", keyFile)
	}
	scpArgs = append(scpArgs, localPath, fmt.Sprintf("%s@%s:%s", target.User, target.Hostname, remotePath))

	scpCmd := exec.CommandContext(ctx, "scp", scpArgs...)
	out, err := scpCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("scp: %w\n%s", err, string(out))
	}
	return nil
}

// DefaultUser returns the SSH user for lab VMs.
func DefaultUser() string {
	if u := os.Getenv("LAB_SSH_USER"); u != "" {
		return u
	}
	return "ubuntu"
}
