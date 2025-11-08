# n8n Automation Domain

Complete n8n workflow automation resources including agents, skills, workflows, templates, and knowledge bases.

---

## 📁 Domain Structure

```
domains/n8n/
├── agents/              # n8n-specific agents
│   ├── architect.md    # Workflow design and architecture
│   ├── debugger.md     # Troubleshooting and debugging
│   └── deployment.md   # Deployment and management
├── skills/              # n8n-specific skills
│   ├── error-handling/ # Error handling patterns
│   ├── deployment/     # Deployment strategies
│   └── troubleshooter.md # Common issues and fixes
├── workflows/           # Workflow files
│   ├── active/         # Production workflows
│   ├── templates/      # Reusable templates
│   └── examples/       # Example workflows
├── knowledge/           # Knowledge bases
│   ├── nodes/          # Node catalog and documentation
│   ├── patterns/       # Common workflow patterns
│   ├── best-practices/ # Production best practices
│   └── validation/     # Validation rules
├── scripts/             # Automation scripts
│   ├── deploy/         # Deployment scripts
│   ├── test/           # Testing scripts
│   └── validate/       # Validation scripts
└── src/                 # Source code
    ├── client/         # n8n API clients
    ├── deployers/      # Deployment logic
    └── validators/     # Validation logic
```

---

## 🚀 Quick Start

### Deploy a Workflow

```bash
cd domains/n8n

# Deploy workflow to n8n instance
node scripts/deploy/deploy-workflow.js

# Deploy with specific file
node scripts/deploy/deploy-workflow.js workflows/active/workflow-name.json
```

### Test Workflows

```bash
# Test form webhook
node scripts/test/test-form-webhook.js

# Test real workflow end-to-end
node scripts/test/test-real-workflow.js

# Submit form directly
node scripts/test/submit-form.js
```

### Validate Workflows

```bash
# Validate workflow JSON
node scripts/validate/validate-workflow.js workflows/active/workflow-name.json

# Check credentials configuration
node scripts/validate/check-credentials.js
```

---

## 📚 Available Resources

### Active Workflows (2)

1. **workflow-builder-gemini-v2-with-qa.json**
   - Meta-workflow that builds n8n workflows from user descriptions
   - Uses Gemini AI for code generation
   - Includes QA validation

2. **workflow-builder-gemini-v2-with-qa-enhanced.json**
   - Enhanced version with additional validation
   - Improved error handling
   - Better output formatting

### Workflow Templates (5)

1. **ai-agent-orchestration.json** - Multi-agent AI routing
2. **api-sync-workflow.json** - Scheduled API synchronization
3. **error-handling-retry.json** - Exponential backoff retry logic
4. **github-pr-review.json** - Automated code review
5. **monitoring-health-check.json** - System health monitoring

### Agents (3)

- **Architect** - Design workflows and solve architecture challenges
- **Debugger** - Troubleshoot workflow failures and errors
- **Deployment** - Deploy and manage n8n workflows

### Skills (3)

- **Error Handling** - Implement retry logic and error recovery
- **Deployment** - Deploy workflows to n8n instances
- **Troubleshooter** - Diagnose and fix common n8n issues

### Knowledge Bases (4)

- **Nodes** - Catalog of all n8n nodes with usage examples
- **Patterns** - Common workflow patterns and best practices
- **Best Practices** - Production-ready workflow guidelines
- **Validation** - Validation rules for workflow quality

---

## 🔐 Security

### Environment Variables

All workflows use environment variables for sensitive data:

```bash
# Required environment variables
N8N_API_URL=https://your-instance.app.n8n.cloud
N8N_API_KEY=your-api-key
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Security Fixes Applied

✅ **Fixed in this restructure:**
- Removed hardcoded Gemini API key from 2 workflows (8 occurrences)
- Migrated to environment variable references: `$env.GEMINI_API_KEY`
- All credentials now use n8n credential management

See [Security Audit](../../docs/audits/2025-11-08-workflow-security-audit.md) for details.

---

## 📖 Usage Guides

### Using Workflow Templates

1. Browse templates in `workflows/templates/`
2. Copy template to `workflows/active/`
3. Customize for your use case
4. Deploy using deployment scripts
5. Test thoroughly before production use

### Using Agents

Agents are available through Claude Code:

```
/agent architect - Design a workflow for [task]
/agent debugger - Fix error in [workflow]
/agent deployment - Deploy [workflow] to n8n
```

### Using Skills

Skills provide focused capabilities:

```
/skill error-handling - Add retry logic to workflow
/skill deployment - Deploy workflow to production
/skill troubleshooter - Diagnose workflow failure
```

---

## 🛠️ Development

### Prerequisites

- n8n instance (Cloud or self-hosted)
- Node.js 18+
- Valid API credentials

### Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Validate all workflows
npm run validate

# Deploy to staging
npm run deploy:staging
```

### Creating New Workflows

1. Design workflow in n8n UI
2. Test thoroughly
3. Export as JSON
4. Save to `workflows/active/` or `workflows/templates/`
5. Validate using validation script
6. Commit to git

---

## 📊 Scripts Reference

### Deployment Scripts

- `deploy/deploy-workflow.js` - Deploy workflow to n8n
- `deploy/deploy-enhanced.js` - Deploy enhanced workflow variant
- `deploy/activate.js` - Activate deployed workflow
- `deploy/update.js` - Update existing workflow

### Testing Scripts

- `test/test-form-webhook.js` - Test form submission
- `test/test-real-workflow.js` - End-to-end workflow test
- `test/submit-form.js` - Direct form submission

### Validation Scripts

- `validate/validate-workflow.js` - Validate workflow JSON
- `validate/check-credentials.js` - Check credential configuration

---

## 🎯 Best Practices

### Workflow Design

- Use descriptive node names
- Add error handling to all critical nodes
- Implement retry logic for external API calls
- Use environment variables for credentials
- Document complex logic with notes

### Error Handling

- Set `continueOnFail: true` on resilient nodes
- Implement exponential backoff for rate-limited APIs
- Add error notifications (Slack/Email)
- Log errors to database for analysis

### Testing

- Test with sample data before production
- Test error scenarios
- Validate all data transformations
- Check credential expiration

### Deployment

- Validate workflow before deployment
- Test in staging environment first
- Monitor first executions closely
- Document deployment steps

---

## 📈 Metrics

- **Active Workflows:** 2
- **Templates:** 5
- **Agents:** 3
- **Skills:** 3
- **Knowledge Bases:** 4
- **Scripts:** 10
- **Source Files:** 5

---

## 🆘 Troubleshooting

Common issues and solutions:

### Workflow Fails with "Invalid API Key"

**Solution:** Check environment variables are set correctly in `.env` file.

### Workflow Not Executing

**Solution:** Check workflow is activated in n8n UI, verify trigger configuration.

### Credential Errors

**Solution:** Run `node scripts/validate/check-credentials.js` to verify credentials.

### Import Errors in Scripts

**Solution:** Check file paths in require() statements match new directory structure.

---

## 📚 Additional Resources

- [n8n Setup Guide](../../docs/guides/n8n-setup.md)
- [Form Testing Guide](../../docs/guides/form-testing.md)
- [Email Submission Guide](../../docs/guides/email-submission.md)
- [API Skills Reference](../../docs/references/api-skills.md)
- [Security Audit Report](../../docs/audits/2025-11-08-workflow-security-audit.md)

---

**Domain Status:** ✅ Active and Production-Ready

**Last Updated:** 2025-11-08
