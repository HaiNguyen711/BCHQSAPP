param(
    [string]$TaskPrefix = "BCHQSAPP"
)

$ErrorActionPreference = "Stop"

$taskNames = @(
    "$TaskPrefix Public Server",
    "$TaskPrefix Cloudflared Tunnel"
)

foreach ($taskName in $taskNames) {
    & schtasks.exe /Delete /TN $taskName /F 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Da xoa task: $taskName"
    } else {
        Write-Host "Khong tim thay task: $taskName"
    }
}

$startupFile = Join-Path ([Environment]::GetFolderPath("Startup")) "$TaskPrefix Startup.vbs"
if (Test-Path -LiteralPath $startupFile) {
    Remove-Item -LiteralPath $startupFile -Force
    Write-Host "Da xoa file Startup cu: $startupFile"
}
