@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Railway PostgreSQL Deploy
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Add PostgreSQL files...
git add .

echo.
echo [2] Commit...
git commit -m "Add PostgreSQL support for Railway"

echo.
echo [3] Push to GitHub...
git push

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo NEXT STEPS:
echo.
echo 1. Go to Railway Dashboard
echo 2. Click your cityapp project
echo 3. Click "+ New" button
echo 4. Select "Database"
echo 5. Click "Add PostgreSQL"
echo 6. Wait 2-3 minutes for auto-deploy
echo 7. Go to Settings - Networking - Generate Domain
echo 8. Enter Port: 3000
echo 9. Test your app!
echo.
echo Full guide: Railway-PostgreSQL-배포가이드.txt
echo.
pause

