# n8n Deployment Setup Guide

**Last Updated:** 2025-11-05
**Status:** ✅ Ready for Fresh Session with Enhanced n8n Skills

---

## Session Restart Checklist

After restarting Claude Code, execute these steps in order:

### 1. Install Enhanced n8n Skills (if not already done)

```bash
# Method A: Clone from GitHub (backup if plugins fail)
cd ~/
git clone https://github.com/czlonkowski/n8n-skills.git
cp -r n8n-skills/skills/* ~/.claude/skills/
rm -rf n8n-skills
```

**Expected Result:** 7 new n8n skills installed globally:
- n8n-code-javascript
- n8n-code-python
- n8n-expression-syntax
- n8n-mcp-tools-expert
- n8n-node-configuration
- n8n-validation-expert
- n8n-workflow-patterns

Verify with:
```bash
ls ~/.claude/skills/ | grep "^n8n-"
```

### 2. Verify Project Structure

Working directory: `/mnt/c/Users/jpmcm.DESKTOP-CQ0CL93/OneDrive/Desktop/HighlandAI/N8NWorkflow`

**Project Structure (Clean):**
```
N8NWorkflow/
├── .claude/
│   ├── agents/
│   │   ├── claude-cc.md
│   │   ├── n8n-deployment.md (NEW)
│   │   └── n8narchitect.md
│   ├── hooks/
│   │   └── startup.sh
│   └── skills/
│       ├── README.md
│       ├── n8n-deployment/ (NEW)
│       │   └── SKILL.md
│       ├── n8n-error-handling/
│       └── n8n-troubleshooter.md
├── config/
│   ├── .env (credentials - gitignored)
│   └── .env.example
├── docs/
│   ├── API_SKILLS_REFERENCE.md
│   ├── CLAUDE_SKILL_IMPLEMENTATION_PATTERNS.json
│   ├── CLAUDE_SKILL_PATTERNS_GUIDE.md
│   └── IMPLEMENTATION_PATTERNS_SUMMARY.md
├── knowledge-bases/
│   ├── patterns.json (50 patterns)
│   ├── node-catalog.json (25 nodes)
│   ├── validation-rules.json (30+ rules)
│   └── best-practices.json (50+ practices)
├── n8n-workflows/
│   └── workflow-builder-gemini-v2-with-qa.json (✅ FIXED & READY)
├── scripts/
│   ├── validate-workflow.js
│   ├── deploy-workflow.js
│   ├── check-credentials.js
│   └── activate-workflow.js
├── src/
│   ├── index.js
│   ├── n8n-mcp.js
│   ├── n8n-setup.js
│   └── knowledge-base-loader.js
├── workflow-templates/
│   └── (template workflows)
├── README.md
├── package.json
├── package-lock.json
└── N8N_SETUP_GUIDE.md (this file)
```

---

## Deployment Status

### ✅ Completed
- [x] Workflow JSON fixed and validated
- [x] 13 nodes configured with proper error handling
- [x] Knowledge bases created (4 JSON files, 123KB)
- [x] QA Validator system implemented
- [x] n8n API connection tested and working
- [x] Project structure cleaned and organized
- [x] n8n Deployment Agent created
- [x] n8n Deployment Skill created
- [x] Enhanced n8n-skills installed

### ⏳ Ready for Next Session
- [ ] Deploy workflow to n8n Cloud (via n8n-deployment skill)
- [ ] Configure Gmail OAuth2 credentials
- [ ] Activate workflow
- [ ] Test with sample brief

---

## Key Files Ready

### Workflow File
**Location:** `n8n-workflows/workflow-builder-gemini-v2-with-qa.json`

**Specifications:**
- **Size:** 15 KB
- **Nodes:** 13
- **Status:** ✅ JSON Valid, tested, ready for import
- **Features:** Multi-agent QA validation, error handling, Gmail output

**Node List:**
1. Form Trigger (form-trigger)
2. Brief Parser (brief-parser)
3. Architect Agent (architect-agent)
4. Prepare Synthesis Context (prepare-context)
5. Synthesis Agent (synthesis-agent)
6. Format Final Output (format-output)
7. Load Knowledge Base (load-kb)
8. QA Validator Agent (qa-validator)
9. Format QA Results (format-qa-results)
10. Check for Errors (check-errors)
11. Send Workflow Email (send-workflow)
12. Error Handler (error-handler)
13. Send Error Email (send-error)

### Knowledge Base Files
**Location:** `knowledge-bases/`

1. **patterns.json** (45 KB) - 50 n8n workflow patterns
2. **node-catalog.json** (32 KB) - 25 essential n8n nodes
3. **validation-rules.json** (18 KB) - 30+ validation rules
4. **best-practices.json** (28 KB) - 50+ best practices

### Deployment Scripts
**Location:** `scripts/`

- `validate-workflow.js` - Validate JSON syntax and structure
- `deploy-workflow.js` - Import workflow to n8n Cloud
- `check-credentials.js` - Verify credential configuration
- `activate-workflow.js` - Activate workflow in production

---

## Environment Configuration

### Required Environment Variables

Create `config/.env` with:
```
N8N_API_URL=https://highlandai.app.n8n.cloud
N8N_API_KEY=<your-api-key>
GEMINI_API_KEY=<your-gemini-key>
```

**Note:** `.env` is in `.gitignore` for security.

### n8n Cloud Instance

**URL:** https://highlandai.app.n8n.cloud

**Credentials Needed:**
- Gmail OAuth2 (for email output)
- Gemini API key (for AI agents)

---

## Deployment Workflow

### Phase 1: Setup (This Session)
1. ✅ Fix workflow JSON
2. ✅ Create deployment infrastructure
3. ✅ Clean up project directory
4. ✅ Install n8n skills

### Phase 2: Deploy (Next Session)
1. Deploy workflow via n8n-deployment skill
2. Configure credentials
3. Test with sample data
4. Activate in production

### Phase 3: Enhance (Future)
1. Expand knowledge bases (50→200+ patterns)
2. Add parallel agent architecture
3. Implement conversational refinement loop

---

## Using the n8n-deployment Skill

### In Next Session

Once n8n-skills are installed, invoke with:

```bash
# Use the skill directly
Skill(command="n8n-deployment")
```

The skill will automatically:
1. ✓ Validate workflow JSON
2. ✓ Import to n8n Cloud
3. ✓ Configure credentials
4. ✓ Test execution
5. ✓ Activate workflow
6. ✓ Provide status report

### Expected Output

```json
{
  "status": "success",
  "workflow": {
    "id": "workflow-id",
    "name": "n8n Workflow Builder (Gemini) - with QA Validator",
    "nodes": 13,
    "url": "https://highlandai.app.n8n.cloud/workflow/...",
    "active": true
  },
  "nextActions": [
    "Test with sample brief",
    "Monitor execution logs",
    "Gather user feedback"
  ]
}
```

---

## Testing Checklist

After deployment, verify:

```
[ ] Workflow imported successfully
[ ] Form accessible at /form/workflow-builder
[ ] Gmail credentials configured and tested
[ ] Gemini API responding
[ ] Test execution with sample data:
    - Brief: "Create a workflow that fetches GitHub issues and sends to Slack"
    - Email: test@example.com
[ ] Email received with:
    - Original brief
    - Generated workflow JSON
    - QA validation results
    - Auto-corrections (if issues found)
[ ] All error paths functioning
[ ] Execution logs clean (no critical errors)
```

---

## Quick Reference Commands

### Validate Workflow
```bash
npm run validate-workflow
```

### Deploy Workflow
```bash
npm run deploy-workflow
```

### Check Credentials
```bash
npm run check-credentials
```

### Activate Workflow
```bash
npm run activate-workflow
```

### List n8n Workflows
```bash
node -e "
  const N8n = require('./src/n8n-setup.js');
  const n8n = new N8n();
  n8n.getWorkflows().then(wfs => {
    wfs.data.forEach(w => console.log(w.id, w.name));
  });
"
```

---

## Troubleshooting

### Issue: n8n API Connection Failed
**Check:**
- N8N_API_KEY is set in config/.env
- API key is valid (not expired)
- n8n Cloud instance is running
- Network connectivity to n8n Cloud

### Issue: Workflow Import Fails
**Check:**
- Workflow JSON is valid: `npm run validate-workflow`
- No hardcoded secrets in workflow
- All nodes have unique IDs
- All connections reference existing nodes

### Issue: Credentials Not Found
**Check:**
- Gmail OAuth2 created in n8n Cloud
- Credential IDs match in workflow nodes
- Credentials have been tested in n8n UI

### Issue: Test Execution Fails
**Check:**
- Gemini API key is valid
- API quota not exceeded
- Sample data format matches expectations
- Check n8n execution logs for details

---

## Resource Links

- **n8n Cloud:** https://highlandai.app.n8n.cloud
- **n8n Documentation:** https://docs.n8n.io
- **Gemini API:** https://ai.google.dev
- **Gmail OAuth2 Setup:** https://support.google.com/cloud/answer/6158849

---

## Next Steps After Restart

1. **Verify n8n-skills installation** - Check ~/.claude/skills/
2. **Invoke n8n-deployment skill** - Deploy workflow to n8n Cloud
3. **Test deployment** - Run test with sample brief
4. **Monitor execution** - Check n8n execution logs
5. **Celebrate** - Workflow is live! 🎉

---

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review n8n Deployment Skill documentation
3. Check n8n execution logs for detailed errors
4. Refer to docs/ for implementation patterns

---

**Status:** ✅ Ready for Deployment
**Created:** 2025-11-05
**Session:** Restart Prepared
