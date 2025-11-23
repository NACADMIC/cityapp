@echo off
chcp 65001 >nul
title 시티반점 서버 (로컬 + Railway DB)
color 0A

echo.
echo ============================================
echo    시티반점 서버 시작 (로컬 + Railway DB)
echo ============================================
echo.
echo 이 방법은:
echo   - 서버: 로컬 PC에서 실행 (프린터 직접 접근 가능)
echo   - 데이터베이스: Railway PostgreSQL 사용
echo.
echo ⚠️  Railway DATABASE_URL 환경 변수가 필요합니다!
echo.
echo ============================================
echo.

cd /d "%~dp0backend"

echo [1/4] 디렉토리 이동 완료
echo 현재 위치: %CD%
echo.

echo [2/4] Node.js 버전 확인...
node --version
if %errorlevel% neq 0 (
    echo.
    echo ❌ Node.js가 설치되어 있지 않습니다!
    echo    Node.js를 먼저 설치해주세요.
    echo.
    pause
    exit /b 1
)
echo.

echo [3/4] 환경 변수 확인...
if "%DATABASE_URL%"=="" (
    echo.
    echo ⚠️  DATABASE_URL 환경 변수가 설정되지 않았습니다!
    echo.
    echo Railway PostgreSQL 연결 정보를 입력하세요:
    echo (예: postgresql://postgres:비밀번호@호스트:포트/railway)
    echo.
    set /p DATABASE_URL="DATABASE_URL 입력: "
    if "%DATABASE_URL%"=="" (
        echo.
        echo ❌ DATABASE_URL이 필요합니다!
        echo.
        pause
        exit /b 1
    )
)
echo    ✅ DATABASE_URL 설정됨
echo.

echo [4/4] 서버 시작 중...
echo.
echo ⚠️  이 창을 닫으면 서버가 종료됩니다!
echo.
echo 📌 서버 시작 후 접속:
echo    - 주문 페이지: http://localhost:3000/order-new
echo    - POS 시스템: http://localhost:3000/pos
echo.
echo ============================================
echo.

set PORT=3000
node server.js

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   서버 시작 실패!
    echo ============================================
    echo.
    pause
)

