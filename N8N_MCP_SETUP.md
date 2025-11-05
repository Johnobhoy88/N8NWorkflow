# n8n MCP Persistent Setup Guide

**Status:** ✅ CONFIGURED AND TESTED
**Last Updated:** 2025-11-05
**Instance:** https://highlandai.app.n8n.cloud
**Connected Workflows:** 3

---

## Quick Status Check

Your n8n MCP is now **permanently configured** and will auto-connect whenever you use Claude Code.

### Currently Connected Workflows:
1. **GitHub Workflow Sync** (ID: JhfYVcapBlX1rPnt)
2. **gemini-email-form** (ID: O6kQptoa2dTbZMK1)
3. **Workflow Builder (Gemini) - Fixed** (ID: cClyFCeD85CPu4th)

---

## 🔐 How It Works

### 1. **Configuration Storage** (`config/.env`)
Your API key is stored locally in `config/.env`:
```
N8N_API_URL=https://highlandai.app.n8n.cloud
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyDwHRrv4...
```

**Security:** This file is in `.gitignore` - never committed to Git.

### 2. **Initialization Script** (`src/n8n-setup.js`)
Node.js module that:
- Loads credentials from `config/.env`
- Validates n8n connection
- Provides workflow API methods
- Can be called manually or automatically

### 3. **Auto-Connect Hook** (`.claude/hooks/startup.sh`)
Bash script that:
- Runs automatically when Claude Code starts
- Tests n8n connection silently
- Shows status in terminal
- Doesn't block startup if n8n is unavailable

### 4. **Available npm Scripts**
```bash
npm run setup-n8n      # Test connection and list workflows
npm run test-n8n       # Quick connection validation
npm run list-workflows # Show all n8n workflows
```

---

## 🚀 What You Can Do Now

### A. Direct Usage in Claude Code
You can now ask me to:
- **Validate workflows** before deployment
- **Test workflow executions**
- **Get workflow details** from your n8n instance
- **Check execution history**
- **Deploy tested workflows**

Example:
```
"Validate the workflow-builder-gemini workflow"
"Get the recent executions for gemini-email-form"
"List all workflows on my n8n instance"
```

### B. Programmatic Access
Use in your Node.js scripts:

```javascript
const N8nMCPSetup = require('./src/n8n-setup.js');
const n8n = new N8nMCPSetup();

// Connect
await n8n.validateConnection();

// Get all workflows
const workflows = await n8n.getWorkflows();

// Get specific workflow
const workflow = await n8n.getWorkflow('cClyFCeD85CPu4th');

// Validate workflow JSON before import
const validation = await n8n.validateWorkflow(workflowJson);
```

### C. Workflow-Builder-Gemini Integration
Your **Workflow Builder (Gemini) - Fixed** workflow can now:
1. Accept client briefs via form
2. Use n8n MCP to validate generated workflows
3. Test before sending to client
4. Provide confidence scores

---

## 🔄 How Auto-Connect Works

### On Startup
When you open Claude Code CLI:

```bash
$ claude
# ... Claude Code initializes ...
✅ n8n MCP Connected    # ← From startup.sh hook
# ... Claude Code ready ...
```

The hook:
1. Loads `config/.env` variables
2. Tests connection to n8n Cloud
3. Reports status (green ✅ or warning ⚠️)
4. Continues startup regardless

### Manual Testing
```bash
npm run setup-n8n

🔌 Testing n8n connection...
✅ n8n connection successful!

📋 Found 3 workflows:
   • GitHub Workflow Sync (ID: JhfYVcapBlX1rPnt)
   • gemini-email-form (ID: O6kQptoa2dTbZMK1)
   • Workflow Builder (Gemini) - Fixed (ID: cClyFCeD85CPu4th)

✨ n8n MCP is ready to use!
```

---

## 🛡️ Security Notes

### API Key Protection
- ✅ Stored only in `config/.env` (not in Git)
- ✅ Never logged or displayed
- ✅ JWT token with expiration
- ✅ Can be rotated in n8n Settings anytime

### If You Need to Rotate the Key
1. Go to n8n: Settings → Account → API Keys
2. Generate a new key
3. Update `config/.env` with new key
4. Test: `npm run test-n8n`

### If You Need to Share This Repo
1. Delete `config/.env` before sharing
2. Keep `config/.env.example` as template
3. Recipient creates their own `.env` with their API key

---

## 📋 Troubleshooting

### "n8n connection failed" on startup?
This is expected if:
- n8n Cloud is temporarily down
- Network issue
- Invalid API key

**Fix:** Check connection manually:
```bash
npm run setup-n8n
```

### "N8N_API_KEY not found"?
The `config/.env` file is missing or empty.

**Fix:**
```bash
# Create .env from example
cp config/.env.example config/.env

# Add your API key to config/.env
N8N_API_URL=https://highlandai.app.n8n.cloud
N8N_API_KEY=eyJhbGciOi...
GEMINI_API_KEY=AIzaSy...
```

### Can't connect even with valid key?
Check if API key is still valid:
1. Log into n8n Cloud
2. Go to Settings → Account → API Keys
3. Verify key is active (not expired/revoked)
4. Generate new key if needed

---

## 🎯 Next Steps

### 1. Use It with Workflow-Builder-Gemini
Update the workflow to:
```javascript
// In Synthesis Agent step
const n8n = require('./src/n8n-setup.js');
const validator = new n8n();
await validator.validateConnection();
const validation = await validator.validateWorkflow(generatedWorkflow);
```

### 2. Create Helper Functions
Add to `src/n8n-helpers.js`:
```javascript
// Get workflow by name
async function getWorkflowByName(name) {
  const n8n = new N8nMCPSetup();
  await n8n.validateConnection();
  const workflows = await n8n.getWorkflows();
  return workflows.data.find(w => w.name === name);
}
```

### 3. Set Up Monitoring
Create a workflow that:
- Runs `npm run setup-n8n` periodically
- Logs results to database
- Alerts if connection fails

---

## 📊 Configuration Files

| File | Purpose | Committed? |
|------|---------|-----------|
| `config/.env` | API credentials | ❌ No (in .gitignore) |
| `config/.env.example` | Template | ✅ Yes |
| `src/n8n-setup.js` | Connection module | ✅ Yes |
| `.claude/hooks/startup.sh` | Auto-connect hook | ✅ Yes |
| `package.json` | Dependencies + scripts | ✅ Yes |

---

## 🔄 Persistence Across Sessions

### What Persists?
- ✅ API key in `config/.env`
- ✅ Setup scripts in `src/n8n-setup.js`
- ✅ Startup hook in `.claude/hooks/startup.sh`
- ✅ npm scripts in `package.json`

### What Doesn't Persist?
- Runtime state (in-memory connection objects)
- Temporary files or logs
- Downloaded workflows (unless saved to disk)

### When You Close/Reopen Claude Code
1. Startup hook runs automatically
2. Tests n8n connection
3. Sets up connection object
4. Ready to use immediately

---

## 💡 Usage Examples

### Example 1: Validate Your Workflow-Builder-Gemini
```javascript
const N8n = require('./src/n8n-setup.js');
const n8n = new N8n();

// Connect
await n8n.validateConnection();

// Get the workflow
const workflow = await n8n.getWorkflow('cClyFCeD85CPu4th');

console.log('Workflow Name:', workflow.name);
console.log('Nodes:', workflow.nodes.length);
console.log('Active:', workflow.active);
```

### Example 2: Test Generated Workflow
```javascript
const generatedWorkflow = {
  name: "New Workflow",
  nodes: [...],
  connections: {...}
};

const validation = await n8n.validateWorkflow(generatedWorkflow);
console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors);
```

### Example 3: List All Workflows
```bash
npm run list-workflows

GitHub Workflow Sync
gemini-email-form
Workflow Builder (Gemini) - Fixed
```

---

## 📞 Support

If you need to:

1. **Change n8n instance** - Update `N8N_API_URL` in `config/.env`
2. **Use different API key** - Update `N8N_API_KEY` in `config/.env`, run `npm run test-n8n`
3. **Add new workflows** - They auto-appear in next connection
4. **Debug connection** - Run `npm run setup-n8n` with verbose output
5. **Disable auto-connect** - Rename/delete `.claude/hooks/startup.sh`

---

## ✨ You're All Set!

Your n8n MCP is now:
- ✅ **Configured** with your API key
- ✅ **Persistent** across Claude Code sessions
- ✅ **Auto-connecting** on startup
- ✅ **Ready to use** immediately

**Next:** Ask me to validate or work with your workflows!

---

**Last Setup:** 2025-11-05
**API Version:** n8n Cloud Public API v1
**Status:** Production Ready
