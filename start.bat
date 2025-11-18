@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ========================================
echo   City Restaurant Server
echo ========================================
echo.
echo.

:menu
echo  [1] Local Test (Same WiFi Only)
echo  [2] External Access (Anywhere)
echo  [3] Exit
echo.
set /p choice="Select (1, 2, 3): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto external
if "%choice%"=="3" exit
goto menu

:local
cls
echo.
echo ========================================
echo  Starting Local Server...
echo ========================================
echo.

cd backend

echo [1/2] Installing packages...
call npm install

echo.
echo [2/2] Starting server...
echo.

start "" http://localhost:3000/pos/login.html

call npm start
goto end

:external
cls
echo.
echo ========================================
echo  Starting External Access Server
echo ========================================
echo.
echo  Two windows will open:
echo  1) Server window (Don't close!)
echo  2) Tunnel window (Copy the URL!)
echo.
pause

start "City Server" /min cmd /c "cd backend && npm install && npm start"

timeout /t 3 /nobreak >nul

if not exist cloudflared.exe (
    echo.
    echo [Download] Downloading Cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    echo Done!
    echo.
)

cls
echo.
echo ========================================
echo  Copy the URL below!
echo ========================================
echo.
echo  Look for: https://xxx-yyy.trycloudflare.com
echo.
echo  Order page: [URL]/order-new
echo  POS page: localhost:3000/pos/login.html
echo.
echo ========================================
echo.

cloudflared.exe tunnel --url http://localhost:3000

:end
pause



