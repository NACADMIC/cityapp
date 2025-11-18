@echo off
echo ========================================
echo Railway 배포 시작!
echo ========================================
echo.

cd C:\Users\j\시티반점앱

echo [1/3] Git 추가 중...
git add .

echo.
echo [2/3] 커밋 중...
git commit -m "마이배민, 아이디/비번 찾기, UI 개선"

echo.
echo [3/3] Railway 배포 중...
git push origin main

echo.
echo ========================================
echo 배포 완료!
echo Railway에서 자동으로 빌드 시작합니다 (2-3분 소요)
echo ========================================
echo.
pause



