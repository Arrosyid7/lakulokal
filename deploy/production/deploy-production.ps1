param(
    [string]$ProjectPath = "D:\\youtube-clipper",
    [string]$VenvPath = "D:\\youtube-clipper\\.venv"
)

$ErrorActionPreference = "Stop"

Write-Host "=== lakulokal production deployment check ==="
Write-Host "Project: $ProjectPath"
Write-Host "Venv: $VenvPath"

if (-not (Test-Path $ProjectPath)) {
    throw "Project folder tidak ditemukan: $ProjectPath"
}

if (-not (Test-Path $VenvPath)) {
    Write-Host "Membuat virtual environment..."
    python -m venv $VenvPath
}

$python = Join-Path $VenvPath "Scripts\\python.exe"
$pip = Join-Path $VenvPath "Scripts\\pip.exe"

Write-Host "Menginstal dependency..."
& $pip install -r (Join-Path $ProjectPath "requirements.txt")

if (-not (Test-Path (Join-Path $ProjectPath ".env"))) {
    Write-Host "File .env belum ada. Salin dari .env.example terlebih dahulu."
}

Write-Host ""
Write-Host "Langkah berikutnya di server produksi:"
Write-Host "1. Pastikan DNS A record sudah mengarah ke IP VPS"
Write-Host "2. Atur domain utama ke lakulokal.my.id"
Write-Host "3. Atur subdomain streamlit ke streamlit.lakulokal.my.id"
Write-Host "4. Jalankan Nginx reverse proxy"
Write-Host "5. Jalankan Flask di port 5000"
Write-Host "6. Jalankan Streamlit di port 8501"
Write-Host "7. Aktifkan SSL Let's Encrypt"
Write-Host ""
Write-Host "Gunakan perintah berikut di VPS:"
Write-Host "sudo apt install nginx certbot python3-certbot-nginx"
Write-Host "sudo cp deploy/production/nginx-lakulokal.conf /etc/nginx/sites-available/lakulokal.conf"
Write-Host "sudo ln -s /etc/nginx/sites-available/lakulokal.conf /etc/nginx/sites-enabled/"
Write-Host "sudo nginx -t"
Write-Host "sudo systemctl reload nginx"
Write-Host "sudo certbot --nginx -d lakulokal.my.id -d www.lakulokal.my.id -d streamlit.lakulokal.my.id"
Write-Host ""
Write-Host "Deployment checklist selesai."
