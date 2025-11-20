@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   가라 데이터 삭제
echo ============================================
echo.
echo ⚠️ 테스트 데이터만 삭제합니다.
echo 실제 가입 데이터는 유지됩니다.
echo.
pause

cd /d "%~dp0"

if exist "backend\restaurant.db" (
  echo [SQLite] 테스트 데이터 삭제 중...
  node backend/scripts/clear-test-data.js
) else (
  echo [PostgreSQL] 테스트 데이터 삭제 중...
  node backend/scripts/clear-test-data-pg.js
)

echo.
echo ============================================
echo   완료!
echo ============================================
echo.
pause

