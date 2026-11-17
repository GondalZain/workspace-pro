@echo off
title Backend + Stripe + Tunnel (All-in-One)
cd /d "%~dp0"
echo =========================================================================
echo   Starting Backend (port 5000) + Stripe Webhooks + Cloudflare Tunnel
echo =========================================================================
echo.
npm run dev:all
pause

