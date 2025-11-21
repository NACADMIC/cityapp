@echo off
chcp 65001 >nul
title 프린터 서버 파일 POS PC로 복사

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║     프린터 서버 파일 복사 가이드         ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.

echo 이 폴더 전체를 POS PC로 복사하세요.
echo.
echo [복사 방법]
echo   1. 이 폴더 전체를 USB 또는 네트워크로 복사
echo   2. POS PC의 바탕화면 또는 원하는 위치에 붙여넣기
echo   3. POS PC에서 "재설치-시작.bat" 실행
echo.
echo [필요한 파일들]
echo   - package.json (수정됨)
echo   - printer-server.js (수정됨)
echo   - 재설치-시작.bat (수정됨)
echo   - Node.js-다운그레이드.bat (새로 추가)
echo   - 기타 모든 파일
echo.
echo [POS PC에서 실행 순서]
echo   1. Node.js-다운그레이드.bat (Node.js v18 LTS 설치)
echo   2. 재설치-시작.bat (프린터 서버 설치 및 실행)
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set /p copy="POS PC로 복사할 준비가 되었나요? (Y/N): "
if /i "%copy%"=="Y" (
    echo.
    echo 현재 폴더 위치:
    cd
    echo.
    echo 이 폴더 전체를 복사하세요:
    echo %CD%
    echo.
    echo 복사 방법:
    echo   1. 폴더 선택 (Ctrl+A)
    echo   2. 복사 (Ctrl+C)
    echo   3. POS PC로 이동
    echo   4. 붙여넣기 (Ctrl+V)
    echo.
) else (
    echo.
    echo 나중에 복사하세요.
    echo.
)

pause


