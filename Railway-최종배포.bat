@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Railway Final Deploy
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Add all changes...
git add .

echo.
echo [2] Commit...
git commit -m "Railway deploy - optimized config"

echo.
echo [3] Push to GitHub...
git push

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo Railway will auto-deploy in 3-5 minutes
echo.
echo Check: https://railway.app
echo Go to: Deployments - View Logs
echo.
echo If still fails, we will use memory database!
echo.
pause

