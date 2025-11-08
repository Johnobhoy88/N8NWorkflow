# Claude Skills Implementation Patterns for n8n Workflows

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Author:** claude-cc agent

## Overview

This guide defines code synthesis patterns for Claude skills that build production-ready n8n workflows. These patterns are derived from analyzing 988 lines of production templates and real-world lessons learned.

## Table of Contents

1. [Core Code Patterns](#core-code-patterns)
2. [Skill Prompt Structure](#skill-prompt-structure)
3. [Error Handling Strategy](#error-handling-strategy)
4. [Output Validation](#output-validation)
5. [Production Readiness](#production-readiness)
6. [Quick Reference](#quick-reference)

---

## Core Code Patterns

### 1. Template Instantiation

**Purpose:** Load and customize workflow templates for specific user requirements.

**Process:**
```
1. Load template from workflow-templates/
2. Parse JSON structure
3. Replace placeholders with user data
4. Validate node connections and IDs
5. Update credential references
6. Adjust node positions
7. Return validated workflow JSON
```

**Critical Validations:**
- ✅ All node IDs are unique
- ✅ All connections reference valid node names
- ✅ All credentials have `{id, name}` structure
- ✅ All nodes have position coordinates `[x, y]`
- ✅ Expression syntax uses `={{ }}` format

---

### 2. HTTP Request Node Synthesis

**CRITICAL PATTERN:**
```json
{
  "parameters": {
    "url": "={{ $env.API_URL }}/endpoint",
    "method": "POST",
    "contentType": "raw",  // ← MUST be "raw" with expressions
    "body": "={{ JSON.stringify({key: $json.value}) }}",
    "options": {
      "timeout": 30000,
      "retry": {
        "retry": {
          "maxRetries": 3,
          "retryInterval": 5000
        }
      }
    }
  },
  "continueOnFail": true  // ← Enable error handling
}
```

**Anti-Patterns to Avoid:**
```
❌ contentType: "json" with expressions
   → Causes "JSON parameter needs to be valid JSON" error

❌ Hardcoded API keys in URL/headers
   → Use $env.VARIABLE_NAME or credentials

❌ Missing timeout configuration
   → Can cause hanging workflows

❌ Bearer token auth for API keys
   → Use query parameters or header auth
```

---

### 3. Code Node Synthesis

**CRITICAL PATTERN:**
```javascript
// Code nodes MUST return [{json: {...}}] array format
const items = $input.all();
const result = items.map(item => ({
  json: {
    // transformation logic
    processedData: item.json.data,
    timestamp: new Date().toISOString()
  }
}));
return result;
```

**Template Literal Pattern:**
```javascript
// ✅ CORRECT: Use template literals for strings
const message = `Multi-line string
with ${variable} interpolation
and proper formatting`;

// ❌ WRONG: String concatenation
const message = 'text' + variable + 'more text';

// ❌ WRONG: Nested template literals in JSON.stringify()
JSON.stringify({text: `${nested}`})  // Causes escaping issues
```

**Critical Rules:**
- ✅ Always return `[{json: {...}}]` array format
- ✅ Use `$input.all()` or `$input.first()` for data access
- ✅ Use template literals for string building
- ✅ Include try/catch for error handling
- ❌ Never access `$credentials` (not available in Code nodes)

---

### 4. Error Handling Synthesis

**Three-Layer Error Pattern:**

```
Layer 1: Node-Level Continuation
  → continueOnFail: true (on nodes that may fail)

Layer 2: Conditional Error Routing
  → IF node checks: {{ $json.error !== undefined }}

Layer 3: Retry Logic with Exponential Backoff
  → Code node calculates: Math.pow(2, attempt) * 1000
  → Wait node delays before retry

Layer 4: Error Logging & Notification
  → Log to database
  → Send Slack/email alerts
  → Return error response
```

**Retry Logic Code Pattern:**
```javascript
const error = $input.first().json.error;
const attempt = $input.first().json.attempt || 1;
const maxRetries = 3;

if (attempt < maxRetries) {
  // Exponential backoff: 2^attempt seconds
  const waitTime = Math.pow(2, attempt) * 1000;

  return [{
    json: {
      shouldRetry: true,
      attempt: attempt + 1,
      waitTime: waitTime,
      error: error,
      message: `Retry attempt ${attempt + 1} of ${maxRetries}`
    }
  }];
} else {
  return [{
    json: {
      shouldRetry: false,
      message: 'Max retries exceeded',
      error: error
    }
  }];
}
```

**Connection Flow:**
```
HTTP Node → Check Error (IF)
             ├─ Error → Retry Logic → Wait → Loop Back
             └─ Success → Continue Workflow
```

---

### 5. Credential Management

**Credential Reference Pattern:**
```json
{
  "credentials": {
    "anthropicApi": {
      "id": "2",
      "name": "Anthropic API"
    }
  }
}
```

**Environment Variables:**
```javascript
// ✅ CORRECT
{{ $env.VARIABLE_NAME }}

// ❌ WRONG
{{ process.env.VARIABLE_NAME }}
```

**Email on n8n Cloud:**
```
✅ USE: Gmail node with OAuth2
❌ NEVER USE: SMTP nodes (blocked by N8N_BLOCK_ENV_ACCESS_IN_NODE)
```

**Security Requirements:**
- Never hardcode API keys or secrets
- Use environment variables for all endpoints
- Never expose credentials in logs or errors
- Rotate credential IDs per environment (dev/staging/prod)

---

### 6. Expression Syntax Patterns

**Common Expression Patterns:**

```javascript
// 1. Access current node data
{{ $json.fieldName }}
{{ $json['Field With Spaces'] }}

// 2. Access previous node data
{{ $('Node Name').item.json.field }}
{{ $('Node Name').first().json.field }}

// 3. Environment variables
{{ $env.VARIABLE_NAME }}

// 4. Workflow metadata
{{ $workflow.name }}
{{ $execution.id }}

// 5. Conditionals
{{ $json.status === 'success' ? 'OK' : 'Failed' }}

// 6. Date/Time
{{ new Date().toISOString() }}

// 7. JSON operations
{{ JSON.stringify($json) }}
{{ JSON.parse($json.stringField) }}
```

**Critical Rules:**
```
✅ Form data at root level: $json['fieldName']
❌ NOT nested: $json.formData['fieldName']

✅ Expressions use ={{ }} syntax
❌ NOT bare {{ }}

✅ Complex logic in Code nodes
❌ NOT in expression templates
```

---

### 7. AI Model Integration

**Claude/Anthropic:**
```json
{
  "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
  "parameters": {
    "model": "claude-sonnet-4-20250514",
    "text": "={{ $json.prompt }}"
  },
  "credentials": {
    "anthropicApi": {"id": "2", "name": "Anthropic API"}
  }
}
```

**OpenAI/GPT:**
```json
{
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "parameters": {
    "model": "gpt-4",
    "messages": {
      "values": [
        {"role": "system", "content": "System prompt"},
        {"role": "user", "content": "={{ $json.query }}"}
      ]
    },
    "options": {"temperature": 0.7, "maxTokens": 1000}
  }
}
```

**Google Gemini (HTTP Request):**
```json
{
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key={{ $env.GEMINI_API_KEY }}",
  "method": "POST",
  "contentType": "raw",
  "body": "={{ JSON.stringify({contents: [{parts: [{text: $json.prompt}]}]}) }}"
}
```

**Model Selection Guide:**

| Use Case | Claude | OpenAI | Gemini |
|----------|--------|--------|--------|
| **Complex Reasoning** | claude-opus-4 | gpt-4-turbo | gemini-1.5-pro |
| **Balanced** | claude-sonnet-4 | gpt-4o | gemini-1.5-pro |
| **Fast/Cheap** | claude-haiku-3.5 | gpt-4o-mini | gemini-1.5-flash |

**Critical Notes:**
- Gemini uses **query parameter** for API key, NOT Bearer token
- Response formats differ by provider - parse accordingly
- Set appropriate temperature (0.0-1.0) and token limits

---

## Skill Prompt Structure

### Required Sections

Every Claude skill MUST include these sections:

#### 1. Role Definition (2-3 sentences)
```markdown
You are an expert n8n workflow architect specializing in [domain].
Your expertise includes [specific capabilities].
```

#### 2. Capabilities (Bulleted list)
```markdown
- Generate exponential backoff retry logic
- Implement error logging to database
- Configure Slack/email error notifications
```

#### 3. Output Format (JSON schema + examples)
```json
{
  "workflow": {
    "name": "Workflow Name",
    "nodes": [...],
    "connections": {...}
  }
}
```

#### 4. Constraints (What NOT to do)
```markdown
- Never use contentType: 'json' with expressions
- Do not hardcode credentials
- Avoid nested expressions in templates
```

#### 5. Context Requirements
```markdown
Required input:
- Workflow purpose and trigger type
- Expected data volume
- Error handling preferences
- Deployment environment (Cloud vs self-hosted)
```

#### 6. Validation Rules
```markdown
Before returning output:
- Validate all JSON is parseable
- Check all node IDs are unique
- Verify all connections reference existing nodes
- Confirm credentials are properly structured
```

### Best Practices

1. **Keep prompts under 500 lines** for token efficiency
2. **Use concrete examples** over abstract descriptions
3. **Include anti-patterns** (what NOT to do)
4. **Reference working templates** from `workflow-templates/`
5. **Provide decision trees** for conditional logic
6. **Include troubleshooting** guidance
7. **Use consistent Markdown** formatting
8. **Version control** prompts in git
9. **Test with edge cases** before deployment
10. **Link to official docs** where relevant

### File Structure
```
.claude/skills/n8n-{domain}/SKILL.md
```

### Metadata Header
```yaml
---
name: skill-name
description: One-line description
model: sonnet|opus
version: 1.0.0
tags: [n8n, category, use-case]
---
```

---

## Error Handling Strategy

### Error Response Format

Skills should return **structured errors**, not throw exceptions:

```json
{
  "error": true,
  "error_type": "validation|synthesis|template|credential",
  "message": "Human-readable error description",
  "details": {
    "failed_checks": ["list of validation failures"],
    "suggested_fixes": ["actionable remediation steps"],
    "documentation_link": "URL to relevant docs"
  },
  "partial_output": "Include any valid partial results"
}
```

### Error Types

| Type | When | Action |
|------|------|--------|
| **validation_error** | User input invalid/incomplete | Return detailed validation failures with correct format examples |
| **synthesis_error** | Cannot generate valid workflow | Explain why and what additional info is needed |
| **template_error** | Template not found or fails | List available templates and requirements |
| **credential_error** | Invalid credential config | Explain proper structure with examples |

### Recovery Strategies

1. **Fallback to simpler template** if complex synthesis fails
2. **Return partial workflow** with TODO comments
3. **Suggest alternatives** when preferred method isn't possible
4. **Include diagnostics** (which check failed, why)
5. **Link to documentation** for user self-service

---

## Output Validation

### Pre-Return Validation Checks

| Check | Method | Severity |
|-------|--------|----------|
| **JSON syntax** | JSON.parse() succeeds | CRITICAL |
| **Node ID uniqueness** | No duplicate IDs | CRITICAL |
| **Connection integrity** | All refs exist | CRITICAL |
| **Credential structure** | Has {id, name} | HIGH |
| **Expression syntax** | Uses ={{ }} | HIGH |
| **HTTP contentType** | 'raw' with expressions | CRITICAL |
| **Code return format** | Contains [{json:}] | HIGH |
| **Position coordinates** | All nodes have [x,y] | MEDIUM |
| **Required properties** | Has name, nodes, connections | CRITICAL |
| **No hardcoded secrets** | No plain API keys | CRITICAL |

### Validation Workflow

```
Step 1: Parse JSON → if fails, return syntax error
Step 2: Schema validation → check required properties
Step 3: Semantic validation → verify references, IDs
Step 4: Security scan → check for credentials
Step 5: Pattern compliance → verify best practices
Step 6: Generate validation report
Step 7: Return error if critical, warnings if minor
```

### Validation Response Format

```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "type": "missing_error_handling",
      "severity": "medium",
      "location": "HTTP Request node 'Fetch API Data'",
      "message": "Consider adding continueOnFail: true",
      "suggestion": "Add continueOnFail: true to parameters"
    }
  ],
  "workflow": "...validated workflow JSON..."
}
```

---

## Production Readiness

### Checklist by Category

#### Error Handling
- [ ] All HTTP requests have `continueOnFail` configured
- [ ] Error paths exist for critical operations
- [ ] Retry logic with exponential backoff implemented
- [ ] Error notifications configured (Slack/email)
- [ ] Error logging to database/monitoring
- [ ] Graceful degradation for non-critical failures

#### Security
- [ ] No hardcoded API keys or credentials
- [ ] Environment variables for sensitive config
- [ ] Credentials properly referenced by ID
- [ ] Webhook endpoints secured
- [ ] No sensitive data in error messages
- [ ] OAuth2 for third-party services

#### Performance
- [ ] Batch processing for large datasets
- [ ] Appropriate timeout values
- [ ] Optimized database queries
- [ ] API rate limiting implemented
- [ ] Memory-efficient transformations
- [ ] Parallel processing where applicable

#### Monitoring
- [ ] Execution data retention configured
- [ ] Health check endpoints
- [ ] Metrics logging (response times, success rates)
- [ ] Alert thresholds defined
- [ ] Workflow execution history enabled
- [ ] Regular review of failures

#### Documentation
- [ ] Descriptive workflow name
- [ ] Template description complete
- [ ] Human-readable node names
- [ ] Code comments for complex logic
- [ ] Relevant tags for discovery
- [ ] README or docs exist

#### Testing
- [ ] Valid sample data tested
- [ ] Edge cases tested
- [ ] Error paths verified
- [ ] Credentials validated
- [ ] Load testing for high-volume
- [ ] Manual execution successful

---

## Quick Reference

### Template Library

| Template | Lines | Use Case | Key Patterns |
|----------|-------|----------|--------------|
| **ai-agent-orchestration** | 153 | Multi-agent AI systems | Intent routing, LangChain, aggregation |
| **api-sync-workflow** | 230 | Scheduled data sync | Schedule trigger, batch processing |
| **error-handling-retry** | 229 | Resilient workflows | Exponential backoff, logging, alerts |
| **github-pr-review** | 237 | Code review automation | Webhooks, GitHub API, AI analysis |
| **monitoring-health-check** | 139 | System monitoring | Periodic checks, conditional alerts |

### Critical Patterns Summary

```
✅ DO:
- Use contentType: 'raw' for HTTP JSON with expressions
- Return [{json: {...}}] from Code nodes
- Use Gmail OAuth2 for email (n8n Cloud)
- Include continueOnFail: true for error handling
- Use template literals for string building
- Reference credentials by {id, name}
- Use $env.VARIABLE_NAME for environment vars
- Test error paths before deployment

❌ DON'T:
- Use contentType: 'json' with expressions
- Access $credentials in Code nodes
- Hardcode API keys or secrets
- Use SMTP email on n8n Cloud
- Nest expressions in templates
- Use Bearer tokens for API key auth (Gemini)
- Forget array wrapper in Code returns
```

### Expression Syntax

```javascript
Current node:     {{ $json.field }}
Previous node:    {{ $('Node Name').first().json.field }}
Environment:      {{ $env.VAR_NAME }}
Workflow meta:    {{ $workflow.name }}
Date/time:        {{ new Date().toISOString() }}
Conditional:      {{ $json.status === 'ok' ? 'Success' : 'Failed' }}
```

### Model Selection

```
Complex reasoning:  claude-opus-4, gpt-4-turbo, gemini-1.5-pro
Balanced:          claude-sonnet-4, gpt-4o, gemini-1.5-pro
Fast/cheap:        claude-haiku-3.5, gpt-4o-mini, gemini-1.5-flash
```

---

## Resources

- **Templates:** `/home/user/N8NWorkflow/workflow-templates/`
- **Patterns JSON:** `/home/user/N8NWorkflow/docs/CLAUDE_SKILL_IMPLEMENTATION_PATTERNS.json`
- **Best Practices:** `/home/user/N8NWorkflow/BEST_PRACTICES.md`
- **Lessons Learned:** `/home/user/N8NWorkflow/LESSONS_LEARNED.md`
- **API Reference:** `/home/user/N8NWorkflow/docs/API_SKILLS_REFERENCE.md`

---

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Status:** Production Ready
