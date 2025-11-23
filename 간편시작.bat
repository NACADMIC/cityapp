@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   🏮 시티반점 주문 시스템 시작
echo ============================================
echo.
echo 📝 서버를 시작합니다...
echo.

cd backend
start cmd /k "npm start"

timeout /t 3 >nul

echo.
echo ✅ 서버 시작 완료!
echo.
echo 📱 테스트 주소:
echo    - 고객 주문: http://localhost:3000/order-new
echo    - POS 접속: http://localhost:3000/pos/login.html
echo.
echo 🚀 Railway 배포 후 고정 주소를 사용하세요!
echo.
pause



