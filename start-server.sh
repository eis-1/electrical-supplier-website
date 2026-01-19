#!/bin/bash

# Start Script for Electrical Supplier Website (Single Port)
# Runs everything on PORT 5000

set -e

# Ensure the script works even if executed from a different working directory
cd "$(cd "$(dirname "$0")" && pwd)"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  ELECTRICAL SUPPLIER WEBSITE - SINGLE PORT SETUP       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if frontend is built
if [ ! -d "frontend/dist" ]; then
    echo "⚠️  Frontend not built. Building now..."
    cd frontend
    npm run build
    cd ..
    echo "✅ Frontend built successfully!"
    echo ""
fi

echo "🚀 Starting server on PORT 5000..."
echo ""
echo "📍 Application URL: http://localhost:5000"
echo "📍 API Base URL:    http://localhost:5000/api/v1"
echo "📍 Admin Panel:     http://localhost:5000/admin/login"
echo "📍 Health Check:    http://localhost:5000/health"
echo ""
echo "🔐 Admin Credentials:"
echo "   Email:    admin@electricalsupplier.com"
echo "   Password: (set via SEED_ADMIN_PASSWORD)"
echo ""
echo "Press Ctrl+C to stop the server"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Start backend (serves both API and frontend)
cd backend
npm run dev
