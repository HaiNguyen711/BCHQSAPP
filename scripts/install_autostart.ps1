param(
    [string]$TaskPrefix = "BCHQSAPP"
)

$ErrorActionPreference = "Stop"

$publicScript = Join-Path $PSScriptRoot "autorun_public.ps1"
$tunnelScript = Join-Path $PSScriptRoot "autorun_tunnel.ps1"
$powershellPath = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
$startupFile = Join-Path ([Environment]::GetFolderPath("Startup")) "$TaskPrefix Startup.vbs"

foreach ($requiredPath in @($publicScript, $tunnelScript, $powershellPath)) {
    if (-not (Test-Path $requiredPath)) {
        throw "Khong tim thay duong dan can thiet: $requiredPath"
    }
}

if (Test-Path -LiteralPath $startupFile) {
    Remove-Item -LiteralPath $startupFile -Force
}

$publicTaskName = "$TaskPrefix Public Server"
$tunnelTaskName = "$TaskPrefix Cloudflared Tunnel"

$publicCommand = '"{0}" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{1}"' -f $powershellPath, $publicScript
$tunnelCommand = 'cmd.exe /c timeout /t 5 /nobreak >nul & "{0}" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{1}"' -f $powershellPath, $tunnelScript

function Write-StartupVbs {
    param(
        [string]$FilePath,
        [string]$PublicCommand,
        [string]$TunnelCommand
    )

    $escapedPublic = $PublicCommand.Replace('"', '""')
    $escapedTunnel = $TunnelCommand.Replace('"', '""')
    $vbsContent = @(
        'Set shell = CreateObject("WScript.Shell")',
        ('shell.Run "{0}", 0, False' -f $escapedPublic),
        'WScript.Sleep 5000',
        ('shell.Run "{0}", 0, False' -f $escapedTunnel)
    ) -join "`r`n"

    Set-Content -LiteralPath $FilePath -Value $vbsContent -Encoding ASCII
}

$publicArgs = @('/Create', '/TN', $publicTaskName, '/SC', 'ONLOGON', '/TR', $publicCommand, '/RL', 'LIMITED', '/F')
$tunnelArgs = @('/Create', '/TN', $tunnelTaskName, '/SC', 'ONLOGON', '/TR', $tunnelCommand, '/RL', 'LIMITED', '/F')

& schtasks.exe $publicArgs
$publicExitCode = $LASTEXITCODE

if ($publicExitCode -eq 0) {
    & schtasks.exe $tunnelArgs
    $tunnelExitCode = $LASTEXITCODE
    if ($tunnelExitCode -eq 0) {
        Write-Host "Da tao Task Scheduler:"
        Write-Host "- $publicTaskName"
        Write-Host "- $tunnelTaskName"
        return
    }
}

Write-StartupVbs -FilePath $startupFile -PublicCommand $publicCommand -TunnelCommand $tunnelCommand
Write-Host "Khong tao duoc Task Scheduler, da cai dat fallback Startup:"
Write-Host "- $startupFile"
