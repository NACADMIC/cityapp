@echo off
chcp 65001 >nul
title 시티반점 - 올인원 시작

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║        🏮 시티반점 시작하기 🏮           ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.
echo.

:menu
echo  [1] 로컬 테스트 (같은 Wi-Fi만)
echo  [2] 외부 접속 (전국 어디서나)
echo  [3] 종료
echo.
set /p choice="선택 (1, 2, 3): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto external
if "%choice%"=="3" exit
goto menu

:local
cls
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  로컬 서버 시작 중...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

cd backend

echo [1/2] 패키지 설치 확인...
call npm install --silent

echo.
echo [2/2] 서버 시작...
echo.

start "" http://localhost:3000/pos/login.html

call npm start
goto end

:external
cls
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  외부 접속 가능 서버 시작
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo  ⚠️  두 개의 창이 열립니다:
echo     1) 서버 창 (닫지 마세요!)
echo     2) 외부 접속 창 (주소 복사!)
echo.
pause

REM 서버 시작 (백그라운드)
start "시티반점 서버" /min cmd /c "cd backend && npm install --silent && npm start"

REM 2초 대기
timeout /t 2 /nobreak >nul

REM Cloudflare 터널
if not exist cloudflared.exe (
    echo.
    echo [다운로드] Cloudflared 다운로드 중...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    echo ✅ 다운로드 완료!
    echo.
)

cls
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  🌐 외부 접속 주소를 복사하세요!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo  아래 나오는 https:// 주소를 복사!
echo  예: https://abc-xyz.trycloudflare.com
echo.
echo  📱 주문: [주소]/order-new
echo  💻 POS: localhost:3000/pos/login.html
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

cloudflared.exe tunnel --url http://localhost:3000

:end
pause



