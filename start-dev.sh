#!/bin/bash

# Start Script for Electrical Supplier Website (Development - Separate Ports)
# Frontend: http://localhost:5173  (Vite)
# Backend:  http://localhost:5000  (Express API)

set -e

# Ensure the script works even if executed from a different working directory
cd "$(cd "$(dirname "$0")" && pwd)"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  ELECTRICAL SUPPLIER WEBSITE - DEV (SEPARATE PORTS)    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "🚀 Starting development servers..."
echo ""
echo "📍 Frontend (Vite): http://localhost:5173"
echo "📍 Backend (API):   http://localhost:5000/api/v1"
echo "📍 Health Check:    http://localhost:5000/health"
echo ""
echo "Press Ctrl+C to stop"
echo "═══════════════════════════════════════════════════════════"
echo ""

npm run dev
