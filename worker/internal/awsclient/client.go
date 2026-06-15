package awsclient

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sts"
)

const defaultSessionDurationSeconds int32 = 3600

// TemporaryCredentials are in-memory only; never persist to the database.
type TemporaryCredentials struct {
	AccessKeyID     string
	SecretAccessKey string
	SessionToken    string
}

// Integration holds a student's cross-account trust configuration.
type Integration struct {
	RoleARN    string
	ExternalID string
	Region     string
}

// NewPlatformSTSClient uses platform IAM user credentials from the environment.
// Fails fast if credentials are missing — they MUST be provided for cross-account role assumption.
func NewPlatformSTSClient(ctx context.Context, region string) (*sts.Client, error) {
	accessKey := os.Getenv("AWS_PLATFORM_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_PLATFORM_SECRET_ACCESS_KEY")

	// Credentials are required — never fall back to default chain (which tries EC2 IMDS)
	if accessKey == "" {
		return nil, fmt.Errorf("AWS_PLATFORM_ACCESS_KEY_ID is not set — check Container App environment variables")
	}
	if secretKey == "" {
		return nil, fmt.Errorf("AWS_PLATFORM_SECRET_ACCESS_KEY is not set — check Container App environment variables")
	}

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKey, secretKey, "",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("load AWS config with platform credentials: %w", err)
	}

	return sts.NewFromConfig(cfg), nil
}

// RoleSessionName builds an auditable session name for CloudTrail.
func RoleSessionName(operation, sessionID string) string {
	shortID := sessionID
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}
	return fmt.Sprintf("devops-lab-%s-%s", operation, shortID)
}

// AssumeStudentRole assumes the student's role with a fresh 1-hour session per operation.
func AssumeStudentRole(
	ctx context.Context,
	integration Integration,
	operation string,
	sessionID string,
) (*TemporaryCredentials, error) {
	if integration.RoleARN == "" {
		return nil, fmt.Errorf("student role ARN is not configured")
	}
	if integration.ExternalID == "" {
		return nil, fmt.Errorf("student external ID is not configured")
	}

	region := integration.Region
	if region == "" {
		region = os.Getenv("AWS_REGION")
	}
	if region == "" {
		region = "ap-south-1"
	}

	stsClient, err := NewPlatformSTSClient(ctx, region)
	if err != nil {
		return nil, err
	}

	sessionName := RoleSessionName(operation, sessionID)
	result, err := stsClient.AssumeRole(ctx, &sts.AssumeRoleInput{
		RoleArn:         aws.String(integration.RoleARN),
		ExternalId:      aws.String(integration.ExternalID),
		RoleSessionName: aws.String(sessionName),
		DurationSeconds: aws.Int32(defaultSessionDurationSeconds),
	})
	if err != nil {
		return nil, fmt.Errorf("sts assume role: %w", err)
	}

	if result.Credentials == nil {
		return nil, fmt.Errorf("sts assume role returned no credentials")
	}

	return &TemporaryCredentials{
		AccessKeyID:     aws.ToString(result.Credentials.AccessKeyId),
		SecretAccessKey: aws.ToString(result.Credentials.SecretAccessKey),
		SessionToken:    aws.ToString(result.Credentials.SessionToken),
	}, nil
}

// BuildOpenTofuEnv returns environment variables for OpenTofu subprocesses.
func BuildOpenTofuEnv(region string, creds *TemporaryCredentials) []string {
	env := os.Environ()
	clean := make([]string, 0, len(env))
	for _, e := range env {
		if len(e) >= 4 && (e[:4] == "AWS_" || (len(e) >= 3 && e[:3] == "TF_")) {
			continue
		}
		clean = append(clean, e)
	}

	if creds != nil && creds.AccessKeyID != "" {
		clean = append(clean,
			fmt.Sprintf("AWS_ACCESS_KEY_ID=%s", creds.AccessKeyID),
			fmt.Sprintf("AWS_SECRET_ACCESS_KEY=%s", creds.SecretAccessKey),
		)
		if creds.SessionToken != "" {
			clean = append(clean, fmt.Sprintf("AWS_SESSION_TOKEN=%s", creds.SessionToken))
		}
	}

	if region == "" {
		region = "ap-south-1"
	}
	clean = append(clean,
		fmt.Sprintf("AWS_DEFAULT_REGION=%s", region),
		"TF_IN_AUTOMATION=true",
	)

	return clean
}
