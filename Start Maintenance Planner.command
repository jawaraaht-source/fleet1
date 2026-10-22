#!/bin/bash
export PATH="$HOME/.nvm/versions/node/v20.12.2/bin:$PATH"
cd "$(dirname "$0")"
echo "Starting Maintenance Planner..."
open http://localhost:3002
node server.js
