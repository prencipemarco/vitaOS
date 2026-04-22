#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d "dist" ]; then
  echo "Prima build..."
  npm install && npm run build
fi
npx serve dist -p 4173 --single &
sleep 1
xdg-open http://localhost:4173 2>/dev/null || open http://localhost:4173 2>/dev/null
wait
