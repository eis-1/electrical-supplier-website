# Start Script for Electrical Supplier Website (Single Port)
# Runs everything on PORT 5000

$ErrorActionPreference = 'Stop'

# Ensure the script works even if executed from a different working directory
Set-Location -Path $PSScriptRoot

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ELECTRICAL SUPPLIER WEBSITE - SINGLE PORT SETUP       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if frontend is built
if (-Not (Test-Path "frontend\dist")) {
    Write-Host "⚠️  Frontend not built. Building now..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    Set-Location ..
    Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🚀 Starting server on PORT 5000..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Application URL: http://localhost:5000" -ForegroundColor Cyan
Write-Host "📍 API Base URL:    http://localhost:5000/api/v1" -ForegroundColor Cyan
Write-Host "📍 Admin Panel:     http://localhost:5000/admin/login" -ForegroundColor Cyan
Write-Host "📍 Health Check:    http://localhost:5000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Email:    admin@electricalsupplier.com"
Write-Host "   Password: (set via SEED_ADMIN_PASSWORD)"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Start backend (serves both API and frontend)
Set-Location backend
npm run dev
