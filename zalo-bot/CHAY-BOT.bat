@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   BOT ZALO AN YEN - dang khoi dong...
echo ============================================
echo.
echo [1/2] Cai thu vien (chi lau o lan dau)...
call npm install
echo.
echo [2/2] Chay bot. GIU CUA SO NAY MO.
echo Mo trinh duyet: http://localhost:3030/qr de quet dang nhap.
echo.
node server.js
echo.
echo (Bot da dung. Dong cua so nay hoac chay lai file de bat lai.)
pause
