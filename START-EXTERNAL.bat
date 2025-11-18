@echo off
cls
echo.
echo ============================================
echo   External Access (Cloudflare)
echo ============================================
echo.
echo WARNING: Server must be running first!
echo Check if "server window" is open!
echo.
pause

cloudflared tunnel --url http://localhost:3000

pause



