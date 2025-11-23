@echo off
chcp 65001 > nul
color 0A

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  🏮 시티반점 서버 시작 (SQLite)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

cd backend

echo 📦 패키지 설치 중...
call npm install

echo.
echo 🚀 서버 실행 중...
echo.

node server.js

pause



