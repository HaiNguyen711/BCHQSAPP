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
$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
$configuredPython = $env:BCHQS_PYTHON

if ($configuredPython -and (Test-Path $configuredPython)) {
    & $configuredPython main.py
} elseif ($pythonCommand) {
    & $pythonCommand.Source main.py
} elseif ($pyLauncher) {
    & $pyLauncher.Source -3 main.py
} else {
    throw "Khong tim thay Python. Hay cai Python 3, hoac dat BCHQS_PYTHON tro toi python.exe."
}
