#!/bin/bash
cd "$(dirname "$0")"
# Build if dist doesn't exist
if [ ! -d "dist" ]; then
  echo "Prima build in corso..."
  npm install && npm run build
fi
# Serve on port 4173
npx serve dist -p 4173 --single &
SERVER_PID=$!
sleep 1
open http://localhost:4173
wait $SERVER_PID
