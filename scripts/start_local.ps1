$env:BCHQS_HOST = "0.0.0.0"
$env:BCHQS_PORT = "8000"

if (-not $env:BCHQS_ADMIN_TOKEN) {
    $env:BCHQS_ADMIN_TOKEN = "doi-token-quan-tri"
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue

if (-not $pythonCommand) {
    throw "Khong tim thay lenh 'python' trong PATH. Hay cai Python 3 va thu lai."
}

& $pythonCommand.Source main.py
