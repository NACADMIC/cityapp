@echo off
chcp 65001 >nul 2>&1
cls

echo ========================================
echo   City Restaurant Server
echo ========================================
echo.
echo Starting server...
echo.

cd backend
start "Server" cmd /k "npm install && npm start"

timeout /t 3 /nobreak >nul

cd ..

if not exist cloudflared.exe (
    echo Downloading cloudflared...
    powershell -Command "try { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' } catch { Write-Host 'Download failed' }"
    echo.
)

if exist cloudflared.exe (
    echo.
    echo ========================================
    echo   COPY THE URL BELOW!
    echo ========================================
    echo.
    echo Look for: https://xxx.trycloudflare.com
    echo.
    echo Order page: [URL]/order-new
    echo POS page: localhost:3000/pos/login.html
    echo.
    echo ========================================
    echo.
    
    cloudflared.exe tunnel --url http://localhost:3000
) else (
    echo.
    echo ERROR: cloudflared.exe not found!
    echo.
    echo Download manually:
    echo https://github.com/cloudflare/cloudflared/releases/latest
    echo.
    echo Download: cloudflared-windows-amd64.exe
    echo Rename to: cloudflared.exe
    echo Place in this folder
    echo.
    pause
)

