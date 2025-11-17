@echo off
title SERVER - City Restaurant
chcp 65001 >nul 2>&1
cls

echo ========================================
echo   STEP 1: Starting Server
echo ========================================
echo.

cd backend
call npm install
echo.
echo Server is starting...
echo.
call npm start

