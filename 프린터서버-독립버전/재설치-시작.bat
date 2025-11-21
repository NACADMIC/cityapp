@echo off
chcp 65001 >nul
title 프린터 서버 - 재설치 및 시작

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║     🖨️  프린터 서버 재설치/시작         ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.

echo  [1/4] Node.js 확인 중...
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

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 설치됨: %NODE_VERSION%
echo.
echo 💡 Python 없이 설치하려면 Node.js v18 LTS 권장
echo    현재 버전이 v20 이상이면 Python이 필요할 수 있습니다.
timeout /t 2 >nul

echo.
echo  [2/4] 기존 패키지 삭제 중...
if exist node_modules (
    rmdir /s /q node_modules
    echo ✅ 기존 패키지 삭제 완료
) else (
    echo ℹ️  기존 패키지 없음
)
timeout /t 1 >nul

echo.
echo  [3/4] 패키지 재설치 중... (2-3분 소요)
echo.
call npm install
echo.
echo  프린터 라이브러리 추가 설치 중...
call npm install escpos escpos-usb
echo.
echo  serialport 설치 시도 중... (prebuilt binary 사용)
call npm install serialport@8.0.9 --optional --prefer-offline --no-audit 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  serialport 설치 실패 (Python 또는 Node.js 버전 문제)
    echo.
    echo 💡 해결 방법:
    echo    1. Node.js v18 LTS 설치 (권장): https://nodejs.org
    echo    2. 또는 Python 설치: https://www.python.org/downloads/
    echo.
    echo    서버는 실행되지만 프린터는 작동하지 않습니다.
    echo.
) else (
    echo ✅ serialport 설치 완료!
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ 패키지 설치 실패!
    echo.
    pause
    exit
)

echo.
echo ✅ 패키지 설치 완료
timeout /t 1 >nul

echo.
echo  [4/4] 프린터 서버 시작...
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

