@echo off
setlocal
title AkarProMax candidate on 3015

set "PROJ=%~dp0.."
set "STANDALONE=%PROJ%\.next-fml2\standalone"

echo ================================================================
echo  Starting the .next-fml2 candidate on port 3015
echo  (3014 is left alone - nothing is killed)
echo ================================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: "node" is not on PATH in this window.
  echo  Open a normal terminal, run:  node -v
  echo  If that fails, Node is not installed for this account.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo  node %%v

if not exist "%STANDALONE%\server.js" (
  echo.
  echo  ERROR: not found - %STANDALONE%\server.js
  echo  Build it first:  node scripts\fml-candidate-build.mjs
  pause
  exit /b 1
)

echo  server.js found.
for /f "usebackq delims=" %%b in ("%PROJ%\.next-fml2\BUILD_ID") do (
  echo  expected BUILD_ID in the page source: %%b
)
echo.
echo  Open:  http://127.0.0.1:3015/tools?tool=findmyland
echo.
echo ----------------------------------------------------------------

cd /d "%STANDALONE%"
set PORT=3015
set HOSTNAME=127.0.0.1
node server.js

echo ----------------------------------------------------------------
echo  Server exited. Copy everything printed above and send it back.
pause
