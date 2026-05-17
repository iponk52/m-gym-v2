@echo off
echo ========================================================
echo M-GYM Database Exporter (Windows)
echo ========================================================
echo.

set DB_NAME=m-gym
set DUMP_FILE=mgym_backup.sql

echo Mencari mysqldump...

if exist "C:\xampp\mysql\bin\mysqldump.exe" (
    set MYSQLDUMP="C:\xampp\mysql\bin\mysqldump.exe"
) else (
    set MYSQLDUMP=mysqldump
)

echo Mengekspor database "%DB_NAME%" ke file "%DUMP_FILE%"...
%MYSQLDUMP% -u root "%DB_NAME%" > "%DUMP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [BERHASIL] Database sukses di-export ke %CD%\%DUMP_FILE%
    echo File ini siap dipindahkan ke server Ubuntu Anda.
) else (
    echo.
    echo [GAGAL] Gagal mengekspor database. Pastikan server MySQL berjalan.
)

pause
