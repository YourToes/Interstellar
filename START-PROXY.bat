@echo off
title Justaline Proxy Server
color 0A
echo ========================================
echo   Justaline Interstellar Proxy
echo ========================================
echo.
echo Starting Interstellar server...
start "Interstellar" cmd /k "npm start"
timeout /t 5 /nobreak >nul
echo.
echo Creating public tunnel...
echo.
echo YOUR PUBLIC URL AND PASSWORD WILL APPEAR BELOW:
echo Copy the URL and password!
echo.
echo ========================================
lt --port 8080
pause

