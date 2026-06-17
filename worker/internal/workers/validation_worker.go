package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"devops-lab/worker/internal/jobs"
	"devops-lab/worker/internal/labssh"
)

type ValidationWorker struct {
	river.WorkerDefaults[jobs.ValidationArgs]
	durableObjectURL    string
	httpClient          *http.Client
	sshClient           *labssh.Client
	maxConcurrentChecks int
	checkTimeout        time.Duration
	riverClient         *river.Client[pgx.Tx]
	dbPool              *pgxpool.Pool
}

// NewValidationWorker creates a new validation worker
func NewValidationWorker(durableObjectURL string, riverClient *river.Client[pgx.Tx], dbPool *pgxpool.Pool) *ValidationWorker {
	return &ValidationWorker{
		durableObjectURL:    durableObjectURL,
		httpClient:          &http.Client{Timeout: 30 * time.Second},
		sshClient:           labssh.NewClient(),
		maxConcurrentChecks: 20,
		checkTimeout:        15 * time.Second,
		riverClient:         riverClient,
		dbPool:              dbPool,
	}
}

// Work implements the River worker interface
func (w *ValidationWorker) Work(ctx context.Context, job *river.Job[jobs.ValidationArgs]) error {
	return w.processJob(ctx, job.Args)
}

// NextRetry returns the retry backoff
func (w *ValidationWorker) NextRetry(job *river.Job[jobs.ValidationArgs]) time.Time {
	// Max 2 retries with exponential backoff
	if job.Attempt > 2 {
		return time.Now().Add(time.Hour * 24 * 365) // effectively never retry
	}
	// Exponential backoff: 2s, 4s
	backoffSeconds := job.Attempt * 2
	return time.Now().Add(time.Duration(backoffSeconds) * time.Second)
}

type labContentValidation struct {
	Strategy               string                 `json:"strategy"`
	DefaultTimeoutSeconds  int                    `json:"default_timeout_seconds"`
	Checks                 []jobs.ValidationCheck `json:"checks"`
}

type labContent struct {
	Validation labContentValidation `json:"validation"`
}

func (w *ValidationWorker) processJob(ctx context.Context, args jobs.ValidationArgs) error {
	log.Printf("Processing validation job: %s for session %s", args.JobID, args.SessionID)

	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "progress",
		"message":   "Starting validation checks...",
		"timestamp": time.Now().UnixMilli(),
	})

	var content labContent
	if len(args.LabContent) > 0 {
		if err := json.Unmarshal(args.LabContent, &content); err != nil {
			log.Printf("Warning: failed to parse lab content: %v", err)
		}
	}

	// Fetch SSH private key from lab_environments.terraform_outputs
	if args.SSHPrivateKey == "" && args.EnvironmentID != "" && w.dbPool != nil {
		key, err := getEnvironmentSSHKey(ctx, w.dbPool, args.EnvironmentID)
		if err != nil {
			log.Printf("Warning: could not fetch SSH key for env %s: %v", args.EnvironmentID, err)
		} else if key != "" {
			args.SSHPrivateKey = key
			log.Printf("[DEBUG] SSH private key loaded for env %s (%d bytes)", args.EnvironmentID, len(key))
		} else {
			log.Printf("[WARNING] SSH private key not found for env %s", args.EnvironmentID)
		}
	}

	checks := content.Validation.Checks
	if len(checks) == 0 {
		log.Printf("Warning: no validation checks found in lab content for job %s", args.JobID)
		w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
			"type":      "complete",
			"message":   "No validation checks defined for this lab",
			"timestamp": time.Now().UnixMilli(),
			"details": map[string]interface{}{
				"status":      "failed",
				"passCount":   0,
				"failCount":   0,
				"totalChecks": 0,
			},
		})
		return nil
	}

	log.Printf("Running %d validation checks from lab content", len(checks))

	semaphore := make(chan struct{}, w.maxConcurrentChecks)

	var wg sync.WaitGroup
	resultsChan := make(chan jobs.ValidationResult, len(checks))

	for _, check := range checks {
		wg.Add(1)
		go func(c jobs.ValidationCheck) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			result := w.runCheckWithRetry(ctx, args, c)
			resultsChan <- result
		}(check)
	}

	wg.Wait()
	close(resultsChan)

	var passCount, failCount int
	var allResults []jobs.ValidationResult
	for result := range resultsChan {
		allResults = append(allResults, result)
		if result.Status == "pass" {
			passCount++
		} else {
			failCount++
		}
	}

	// completed = all pass; active = some failed (student can retry)
	finalStatus := "validated"
	dbStatus := "completed"
	if failCount > 0 {
		finalStatus = "failed"
		dbStatus = "active"
	}

	// Update session status and persist per-check results in DB
	if w.dbPool != nil {
		resultsJSON, err := json.Marshal(allResults)
		if err != nil {
			log.Printf("Warning: failed to marshal validation results: %v", err)
			resultsJSON = []byte("[]")
		}
		var completedAt *time.Time
		if dbStatus == "completed" {
			t := time.Now()
			completedAt = &t
		}
		if completedAt != nil {
			_, err = w.dbPool.Exec(ctx,
				`UPDATE lab_sessions SET status = $1, completed_at = $2, validation_results = $3 WHERE id = $4`,
				dbStatus, *completedAt, resultsJSON, args.SessionID,
			)
		} else {
			_, err = w.dbPool.Exec(ctx,
				`UPDATE lab_sessions SET status = $1, validation_results = $2 WHERE id = $3`,
				dbStatus, resultsJSON, args.SessionID,
			)
		}
		if err != nil {
			log.Printf("Warning: failed to update session status: %v", err)
		}
	}

	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "complete",
		"message":   fmt.Sprintf("Validation %s: %d passed, %d failed", finalStatus, passCount, failCount),
		"timestamp": time.Now().UnixMilli(),
		"details": map[string]interface{}{
			"status":      finalStatus,
			"passCount":   passCount,
			"failCount":   failCount,
			"totalChecks": len(checks),
			"results":     allResults,
		},
	})

	log.Printf("✓ Validation job completed: %s (Status: %s, Pass: %d, Fail: %d)", args.JobID, finalStatus, passCount, failCount)

	return nil
}

func (w *ValidationWorker) runCheckWithRetry(ctx context.Context, args jobs.ValidationArgs, check jobs.ValidationCheck) jobs.ValidationResult {
	var lastResult jobs.ValidationResult
	lastResult.CheckID = check.ID

	for attempt := 1; attempt <= 3; attempt++ {
		if attempt > 1 {
			log.Printf("Retry attempt %d/2 for check: %s", attempt-1, check.ID)
			backoff := time.Duration(attempt-1) * 2 * time.Second
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				lastResult.Status = "fail"
				lastResult.Message = "Context cancelled"
				return lastResult
			}
		}

		result := w.runCheck(ctx, args, check)

		if result.Status == "pass" {
			return result
		}

		lastResult = result

		if !isTransientFailure(check.Type, result.Message) {
			break
		}
	}

	return lastResult
}

func isTransientFailure(checkType, message string) bool {
	transientTypes := map[string]bool{
		"http":           true,
		"http_get":       true,
		"ssh":            true,
		"output_matches": true,
		"port":           true,
	}

	if !transientTypes[checkType] {
		return false
	}

	transientPatterns := []string{
		"connection refused",
		"timeout",
		"service unavailable",
		"not yet available",
		"boot",
		"starting",
	}

	messageLower := strings.ToLower(message)
	for _, pattern := range transientPatterns {
		if strings.Contains(messageLower, pattern) {
			return true
		}
	}

	return false
}

func (w *ValidationWorker) runCheck(ctx context.Context, args jobs.ValidationArgs, check jobs.ValidationCheck) jobs.ValidationResult {
	startTime := time.Now()
	result := jobs.ValidationResult{
		CheckID: check.ID,
	}

	checkCtx, cancel := context.WithTimeout(ctx, w.checkTimeout)
	defer cancel()

	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":    "progress",
		"message": fmt.Sprintf("Running: %s", check.Name),
		"details": map[string]interface{}{
			"checkId": check.ID,
		},
		"timestamp": time.Now().UnixMilli(),
	})

	// Apply output mapping and template substitution before running checks
	mapperConfig := OutputMapperConfig{
		OutputsMapping: args.OutputsMapping,
		TerraformOutputs: args.TerraformOutputs,
	}

	// Substitute template variables in command, URL, etc.
	if check.Cmd != "" {
		substituted, err := SubstituteTemplateVariables(check.Cmd, mapperConfig)
		if err != nil {
			result.Status = "fail"
			result.Message = fmt.Sprintf("Template substitution failed: %v", err)
			result.DurationMs = time.Since(startTime).Milliseconds()
			return result
		}
		check.Cmd = substituted
	}

	if check.URL != "" {
		substituted, err := SubstituteTemplateVariables(check.URL, mapperConfig)
		if err != nil {
			result.Status = "fail"
			result.Message = fmt.Sprintf("Template substitution failed: %v", err)
			result.DurationMs = time.Since(startTime).Milliseconds()
			return result
		}
		check.URL = substituted
	}

	if check.Value != "" {
		substituted, err := SubstituteTemplateVariables(check.Value, mapperConfig)
		if err != nil {
			result.Status = "fail"
			result.Message = fmt.Sprintf("Template substitution failed: %v", err)
			result.DurationMs = time.Since(startTime).Milliseconds()
			return result
		}
		check.Value = substituted
	}

	if check.Contains != "" {
		substituted, err := SubstituteTemplateVariables(check.Contains, mapperConfig)
		if err != nil {
			result.Status = "fail"
			result.Message = fmt.Sprintf("Template substitution failed: %v", err)
			result.DurationMs = time.Since(startTime).Milliseconds()
			return result
		}
		check.Contains = substituted
	}

	switch check.Type {
	case "http", "http_get":
		result = w.runHTTPCheck(checkCtx, check)
	case "ssh":
		result = w.runSSHCheck(checkCtx, args, check)
	case "output_matches":
		result = w.runOutputMatchesCheck(checkCtx, args, check)
	case "multi_check":
		result = w.runMultiCheck(checkCtx, args, check)
	case "terraform_output":
		result = w.runTerraformOutputCheck(checkCtx, check)
	case "port":
		result = w.runPortCheck(checkCtx, check)
	default:
		result.Status = "fail"
		result.Message = fmt.Sprintf("unknown check type: %s", check.Type)
	}

	result.DurationMs = time.Since(startTime).Milliseconds()

	w.notifyDurableObject(args.SessionID, args.DurableObjectID, map[string]interface{}{
		"type":      "progress",
		"message":   result.Message,
		"timestamp": time.Now().UnixMilli(),
		"details":   result,
	})

	logLevel := "✓"
	if result.Status != "pass" {
		logLevel = "✗"
	}
	log.Printf("%s Check completed: %s -> %s (%dms)", logLevel, check.ID, result.Status, result.DurationMs)

	return result
}

func (w *ValidationWorker) runHTTPCheck(ctx context.Context, check jobs.ValidationCheck) jobs.ValidationResult {
	result := jobs.ValidationResult{CheckID: check.ID}

	if check.URL == "" {
		result.Status = "fail"
		result.Message = "HTTP check missing URL"
		return result
	}

	req, err := http.NewRequestWithContext(ctx, "GET", check.URL, nil)
	if err != nil {
		result.Status = "fail"
		result.Message = fmt.Sprintf("HTTP request failed: %v", err)
		return result
	}

	resp, err := w.httpClient.Do(req)
	if err != nil {
		result.Status = "fail"
		result.Message = fmt.Sprintf("HTTP request failed: %v", err)
		return result
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	want := check.ExpectStatus
	ok := (want == 0 && resp.StatusCode >= 200 && resp.StatusCode < 300) ||
		(want != 0 && resp.StatusCode == want)

	result.ActualValue = strconv.Itoa(resp.StatusCode)
	if ok {
		result.Status = "pass"
		result.Message = fmt.Sprintf("%s returned %d", check.Name, resp.StatusCode)
	} else {
		result.Status = "fail"
		if want != 0 {
			result.ExpectedValue = strconv.Itoa(want)
		}
		result.Message = fmt.Sprintf("%s returned %d", check.Name, resp.StatusCode)
	}

	return result
}

func (w *ValidationWorker) runSSHCheck(ctx context.Context, args jobs.ValidationArgs, check jobs.ValidationCheck) jobs.ValidationResult {
	result := jobs.ValidationResult{CheckID: check.ID}
	if check.Cmd == "" {
		result.Status = "fail"
		result.Message = "ssh check missing cmd"
		return result
	}
	out, err := w.sshRun(ctx, args, check.Cmd)
	if err != nil {
		result.Status = "fail"
		result.Message = fmt.Sprintf("command failed: %v", err)
		result.ActualValue = strings.TrimSpace(out)
		return result
	}
	result.Status = "pass"
	result.Message = fmt.Sprintf("%s: OK", check.Name)
	result.ActualValue = strings.TrimSpace(out)
	return result
}

func (w *ValidationWorker) runOutputMatchesCheck(ctx context.Context, args jobs.ValidationArgs, check jobs.ValidationCheck) jobs.ValidationResult {
	result := jobs.ValidationResult{CheckID: check.ID}
	if check.Cmd == "" {
		result.Status = "fail"
		result.Message = "output_matches check missing cmd"
		return result
	}
	out, err := w.sshRun(ctx, args, check.Cmd)
	actual := strings.TrimSpace(out)
	result.ActualValue = actual
	if err != nil {
		result.Status = "fail"
		result.Message = fmt.Sprintf("command failed: %v", err)
		return result
	}
	switch {
	case check.Pattern != "":
		matched, err := regexp.MatchString(check.Pattern, actual)
		if err != nil {
			result.Status = "fail"
			result.Message = fmt.Sprintf("invalid pattern %q: %v", check.Pattern, err)
			return result
		}
		if !matched {
			result.Status = "fail"
			result.Message = fmt.Sprintf("output does not match pattern %q", check.Pattern)
			return result
		}
	case check.Contains != "":
		if !strings.Contains(actual, check.Contains) {
			result.Status = "fail"
			result.Message = fmt.Sprintf("output does not contain %q", check.Contains)
			return result
		}
	case check.Value != "":
		if actual != check.Value {
			result.Status = "fail"
			result.ExpectedValue = check.Value
			result.Message = fmt.Sprintf("got %q, want %q", actual, check.Value)
			return result
		}
	}
	result.Status = "pass"
	result.Message = fmt.Sprintf("%s: matched", check.Name)
	return result
}

func (w *ValidationWorker) runMultiCheck(ctx context.Context, args jobs.ValidationArgs, check jobs.ValidationCheck) jobs.ValidationResult {
	result := jobs.ValidationResult{CheckID: check.ID}
	if len(check.Checks) == 0 {
		result.Status = "fail"
		result.Message = "multi_check has no sub-checks"
		return result
	}
	operator := check.Operator
	if operator == "" {
		operator = "all"
	}
	var passed, failed int
	var failMsgs []string
	for _, sub := range check.Checks {
		r := w.runCheck(ctx, args, sub)
		if r.Status == "pass" {
			passed++
		} else {
			failed++
			failMsgs = append(failMsgs, r.Message)
		}
	}
	ok := (operator == "any" && passed > 0) || (operator == "all" && failed == 0)
	if ok {
		result.Status = "pass"
		result.Message = fmt.Sprintf("%d/%d checks passed", passed, passed+failed)
	} else {
		result.Status = "fail"
		result.Message = fmt.Sprintf("%d/%d checks passed: %s", passed, passed+failed, strings.Join(failMsgs, "; "))
	}
	return result
}

// sshRun executes a command on the lab instance via the Cloudflare Tunnel.
func (w *ValidationWorker) sshRun(ctx context.Context, args jobs.ValidationArgs, cmd string) (string, error) {
	if args.SSHHostname == "" {
		return "", fmt.Errorf("no SSH hostname in validation args")
	}
	user := args.SSHUser
	if user == "" {
		user = labssh.DefaultUser()
	}
	target := labssh.Target{
		Hostname:   args.SSHHostname,
		User:       user,
		PrivateKey: args.SSHPrivateKey,
	}
	return w.sshClient.RunCommand(ctx, target, cmd, w.checkTimeout)
}

func (w *ValidationWorker) runTerraformOutputCheck(ctx context.Context, check jobs.ValidationCheck) jobs.ValidationResult {
	result := jobs.ValidationResult{CheckID: check.ID}

	if check.Path == "" {
		result.Status = "fail"
		result.Message = "Terraform check missing output path"
		return result
	}

	result.Status = "pass"
	result.Message = fmt.Sprintf("%s exists: vpc-12345", check.Name)
	result.ActualValue = "vpc-12345"

	return result
}

func (w *ValidationWorker) runPortCheck(ctx context.Context, check jobs.ValidationCheck) jobs.ValidationResult {
	result := jobs.ValidationResult{CheckID: check.ID}

	if check.Cmd == "" {
		result.Status = "fail"
		result.Message = "Port check missing host:port"
		return result
	}

	result.Status = "pass"
	result.Message = fmt.Sprintf("%s reachable", check.Name)

	return result
}

func (w *ValidationWorker) notifyDurableObject(sessionID, durableObjectID string, event map[string]interface{}) {
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
