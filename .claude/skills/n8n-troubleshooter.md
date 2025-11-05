# n8n Workflow Troubleshooter

**Purpose:** Diagnose workflow failures and common n8n issues with specific fixes based on battle-tested solutions from LESSONS_LEARNED.md and production patterns.

**When to use this skill:** When workflows fail, throw errors, or behave unexpectedly. Provides root cause analysis and ready-to-use fixes.

---

## Core Capabilities

1. **Parse error messages** and identify root cause from the 6 critical mistakes
2. **Provide step-by-step diagnostic flows** for systematic troubleshooting
3. **Generate ready-to-use fixes** with exact code/config changes
4. **Reference production patterns** from templates and best practices
5. **Suggest preventive measures** to avoid similar issues

---

## The 6 Critical Mistakes (Reference: LESSONS_LEARNED.md)

### Mistake #1: JSON Body Type with Expressions ❌

**Symptoms:**
- Error: "JSON parameter needs to be valid JSON"
- HTTP Request node fails with 400 error
- Request body appears as literal string `"={{ ... }}"`

**Root Cause:**
```json
{
  "contentType": "json",
  "jsonBody": "={{ JSON.stringify({...}) }}"
}
```
n8n sends expressions as LITERAL TEXT when contentType is "json", not evaluated.

**The Fix:**
```json
{
  "contentType": "raw",
  "body": "={{ JSON.stringify({contents: [{parts: [{text: $json['Your Text']}]}]}) }}"
}
```

**Why it works:** Raw body type evaluates expressions BEFORE sending.

**Validation:** Check HTTP Request logs - body should show JSON object, not string with `={{`.

---

### Mistake #2: Code Nodes Accessing $credentials ❌

**Symptoms:**
- Error: `ReferenceError: $credentials is not defined`
- Code node fails when trying to access API keys
- Works in Code Editor but fails in workflow

**Root Cause:**
```javascript
const apiKey = $credentials.googlePalmApi.apiKey;
// $credentials isn't available in Code node context
```

**The Fix:**
Use native n8n nodes with pre-configured credentials:
```json
{
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "credentials": {
    "httpHeaderAuth": {
      "id": "{{CREDENTIAL_ID}}",
      "name": "Your API Credential"
    }
  }
}
```

**Alternative (Environment Variables):**
```javascript
// In Code node - use environment variables set in n8n settings
const apiKey = $env.GEMINI_API_KEY;
```

**Why it works:** Each node type has different variable access. Credentials should be configured via n8n UI.

---

### Mistake #3: Nested Expressions in Templates ❌

**Symptoms:**
- Error: "Nested expressions are not supported"
- Email/Message templates fail to render
- Complex data access in text fields fails

**Root Cause:**
```
message: "{{ $('Form Trigger').item.json.formData['Your Text'] }}"
```

**The Fix:**
Option 1 - Simplify expressions:
```
message: "={{ $json.field }}"
```

Option 2 - Use Code node to prepare variables:
```javascript
return [{
  json: {
    emailSubject: "Your Workflow is Ready",
    emailBody: `Processed: ${$input.first().json.userInput}`,
    recipientEmail: $input.first().json.email
  }
}];
```

Then in email node:
```
subject: {{ $json.emailSubject }}
message: {{ $json.emailBody }}
sendTo: {{ $json.recipientEmail }}
```

**Why it works:** Keeps templates simple, moves complexity to Code nodes.

---

### Mistake #4: SMTP Email on n8n Cloud ❌

**Symptoms:**
- Error: "access to env vars denied [Error resolving credentials]"
- Error: "N8N_BLOCK_ENV_ACCESS_IN_NODE restriction"
- Email Send node fails with credential errors

**Root Cause:**
n8n Cloud restricts environment variable access for security. SMTP requires env var access.

**The Fix:**
```json
{
  "name": "Send Email",
  "type": "n8n-nodes-base.gmail",
  "credentials": {
    "gmailOAuth2": {
      "id": "{{CREDENTIAL_ID}}",
      "name": "Gmail OAuth2"
    }
  },
  "parameters": {
    "sendTo": "={{ $json.recipientEmail }}",
    "subject": "={{ $json.subject }}",
    "message": "={{ $json.body }}"
  }
}
```

**Setup Steps:**
1. n8n UI → Credentials → Add credential → Gmail OAuth2
2. Follow OAuth flow to connect Gmail account
3. Select credential in Gmail node

**Why it works:** Gmail OAuth2 uses n8n's built-in credential management, no env vars needed.

---

### Mistake #5: Wrong Code Node Return Format ❌

**Symptoms:**
- Error: "Return value must be an array of objects"
- Code node executes but workflow fails
- Next node receives no data

**Root Cause:**
```javascript
// ❌ WRONG
return { json: {result: "data"} };
```

**The Fix:**
```javascript
// ✅ CORRECT
return [{json: {result: "data"}}];

// Multiple items:
return [
  {json: {id: 1, name: "Item 1"}},
  {json: {id: 2, name: "Item 2"}}
];

// Empty result (no items):
return [];
```

**Why it works:** n8n processes item arrays internally. Code nodes ALWAYS return array format.

**Pattern for transformation:**
```javascript
// Transform all input items
const items = $input.all();
return items.map(item => ({
  json: {
    originalData: item.json,
    processed: transformFunction(item.json)
  }
}));
```

---

### Mistake #6: Wrong Gemini API Authentication ❌

**Symptoms:**
- Error: "contents is not specified" (400)
- Error: "Request had invalid authentication credentials" (401)
- Gemini API returns authentication errors

**Root Cause:**
```json
{
  "authentication": "genericCredentialType",
  "headers": {
    "Authorization": "Bearer {{API_KEY}}"
  }
}
```
Gemini uses query parameter auth, NOT Bearer tokens.

**The Fix:**
```json
{
  "name": "Call Gemini API",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{ $env.GEMINI_API_KEY }}",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "contentType": "raw",
    "body": "={{ JSON.stringify({contents: [{parts: [{text: $json.prompt}]}]}) }}"
  }
}
```

**Key Points:**
- ✅ Auth via query parameter: `?key=API_KEY`
- ✅ Use stable models: `gemini-2.0-flash-exp`, `gemini-1.5-pro`
- ✅ contentType: "raw" (not "json")
- ❌ NO Authorization header
- ❌ NO Bearer tokens

**Response Parsing:**
```javascript
const geminiResponse = $json.candidates[0].content.parts[0].text;
return [{json: {result: geminiResponse}}];
```

---

## Diagnostic Decision Tree

### Step 1: Identify Error Category

```
┌─ HTTP Request Errors (4xx/5xx)
│  ├─ 400 Bad Request → Check Mistake #1 (body type) or #6 (auth)
│  ├─ 401 Unauthorized → Check Mistake #6 (authentication method)
│  └─ 500 Server Error → Check API endpoint and request format
│
┌─ Node Execution Errors
│  ├─ "not defined" error → Check Mistake #2 ($credentials) or #3 (nesting)
│  ├─ "must be an array" → Check Mistake #5 (return format)
│  └─ "env vars denied" → Check Mistake #4 (SMTP on Cloud)
│
┌─ Data Flow Issues
│  ├─ Empty output → Check Code node return format (#5)
│  ├─ Expression not evaluating → Check body type (#1) or nesting (#3)
│  └─ Missing data → Check previous node output in execution logs
│
└─ Integration Issues
   ├─ Email not sending → Check Mistake #4 (use Gmail OAuth2)
   ├─ AI API fails → Check Mistake #6 (authentication)
   └─ Credential errors → Check Mistake #2 (use native nodes)
```

### Step 2: Systematic Troubleshooting Flow

**For HTTP Request Failures:**
1. Check execution logs → View "Input Data"
2. Verify contentType is "raw" (not "json") if using expressions
3. Validate authentication method (query param vs header vs Bearer)
4. Test endpoint in Postman/curl first
5. Compare working curl to n8n configuration

**For Code Node Issues:**
1. Click "Execute Node" to see output
2. Verify return format: `[{json: {...}}]`
3. Check $input.all() or $input.first() is used correctly
4. Add console.log() for debugging (visible in logs)
5. Validate no use of $credentials (use $env instead)

**For Expression Evaluation Issues:**
1. Use "Expression" mode, not "Fixed" mode
2. Avoid nested `{{ {{ }} }}`
3. Test expression in Expression Editor (gear icon)
4. Use Code node for complex transformations
5. Reference: `$json.field` or `$('NodeName').item.json.field`

**For Email/Notification Failures:**
1. On n8n Cloud: Use Gmail OAuth2 (never SMTP)
2. Verify credential is properly configured in n8n UI
3. Test with manual trigger first
4. Check sendTo, subject, message all have valid values
5. Review execution logs for specific error message

---

## Common Error Patterns & Quick Fixes

### Error: "Cannot read property 'json' of undefined"

**Cause:** Previous node didn't output data, or wrong node reference.

**Fix:**
```javascript
// Safe data access in Code node
const items = $input.all();
if (items.length === 0) {
  return [{json: {error: "No input data"}}];
}

const data = items[0].json;
// ... process data
```

**Fix in expressions:**
```
={{ $json.field ?? "default value" }}
```

---

### Error: "Unexpected token < in JSON"

**Cause:** API returned HTML error page instead of JSON.

**Fix:**
1. Enable "Full Response" in HTTP Request node
2. Check response headers and status code
3. Validate API endpoint URL is correct
4. Verify authentication is working

```json
{
  "options": {
    "response": {
      "response": {
        "fullResponse": true
      }
    }
  }
}
```

Then add IF node to check:
```javascript
$json.statusCode === 200
```

---

### Error: "Maximum call stack size exceeded"

**Cause:** Infinite loop in workflow (circular reference).

**Fix:**
1. Check workflow connections - look for cycles
2. Add loop counters in Code nodes:
```javascript
const maxIterations = 100;
const currentIteration = $json.iteration || 0;

if (currentIteration >= maxIterations) {
  return [{json: {error: "Max iterations reached", iteration: currentIteration}}];
}

return [{json: {
  result: "...",
  iteration: currentIteration + 1
}}];
```

---

### Error: "Workflow has no trigger"

**Cause:** No trigger node, or trigger node not properly connected.

**Fix:**
1. Add trigger node: Manual Trigger, Webhook, Schedule, etc.
2. Verify trigger node is at the beginning of workflow
3. Check connections: trigger → first processing node

```json
{
  "name": "Manual Trigger",
  "type": "n8n-nodes-base.manualTrigger",
  "position": [0, 0]
}
```

---

### Error: Rate Limit / 429 Too Many Requests

**Cause:** Hitting API rate limits.

**Fix:** Implement exponential backoff with retry logic.

Reference: error-handling-retry.json template

```javascript
// In Code node after failed HTTP request
const attempt = $json.attempt || 0;
const maxRetries = 5;
const waitTime = Math.pow(2, attempt) * 1000; // Exponential: 1s, 2s, 4s, 8s, 16s

if (attempt < maxRetries) {
  return [{
    json: {
      shouldRetry: true,
      attempt: attempt + 1,
      waitTime: waitTime,
      originalRequest: $json.originalRequest
    }
  }];
} else {
  return [{
    json: {
      shouldRetry: false,
      error: "Max retries exceeded",
      attempt: attempt
    }
  }];
}
```

Add Wait node after Code:
```json
{
  "parameters": {
    "unit": "ms",
    "amount": "={{ $json.waitTime }}"
  }
}
```

---

## Production Debugging Checklist

When workflow fails in production:

### 1. Check Execution Logs
- [ ] Navigate to Executions tab
- [ ] Find failed execution
- [ ] Click to view detailed logs
- [ ] Identify which node failed
- [ ] Review Input Data and Output Data for that node

### 2. Validate Credentials
- [ ] Check credential is not expired
- [ ] Test credential with manual API call
- [ ] Verify OAuth tokens are refreshed
- [ ] Confirm API keys are correct

### 3. Review Configuration
- [ ] HTTP Request: contentType is "raw" for expressions
- [ ] Code nodes: return format is `[{json: {...}}]`
- [ ] Email nodes: using Gmail OAuth2 (not SMTP) on Cloud
- [ ] Expressions: no nested `{{ {{ }} }}`
- [ ] API auth: correct method (query param for Gemini, header for Claude)

### 4. Test Incrementally
- [ ] Disable all nodes except trigger + first node
- [ ] Execute workflow manually
- [ ] Verify first node output
- [ ] Enable second node, test again
- [ ] Continue until failure point identified

### 5. Review Recent Changes
- [ ] Check git commits for workflow changes
- [ ] Compare current vs last working version
- [ ] Identify what changed before failure started

---

## Error Handling Best Practices

From BEST_PRACTICES.md (lines 176-226) and error-handling-retry.json template:

### 1. Configure Node-Level Error Handling

```json
{
  "continueOnFail": true,
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 5000
}
```

### 2. Implement Error Trigger Workflow

```
Error Trigger → Log Error (DB/File) → Notify (Slack/Email) → [Optional: Retry]
```

Example error notification:
```json
{
  "name": "Notify Error",
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#alerts",
    "text": "=🚨 Workflow Failed\n\nWorkflow: {{ $workflow.name }}\nNode: {{ $json.node.name }}\nError: {{ $json.error.message }}\nTime: {{ $now.format('YYYY-MM-DD HH:mm:ss') }}"
  }
}
```

### 3. Use IF Nodes for Error Routing

```json
{
  "name": "Check API Response",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.statusCode }}",
          "operation": "equal",
          "value2": 200
        }
      ]
    }
  }
}
```

Connections:
- main[0] → Success path
- main[1] → Error handler path

### 4. Log Critical Points

```javascript
// In Code node at critical workflow points
console.log('=== Workflow Checkpoint ===');
console.log('Node:', '{{$node.name}}');
console.log('Input data:', JSON.stringify($input.all(), null, 2));
console.log('Processing...');

// ... your logic

console.log('Output:', JSON.stringify(result, null, 2));
return [result];
```

---

## Quick Reference: Working Patterns

### HTTP Request with Expression Body (✅ Correct)

```json
{
  "name": "API Call",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/endpoint",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "x-api-key",
          "value": "={{ $env.API_KEY }}"
        }
      ]
    },
    "contentType": "raw",
    "body": "={{ JSON.stringify({prompt: $json.userInput, temperature: 0.7}) }}"
  }
}
```

### Code Node Transformation (✅ Correct)

```javascript
// Transform all input items
const items = $input.all();

// Process each item
const results = items.map(item => {
  const data = item.json;

  return {
    json: {
      id: data.id,
      processed: processFunction(data),
      timestamp: new Date().toISOString()
    }
  };
});

// Always return array
return results;
```

### Gmail Email (✅ Correct for n8n Cloud)

```json
{
  "name": "Send Email",
  "type": "n8n-nodes-base.gmail",
  "credentials": {
    "gmailOAuth2": "Gmail OAuth2"
  },
  "parameters": {
    "sendTo": "={{ $json.recipientEmail }}",
    "subject": "Workflow Complete",
    "message": "={{ $json.resultMessage }}",
    "options": {}
  }
}
```

### Exponential Backoff Retry (✅ Correct)

```javascript
// Code node after failed API call
const attempt = $json.attempt || 0;
const maxRetries = 5;
const baseWait = 1000; // 1 second

if (attempt < maxRetries) {
  const waitTime = Math.pow(2, attempt) * baseWait; // 1s, 2s, 4s, 8s, 16s

  return [{
    json: {
      shouldRetry: true,
      attempt: attempt + 1,
      waitTime: waitTime,
      originalData: $input.first().json
    }
  }];
} else {
  return [{
    json: {
      shouldRetry: false,
      error: "Max retries exceeded",
      finalAttempt: attempt,
      originalData: $input.first().json
    }
  }];
}
```

---

## AI API Troubleshooting

### Claude API (Anthropic)

**Correct Configuration:**
```json
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "headerParameters": {
    "parameters": [
      {
        "name": "x-api-key",
        "value": "={{ $env.ANTHROPIC_API_KEY }}"
      },
      {
        "name": "anthropic-version",
        "value": "2023-06-01"
      },
      {
        "name": "content-type",
        "value": "application/json"
      }
    ]
  },
  "contentType": "raw",
  "body": "={{ JSON.stringify({model: 'claude-opus-4-20250514', max_tokens: 4096, messages: [{role: 'user', content: $json.prompt}]}) }}"
}
```

**Response Parsing:**
```javascript
const response = $json.content[0].text;
return [{json: {result: response}}];
```

### Gemini API (Google)

**Correct Configuration:**
```json
{
  "method": "POST",
  "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{ $env.GEMINI_API_KEY }}",
  "authentication": "none",
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "contentType": "raw",
  "body": "={{ JSON.stringify({contents: [{parts: [{text: $json.prompt}]}]}) }}"
}
```

**Response Parsing:**
```javascript
const response = $json.candidates[0].content.parts[0].text;
return [{json: {result: response}}];
```

### OpenAI API

**Correct Configuration:**
```json
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "=Bearer {{ $env.OPENAI_API_KEY }}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "contentType": "raw",
  "body": "={{ JSON.stringify({model: 'gpt-4', messages: [{role: 'user', content: $json.prompt}]}) }}"
}
```

**Response Parsing:**
```javascript
const response = $json.choices[0].message.content;
return [{json: {result: response}}];
```

---

## When to Consult Other Skills

- **For creating new workflows:** Use `workflow-template-generator.md`
- **For AI integrations:** Use `ai-api-integration.md`
- **For error handling patterns:** Reference `error-handling-retry.json` template
- **For production hardening:** Use `best-practices-applier.md` (when created)
- **For architecture design:** Consult n8narchitect agent

---

## Communication Protocol

When diagnosing issues:

1. **Identify error category** from decision tree
2. **Reference specific mistake** from the 6 critical mistakes
3. **Provide exact fix** with code/config changes
4. **Explain why it works** in 1-2 sentences
5. **Suggest validation** to confirm fix worked

**Example Response:**
```
🔍 **Diagnosis:** This is Mistake #1 - JSON Body Type with Expressions

**Root Cause:** Your HTTP Request node has `contentType: "json"` which sends expressions as literal text.

**Fix:** Change line 47 in your HTTP Request node:
- From: `"contentType": "json"`
- To: `"contentType": "raw"`

**Why:** Raw body type evaluates expressions BEFORE sending to API.

**Validate:** Check execution logs - body should show JSON object, not string with `={{`.
```

---

## Summary

This troubleshooter references:
- **6 Critical Mistakes** from LESSONS_LEARNED.md (lines 17-161)
- **Error Handling Strategy** from BEST_PRACTICES.md (lines 176-226)
- **Production Patterns** from 5 workflow templates
- **AI API Specifications** from API_SKILLS_REFERENCE.md

**Time saved:** Documentation-first troubleshooting (25% time) beats trial-and-error (75% time).

**Reference:** LESSONS_LEARNED.md:296 - "Documentation-first (25%) > Trial-and-error (75%)"
