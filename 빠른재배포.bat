@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Quick Deploy
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Git add...
git add . 2>&1

echo.
echo [2] Git commit...
git commit -m "Fix root route" 2>&1

echo.
echo [3] Git push...
git push 2>&1

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo Railway auto-deploy in 2-3 minutes
echo.
pause

