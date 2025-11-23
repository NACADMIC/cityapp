@echo off
chcp 65001 >nul
title Git 푸시

echo.
echo ============================================
echo    Git 변경사항 푸시
echo ============================================
echo.

echo [1/3] 변경사항 추가...
git add .

echo.
echo [2/3] 커밋...
git commit -m "프린터 서버 로깅 개선, 주문 수락 기능 개선, 로고 이미지 적용"

echo.
echo [3/3] GitHub에 푸시...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ 푸시 완료!
    echo.
    echo Railway에서 자동 배포가 시작됩니다.
) else (
    echo.
    echo ❌ 푸시 실패!
    echo Git 상태를 확인하세요.
)

echo.
pause

