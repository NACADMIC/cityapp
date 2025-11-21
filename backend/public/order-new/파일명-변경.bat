@echo off
chcp 65001 >nul
echo.
echo 로고 파일명 변경 중...
echo.

cd /d "%~dp0"

if exist "logo.png.jpg" (
    ren "logo.png.jpg" "logo.jpg"
    echo ✅ 파일명 변경 완료: logo.png.jpg -> logo.jpg
) else if exist "logo.jpg" (
    echo ✅ 이미 logo.jpg 파일이 존재합니다.
) else (
    echo ❌ logo.png.jpg 파일을 찾을 수 없습니다.
)

pause

