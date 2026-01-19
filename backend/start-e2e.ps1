# PowerShell version of start-e2e script for Windows
# This builds the frontend and starts the backend dev server

$ErrorActionPreference = "Stop"

Write-Host "Building frontend..." -ForegroundColor Cyan

# Build frontend
Set-Location ../frontend
$buildProcess = Start-Process -FilePath "npm" -ArgumentList "run", "build" -NoNewWindow -PassThru -Wait

if ($buildProcess.ExitCode -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit $buildProcess.ExitCode
}

# Verify dist exists
$distPath = Join-Path $PSScriptRoot "..\frontend\dist\index.html"
if (-not (Test-Path $distPath)) {
    Write-Host "Error: Frontend dist not found at $distPath" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend built successfully!" -ForegroundColor Green
Write-Host "Starting backend dev server..." -ForegroundColor Cyan

# Return to backend directory and start dev server
Set-Location ../backend
& npm run dev
