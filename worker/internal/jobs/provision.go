package jobs

// ProvisionArgs defines the arguments for a provisioning job
type ProvisionArgs struct {
	JobID           string `json:"jobId"`
	SessionID       string `json:"sessionId"`
	UserID          string `json:"userId"`
	LabSlug         string `json:"labSlug"`
	LabID           string `json:"labId"`
	DurableObjectID string `json:"durableObjectId"`
	ScenarioID      string `json:"scenarioId,omitempty"`
	AWSRoleArn      string `json:"awsRoleArn,omitempty"`
	AWSExternalID   string `json:"awsExternalId,omitempty"`
	AWSRegion       string `json:"awsRegion"`
	TerraformModule string `json:"terraformModule"`
	CFTunnelToken   string `json:"cfTunnelToken"`
	Timestamp       int64  `json:"timestamp"`
}

// Kind implements river.Job interface
func (p ProvisionArgs) Kind() string {
	return "provision"
}
