@echo off
chcp 65001 >nul 2>&1
cls

echo ========================================
echo   Local Test - City Restaurant
echo ========================================
echo.

cd backend

echo Installing packages...
call npm install

echo.
echo Starting server...
echo.
echo ========================================
echo   Server URLs:
echo ========================================
echo.
echo   Order page: http://localhost:3000/order-new
echo   POS page: http://localhost:3000/pos/login.html
echo   Password: 1234
echo.
echo ========================================
echo.

start "" http://localhost:3000/pos/login.html

call npm start

