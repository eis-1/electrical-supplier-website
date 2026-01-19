# Start Script for Electrical Supplier Website (Development - Separate Ports)
# Frontend: http://localhost:5173  (Vite)
# Backend:  http://localhost:5000  (Express API)

$ErrorActionPreference = 'Stop'

# Ensure the script works even if executed from a different working directory
Set-Location -Path $PSScriptRoot

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ELECTRICAL SUPPLIER WEBSITE - DEV (SEPARATE PORTS)    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Starting development servers..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Frontend (Vite): http://localhost:5173" -ForegroundColor Cyan
Write-Host "📍 Backend (API):   http://localhost:5000/api/v1" -ForegroundColor Cyan
Write-Host "📍 Health Check:    http://localhost:5000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Runs backend + frontend together (root script uses concurrently)
npm run dev
