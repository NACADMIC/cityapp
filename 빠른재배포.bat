@echo off
chcp 65001
echo.
echo ====================================
echo 빠른 재배포
echo ====================================
echo.

cd /d "C:\Users\j\시티반점앱"

git add .
git commit -m "음성5초+포인트수정"
git push origin main

echo.
echo ====================================
echo 재배포 완료!
echo Railway에서 자동 배포 중...
echo ====================================
echo.
pause
