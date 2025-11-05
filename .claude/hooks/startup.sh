#!/bin/bash

# Claude Code Startup Hook
# Auto-initializes n8n MCP connection on Claude Code startup

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

# Check if config/.env exists
if [ ! -f "config/.env" ]; then
  echo "⚠️  config/.env not found. n8n connection will not be available."
  echo "   Run: npm run setup-n8n"
  exit 0
fi

# Load environment variables
export $(cat config/.env | grep -v '^#' | xargs)

# Check if N8N_API_KEY is set
if [ -z "$N8N_API_KEY" ]; then
  echo "⚠️  N8N_API_KEY not configured. n8n MCP unavailable."
  exit 0
fi

# Test connection silently
if node -e "
const N8nMCPSetup = require('./src/n8n-setup.js');
const setup = new N8nMCPSetup();
setup.validateConnection().then(connected => {
  if (connected) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
" 2>/dev/null; then
  echo "✅ n8n MCP Connected"
else
  echo "⚠️  Could not connect to n8n. Check your API key."
fi
