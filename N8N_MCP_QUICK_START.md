# n8n MCP Quick Start Reference

## ⚡ TL;DR

Your n8n is connected and auto-loads on startup. You're ready to go!

```bash
# Test connection
npm run setup-n8n

# List all workflows
npm run list-workflows

# Quick test
npm run test-n8n
```

---

## 🎯 What You Can Do Now

### Tell me things like:
- "Validate the workflow-builder-gemini workflow"
- "Get details about the gemini-email-form workflow"
- "Show me all my workflows"
- "Test this workflow JSON"
- "Check if my workflow is valid before deploying"

### I can:
- ✅ Connect to your n8n Cloud instance
- ✅ Validate workflow JSON
- ✅ Get workflow details
- ✅ List all your workflows
- ✅ Check execution history
- ✅ Test workflow configurations

---

## 📁 What Was Set Up

| File | What It Does |
|------|-------------|
| `config/.env` | Your API credentials (secret - not in Git) |
| `src/n8n-setup.js` | Connection module you can import and use |
| `.claude/hooks/startup.sh` | Auto-connects when you open Claude Code |
| `package.json` | Updated with dependencies and scripts |
| `N8N_MCP_SETUP.md` | Full documentation (you're reading the summary) |

---

## 🔐 API Key Location

Your key is stored in: `config/.env`

```
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- Never shared, never committed
- Only used for authentication
- Can be rotated anytime in n8n Settings

---

## 🚀 Start Working!

You're ready to work on **workflow-builder-gemini**. What would you like to do?

1. Validate the workflow?
2. Test it with sample input?
3. Enhance it with validation?
4. Something else?

Just let me know! 🎉
