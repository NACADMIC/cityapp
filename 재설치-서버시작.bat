@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   서버 재설치 및 시작
echo ============================================
echo.

cd backend

echo [1] npm 재설치...
call npm install

echo.
echo [2] 서버 시작...
call npm start

pause



