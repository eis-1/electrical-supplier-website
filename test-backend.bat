@echo off
echo ========================================
echo Backend Server Diagnostic Tool
echo ========================================
echo.

set PORT=5000

echo [1/5] Checking if server is running...
curl -s http://localhost:%PORT%/health > nul 2>&1
if %errorlevel% equ 0 (
  echo    ✓ Server is responding on port %PORT%
) else (
    echo    ✗ Server not responding. Starting server...
    cd /d "%~dp0backend"
    start /B npm run dev
    timeout /t 5 /nobreak > nul
)

echo.
echo [2/5] Testing Health Endpoint...
curl -s http://localhost:%PORT%/health
echo.

echo.
echo [3/5] Testing Categories Endpoint...
curl -s http://localhost:%PORT%/api/v1/categories?limit=2
echo.

echo.
echo [4/5] Bootstrapping default admin (no public registration)...
cd /d "%~dp0backend"
node setup-admin.js
echo.

echo.
echo [5/5] Testing Login...
if "%ADMIN_PASSWORD%"=="" (
  if "%SEED_ADMIN_PASSWORD%"=="" (
    echo    Skipping login test (set ADMIN_PASSWORD or SEED_ADMIN_PASSWORD)
  ) else (
    curl -s -X POST http://localhost:%PORT%/api/v1/auth/login ^
      -H "Content-Type: application/json" ^
      -d "{\"email\":\"admin@electricalsupplier.com\",\"password\":\"%SEED_ADMIN_PASSWORD%\"}"
  )
) else (
  curl -s -X POST http://localhost:%PORT%/api/v1/auth/login ^
    -H "Content-Type: application/json" ^
    -d "{\"email\":\"admin@electricalsupplier.com\",\"password\":\"%ADMIN_PASSWORD%\"}"
)
echo.

echo.
echo ========================================
echo Testing Complete!
echo ========================================
echo.
echo Server is running at: http://localhost:%PORT%
echo API Base URL: http://localhost:%PORT%/api/v1
echo Health Check: http://localhost:%PORT%/health
echo.
pause
