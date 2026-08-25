@echo off
REM Double-click this. It runs the read-only 3014 diagnostic and keeps the window open.
cd /d "%~dp0.."
echo Running Find My Land runtime diagnostic against http://127.0.0.1:3014
echo.
node "scripts\fml-runtime-diagnose.mjs" http://127.0.0.1:3014
echo.
echo ----------------------------------------------------------------
echo A copy was saved to: scripts\fml-runtime-diagnose.out.txt
echo Send that file back.
echo ----------------------------------------------------------------
pause
