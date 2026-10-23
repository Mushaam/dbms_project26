@echo off
REM Starter script for Museum Lifecycle (Windows)
setlocal EnableExtensions
cd /d "%~dp0"

echo ==^> Museum Artifact Lifecycle — starter
echo     Project: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Error: 'node' is not installed or not on PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo Error: 'npm' is not installed or not on PATH.
  exit /b 1
)

for /f "tokens=1 delims=v." %%V in ('node -v') do set NODE_MAJOR=%%V
if not defined NODE_MAJOR set NODE_MAJOR=0
if %NODE_MAJOR% LSS 18 (
  echo Error: Node.js 18+ required.
  node -v
  exit /b 1
)

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo ==^> Created .env from .env.example — edit DB_PASSWORD ^(and other values^) if needed.
) else (
  echo ==^> Using existing .env
)

if not exist "node_modules\" (
  echo ==^> Installing npm dependencies...
  call npm install
  if errorlevel 1 exit /b 1
) else (
  echo ==^> Dependencies already installed
)

if /I "%~1"=="--init-db" (
  where mysql >nul 2>&1
  if errorlevel 1 (
    echo Error: 'mysql' client is not installed or not on PATH.
    exit /b 1
  )
  echo ==^> Loading schema: db\museum_lifecycle.sql
  REM Reads DB_* from .env via a small helper
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /I "%%A"=="DB_HOST" set "DB_HOST=%%B"
    if /I "%%A"=="DB_PORT" set "DB_PORT=%%B"
    if /I "%%A"=="DB_USER" set "DB_USER=%%B"
    if /I "%%A"=="DB_PASSWORD" set "DB_PASSWORD=%%B"
  )
  if not defined DB_HOST set "DB_HOST=127.0.0.1"
  if not defined DB_PORT set "DB_PORT=3306"
  if not defined DB_USER set "DB_USER=root"
  set "MYSQL_PWD=%DB_PASSWORD%"
  mysql -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" < "db\museum_lifecycle.sql"
  if errorlevel 1 (
    set "MYSQL_PWD="
    echo Database load failed. Check .env credentials and that MySQL is running.
    exit /b 1
  )
  set "MYSQL_PWD="
  echo ==^> Database initialized.
)

set "PORT=3000"
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if /I "%%A"=="PORT" set "PORT=%%B"
)

echo.
echo ==^> Starting server on http://localhost:%PORT%
echo     Login: admin / admin123
echo     Tip:   start.bat --init-db   ^& load schema + sample data once
echo.
call npm start
endlocal
