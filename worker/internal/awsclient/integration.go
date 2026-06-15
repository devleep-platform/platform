package awsclient

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// FetchIntegration loads verified AWS integration for a user from PostgreSQL.
func FetchIntegration(ctx context.Context, db *pgxpool.Pool, userID string) (*Integration, error) {
	var roleARN, externalID, region string
	err := db.QueryRow(ctx, `
		SELECT role_arn, external_id, region
		FROM aws_integrations
		WHERE user_id = $1 AND verified_at IS NOT NULL
	`, userID).Scan(&roleARN, &externalID, &region)
	if err != nil {
		return nil, fmt.Errorf("fetch aws integration for user %s: %w", userID, err)
	}

	return &Integration{
		RoleARN:    roleARN,
		ExternalID: externalID,
		Region:     region,
	}, nil
}
