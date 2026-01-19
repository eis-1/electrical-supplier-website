# Cleanup script for Windows - kills processes on port 5000 and orphaned node processes

Write-Host "Cleaning up processes..." -ForegroundColor Cyan

# Kill processes using port 5000
$port = 5000
$processIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processIds) {
    foreach ($pid in $processIds) {
        Write-Host "Killing process $pid on port $port" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host "No processes found on port $port" -ForegroundColor Green
}

# Kill orphaned tsx/node processes
$tsxProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*tsx*" -or $_.CommandLine -like "*playwright*" }

if ($tsxProcesses) {
    foreach ($proc in $tsxProcesses) {
        Write-Host "Killing orphaned node process: $($proc.Id)" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Cleanup complete!" -ForegroundColor Green
Start-Sleep -Seconds 2
