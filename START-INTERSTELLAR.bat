@echo off
echo ========================================
echo   Justaline Interstellar Proxy Starter
echo ========================================
echo.
echo Starting Interstellar on port 8080...
echo.

REM Start Interstellar in a new window
start "Interstellar Server" cmd /k "npm start"

REM Wait for server to start
timeout /t 5 /nobreak >nul

echo.
echo Creating public tunnel...
echo.
echo YOUR PUBLIC URL WILL APPEAR BELOW:
echo Copy it and paste in Justaline admin settings!
echo.
echo ========================================
echo.

REM Start tunnel (this will show the URL)
lt --port 8080

pause

