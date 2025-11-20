@echo off
chcp 65001 >nul
title 오늘 출시 - 최종 푸시
echo.
echo ============================================
echo    오늘 출시 - 최종 푸시
echo ============================================
echo.
echo [1/4] Git 상태 확인...
git status --short
echo.
echo [2/4] 모든 변경사항 추가...
git add .
echo.
echo [3/4] 커밋 생성...
git commit -m "POS 설정 저장/유지 기능 완전 구현: 영업시간(요일별), 브레이크타임, 임시휴업, 가게정보 모두 DB 저장 및 재배포 시 유지 보장"
if %errorlevel% neq 0 (
    echo 경고: 커밋 실패 (변경사항이 없을 수 있음)
)
echo.
echo [4/4] GitHub에 푸시...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo   푸시 완료!
    echo ============================================
    echo.
    echo Railway에서 자동 배포가 시작됩니다.
    echo.
    echo 배포 확인:
    echo 1. Railway 대시보드 접속
    echo 2. Deployments 탭에서 배포 상태 확인
    echo 3. 배포 완료 후 서비스 URL 확인
    echo.
) else (
    echo.
    echo ============================================
    echo   푸시 실패!
    echo ============================================
    echo.
    echo 원격 저장소에 변경사항이 있을 수 있습니다.
    echo git-pull-push.bat 파일을 먼저 실행하세요.
    echo.
)
pause

