@echo off
title TAURUS - Backend Server
cd /d "%~dp0backend"
echo Memulai TAURUS Backend API (Port 4000)...
npm run dev
pause