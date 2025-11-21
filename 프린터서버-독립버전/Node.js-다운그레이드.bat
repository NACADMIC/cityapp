@echo off
chcp 65001 >nul
title Node.js v18 LTS 다운그레이드 가이드

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║     Node.js v18 LTS 다운그레이드         ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.

echo 현재 Node.js 버전 확인 중...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되어 있지 않습니다.
    echo.
    echo Node.js v18 LTS를 설치하세요:
    echo https://nodejs.org
    echo.
    pause
    exit
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo 현재 버전: %NODE_VERSION%
echo.

echo %NODE_VERSION% | findstr /C:"v18" >nul
if %errorlevel% equ 0 (
    echo ✅ 이미 Node.js v18입니다!
    echo.
    echo 프린터 서버를 설치하세요:
    echo 재설치-시작.bat
    echo.
    pause
    exit
)

echo %NODE_VERSION% | findstr /C:"v20" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Node.js v20 이상입니다.
    echo    Python 없이 프린터를 사용하려면 v18 LTS가 필요합니다.
    echo.
) else (
    echo ⚠️  Node.js 버전이 v18이 아닙니다.
    echo    Python 없이 프린터를 사용하려면 v18 LTS가 필요합니다.
    echo.
)

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 다운그레이드 방법:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo [1단계] 기존 Node.js 제거
echo   1. 제어판 > 프로그램 제거
echo   2. "Node.js" 검색 후 제거
echo   또는
echo   Windows 설정 > 앱 > Node.js 제거
echo.
echo [2단계] Node.js v18 LTS 설치
echo   1. 브라우저에서 https://nodejs.org 접속
echo   2. 왼쪽 "LTS" 버전 클릭 (v18.x.x)
echo   3. Windows Installer (.msi) 다운로드
echo   4. 설치 시 "Add to PATH" 체크 필수!
echo   5. 설치 완료 후 재부팅 (권장)
echo.
echo [3단계] 확인
echo   명령 프롬프트에서: node --version
echo   v18.x.x 나오면 성공!
echo.
echo [4단계] 프린터 서버 설치
echo   재설치-시작.bat 실행
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set /p open="브라우저에서 Node.js 다운로드 페이지를 열까요? (Y/N): "
if /i "%open%"=="Y" (
    start https://nodejs.org
    echo.
    echo 브라우저가 열렸습니다.
    echo "LTS" 버전을 다운로드하세요.
    echo.
)

pause


