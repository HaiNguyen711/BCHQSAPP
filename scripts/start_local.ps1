$env:BCHQS_HOST = "0.0.0.0"
$env:BCHQS_PORT = "8000"

if (-not $env:BCHQS_ADMIN_TOKEN) {
    $env:BCHQS_ADMIN_TOKEN = "doi-token-quan-tri"
}

& "C:\Users\CPU12709-local\AppData\Local\Programs\Python\Python310\python.exe" main.py
