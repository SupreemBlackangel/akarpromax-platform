@echo off
setlocal enabledelayedexpansion
title Restart AkarProMax candidate on 3014

set "PROJ=%~dp0.."
set "STANDALONE=%PROJ%\.next-fml2\standalone"

echo ================================================================
echo  STEP 1 - stopping whatever holds port 3014
echo ================================================================
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3014 .*LISTENING"') do (
  set FOUND=1
  echo   killing PID %%a ...
  taskkill /F /PID %%a >nul 2>&1
  if errorlevel 1 (
    echo   FAILED to kill PID %%a - run this file as Administrator.
  ) else (
    echo   PID %%a stopped.
  )
)
if !FOUND!==0 echo   nothing was listening on 3014.

timeout /t 3 /nobreak >nul

netstat -ano | findstr /R /C:":3014 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo.
  echo   Port 3014 is STILL held. Re-run this file as Administrator.
  pause
  exit /b 1
)
echo   port 3014 is now free.

echo.
echo ================================================================
echo  STEP 2 - checking the candidate exists
echo ================================================================
if not exist "%STANDALONE%\server.js" (
  echo   MISSING: %STANDALONE%\server.js
  echo   Build it first:  node scripts\fml-candidate-build.mjs
  pause
  exit /b 1
)
echo   found: %STANDALONE%\server.js
for /f "usebackq delims=" %%b in ("%PROJ%\.next-fml2\BUILD_ID") do echo   BUILD_ID: %%b
echo.
echo   After it starts, open the page and press Ctrl+U.
echo   The source must now contain that same BUILD_ID.
echo   If it still shows Bibfn0ux5pej_zv6aF9C8, a different server is answering.

echo.
echo ================================================================
echo  STEP 3 - starting on http://127.0.0.1:3014
echo ================================================================
echo.

cd /d "%STANDALONE%"
set PORT=3014
set HOSTNAME=127.0.0.1
node server.js

echo.
echo ================================================================
echo  Server exited. Any startup error is printed above.
echo  A database connection error here means the isolated
echo  certification DB env vars were not set in this window.
echo ================================================================
pause
