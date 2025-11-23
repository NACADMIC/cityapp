@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Railway Server Deploy
echo ============================================
echo.

cd /d "%~dp0"

git add .
git commit -m "Deploy to Railway"
git push

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo Railway will auto-deploy in 2-3 minutes
echo Check: https://railway.app
echo.
pause



