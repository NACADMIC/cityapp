@echo off
chcp 65001 >nul
title 프린터 서버 터널 시작 (Cloudflare Tunnel)
color 0C

echo.
echo ============================================
echo    🌐 프린터 서버 터널링 시작
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

echo [1/3] 프린터 서버 실행 확인...
echo      프린터 서버가 http://localhost:3001 에서 실행 중이어야 합니다.
echo.
timeout /t 3 >nul

echo [2/3] Cloudflare Tunnel 시작 중...
echo      프린터 서버를 인터넷에 노출합니다...
echo.
echo ⚠️  생성된 터널 URL을 복사하여 Railway 환경 변수에 설정하세요!
echo.

cloudflared.exe tunnel --url http://localhost:3001

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   터널 시작 실패!
    echo ============================================
    echo.
    echo 가능한 원인:
    echo 1. cloudflared.exe가 없음
    echo    해결: cloudflared.exe 파일이 이 폴더에 있는지 확인
    echo.
    echo 2. 프린터 서버가 실행되지 않음
    echo    해결: 먼저 "서버시작.bat"을 실행하여 프린터 서버 시작
    echo.
    pause
)

