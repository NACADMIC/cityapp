@echo off
chcp 65001 >nul 2>&1
cls

git add .
git commit -m "Fix root route"
git push

echo.
echo DONE! Railway auto-deploy in 2 mins
echo.
pause

