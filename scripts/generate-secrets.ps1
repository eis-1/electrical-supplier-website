# Production Secrets Generator
# Generates strong random secrets for production deployment

Write-Host "=== Production Secrets Generator ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy these values to your production .env file"
Write-Host "NEVER commit these secrets to version control!" -ForegroundColor Red
Write-Host ""
Write-Host "-------------------------------------------"
Write-Host ""

function Get-RandomSecret {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

Write-Host "# JWT Secrets (Keep these private!)" -ForegroundColor Yellow
Write-Host "JWT_SECRET=$(Get-RandomSecret 32)"
Write-Host "JWT_REFRESH_SECRET=$(Get-RandomSecret 32)"
Write-Host "COOKIE_SECRET=$(Get-RandomSecret 32)"
Write-Host ""

Write-Host "# Admin Password (CHANGE DEFAULT IMMEDIATELY)" -ForegroundColor Yellow
Write-Host "# Set SEED_ADMIN_PASSWORD to a strong value (do not commit it)"
Write-Host "# Generate bcrypt hash:"
Write-Host "#   cd backend"
Write-Host "#   node -e `"const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 12).then(console.log)`""
Write-Host ""

Write-Host "# Database Password (if using PostgreSQL)" -ForegroundColor Yellow
$dbPass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
Write-Host "DB_PASSWORD=$dbPass"
Write-Host ""

Write-Host ""
Write-Host "-------------------------------------------"
Write-Host ""
Write-Host "WARNING: SECURITY CHECKLIST:" -ForegroundColor Yellow
Write-Host "1. Store secrets in secure password manager"
Write-Host "2. Use different secrets for each environment"
Write-Host "3. Rotate secrets regularly (every 90 days)"
Write-Host "4. Never share secrets via email/chat"
Write-Host "5. Use environment variables or secret management service"
Write-Host ""
Write-Host "See PRODUCTION_SETUP.md for complete deployment guide" -ForegroundColor Cyan

