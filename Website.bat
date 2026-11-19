@echo off
setlocal
title KIMSHEALTH Scientific Proceedings
rem ------------------------------------------------------------------
rem  Runs the KIMSHEALTH Scientific Proceedings website on this PC,
rem  and updates it to the latest version from GitHub.
rem  Keep this file anywhere (for example on your Desktop) and double-click it.
rem  The website is kept in: %USERPROFILE%\KIMSHEALTH-Proceedings
rem ------------------------------------------------------------------
set "APP=%USERPROFILE%\KIMSHEALTH-Proceedings"
set "REPO=https://github.com/kannanyalla-lab/scientificproceedings"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed. Install the LTS version from https://nodejs.org
  echo  then double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "%APP%\package.json" (
  echo.
  echo  First time setup: downloading the website...
  call :download || goto :fail
  goto :install
)

echo.
echo  ==============================================
echo    KIMSHEALTH Scientific Proceedings
echo  ==============================================
echo    1. Start the website
echo    2. Update to the latest version, then start
echo.
choice /c 12 /n /t 15 /d 1 /m "  Press 1 or 2 (starts automatically in 15 seconds): "
if errorlevel 2 (
  echo.
  echo  Downloading the latest version...
  call :download || goto :fail
  goto :install
)
if not exist "%APP%\node_modules" goto :install
goto :start

:install
cd /d "%APP%"
echo.
echo  Installing packages. This takes a minute or two...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

:start
cd /d "%APP%"
echo.
echo  Starting the website. Your browser will open at http://localhost:3000
echo  Editor panel: http://localhost:3000/admin  (editor@example.com / admin123)
echo  To stop the website, close this window.
echo.
start "" /min cmd /c "timeout /t 20 /nobreak >nul & start http://localhost:3000"
call npm run dev
echo.
pause
exit /b 0

:download
rem Downloads the code from GitHub and copies it into %APP%, keeping your
rem settings (.env), database (.data) and uploaded files (uploads).
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "$tmp = Join-Path $env:TEMP 'ksp-download';" ^
  "if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force };" ^
  "New-Item -ItemType Directory $tmp | Out-Null;" ^
  "$zip = Join-Path $tmp 'site.zip';" ^
  "try { Invoke-WebRequest -UseBasicParsing ($env:REPO + '/archive/refs/heads/claude/journal-site.zip') -OutFile $zip }" ^
  "catch { Invoke-WebRequest -UseBasicParsing ($env:REPO + '/archive/refs/heads/main.zip') -OutFile $zip };" ^
  "Expand-Archive $zip $tmp -Force;" ^
  "$src = Get-ChildItem $tmp -Directory | Select-Object -First 1;" ^
  "New-Item -ItemType Directory -Force $env:APP | Out-Null;" ^
  "robocopy $src.FullName $env:APP /E /XD .data uploads node_modules .next /XF .env /NFL /NDL /NJH /NJS /NP | Out-Null;" ^
  "if ($LASTEXITCODE -ge 8) { throw 'Copying files failed.' };" ^
  "Remove-Item $tmp -Recurse -Force;" ^
  "exit 0"
if errorlevel 1 exit /b 1
echo  Downloaded to %APP%
exit /b 0

:fail
echo.
echo  Something went wrong. Check your internet connection and try again.
echo  If it keeps failing, send a screenshot of this window to Claude.
echo.
pause
exit /b 1
