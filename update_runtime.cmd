@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\update_runtime.ps1" %*
if errorlevel 1 (
  echo Update failed. Check the message above and try again.
  pause
  exit /b 1
)
echo Runtime update completed.
pause
