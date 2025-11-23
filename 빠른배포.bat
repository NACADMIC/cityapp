@echo off
chcp 65001 >nul 2>&1
cls
echo.
echo ============================================
echo   Railway 빠른 배포
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Git에 변경사항 추가...
git add .

echo [2/3] 커밋...
git commit -m "프린터, PG 결제 연동 완료 - 배포 준비"

echo [3/3] GitHub에 푸시...
git push origin main

echo.
echo ============================================
echo   배포 완료!
echo ============================================
echo.
echo Railway가 자동으로 배포를 시작합니다.
echo 2-3분 후 다음 주소에서 확인하세요:
echo.
echo https://railway.app
echo.
echo 환경 변수 설정 필수:
echo - IMP_KEY (I'mport 가맹점 코드)
echo - IMP_SECRET (I'mport API Secret)
echo - PRINTER 설정 (선택)
echo.
pause

