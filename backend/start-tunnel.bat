@echo off
title Cloudflare Localhost Tunnel
cd /d "E:\Office\backend"
echo ========================================================
echo   Starting Cloudflare Public Tunnel for Localhost:5000
echo ========================================================
echo.
cloudflared tunnel --url http://localhost:5000
pause
