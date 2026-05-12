#!/usr/bin/env bash
set -euo pipefail

npm test
npm run check
npm run build
npm run smoke
npm run package:smoke

if command -v agent-qc >/dev/null 2>&1; then
  agent-qc ready
else
  echo "agent-qc not installed; skipping"
fi
