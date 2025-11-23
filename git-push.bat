@echo off
chcp 65001 >nul
cls
echo.
echo ========================================
echo   GitHub 푸시 자동화
echo ========================================
echo.

cd /d "%~dp0"

set PATH=%PATH%;C:\Program Files\Git\bin

echo [1/3] Git 상태 확인...
git status
echo.

echo [2/3] 변경사항 추가...
git add .
echo.

echo [3/3] 커밋 및 푸시...
echo.
echo 커밋 메시지를 입력하세요 (Enter: 기본 메시지 사용):
set /p commit_msg="> "

if "%commit_msg%"=="" (
    set commit_msg=업데이트: %date% %time%
)

git commit -m "%commit_msg%"
echo.

echo GitHub에 푸시 중...
echo.
echo ⚠️  인증 정보 입력이 필요합니다:
echo    Username: opunitacity-ui
echo    Password: Personal Access Token 입력
echo.

git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ 푸시 완료!
    echo.
    echo 저장소: https://github.com/opunitacity-ui/city2
) else (
    echo.
    echo ❌ 푸시 실패!
    echo.
    echo 확인사항:
    echo 1. Personal Access Token이 올바른지 확인
    echo 2. 토큰에 repo 권한이 있는지 확인
    echo 3. 저장소 권한을 확인
)

echo.
pause
