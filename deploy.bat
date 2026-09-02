@echo off
REM ============================================
REM SMK TKJ Akademik - Deploy Script
REM ============================================
REM Usage: deploy.bat
REM ============================================

echo.
echo ========================================
echo   SMK TKJ Akademik - Deploy
echo ========================================
echo.

REM 1. Pull latest code
echo [1/5] Pulling latest code...
cd /d "%~dp0"
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo ERROR: git pull failed
    pause
    exit /b 1
)

REM 2. Install backend dependencies
echo [2/5] Installing backend dependencies...
cd backend
call npm install --production
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

REM 3. Build frontend
echo [3/5] Building frontend...
cd ..\frontend
call npm install
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: frontend build failed
    pause
    exit /b 1
)

REM 4. Stop existing server
echo [4/5] Stopping existing server...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM 5. Start server
echo [5/5] Starting server...
cd ..\backend
start /min powershell -Command "node server.js"
start /min powershell -Command "node bot-poll.js"
timeout /t 3 /nobreak >nul

REM Verify
echo.
echo Checking server health...
curl -s http://localhost:5000/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Server is running!
) else (
    echo [WARN] Server might not be ready yet. Check manually.
)

echo.
echo ========================================
echo   Deploy selesai!
echo ========================================
echo.
pause
