@echo off
chcp 65001 >nul
title 시티반점 - 프린터 서버

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║     🖨️  프린터 서버 시작하기 🖨️          ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.
echo  이 서버는 로컬 PC에서 실행되어
echo  Railway 메인 서버의 프린터 요청을 처리합니다.
echo.
echo  ⚠️  이 창을 닫지 마세요!
echo.
pause

cd backend

echo.
echo 📦 패키지 설치 확인 중...
call npm install --silent

echo.
echo 🚀 프린터 서버 시작 중...
echo.

node printer-server.js

pause

