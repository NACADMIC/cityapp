@echo off
chcp 65001 >nul
title 프린터 서버 - 한번에 설치 및 시작

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║     🖨️  프린터 서버 자동 설치/시작      ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.
echo  [1/3] Node.js 확인 중...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ Node.js가 설치되어 있지 않습니다!
    echo.
    echo 다음 사이트에서 Node.js를 설치해주세요:
    echo https://nodejs.org
    echo.
    pause
    exit
)

echo ✅ Node.js 설치됨
timeout /t 1 >nul

echo.
echo  [2/3] 패키지 설치 중... (2-3분 소요)
echo.
call npm install --silent

echo.
echo  [3/3] 프린터 서버 시작...
echo.
echo ════════════════════════════════════════════
echo    프린터 서버가 실행 중입니다
echo ════════════════════════════════════════════
echo.
echo  ⚠️  이 창을 닫지 마세요!
echo.
echo  Railway에서 주문이 들어오면 자동으로 인쇄됩니다.
echo.
echo ════════════════════════════════════════════
echo.

node printer-server.js

pause

