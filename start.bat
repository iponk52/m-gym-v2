@echo off
title M-GYM Launcher
echo =========================================
echo       M-GYM Management System
echo =========================================
echo.
echo Memulai layanan Backend dan Frontend...
echo.

:: Memulai Backend di jendela baru
echo [1/2] Menjalankan Golang Backend...
start "M-GYM Backend" cmd /k "cd backend && go run main.go"

:: Memberikan sedikit jeda (2 detik) agar backend siap
timeout /t 2 /nobreak >nul

:: Memulai Frontend di jendela baru
echo [2/2] Menjalankan React Frontend...
start "M-GYM Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Semua layanan berhasil dijalankan di jendela terpisah!
echo Jendela ini akan otomatis menutup dalam 3 detik...
timeout /t 3 /nobreak >nul
exit
