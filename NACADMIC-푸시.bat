@echo off
chcp 65001 >nul
cls
echo.
echo ========================================
echo   NACADMIC/cityapp 저장소에 푸시
echo ========================================
echo.

cd /d "%~dp0"

set PATH=%PATH%;C:\Program Files\Git\bin

echo [1/3] 원격 저장소 설정...
git remote remove origin 2>nul
git remote add origin https://github.com/NACADMIC/cityapp.git
echo.

echo [2/3] 강제 푸시 중...
echo ⚠️  기존 저장소 내용이 모두 삭제되고 현재 코드로 대체됩니다!
echo.
git push origin main --force

if %errorlevel% equ 0 (
    echo.
    echo ===================================
    echo ✅ 푸시 완료!
    echo ===================================
    echo.
    echo 저장소: https://github.com/NACADMIC/cityapp
    echo.
) else (
    echo.
    echo ❌ 푸시 실패!
    echo.
    echo 에러 코드: %errorlevel%
    echo.
)

pause

