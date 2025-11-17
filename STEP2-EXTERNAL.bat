@echo off
title EXTERNAL ACCESS
chcp 65001 >nul 2>&1
cls

echo ========================================
echo   STEP 2: External Access
echo ========================================
echo.
echo Waiting for server...
timeout /t 5 /nobreak
echo.

if not exist cloudflared.exe (
    echo Downloading cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    echo Done!
    echo.
)

echo ========================================
echo   COPY THE HTTPS ADDRESS BELOW!
echo ========================================
echo.

cloudflared.exe tunnel --url http://localhost:3000

pause

