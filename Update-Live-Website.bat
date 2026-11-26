@echo off
setlocal
title Update the LIVE website (proceedings.kimstvm.tech)
rem ------------------------------------------------------------------
rem  Updates the live site https://proceedings.kimstvm.tech to the latest
rem  version on GitHub (branch claude/journal-site). Double-click to run.
rem  The first time, it links this PC to the server with a key, so later
rem  runs need no password. Nothing secret is stored in this file.
rem ------------------------------------------------------------------
set "SERVER=root@189.72.181.55"
set "KEY=%USERPROFILE%\.ssh\ksp_vps"
set "BRANCH=claude/journal-site"
set "SSHOPT=-i "%KEY%" -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30"

echo.
echo  ==============================================
echo    Update the LIVE website
echo    https://proceedings.kimstvm.tech
echo  ==============================================

where ssh >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Windows' SSH tool is missing. Open Settings ^> Apps ^> Optional features,
  echo  click "Add a feature", add "OpenSSH Client", then double-click this file again.
  goto :fail
)

if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"
if not exist "%KEY%" (
  echo.
  echo  Creating this PC's key for the server ^(one time only^)...
  ssh-keygen -q -t ed25519 -N "" -C "ksp-update" -f "%KEY%"
  if errorlevel 1 goto :fail
)

ssh %SSHOPT% -o BatchMode=yes -o ConnectTimeout=15 %SERVER% "echo ok" >nul 2>nul
if not errorlevel 1 goto :update

echo.
echo  ----------------------------------------------------------------
echo   ONE-TIME SETUP: link this PC to the server
echo  ----------------------------------------------------------------
echo   Type the server's ROOT PASSWORD below and press Enter.
echo   Nothing shows while you type - that's normal.
echo   (Forgot it? In Hostinger: VPS ^> Manage ^> Settings ^> Root password.)
echo.
type "%KEY%.pub" | ssh -o StrictHostKeyChecking=accept-new %SERVER% "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
if errorlevel 1 (
  echo.
  echo  The password didn't work. Double-click this file to try again.
  goto :fail
)
echo.
echo  Linked. From now on no password is needed.

:update
echo.
echo  Updating the live website. This takes about 5 minutes - please keep this window open...
echo.
ssh -t %SSHOPT% %SERVER% "cd /opt/ksp && git fetch -q origin %BRANCH% && git checkout -q -B %BRANCH% FETCH_HEAD && KSP_BRANCH=%BRANCH% bash deploy/install.sh"
if errorlevel 1 goto :fail

echo.
echo  ==============================================
echo    Done! The live website is updated.
echo  ==============================================
start "" "https://proceedings.kimstvm.tech"
echo.
pause
exit /b 0

:fail
echo.
echo  Something went wrong. Take a screenshot of this window and send it to Claude.
echo.
pause
exit /b 1
