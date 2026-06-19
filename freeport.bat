@echo off
set "port=7769"

:: 1. Find and display the matching connection
echo Checking port %port%...
netstat -ano | findstr :%port% | findstr LISTENING

:: 2. If no process is found, exit
if %errorlevel% neq 0 (
    echo No process found listening on port %port%.
    pause
    exit /b
)

:: 3. Ask for confirmation
echo.
set /p "choice=Do you want to terminate this process? (Y/N): "

:: 4. Process the user's choice
if /i "%choice%"=="Y" (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%port% ^| findstr LISTENING') do taskkill /F /PID %%a
    echo Process terminated successfully.
) else (
    echo Operation canceled.
)

pause