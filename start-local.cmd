@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [Erreur] Installez Node.js 22.12+ ou 20.19+ puis relancez ce script.
  pause
  exit /b 1
)

node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19) ? 0 : 1)" >nul 2>nul
if errorlevel 1 (
  echo [Erreur] Linux Lab exige Node.js 20.19+ ou 22.12+.
  pause
  exit /b 1
)

where corepack >nul 2>nul
if errorlevel 1 (
  where pnpm >nul 2>nul
  if errorlevel 1 (
    echo [Erreur] Installez Corepack ou pnpm 10.18.0, puis relancez ce script.
    pause
    exit /b 1
  )
  set "PM=pnpm"
) else (
  set "PM=corepack pnpm"
)

if not exist "node_modules\.bin\tsx.cmd" (
  echo Installation des dependances du projet...
  call %PM% install --frozen-lockfile
  if errorlevel 1 exit /b 1
)

set "NODE_ENV=development"
if not defined PORT set "PORT=3000"
echo Linux Lab demarre sur http://localhost:%PORT% - Ctrl+C pour arreter.
call %PM% exec tsx watch server/_core/index.ts
exit /b %ERRORLEVEL%
