@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   GitHub Push
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Git init...
git init

echo.
echo [2] Add files...
git add .

echo.
echo [3] Commit...
git commit -m "City Restaurant App - First Deploy"

echo.
echo [4] Remote add...
git remote add origin https://github.com/NACADMIC/cityapp.git

echo.
echo [5] Branch...
git branch -M main

echo.
echo [6] Push...
git push -u origin main

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo GitHub: https://github.com/NACADMIC/cityapp
echo.
echo Next: Railway Deploy
echo   1. Go to https://railway.app
echo   2. Login with GitHub
echo   3. Deploy from GitHub repo
echo   4. Select: cityapp
echo   5. Done!
echo.
pause

