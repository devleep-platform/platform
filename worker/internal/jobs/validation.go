package jobs

import "encoding/json"

// ValidationArgs defines the arguments for a validation job
type ValidationArgs struct {
	JobID           string                 `json:"jobId"`
	SessionID       string                 `json:"sessionId"`
	UserID          string                 `json:"userId"`
	LabID           string                 `json:"labId"`
	DurableObjectID string                 `json:"durableObjectId"`
	LabContent      json.RawMessage        `json:"labContent"`           // JSONB from lab_definitions.content
	OutputsMapping  map[string]string      `json:"outputsMapping"`       // JSONB from lab_definitions.outputs_mapping
	TerraformOutputs map[string]interface{} `json:"terraformOutputs"`    // From lab_sessions.terraform_outputs
	Timestamp        int64                  `json:"timestamp"`
	SSHHostname      string                 `json:"sshHostname,omitempty"`
	SSHUser          string                 `json:"sshUser,omitempty"`
	SSHPrivateKey    string                 `json:"sshPrivateKey,omitempty"`
	EnvironmentID    string                 `json:"environmentId,omitempty"`
}

// Kind implements river.Job interface
func (v ValidationArgs) Kind() string {
	return "validation"
}

// ValidationCheck defines a single validation check.
// Type values: "ssh", "http"/"http_get", "output_matches", "terraform_output", "port", "multi_check"
type ValidationCheck struct {
	ID           string            `json:"id"`
	Type         string            `json:"type"`
	Name         string            `json:"name"`
	Cmd          string            `json:"cmd,omitempty"`
	URL          string            `json:"url,omitempty"`
	Path         string            `json:"path,omitempty"`
	Value        string            `json:"value,omitempty"`
	Contains     string            `json:"contains,omitempty"`
	Pattern      string            `json:"pattern,omitempty"`
	ExpectStatus int               `json:"expectStatus,omitempty"`
	Operator     string            `json:"operator,omitempty"`
	Checks       []ValidationCheck `json:"checks,omitempty"`
	FailureHint  string            `json:"failure_hint,omitempty"`
}

// ValidationResult tracks the result of a single check
type ValidationResult struct {
	CheckID       string `json:"checkId"`
	Status        string `json:"status"` // "pass" or "fail"
	Message       string `json:"message"`
	DurationMs    int64  `json:"durationMs"`
	ExpectedValue string `json:"expectedValue,omitempty"`
	ActualValue   string `json:"actualValue,omitempty"`
}
