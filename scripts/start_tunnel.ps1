$cloudflaredCommand = Get-Command cloudflared -ErrorAction SilentlyContinue

if ($cloudflaredCommand) {
    $cloudflaredPath = $cloudflaredCommand.Source
} else {
    $cloudflaredPath = Join-Path $env:LOCALAPPDATA "cloudflared\cloudflared.exe"
}

if (-not (Test-Path $cloudflaredPath)) {
    throw "Khong tim thay cloudflared. Hay cai dat cloudflared va thu lai."
}

$configPath = Join-Path $PSScriptRoot "..\deploy\cloudflared-config.yml"

if (-not (Test-Path $configPath)) {
    throw "Khong tim thay deploy\\cloudflared-config.yml."
}

& $cloudflaredPath tunnel --config $configPath run
