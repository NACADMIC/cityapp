@echo off
chcp 65001 >nul
title 시티반점 서버
color 0A

cls
echo.
echo ========================================
echo   🏮 시티반점 서버 시작 (간단 버전)
echo ========================================
echo.

cd backend
set PATH=%PATH%;C:\Program Files\nodejs

echo 📦 문제 모듈 제거 중...
if exist "node_modules\better-sqlite3" rmdir /s /q "node_modules\better-sqlite3" 2>nul
if exist "node_modules\bcrypt" rmdir /s /q "node_modules\bcrypt" 2>nul

echo.
echo 📦 필수 모듈만 설치 중...
echo    (네이티브 모듈 빌드 건너뛰기)
call npm install express socket.io cors body-parser uuid axios multer --ignore-scripts

echo.
echo 🚀 서버 시작 중...
echo    (메모리 DB 모드 - Visual Studio 필요 없음!)
echo.
echo ✅ 주문 페이지: http://localhost:3000/order-new
echo ✅ POS 페이지: http://localhost:3000/pos/login.html
echo.
echo ⚠️ 이 창을 닫으면 서버가 종료됩니다!
echo.

timeout /t 3 /nobreak >nul
start http://localhost:3000/order-new
timeout /t 1 /nobreak >nul
start http://localhost:3000/pos/login.html

node server-simple.js

pause
