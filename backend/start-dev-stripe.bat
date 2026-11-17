@echo off
title Backend + Stripe Listener
cd /d "%~dp0"
echo =========================================================================
echo   Starting Backend (port 5000) + Stripe Webhooks Listener
echo =========================================================================
echo.
npm run dev:stripe
pause

