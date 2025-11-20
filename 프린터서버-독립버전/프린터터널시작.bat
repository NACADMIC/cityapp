@echo off
chcp 65001 >nul
title 프린터 서버 터널 (Cloudflare)
color 0C

echo.
echo ============================================
echo    🌐 프린터 서버 터널 시작
echo ============================================
echo.
echo 이 터널은 로컬 프린터 서버를 인터넷에 노출하여
echo Railway 서버에서 접근할 수 있게 합니다.
echo.
echo ⚠️  이 창을 닫으면 터널이 종료됩니다!
echo.
echo ============================================
echo.

cd /d "%~dp0"

echo 프린터 서버가 http://localhost:3001 에서 실행 중이어야 합니다.
echo.
timeout /t 2 >nul

echo Cloudflare Tunnel 시작 중...
echo.
echo ⚠️  아래에 표시되는 URL을 복사하여
echo    Railway 환경 변수 PRINTER_SERVER_URL에 설정하세요!
echo.

cloudflared.exe tunnel --url http://localhost:3001

if %errorlevel% neq 0 (
    echo.
    echo ❌ 터널 시작 실패!
    echo.
    echo cloudflared.exe 파일이 이 폴더에 있는지 확인하세요.
    echo.
    pause
)

