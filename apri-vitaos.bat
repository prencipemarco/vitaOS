@echo off
cd /d "%~dp0"
if not exist "dist" (
  echo Prima build in corso...
  npm install && npm run build
)
start "" http://localhost:4173
npx serve dist -p 4173 --single
