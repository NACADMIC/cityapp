@echo off
cd /d "%~dp0"
git add .
git commit -m "UI update"
git push origin main
echo.
echo Done!
echo Railway will auto-deploy...
echo.
pause



