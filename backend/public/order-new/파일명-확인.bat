@echo off
chcp 65001 >nul
echo.
echo ============================================
echo    로고 파일명 확인
echo ============================================
echo.

cd /d "%~dp0"

echo 현재 폴더의 logo 관련 파일:
echo.
dir logo* /b
echo.

if exist "logo.jpg.jpg" (
    echo ✅ 파일명: logo.jpg.jpg
    echo.
    echo HTML에서 logo.jpg.jpg로 참조하고 있는지 확인하세요.
) else if exist "logo.jpg" (
    echo ✅ 파일명: logo.jpg
    echo.
    echo HTML에서 logo.jpg로 참조하고 있는지 확인하세요.
) else if exist "logo" (
    echo ✅ 파일명: logo (확장자 없음)
    echo.
    echo 파일명을 logo.jpg로 변경하거나 HTML에서 logo로 참조하세요.
) else (
    echo ❌ logo 파일을 찾을 수 없습니다.
)

echo.
pause

