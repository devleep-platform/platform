#!/bin/bash
# test-api.sh - Test all backend endpoints

API_URL="http://localhost:3001"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="TestPassword123"

echo "🧪 Testing DevOps Lab Platform API"
echo "=================================="
echo ""

# Health check
echo "1️⃣  Health Check..."
curl -s "$API_URL/health" | jq . || echo "❌ Failed"
echo ""

# Register
echo "2️⃣  Register User..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"Test User\"
  }")

echo "$REGISTER_RESPONSE" | jq .
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✓ Token: $TOKEN"
echo ""

# Get current user
echo "3️⃣  Get Current User..."
curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# List labs
echo "4️⃣  List Labs..."
curl -s "$API_URL/labs" | jq .
echo ""

# Initiate AWS integration (requires token)
echo "5️⃣  Initiate AWS Integration..."
curl -s -X POST "$API_URL/aws/initiate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_arn": "arn:aws:iam::123456789012:role/DevopsLabRole",
    "region": "ap-south-1"
  }' | jq .
echo ""

echo "✅ API tests completed!"
