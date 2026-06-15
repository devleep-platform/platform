package jobs

// TeardownArgs defines the arguments for a legacy per-session teardown job.
type TeardownArgs struct {
	SessionID       string `json:"sessionId"`
	UserID          string `json:"userId"`
	DurableObjectID string `json:"durableObjectId"`
	Timestamp       int64  `json:"timestamp"`
}

// Kind implements river.Job interface
func (t TeardownArgs) Kind() string {
	return "teardown"
}
