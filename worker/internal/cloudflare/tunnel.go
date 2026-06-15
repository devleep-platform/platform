package cloudflare

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const cfAPIBase = "https://api.cloudflare.com/client/v4"

// cfHTTPClient is configured with a generous timeout for Cloudflare API calls
var cfHTTPClient = &http.Client{
	Timeout: 60 * time.Second,
}

type apiResponse struct {
	Success bool            `json:"success"`
	Errors  []apiError      `json:"errors"`
	Result  json.RawMessage `json:"result"`
}

type apiError struct {
	Message string `json:"message"`
}

type tunnelConnection struct {
	ID   string `json:"id"`
	UUID string `json:"uuid"`
}

// WaitForTunnelHealthy polls until the tunnel has an active connector or timeout.
func WaitForTunnelHealthy(ctx context.Context, tunnelID string, timeout time.Duration) error {
	if tunnelID == "" {
		return fmt.Errorf("tunnel ID is empty")
	}
	if os.Getenv("CLOUDFLARE_API_TOKEN") == "" {
		return fmt.Errorf("CLOUDFLARE_API_TOKEN not set")
	}

	deadline := time.Now().Add(timeout)
	interval := 5 * time.Second

	for time.Now().Before(deadline) {
		conns, err := listTunnelConnections(ctx, tunnelID)
		if err != nil {
			return err
		}
		if len(conns) > 0 {
			return nil
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(interval):
		}
	}

	return fmt.Errorf("tunnel %s did not become healthy within %s", tunnelID, timeout)
}

func listTunnelConnections(ctx context.Context, tunnelID string) ([]tunnelConnection, error) {
	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	if accountID == "" {
		return nil, fmt.Errorf("CLOUDFLARE_ACCOUNT_ID not set")
	}

	url := fmt.Sprintf("%s/accounts/%s/cfd_tunnel/%s/connections", cfAPIBase, accountID, tunnelID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("CLOUDFLARE_API_TOKEN"))

	resp, err := cfHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var parsed apiResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Success {
		return nil, fmt.Errorf("cloudflare API: %s", string(body))
	}

	var conns []tunnelConnection
	if err := json.Unmarshal(parsed.Result, &conns); err != nil {
		return nil, err
	}
	return conns, nil
}

// DeleteTunnel removes a Cloudflare tunnel by ID.
func DeleteTunnel(ctx context.Context, tunnelID string) error {
	if tunnelID == "" || os.Getenv("CLOUDFLARE_API_TOKEN") == "" {
		return nil
	}
	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	if accountID == "" {
		return nil
	}

	url := fmt.Sprintf("%s/accounts/%s/cfd_tunnel/%s", cfAPIBase, accountID, tunnelID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("CLOUDFLARE_API_TOKEN"))

	resp, err := cfHTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}
