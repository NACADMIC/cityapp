@echo off
title Git 충돌 해결 및 배포
echo.
echo ============================================
echo    Git 충돌 해결 및 배포
echo ============================================
echo.
echo [1/4] 원격 변경사항 가져오기...
git pull origin main --no-rebase
if %errorlevel% neq 0 (
    echo.
    echo 충돌이 발생했습니다!
    echo 충돌 파일을 수동으로 해결한 후 다시 실행하세요.
    pause
    exit /b 1
)
echo.
echo [2/4] 변경사항 추가...
git add .
echo.
echo [3/4] 커밋...
git commit -m "충돌 해결: 프린터 기능 통합 및 모든 기능 구현 완료"
echo.
echo [4/4] GitHub에 푸시...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo 배포 완료!
    echo.
    echo Railway에서 자동 배포가 시작됩니다.
) else (
    echo.
    echo 푸시 실패!
    echo Git-충돌해결-가이드.md 파일을 참고하세요.
)
echo.
pause

