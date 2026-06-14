@echo off
cd /d "%~dp0"
start "Omega API" cmd /k "cd /d \"%~dp0apps\api\" && run-api.cmd"
start "Omega Frontend" cmd /k "cd /d \"%~dp0apps\frontend\" && run-frontend.cmd"
