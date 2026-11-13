@echo off
chcp 65001 > nul
title REIGN STORE - Local Server
echo ==================================================
echo   👑 متجر REIGN للملابس الرياضية الفاخرة
echo ==================================================
echo.
echo جاري تشغيل سيرفر المتجر...
start "" "http://localhost:8080"
python server.py
pause
