@echo off
chcp 65001 >nul
title 즉시 출시 - 시티반점
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║        🚀 즉시 출시 - 시티반점 🚀        ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.
echo [1/4] Git 상태 확인...
git status --short
echo.
echo [2/4] 모든 변경사항 추가...
git add .
echo.
echo [3/4] 커밋 생성...
git commit -m "오늘 출시 준비: 쿠폰/포인트 데이터 유지 보장, 모바일 최적화, 고객분석 개선, 신규가입 쿠폰 자동발급 강화"
if %errorlevel% neq 0 (
    echo ⚠️ 커밋 실패 (변경사항이 없을 수 있음)
)
echo.
echo [4/4] GitHub에 푸시...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ✅ 푸시 완료!
    echo.
    echo ════════════════════════════════════════
    echo   🎉 출시 완료! 🎉
    echo ════════════════════════════════════════
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
    echo ❌ 푸시 실패!
    echo.
    echo 원격 저장소에 변경사항이 있을 수 있습니다.
    echo git-pull-push.bat 파일을 먼저 실행하세요.
)
echo.
pause

