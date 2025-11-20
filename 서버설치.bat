@echo off
chcp 65001 >nul
title 시티반점 프린터 서버 의존성 설치
color 0E

echo.
echo ============================================
echo    🖨️  프린터 서버 의존성 패키지 설치
echo ============================================
echo.
echo 프린터 테스트를 위한 패키지를 설치합니다.
echo.
echo ============================================
echo.

cd /d "%~dp0backend"

echo [1/2] 디렉토리 이동 완료
echo 현재 위치: %CD%
echo.

echo [2/2] npm 패키지 설치 중...
echo ⏳ 시간이 조금 걸릴 수 있습니다...
echo ⚠️  특히 프린터 관련 패키지는 시간이 오래 걸립니다...
echo.

npm install

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo   ✅ 설치 완료!
    echo ============================================
    echo.
    echo 이제 "서버시작.bat" 파일을 실행하세요.
    echo.
    echo ⚠️  중요:
    echo   - 프린터 서버는 로컬 PC에서 실행됩니다
    echo   - Railway 메인 서버는 별도로 실행 중입니다
    echo   - Railway 서버의 PRINTER_SERVER_URL 환경 변수에
    echo     이 PC의 주소를 설정해야 합니다
    echo     (예: http://192.168.0.100:3001)
    echo.
) else (
    echo.
    echo ============================================
    echo   ❌ 설치 실패!
    echo ============================================
    echo.
    echo Node.js와 npm이 제대로 설치되어 있는지 확인하세요.
    echo.
)

pause

