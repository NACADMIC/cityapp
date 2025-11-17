@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   시티반점 로컬 서버 시작
echo ============================================
echo.

cd backend
start cmd /k "npm start"

timeout /t 3 >nul

echo.
echo ✅ 서버 시작!
echo.
echo 📱 폰에서 접속 (같은 WiFi):
echo    http://192.168.0.15:3000/order-new
echo.
echo 💻 POS 접속:
echo    http://localhost:3000/pos/login.html
echo.
pause

