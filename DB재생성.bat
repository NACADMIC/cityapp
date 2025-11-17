@echo off
chcp 65001 >nul 2>&1
cls

echo ========================================
echo   Database Reset
echo ========================================
echo.
echo WARNING: This will delete all data!
echo.
pause

if exist backend\restaurant.db (
    del backend\restaurant.db
    echo Database deleted!
) else (
    echo Database file not found.
)

if exist backend\database.db (
    del backend\database.db
    echo Old database deleted!
)

echo.
echo Done! Restart server to create new database.
echo.
pause

