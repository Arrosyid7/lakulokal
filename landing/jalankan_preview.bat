@echo off
cd /d "%~dp0"
echo Server berjalan di http://localhost:8080
echo Tekan Ctrl+C untuk berhenti.
python -m http.server 8080
pause
