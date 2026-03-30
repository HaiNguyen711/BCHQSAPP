param(
    [string]$PublicBaseUrl = "",
    [string]$AdminToken = "doi-token-quan-tri"
)

$env:BCHQS_HOST = "0.0.0.0"
$env:BCHQS_PORT = "8000"
$env:BCHQS_ADMIN_TOKEN = $AdminToken
$env:BCHQS_PUBLIC_BASE_URL = $PublicBaseUrl

& "C:\Users\CPU12709-local\AppData\Local\Programs\Python\Python310\python.exe" main.py
