---
skill: workflow-template-generator
description: Generate customized n8n workflows from production templates based on user requirements
version: 1.0.0
priority: tier-1
tags: [workflows, templates, generation, n8n]
---

# Workflow Template Generator

## Purpose
Generate production-ready n8n workflows by customizing and combining the 5 battle-tested templates: AI Agent Orchestration, API Sync, Error Handling, GitHub PR Review, and System Monitoring.

## Capabilities

### Template Selection
- **AI Agent Orchestration** - Multi-agent routing with GPT-4/Claude intent classification
- **API Sync Workflow** - ETL pipeline with scheduled sync, batch processing, retry logic
- **Error Handling & Retry** - Exponential backoff, logging, Slack notifications, database storage
- **GitHub PR Review** - Automated code review with GPT-4, labeling, comment posting
- **System Monitoring** - Health checks every 5 min, response time tracking, alerting

### Customization Operations
1. Modify node parameters (API endpoints, schedules, batch sizes)
2. Update credentials and environment variables
3. Adjust cron schedules and timing
4. Configure notification channels (Slack, Email, Database)
5. Merge multiple templates for complex workflows
6. Apply naming conventions from BEST_PRACTICES.md

### Validation
- Ensure unique node IDs (UUID format)
- Validate connections reference existing nodes
- Check credential structures are correct
- Verify cron expressions are valid
- Confirm environment variables are documented

## When to Use This Skill

**Use when users need:**
- Quick workflow generation from proven patterns
- Production-ready configurations without trial-and-error
- Multi-step workflows combining different capabilities
- Starting point that follows n8n best practices

**Examples:**
- "Create a workflow that syncs Salesforce data every 6 hours with error notifications"
- "Build an AI agent that routes questions to Claude or GPT-4 based on complexity"
- "Set up monitoring for my API endpoints with Slack alerts"
- "Automated PR reviews using GPT-4 with labeling and comments"

## Key Resources Referenced

### Templates (Primary Sources)
- `workflow-templates/ai-agent-orchestration.json` (153 lines) - Multi-agent patterns
- `workflow-templates/api-sync-workflow.json` (230 lines) - ETL and batch processing
- `workflow-templates/error-handling-retry.json` (229 lines) - Resilience patterns
- `workflow-templates/github-pr-review.json` (237 lines) - Webhook + AI review
- `workflow-templates/monitoring-health-check.json` (139 lines) - Scheduled monitoring

### Documentation
- `BEST_PRACTICES.md` (lines 22-27) - File naming conventions
- `BEST_PRACTICES.md` (lines 28-75) - Docker Compose deployment patterns
- `LESSONS_LEARNED.md` (complete) - Avoid 6 critical mistakes
- `n8narchitect.md` - Agent for workflow architecture design

## Template Selection Guide

| User Need | Template | Key Nodes | Customization Points |
|-----------|----------|-----------|---------------------|
| **AI task routing** | ai-agent-orchestration | Webhook → OpenAI → Switch → Claude → Aggregate | Model selection, intent conditions, response format |
| **Scheduled data sync** | api-sync-workflow | Schedule → Fetch → Transform → Batch → Sync | Cron expression, API endpoints, batch size, credentials |
| **Add resilience** | error-handling-retry | Any → Check Error → Retry Logic → Wait → Log → Notify | Max retries, backoff formula, notification channels |
| **GitHub automation** | github-pr-review | Webhook → Filter → Get PR → AI Review → Comment → Label | Review prompts, label names, notification settings |
| **Service monitoring** | monitoring-health-check | Schedule → Health Check → Evaluate → Alert → Log | Endpoints, check frequency, alert thresholds |

## Examples

### Example 1: API Sync with Error Handling

**User Request:**
> "I need to sync customer data from our CRM API to PostgreSQL every 4 hours. If it fails, retry 3 times with backoff and notify me on Slack."

**Generated Workflow:**
```json
{
  "name": "CRM to PostgreSQL Sync with Error Handling",
  "nodes": [
    {
      "id": "schedule-trigger",
      "name": "Schedule Every 4 Hours",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{"field": "cronExpression", "expression": "0 */4 * * *"}]
        }
      },
      "position": [250, 300]
    },
    {
      "id": "fetch-crm-data",
      "name": "Fetch CRM Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.CRM_API_URL }}/customers",
        "method": "GET",
        "authentication": "genericCredentialType"
      },
      "position": [470, 300],
      "continueOnFail": true
    },
    {
      "id": "check-error",
      "name": "Check If Error",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [{"value1": "={{ $json.error !== undefined }}", "value2": true}]
        }
      },
      "position": [690, 300]
    },
    {
      "id": "retry-logic",
      "name": "Exponential Backoff Retry",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const attempt = $json.attempt || 1;\nconst maxRetries = 3;\nconst waitTime = Math.pow(2, attempt) * 1000;\n\nif (attempt < maxRetries) {\n  return [{json: {shouldRetry: true, attempt: attempt + 1, waitTime: waitTime}}];\n} else {\n  return [{json: {shouldRetry: false, message: 'Max retries exceeded'}}];\n}"
      },
      "position": [910, 200]
    },
    {
      "id": "slack-alert",
      "name": "Notify on Slack",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channelId": "={{ $env.SLACK_ALERTS_CHANNEL }}",
        "text": "=CRM Sync Failed\nAttempts: {{ $json.attempt }}\nError: {{ $json.error.message }}"
      },
      "position": [1130, 200]
    },
    {
      "id": "transform-data",
      "name": "Transform to PostgreSQL Format",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return items.map(item => ({\n  json: {\n    customer_id: item.json.id,\n    name: item.json.name,\n    email: item.json.email,\n    synced_at: new Date().toISOString()\n  }\n}));"
      },
      "position": [910, 400]
    },
    {
      "id": "insert-postgres",
      "name": "Insert into PostgreSQL",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "customers",
        "columns": {
          "mappings": [
            {"column": "customer_id", "value": "={{ $json.customer_id }}"},
            {"column": "name", "value": "={{ $json.name }}"},
            {"column": "email", "value": "={{ $json.email }}"},
            {"column": "synced_at", "value": "={{ $json.synced_at }}"}
          ]
        }
      },
      "position": [1130, 400]
    }
  ],
  "connections": {
    "Schedule Every 4 Hours": {"main": [[{"node": "Fetch CRM Data"}]]},
    "Fetch CRM Data": {"main": [[{"node": "Check If Error"}]]},
    "Check If Error": {
      "main": [
        [{"node": "Exponential Backoff Retry"}],
        [{"node": "Transform to PostgreSQL Format"}]
      ]
    },
    "Exponential Backoff Retry": {"main": [[{"node": "Notify on Slack"}]]},
    "Transform to PostgreSQL Format": {"main": [[{"node": "Insert into PostgreSQL"}]]}
  },
  "settings": {"executionOrder": "v1"},
  "tags": ["CRM", "sync", "postgres", "error-handling"]
}
```

**Environment Variables Required:**
```bash
CRM_API_URL=https://api.crm.com
SLACK_ALERTS_CHANNEL=C12345678
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

---

### Example 2: Multi-Model AI Orchestration

**User Request:**
> "Route customer questions to Claude Opus for complex analysis or GPT-4 for general questions based on intent classification."

**Generated Workflow:**
Uses `ai-agent-orchestration.json` template with customizations:
- OpenAI intent classifier (lines 18-47)
- Switch node routing based on intent (lines 50-66)
- Claude Opus for "analysis" intent (lines 68-82)
- GPT-4 for "general" intent
- Result aggregation (lines 84-96)

**Key Customizations:**
1. Model IDs updated to 2025 versions:
   - `claude-opus-4-20250514` (not claude-3-opus)
   - `gpt-4` (current stable)
2. Intent conditions in Switch node
3. System prompts customized for each model
4. Response aggregation format

---

### Example 3: Monitoring + Alerts

**User Request:**
> "Monitor 3 API endpoints every 5 minutes, alert on Slack if response time > 3 seconds or status is down."

**Generated Workflow:**
Uses `monitoring-health-check.json` template with:
- 3 parallel HTTP health check nodes
- Evaluation logic checking response time < 3000ms
- Slack alert node for degraded services
- PostgreSQL logging for metrics

---

## Common Patterns

### Pattern 1: Environment Variable Configuration
```json
{
  "parameters": {
    "url": "={{ $env.API_ENDPOINT }}",
    "authentication": "genericCredentialType"
  }
}
```

### Pattern 2: Cron Schedule Configuration
```json
{
  "parameters": {
    "rule": {
      "interval": [
        {"field": "cronExpression", "expression": "0 */4 * * *"}
      ]
    }
  }
}
```

**Common Schedules:**
- Every 5 minutes: `*/5 * * * *`
- Every hour: `0 * * * *`
- Every 4 hours: `0 */4 * * *`
- Daily at 9 AM: `0 9 * * *`
- Weekly Monday 9 AM: `0 9 * * 1`

### Pattern 3: Batch Processing
```json
{
  "id": "batch-processor",
  "type": "n8n-nodes-base.splitInBatches",
  "parameters": {
    "batchSize": 100,
    "options": {"allowEmptyUpdates": false}
  }
}
```

### Pattern 4: Error Handling with Retry
```javascript
// Exponential backoff formula
const waitTime = Math.pow(2, attempt) * 1000;

// Return format for Code nodes
return [{json: {shouldRetry: true, attempt: attempt + 1, waitTime: waitTime}}];
```

---

## Integration with Other Skills

**Workflow:**
1. **This skill** generates initial workflow from template
2. Invoke `ai-api-integration.md` if workflow needs AI model configuration
3. Invoke `error-handling-implementer.md` to add resilience
4. Invoke `workflow-validator.md` to check for common mistakes
5. Invoke `best-practices-applier.md` for production hardening

**Example Chain:**
```
User: "Create AI workflow with Claude"
  ↓
workflow-template-generator → ai-agent-orchestration.json
  ↓
ai-api-integration → Add Claude Opus 4 config
  ↓
error-handling-implementer → Add retry logic
  ↓
workflow-validator → Check for mistakes
  ↓
Output: Production-ready workflow JSON
```

---

## Error Handling

### When Template Selection Fails
**Error:** User request doesn't match any template
**Action:** Ask clarifying questions:
- "What triggers the workflow? (webhook, schedule, manual)"
- "What's the main action? (API call, data transform, AI processing)"
- "What's the output? (email, database, API response)"

### When Customization Fails
**Error:** Invalid parameters (bad cron expression, missing env vars)
**Action:**
1. Validate cron expression with parser
2. List required environment variables
3. Provide example values
4. Reference BEST_PRACTICES.md for guidance

### When Multiple Templates Needed
**Error:** User needs features from multiple templates
**Action:**
1. Identify primary template (main workflow pattern)
2. Extract relevant nodes from secondary templates
3. Merge with unique node IDs
4. Validate connections
5. Warn user about complexity

---

## Validation Rules

Before returning workflow, verify:
- [ ] All node IDs are unique
- [ ] All connections reference existing node IDs
- [ ] Cron expressions are valid (if scheduled)
- [ ] Environment variables are documented
- [ ] Credentials have proper structure
- [ ] HTTP nodes use `contentType: 'raw'` with expressions
- [ ] Code nodes return `[{json: {...}}]` format
- [ ] No hardcoded API keys or secrets
- [ ] Tags array includes relevant keywords
- [ ] Workflow name is descriptive

---

## Quick Reference

### Template Selection Decision Tree
```
Is it AI-related?
  ├─ Yes → Multi-model routing? → ai-agent-orchestration
  └─ No  → Is it scheduled?
           ├─ Yes → Data sync? → api-sync-workflow
           │        Monitoring? → monitoring-health-check
           └─ No  → Webhook trigger?
                    ├─ GitHub PR? → github-pr-review
                    └─ API endpoint? → Combine webhook + error-handling
```

### Critical Pattern Checklist
- ✅ Use `contentType: 'raw'` not `'json'` for HTTP with expressions
- ✅ Code nodes return `[{json: {...}}]`
- ✅ Gmail OAuth2 (not SMTP on n8n Cloud)
- ✅ Environment variables for secrets: `$env.VAR_NAME`
- ✅ Exponential backoff: `Math.pow(2, attempt) * 1000`
- ✅ Batch size 50-100 for API calls
- ✅ Batch size 500-1000 for DB operations

---

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Maintained By:** n8n Workflow Team
**Related Skills:** ai-api-integration, error-handling-implementer, workflow-validator
