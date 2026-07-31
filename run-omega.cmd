@echo off
REM Remote mode uses Docker Compose plus Cloudflare Tunnel.
REM This script remains the preferred local-only startup path on 127.0.0.1.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0run-omega.ps1"
