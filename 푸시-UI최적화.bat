@echo off
chcp 65001 >nul
title UI 최적화 변경사항 푸시

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║     UI 최적화 변경사항 푸시              ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.

echo 변경된 파일:
echo   - backend/public/order-new/style-premium.css
echo     (장바구니 및 기타 화면 패딩 최적화)
echo.

echo [1/3] Git 상태 확인...
git status --short
echo.

echo [2/3] 변경사항 추가...
git add backend/public/order-new/style-premium.css
if %errorlevel% neq 0 (
    echo ❌ Git add 실패
    pause
    exit
)
echo ✅ 파일 추가 완료
echo.

echo [3/3] 커밋 및 푸시...
set /p commit_msg="커밋 메시지 (기본: UI 최적화): "
if "%commit_msg%"=="" set commit_msg=UI 최적화: 장바구니 및 기타 화면 패딩 수정

git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ❌ 커밋 실패
    pause
    exit
)
echo ✅ 커밋 완료
echo.

git push
if %errorlevel% neq 0 (
    echo.
    echo ❌ 푸시 실패
    echo.
    echo 원격 저장소와 충돌이 있을 수 있습니다.
    echo "git pull" 후 다시 시도하세요.
    echo.
    pause
    exit
)

echo.
echo ✅ 푸시 완료!
echo.
echo Railway에서 자동으로 재배포됩니다.
echo.

pause


