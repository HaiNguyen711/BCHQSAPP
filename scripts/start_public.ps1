param(
    [string]$PublicBaseUrl = "",
    [string]$AdminToken = ""
)

$runtimeEnvPath = Join-Path $PSScriptRoot "..\deploy\runtime.env.ps1"
if (Test-Path $runtimeEnvPath) {
    . $runtimeEnvPath
}

$env:BCHQS_HOST = "0.0.0.0"
$env:BCHQS_PORT = "8000"

if (-not $AdminToken) {
    $AdminToken = $env:BCHQS_ADMIN_TOKEN
}
if (-not $AdminToken) {
    $AdminToken = "doi-token-quan-tri"
}

if (-not $PublicBaseUrl) {
    $PublicBaseUrl = $env:BCHQS_PUBLIC_BASE_URL
}

$env:BCHQS_ADMIN_TOKEN = $AdminToken
$env:BCHQS_PUBLIC_BASE_URL = $PublicBaseUrl

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue

if (-not $pythonCommand) {
    throw "Khong tim thay lenh 'python' trong PATH. Hay cai Python 3 va thu lai."
}

& $pythonCommand.Source main.py
