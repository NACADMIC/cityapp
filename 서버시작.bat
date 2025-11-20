@echo off
chcp 65001 >nul
title 시티반점 프린터 서버 시작
color 0B

echo.
echo ============================================
echo    🖨️  프린터 서버 시작 (로컬 PC)
echo ============================================
echo.
echo 이 서버는 로컬 PC에서 실행되어
echo Railway 메인 서버의 프린터 요청을 처리합니다.
echo.
echo ⚠️  이 창을 닫으면 프린터 서버가 종료됩니다!
echo.
echo ============================================
echo.

cd /d "%~dp0backend"

echo [1/3] 디렉토리 이동 완료
echo 현재 위치: %CD%
echo.

echo [2/3] Node.js 버전 확인...
node --version
if %errorlevel% neq 0 (
    echo.
    echo ❌ Node.js가 설치되어 있지 않습니다!
    echo    Node.js를 먼저 설치해주세요.
    echo    https://nodejs.org 에서 다운로드 가능합니다.
    echo.
    pause
    exit /b 1
)
echo.

echo [3/3] 프린터 서버 시작 중...
echo.
echo 📡 Railway 서버에서 프린터 요청을 받을 준비 중...
echo.
echo 프린터 설정:
echo   - 프린터: LKT-20
echo   - 포트: COM2
echo   - 통신속도: 9600 bps
echo   - 로컬 주소: http://localhost:3001
echo.
echo ⚠️  중요: Railway 서버에서 접근하려면
echo    "프린터터널시작.bat"도 실행해야 합니다!
echo.
echo ============================================
echo.

node printer-server.js

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   프린터 서버 시작 실패!
    echo ============================================
    echo.
    echo 가능한 원인:
    echo 1. 의존성 패키지가 설치되지 않음
    echo    해결: "서버설치.bat" 파일을 먼저 실행하세요
    echo.
    echo 2. 포트가 이미 사용 중
    echo    해결: 다른 프로그램이 3001번 포트를 사용하고 있는지 확인
    echo.
    echo 3. 프린터 연결 오류
    echo    해결: COM2 포트가 올바른지 확인
    echo.
    pause
)

