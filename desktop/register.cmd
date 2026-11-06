@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register.ps1" -OpenSettings
echo.
pause
endlocal
