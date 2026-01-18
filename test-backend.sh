#!/bin/bash

echo "========================================"
echo "Backend Server Diagnostic Tool"
echo "========================================"
echo ""

PORT=${PORT:-5000}

echo "[1/5] Checking if server is running..."
if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "   ✓ Server is responding on port $PORT"
else
    echo "   ✗ Server not responding. Please start with: cd backend && npm run dev"
    exit 1
fi

echo ""
echo "[2/5] Testing Health Endpoint..."
curl -s http://localhost:$PORT/health | python -m json.tool 2>/dev/null || curl -s http://localhost:$PORT/health
echo ""

echo ""
echo "[3/5] Testing Categories Endpoint..."
curl -s "http://localhost:$PORT/api/v1/categories?limit=2" | python -m json.tool 2>/dev/null || curl -s "http://localhost:$PORT/api/v1/categories?limit=2"
echo ""

echo ""
echo "[4/5] Bootstrapping default admin (no public registration)..."
(cd backend && node setup-admin.js) || true
echo ""

echo ""
echo "[5/5] Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@electricalsupplier.com\",\"password\":\"admin123\"}")
echo "$LOGIN_RESPONSE" | python -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token if successful
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$TOKEN" ]; then
    echo ""
    echo "   ✓ Login successful! Token received."
    echo "   Token: ${TOKEN:0:50}..."
fi

echo ""
echo "========================================"
echo "Testing Complete!"
echo "========================================"
echo ""
echo "Server is running at: http://localhost:$PORT"
echo "API Base URL: http://localhost:$PORT/api/v1"
echo "Health Check: http://localhost:$PORT/health"
echo ""
