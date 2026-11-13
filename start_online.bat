@echo off
chcp 65001 > nul
title REIGN STORE - Live Online Tunnel
echo ==================================================
echo   🌐 نشر متجر REIGN أونلاين برابط مباشر (Live URL)
echo ==================================================
echo.
echo 1. تشغيل السيرفر المحلي في الخلفية...
start /B python server.py > nul 2>&1
timeout /t 2 /nobreak > nul

echo 2. إنشاء نفق سحابي عبر Cloudflare...
cloudflared.exe tunnel --url http://localhost:8080
pause
