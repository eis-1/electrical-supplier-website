$port = if ($args.Length -gt 0) { [int]$args[0] } else { 5000 }
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    $processId = $connections[0].OwningProcess
    Write-Host "Killing process $processId on port $port"
    Stop-Process -Id $processId -Force
    Start-Sleep -Seconds 2
    Write-Host "Port $port is now free"
}
else {
    Write-Host "Port $port is already free"
}
