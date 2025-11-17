@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Railway Re-deploy (Fix 2)
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Add all files...
git add .

echo.
echo [2] Commit...
git commit -m "Fix better-sqlite3 build for Railway"

echo.
echo [3] Push...
git push

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo Railway auto-deploy in 2-3 minutes
echo.
echo Check logs at: https://railway.app
echo Go to: Deployments - View Logs
echo.
pause

