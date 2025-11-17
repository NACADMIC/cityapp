@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Railway Re-deploy
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Add new config files...
git add railway.json nixpacks.toml

echo.
echo [2] Commit...
git commit -m "Fix Railway config"

echo.
echo [3] Push...
git push

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo Railway will auto-deploy in 1-2 minutes!
echo Check: https://railway.app
echo.
pause

