package jobs

// ProvisionEnvironmentArgs provisions infrastructure for a lab environment (24h lifetime).
type ProvisionEnvironmentArgs struct {
	JobID            string `json:"jobId"`
	EnvironmentID    string `json:"environmentId"`
	SessionID        string `json:"sessionId"`
	UserID           string `json:"userId"`
	LabSlug          string `json:"labSlug"`
	LabID            string `json:"labId"`
	DurableObjectID  string `json:"durableObjectId"`
	ScenarioID       string `json:"scenarioId,omitempty"`
	TerraformModule  string `json:"terraformModule"`
	CFTunnelToken    string `json:"cfTunnelToken"`
	TunnelID         string `json:"tunnelId,omitempty"`
	TunnelHostname   string `json:"tunnelHostname,omitempty"`
	StudentRegion    string `json:"studentRegion,omitempty"`
	Timestamp        int64  `json:"timestamp"`
}

func (ProvisionEnvironmentArgs) Kind() string {
	return "provision_environment"
}

// SwitchScenarioArgs swaps operational state on an existing environment.
type SwitchScenarioArgs struct {
	JobID           string `json:"jobId"`
	EnvironmentID   string `json:"environmentId"`
	SessionID       string `json:"sessionId"`
	UserID          string `json:"userId"`
	DurableObjectID string `json:"durableObjectId"`
	FromScenarioID  string `json:"fromScenarioId,omitempty"`
	ToScenarioID    string `json:"toScenarioId,omitempty"`
	TunnelHostname  string `json:"tunnelHostname,omitempty"`
	Timestamp       int64  `json:"timestamp"`
}

func (SwitchScenarioArgs) Kind() string {
	return "switch_scenario"
}

// TeardownEnvironmentArgs destroys environment infrastructure.
type TeardownEnvironmentArgs struct {
	EnvironmentID   string `json:"environmentId"`
	UserID          string `json:"userId"`
	SessionID       string `json:"sessionId,omitempty"`
	DurableObjectID string `json:"durableObjectId,omitempty"`
	Reason          string `json:"reason,omitempty"`
	Timestamp       int64  `json:"timestamp"`
}

func (TeardownEnvironmentArgs) Kind() string {
	return "teardown_environment"
}

// ExpireEnvironmentArgs is a scheduled job fired when environment TTL is reached.
type ExpireEnvironmentArgs struct {
	EnvironmentID string `json:"environmentId"`
	UserID        string `json:"userId"`
	Timestamp     int64  `json:"timestamp"`
}

func (ExpireEnvironmentArgs) Kind() string {
	return "expire_environment"
}

// ExpireSessionArgs is a scheduled job fired when a lab session's timeout_minutes is reached.
// It marks the session expired but leaves the environment running for future scenario switches.
type ExpireSessionArgs struct {
	SessionID string `json:"sessionId"`
	Timestamp int64  `json:"timestamp"`
}

func (ExpireSessionArgs) Kind() string {
	return "expire_session"
}
