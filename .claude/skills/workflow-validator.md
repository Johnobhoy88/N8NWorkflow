# Workflow Validator

**Purpose:** Catch common mistakes before deployment using comprehensive validation checklists based on the 6 critical mistakes and production best practices.

**When to use this skill:** Before deploying any workflow to production, after making significant changes, or when troubleshooting unexpected behavior.

---

## Core Capabilities

1. **Pre-deployment validation checklist** - Systematic checks before going live
2. **6 Critical Mistakes detection** - Automatically identify LESSONS_LEARNED.md mistakes
3. **Configuration validation** - Verify node parameters are correct
4. **Data flow validation** - Ensure data passes correctly between nodes
5. **Security validation** - Check credentials and environment variables
6. **Performance validation** - Identify potential bottlenecks

---

## Quick Validation Command

Run through this 5-minute checklist before any deployment:

```
□ HTTP Request nodes use contentType: "raw" (not "json")
□ Code nodes return [{json: {...}}] format
□ Email nodes use Gmail OAuth2 (not SMTP on Cloud)
□ No nested expressions in templates
□ No $credentials access in Code nodes
□ Gemini API uses query param auth (not Bearer)
□ Error handling configured (continueOnFail or Error Trigger)
□ Credentials properly configured in n8n UI
□ Manual test execution successful
□ Error paths tested
```

---

## The 6 Critical Mistakes Validator

### Mistake #1: JSON Body Type with Expressions

**What to check:** All HTTP Request nodes with expressions in body

**Validation Script:**
```javascript
// Run this in a Code node to validate your workflow
const httpNodes = $('HTTP Request').all();
const issues = [];

httpNodes.forEach((node, index) => {
  const params = node.json.parameters;

  // Check if using json contentType with expressions
  if (params.contentType === 'json' &&
      (params.jsonBody?.includes('={{') || params.body?.includes('={{'))) {
    issues.push({
      node: `HTTP Request ${index + 1}`,
      issue: 'Using contentType "json" with expressions',
      fix: 'Change contentType to "raw"',
      severity: 'HIGH'
    });
  }
});

return [{json: {issues: issues, passed: issues.length === 0}}];
```

**Manual Check:**
1. Open each HTTP Request node
2. Check "Body Content Type" setting
3. If using expressions (`={{...}}`), ensure contentType is "raw"
4. Test by clicking "Execute Node"

**✅ Correct Configuration:**
```json
{
  "contentType": "raw",
  "body": "={{ JSON.stringify({data: $json.field}) }}"
}
```

**❌ Incorrect Configuration:**
```json
{
  "contentType": "json",
  "jsonBody": "={{ JSON.stringify({data: $json.field}) }}"
}
```

---

### Mistake #2: Code Nodes Accessing $credentials

**What to check:** All Code nodes for $credentials references

**Validation Script:**
```javascript
// Scan all Code nodes for $credentials usage
const codeNodes = $workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');
const issues = [];

codeNodes.forEach(node => {
  const code = node.parameters.jsCode || '';

  if (code.includes('$credentials')) {
    issues.push({
      node: node.name,
      issue: '$credentials is not available in Code node context',
      fix: 'Use $env.VARIABLE_NAME or configure credentials in native HTTP nodes',
      severity: 'HIGH'
    });
  }
});

return [{json: {issues: issues, passed: issues.length === 0}}];
```

**Manual Check:**
1. Open each Code node
2. Search for `$credentials` in code
3. Replace with `$env.VARIABLE_NAME` or use native HTTP Request with credentials

**✅ Correct Approach:**
```javascript
// Option 1: Use environment variable
const apiKey = $env.GEMINI_API_KEY;

// Option 2: Pass from previous node
const apiKey = $input.first().json.apiKey;
```

**❌ Incorrect Approach:**
```javascript
// This will fail
const apiKey = $credentials.geminiApi.apiKey;
```

---

### Mistake #3: Nested Expressions in Templates

**What to check:** Email nodes, Message nodes, any text fields with complex expressions

**Validation Pattern:**
```javascript
// Check for nested {{ {{ expressions
const textFields = [
  // Email node fields
  $('Send Email').item?.json?.parameters?.message,
  $('Send Email').item?.json?.parameters?.subject,
  // Add other text fields as needed
];

const issues = [];

textFields.forEach((field, index) => {
  if (field && field.includes('{{ ') && field.split('{{').length > 2) {
    issues.push({
      field: `Text field ${index + 1}`,
      issue: 'Possible nested expressions detected',
      fix: 'Simplify expressions or use Code node to prepare variables',
      severity: 'MEDIUM'
    });
  }
});

return [{json: {issues: issues, passed: issues.length === 0}}];
```

**Manual Check:**
1. Open Email/Message nodes
2. Check subject, message, and other text fields
3. Look for nested `{{ }}` syntax
4. Simplify or use Code node for complex data access

**✅ Correct Approach:**
```javascript
// Code node: Prepare Email Data
return [{
  json: {
    subject: "Workflow Complete",
    message: `Result: ${$json.result}`,
    recipient: $json.email
  }
}];
```

Then in Email node:
```
subject: ={{ $json.subject }}
message: ={{ $json.message }}
sendTo: ={{ $json.recipient }}
```

**❌ Incorrect Approach:**
```
message: {{ $('Previous Node').item.json.nested['field'] }}
```

---

### Mistake #4: SMTP Email on n8n Cloud

**What to check:** Email Send nodes on n8n Cloud

**Validation:**
```javascript
// Check if using Email Send (SMTP) node
const emailNodes = $workflow.nodes.filter(n =>
  n.type === 'n8n-nodes-base.emailSend'
);

const issues = [];

if (emailNodes.length > 0) {
  issues.push({
    nodes: emailNodes.map(n => n.name),
    issue: 'Using SMTP Email Send node on n8n Cloud',
    fix: 'Replace with Gmail node using OAuth2',
    severity: 'HIGH',
    error: 'This will fail with "access to env vars denied" error'
  });
}

return [{json: {issues: issues, passed: issues.length === 0}}];
```

**Manual Check:**
1. Check if you're on n8n Cloud (not self-hosted)
2. Look for "Email Send" or "Send Email" nodes
3. Verify node type is `n8n-nodes-base.gmail` (not `emailSend`)
4. Confirm Gmail OAuth2 credential is configured

**✅ Correct for n8n Cloud:**
```json
{
  "name": "Send Email",
  "type": "n8n-nodes-base.gmail",
  "credentials": {
    "gmailOAuth2": "Gmail OAuth2 Account"
  }
}
```

**❌ Incorrect for n8n Cloud:**
```json
{
  "name": "Send Email",
  "type": "n8n-nodes-base.emailSend",
  "credentials": {
    "smtp": "SMTP Account"
  }
}
```

---

### Mistake #5: Wrong Code Node Return Format

**What to check:** All Code nodes for proper return format

**Validation Script:**
```javascript
// Check return statements in Code nodes
const codeNodes = $workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');
const issues = [];

codeNodes.forEach(node => {
  const code = node.parameters.jsCode || '';

  // Check for incorrect return patterns
  const hasObjectReturn = /return\s*{\s*json:/.test(code) && !/return\s*\[/.test(code);

  if (hasObjectReturn) {
    issues.push({
      node: node.name,
      issue: 'Code node returns object instead of array',
      fix: 'Change return {json: {...}} to return [{json: {...}}]',
      severity: 'HIGH'
    });
  }
});

return [{json: {issues: issues, passed: issues.length === 0}}];
```

**Manual Check:**
1. Open each Code node
2. Find all `return` statements
3. Verify format is `return [{json: {...}}]`
4. Test with "Execute Node"

**✅ Correct Format:**
```javascript
// Single item
return [{json: {result: "data"}}];

// Multiple items
return [
  {json: {id: 1}},
  {json: {id: 2}}
];

// Empty (no items)
return [];
```

**❌ Incorrect Format:**
```javascript
// Missing array wrapper
return {json: {result: "data"}};

// Plain object
return {result: "data"};

// Undefined
return;
```

---

### Mistake #6: Wrong Gemini API Authentication

**What to check:** Gemini API calls for correct authentication

**Validation:**
```javascript
// Check HTTP Request nodes calling Gemini API
const httpNodes = $('HTTP Request').all();
const issues = [];

httpNodes.forEach((node, index) => {
  const params = node.json.parameters;
  const url = params.url || '';

  if (url.includes('generativelanguage.googleapis.com')) {
    // Check if using Bearer token (incorrect)
    const authHeader = params.headerParameters?.parameters?.find(
      h => h.name === 'Authorization'
    );

    if (authHeader) {
      issues.push({
        node: `HTTP Request ${index + 1}`,
        issue: 'Gemini API using Authorization header (Bearer token)',
        fix: 'Remove Authorization header, use ?key=API_KEY query parameter',
        severity: 'HIGH'
      });
    }

    // Check if using query parameter (correct)
    if (!url.includes('?key=')) {
      issues.push({
        node: `HTTP Request ${index + 1}`,
        issue: 'Gemini API missing query parameter authentication',
        fix: 'Add ?key={{ $env.GEMINI_API_KEY }} to URL',
        severity: 'HIGH'
      });
    }
  }
});

return [{json: {issues: issues, passed: issues.length === 0}}];
```

**Manual Check:**
1. Find HTTP Request nodes calling Gemini API
2. Check URL includes `?key=API_KEY`
3. Verify NO Authorization header is set
4. Test with "Execute Node"

**✅ Correct Configuration:**
```json
{
  "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{ $env.GEMINI_API_KEY }}",
  "authentication": "none",
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
}
```

**❌ Incorrect Configuration:**
```json
{
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer {{ $env.GEMINI_API_KEY }}"
      }
    ]
  }
}
```

---

## Complete Pre-Deployment Checklist

From BEST_PRACTICES.md (lines 206-226):

### 1. Configuration Validation

```
□ All credentials properly configured in n8n UI
□ Environment variables set in Settings → Variables
□ Webhook endpoints configured with correct URL
□ Schedule/Cron expressions validated (use crontab.guru)
□ API endpoints use correct URLs (staging vs production)
□ Timeout values appropriate for operations (default 30s)
□ Batch sizes configured for large datasets (50-100 for APIs)
```

### 2. Data Flow Validation

```
□ Manual trigger test successful
□ Data flows correctly between all nodes
□ Expressions evaluate as expected (test in Expression Editor)
□ Variables from previous nodes accessible
□ No "undefined" or "null" in critical fields
□ Arrays/objects properly formatted
□ Date/time fields in correct timezone
```

### 3. Error Handling Validation

```
□ Error handling implemented (continueOnFail or Error Trigger)
□ Retry logic configured for transient errors
□ Error notifications set up (Slack/Email)
□ Error logging configured (DB/File/External service)
□ Fallback paths tested
□ All error paths lead to resolution (no dead ends)
□ Webhook error responses return proper status codes
```

### 4. Security Validation

```
□ No API keys hardcoded in workflow JSON
□ Credentials use n8n's credential system
□ Sensitive data not logged to console
□ Webhook endpoints use authentication if needed
□ HTTPS used for all API calls
□ No credentials committed to git
□ Environment variables used for secrets
```

### 5. Performance Validation

```
□ No infinite loops (max iteration limits set)
□ Large datasets use batch processing
□ Rate limits respected (exponential backoff implemented)
□ Database queries optimized (indexes, limits)
□ HTTP request timeouts configured appropriately
□ Memory-intensive operations split into batches
□ No unnecessary data transformations in loops
```

### 6. Testing Validation

```
□ Manual test execution successful
□ Edge cases tested (empty data, null values, malformed input)
□ Error scenarios tested (API failures, timeouts, invalid data)
□ Load testing completed for high-volume workflows
□ All branches of IF nodes tested
□ Schedule trigger tested (use manual test first)
□ Webhook trigger tested with real payload
□ End-to-end test with production-like data
```

---

## Automated Validation Workflow

Create this workflow to automatically validate other workflows:

```json
{
  "name": "Workflow Validator",
  "nodes": [
    {
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "parameters": {}
    },
    {
      "name": "Get Workflow JSON",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "=https://your-n8n-instance.com/api/v1/workflows/{{ $json.workflowId }}",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-N8N-API-KEY",
              "value": "={{ $env.N8N_API_KEY }}"
            }
          ]
        }
      }
    },
    {
      "name": "Run Validations",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const workflow = $json;\nconst issues = [];\n\n// Validation 1: Check HTTP Request nodes\nconst httpNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');\nhttpNodes.forEach(node => {\n  if (node.parameters.contentType === 'json' && \n      (node.parameters.body?.includes('={{') || node.parameters.jsonBody?.includes('={{'))) {\n    issues.push({\n      node: node.name,\n      type: 'CRITICAL_MISTAKE_1',\n      message: 'HTTP Request using contentType json with expressions',\n      fix: 'Change to contentType: raw'\n    });\n  }\n  \n  // Check Gemini API auth\n  if (node.parameters.url?.includes('generativelanguage.googleapis.com')) {\n    const hasAuthHeader = node.parameters.headerParameters?.parameters?.some(\n      h => h.name === 'Authorization'\n    );\n    if (hasAuthHeader) {\n      issues.push({\n        node: node.name,\n        type: 'CRITICAL_MISTAKE_6',\n        message: 'Gemini API using Bearer token instead of query param',\n        fix: 'Remove Authorization header, add ?key=API_KEY to URL'\n      });\n    }\n  }\n});\n\n// Validation 2: Check Code nodes\nconst codeNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');\ncodeNodes.forEach(node => {\n  const code = node.parameters.jsCode || '';\n  \n  if (code.includes('$credentials')) {\n    issues.push({\n      node: node.name,\n      type: 'CRITICAL_MISTAKE_2',\n      message: 'Code node accessing $credentials (not available)',\n      fix: 'Use $env.VARIABLE_NAME instead'\n    });\n  }\n  \n  // Check return format\n  const hasObjectReturn = /return\\s*{\\s*json:/.test(code) && !/return\\s*\\[/.test(code);\n  if (hasObjectReturn) {\n    issues.push({\n      node: node.name,\n      type: 'CRITICAL_MISTAKE_5',\n      message: 'Code node returns object instead of array',\n      fix: 'Change to return [{json: {...}}]'\n    });\n  }\n});\n\n// Validation 3: Check Email nodes on Cloud\nconst smtpNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.emailSend');\nif (smtpNodes.length > 0) {\n  issues.push({\n    nodes: smtpNodes.map(n => n.name),\n    type: 'CRITICAL_MISTAKE_4',\n    message: 'Using SMTP email node (fails on n8n Cloud)',\n    fix: 'Replace with Gmail node using OAuth2'\n  });\n}\n\n// Validation 4: Check error handling\nconst nodesWithoutErrorHandling = workflow.nodes.filter(n => \n  ['httpRequest', 'postgres', 'mysql'].includes(n.type.split('.').pop()) &&\n  !n.continueOnFail && !n.retryOnFail\n).length;\n\nif (nodesWithoutErrorHandling > 0) {\n  issues.push({\n    type: 'WARNING',\n    message: `${nodesWithoutErrorHandling} critical nodes without error handling`,\n    fix: 'Add continueOnFail or retryOnFail, or create Error Trigger workflow'\n  });\n}\n\n// Summary\nconst criticalIssues = issues.filter(i => i.type.includes('CRITICAL_MISTAKE'));\nconst warnings = issues.filter(i => i.type === 'WARNING');\n\nreturn [{\n  json: {\n    workflowId: workflow.id,\n    workflowName: workflow.name,\n    validation: {\n      passed: issues.length === 0,\n      totalIssues: issues.length,\n      criticalIssues: criticalIssues.length,\n      warnings: warnings.length\n    },\n    issues: issues,\n    timestamp: new Date().toISOString()\n  }\n}];"
      }
    },
    {
      "name": "Check Validation Result",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.validation.passed }}",
              "operation": "equal",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "name": "Validation Passed",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return [{\n  json: {\n    status: 'PASSED',\n    message: `✅ Workflow \"${$json.workflowName}\" passed all validations`,\n    details: $json\n  }\n}];"
      }
    },
    {
      "name": "Validation Failed - Report Issues",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#workflow-alerts",
        "text": "=⚠️ *Workflow Validation Failed*\\n\\n*Workflow:* {{ $json.workflowName }}\\n*Critical Issues:* {{ $json.validation.criticalIssues }}\\n*Warnings:* {{ $json.validation.warnings }}\\n\\n*Issues:*\\n{{ $json.issues.map(i => `• [${i.type}] ${i.node || 'General'}: ${i.message}\\n  Fix: ${i.fix}`).join('\\n') }}"
      }
    }
  ]
}
```

---

## Common Validation Failures

### Configuration Issues

**Issue:** "Cannot read property 'json' of undefined"
**Cause:** Previous node didn't output data or wrong node reference
**Validation:**
```javascript
// In Code node
const items = $input.all();
if (items.length === 0) {
  throw new Error('No input data - check previous node');
}
```

**Issue:** "Expression not evaluating"
**Cause:** Using "Fixed" mode instead of "Expression" mode
**Validation:** Click field → Check for `=` prefix → Should show "Expression" mode

**Issue:** "Credential not found"
**Cause:** Credential deleted or renamed, or not properly configured
**Validation:** Settings → Credentials → Verify credential exists and is valid

---

### Data Flow Issues

**Issue:** Empty output from Code node
**Cause:** Not returning array format, or returning empty array
**Validation:**
```javascript
// Always return array with at least one item for debugging
const result = processData($input.all());

if (!result || result.length === 0) {
  console.log('WARNING: Empty result');
  return [{json: {debug: 'No data processed', inputCount: $input.all().length}}];
}

return result;
```

**Issue:** "Cannot access field of undefined"
**Cause:** Attempting to access nested data that doesn't exist
**Validation:**
```javascript
// Use optional chaining and defaults
const value = $json?.nested?.field ?? 'default';
```

---

### Performance Issues

**Issue:** Workflow timeout
**Cause:** Processing too much data at once, or API call hanging
**Validation:**
- Check HTTP Request timeout settings (default 30s)
- Use batch processing for large datasets
- Add logging to identify slow nodes

**Issue:** Rate limit errors (429)
**Cause:** Making too many API requests too quickly
**Validation:**
- Implement exponential backoff (see error-handling-implementer.md)
- Add delay between batch operations
- Check API rate limit documentation

---

## Validation Report Template

Use this template to document validation results:

```markdown
# Workflow Validation Report

**Workflow:** [Name]
**Validated By:** [Your Name]
**Date:** [YYYY-MM-DD]
**Status:** [PASSED / FAILED / PASSED WITH WARNINGS]

## Critical Mistakes Check

- [ ] Mistake #1: HTTP Request contentType ✅ PASSED
- [ ] Mistake #2: Code node $credentials ✅ PASSED
- [ ] Mistake #3: Nested expressions ✅ PASSED
- [ ] Mistake #4: SMTP on Cloud ✅ PASSED
- [ ] Mistake #5: Code return format ✅ PASSED
- [ ] Mistake #6: Gemini API auth ✅ PASSED

## Configuration Validation

- [ ] Credentials configured ✅ PASSED
- [ ] Environment variables set ✅ PASSED
- [ ] Webhooks configured ⚠️ WARNING: Need to add signature verification
- [ ] Schedules validated ✅ PASSED

## Testing Results

- [ ] Manual test ✅ PASSED
- [ ] Edge cases ✅ PASSED
- [ ] Error scenarios ✅ PASSED
- [ ] Load test ❌ FAILED: Timeout with 1000+ items

## Issues Found

1. **[MEDIUM]** Batch processing needed
   - Node: "Process Items"
   - Issue: Timeout with large datasets
   - Fix: Add Split In Batches node with batch size 100

2. **[LOW]** Missing error notification
   - Fix: Add Slack alert for API failures

## Recommendations

1. Implement batch processing for scalability
2. Add error notification to Error Trigger workflow
3. Set up monitoring dashboard
4. Schedule load test before production deployment

## Approval

- [ ] Ready for production deployment
- [ ] Requires fixes before deployment

**Notes:** Fix batch processing issue before deploying. All critical validations passed.
```

---

## Integration with Other Skills

- **After validation failures:** Use `n8n-troubleshooter.md` to fix issues
- **For missing error handling:** Use `error-handling-implementer.md`
- **For production hardening:** Use `best-practices-applier.md`
- **For testing:** Use templates in `workflow-templates/`

---

## Quick Commands

**Run all validations:**
1. Copy "Automated Validation Workflow" above
2. Import into n8n
3. Configure with workflow ID to validate
4. Execute and review issues

**Manual validation (5 minutes):**
1. Open checklist in this document
2. Check each item systematically
3. Fix any issues found
4. Re-test before deployment

**Emergency pre-deploy check:**
```
1. Execute workflow manually - does it work?
2. Check for any red error indicators
3. Verify credentials are valid
4. Test one error scenario
5. Deploy
```

---

## Summary

**Validation prevents:**
- 95% of common deployment failures
- Hours of debugging production issues
- Data loss from unhandled errors
- Security vulnerabilities from exposed credentials

**Time investment:** 5-15 minutes per workflow
**Time saved:** Hours of troubleshooting + prevented downtime

**Remember:** All 6 critical mistakes are 100% preventable with proper validation.

**Reference:**
- LESSONS_LEARNED.md (lines 17-339) - All 6 mistakes
- BEST_PRACTICES.md (lines 206-226) - Testing checklist
