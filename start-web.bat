@echo off
title TAURUS - Web Ticketing Client
cd /d "%~dp0web"
echo Memulai TAURUS Web UI (Port 3000)...
npm run dev
pause