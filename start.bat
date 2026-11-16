@echo off
title CYBER ARENA: ZERO HOUR - Arena FPS
echo Starting CYBER ARENA: ZERO HOUR...
cd /d "%~dp0"
node server.js
if %errorlevel% neq 0 (
    echo.
    echo Node.js not detected or failed to start.
    echo Opening index.html directly in your default browser...
    start index.html
)
pause
