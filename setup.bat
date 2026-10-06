@echo off
echo ============================================
echo  lakulokal — Setup Dependencies
echo ============================================
echo.

set PIP=d:\youtube-clipper\.venv\Scripts\pip.exe
set PYTHON=d:\youtube-clipper\.venv\Scripts\python.exe

if not exist d:\youtube-clipper\.env (
    copy d:\youtube-clipper\.env.example d:\youtube-clipper\.env
    echo [1/3] .env dibuat dari template.
) else (
    echo [1/3] .env sudah ada.
)

echo.
echo [2/3] Install semua dependency dari requirements.txt...
%PIP% install -r d:\youtube-clipper\requirements.txt

echo.
echo ============================================
echo  Setup selesai!
echo.
echo  Langkah berikutnya:
echo  1. Isi GROQ_API_KEY di .env
echo     Daftar gratis: https://console.groq.com
echo  2. Jalankan server: jalankan_server.bat
echo ============================================
pause
