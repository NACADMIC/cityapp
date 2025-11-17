@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Railway Simple Deploy
echo ============================================
echo.

cd /d "%~dp0"

git add .
git commit -m "Simple memory DB for Railway"
git push

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo Railway will auto-deploy in 2 minutes
echo No PostgreSQL needed!
echo.
pause

