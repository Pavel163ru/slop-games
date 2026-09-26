@echo off
cd /d "%~dp0"
node deploy.mjs
if errorlevel 1 (
  echo.
  echo Deploy failed. See the error above.
  pause
)
