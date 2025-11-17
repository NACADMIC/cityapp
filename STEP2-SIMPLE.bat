@echo off
title EXTERNAL ACCESS
cls

echo ========================================
echo   External Access Starting...
echo ========================================
echo.

if not exist cloudflared.exe (
    echo ERROR: cloudflared.exe not found!
    echo.
    echo Please download:
    echo https://github.com/cloudflare/cloudflared/releases/latest
    echo.
    echo Download: cloudflared-windows-amd64.exe
    echo Rename to: cloudflared.exe
    echo Place in this folder
    echo.
    pause
    exit
)

echo ========================================
echo   COPY THE HTTPS ADDRESS!
echo ========================================
echo.

cloudflared.exe tunnel --url http://localhost:3000

pause

