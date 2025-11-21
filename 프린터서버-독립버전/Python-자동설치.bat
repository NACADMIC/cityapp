@echo off
chcp 65001 >nul
title Python 자동 설치

cls
echo.
echo ╔══════════════════════════════════════════╗
echo ║                                          ║
echo ║     🐍 Python 자동 설치 (필수)           ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.
echo 프린터 라이브러리 설치에 Python이 필요합니다.
echo.
echo [방법 1] 자동 설치 (권장)
echo   - Chocolatey를 통한 자동 설치
echo.
echo [방법 2] 수동 설치
echo   - https://www.python.org/downloads/
echo   - Python 3.9 이상 설치
echo   - "Add Python to PATH" 체크 필수!
echo.
echo ============================================
echo.
set /p choice="자동 설치를 진행하시겠습니까? (Y/N): "

if /i "%choice%"=="Y" (
    echo.
    echo Chocolatey 설치 중...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Chocolatey 설치 실패
        echo.
        echo 수동 설치를 진행해주세요:
        echo 1. https://www.python.org/downloads/ 접속
        echo 2. Python 3.9 이상 다운로드 및 설치
        echo 3. 설치 시 "Add Python to PATH" 체크
        echo.
        pause
        exit
    )
    
    echo.
    echo Python 설치 중...
    choco install python3 -y
    
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Python 설치 실패
        echo.
        echo 수동 설치를 진행해주세요:
        echo 1. https://www.python.org/downloads/ 접속
        echo 2. Python 3.9 이상 다운로드 및 설치
        echo 3. 설치 시 "Add Python to PATH" 체크
        echo.
        pause
        exit
    )
    
    echo.
    echo ✅ Python 설치 완료!
    echo.
    echo 이제 "재설치-시작.bat"를 실행하세요.
    echo.
) else (
    echo.
    echo 수동 설치 안내:
    echo.
    echo 1. https://www.python.org/downloads/ 접속
    echo 2. Python 3.9 이상 다운로드 및 설치
    echo 3. 설치 시 "Add Python to PATH" 체크 필수!
    echo 4. 설치 완료 후 "재설치-시작.bat" 실행
    echo.
)

pause


