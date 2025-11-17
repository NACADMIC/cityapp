@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   GitHub Upload
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Git init...
git init
echo.

echo [2] Git config
echo     Enter your GitHub name and email
echo.

set /p GIT_NAME="GitHub Name: "
set /p GIT_EMAIL="GitHub Email: "

git config --global user.name "%GIT_NAME%"
git config --global user.email "%GIT_EMAIL%"

echo.
echo [3] Adding files...
git add .

echo.
echo [4] Commit...
git commit -m "City Restaurant App"

echo.
echo ============================================
echo DONE!
echo ============================================
echo.
echo NEXT STEP:
echo.
echo 1. Go to: https://github.com
echo 2. Click + button (top right) - New repository
echo 3. Name: citybanjeom-app
echo 4. Select: Public
echo 5. Click: Create repository
echo 6. Copy the URL (https://github.com/YOUR_ID/citybanjeom-app.git)
echo.
echo 7. Run these commands:
echo.
echo    git remote add origin [YOUR_URL]
echo    git branch -M main
echo    git push -u origin main
echo.
echo ============================================
echo.
pause

