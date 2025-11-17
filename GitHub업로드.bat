@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   📤 GitHub에 코드 업로드
echo ============================================
echo.

cd /d "%~dp0"

echo 📝 Git 초기화 중...
git init

echo.
echo 📝 Git 사용자 설정 (처음 한 번만)
echo    당신의 GitHub 이름과 이메일을 입력하세요!
echo.

set /p GIT_NAME="GitHub 이름 입력: "
set /p GIT_EMAIL="GitHub 이메일 입력: "

git config --global user.name "%GIT_NAME%"
git config --global user.email "%GIT_EMAIL%"

echo.
echo 📝 파일 추가 중...
git add .

echo.
echo 📝 커밋 중...
git commit -m "시티반점 앱 배포"

echo.
echo ============================================
echo ✅ Git 준비 완료!
echo ============================================
echo.
echo 📋 다음 단계:
echo.
echo 1. https://github.com 접속
echo 2. 우측 상단 + 클릭 → New repository
echo 3. 이름: citybanjeom-app
echo 4. Public 선택 → Create repository
echo 5. 나온 주소 복사 (예: https://github.com/아이디/citybanjeom-app.git)
echo.
echo 6. 아래 명령어 실행:
echo.
echo    git remote add origin [복사한주소]
echo    git branch -M main
echo    git push -u origin main
echo.
echo ============================================
echo.
pause

