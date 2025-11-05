# Error Handling Implementer

**Purpose:** Add production-grade error handling to n8n workflows including retry logic, exponential backoff, error notifications, and logging.

**When to use this skill:** When hardening workflows for production, implementing resilient API integrations, or adding comprehensive error recovery.

---

## Core Capabilities

1. **Add exponential backoff retry logic** to failed API calls
2. **Implement Error Trigger workflows** for global error handling
3. **Configure node-level error handling** (continueOnFail, retryOnFail)
4. **Set up error notifications** (Slack, Email, SMS)
5. **Create error logging systems** (Database, File, External service)
6. **Build fallback execution paths** for graceful degradation

---

## Reference Architecture

From `error-handling-retry.json` template:

```
Trigger → API Call → Check Success → Success Path
                ↓ (error)
          Check Retry Logic
                ↓
          Should Retry? → Wait (Exponential) → Retry API Call
                ↓ (no)
          Log Error → Notify Team → Fallback Action
```

---

## Implementation Patterns

### Pattern 1: Node-Level Error Handling

**When to use:** For simple retry scenarios with consistent wait times.

**Configuration:**
```json
{
  "name": "API Call with Auto-Retry",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/endpoint"
  },
  "continueOnFail": true,
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 5000
}
```

**Properties:**
- `continueOnFail: true` - Workflow continues even if node fails
- `retryOnFail: true` - Automatically retry on failure
- `maxTries: 3` - Total attempts (1 initial + 2 retries)
- `waitBetweenTries: 5000` - Fixed 5 second wait between attempts

**Best for:**
- Temporary network issues
- Transient API errors
- Simple retry scenarios
- Non-critical operations

**Limitations:**
- Fixed wait time (no exponential backoff)
- No custom retry logic
- Limited error inspection

---

### Pattern 2: Exponential Backoff with Custom Logic

**When to use:** For rate-limited APIs, complex retry conditions, or when you need control over retry behavior.

**Full Implementation:**

#### Step 1: HTTP Request with Error Capture

```json
{
  "name": "API Call",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/endpoint",
    "options": {
      "response": {
        "response": {
          "fullResponse": true
        }
      }
    }
  },
  "continueOnFail": true
}
```

**Note:** `fullResponse: true` gives access to statusCode, headers, and body.

#### Step 2: Check Response Success

```json
{
  "name": "Check Response",
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

**Connections:**
- `main[0]` → Success path
- `main[1]` → Retry logic path

#### Step 3: Calculate Retry Logic

```javascript
// Code node: "Calculate Retry"
const attempt = $json.attempt || 0;
const maxRetries = 5;
const baseWait = 1000; // 1 second
const maxWait = 32000; // 32 seconds cap

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (capped)
const waitTime = Math.min(Math.pow(2, attempt) * baseWait, maxWait);

// Check if should retry
if (attempt < maxRetries) {
  return [{
    json: {
      shouldRetry: true,
      attempt: attempt + 1,
      waitTime: waitTime,
      waitTimeFormatted: `${waitTime / 1000}s`,
      originalRequest: $input.first().json.originalRequest || $input.first().json,
      error: $input.first().json.error || 'API call failed'
    }
  }];
} else {
  // Max retries exceeded
  return [{
    json: {
      shouldRetry: false,
      attempt: attempt,
      error: 'Max retries exceeded',
      originalRequest: $input.first().json.originalRequest || $input.first().json
    }
  }];
}
```

#### Step 4: Route Based on Retry Decision

```json
{
  "name": "Should Retry?",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.shouldRetry }}",
          "operation": "equal",
          "value2": true
        }
      ]
    }
  }
}
```

**Connections:**
- `main[0]` → Wait node → Loop back to API Call
- `main[1]` → Log Error → Notify → Stop

#### Step 5: Wait with Exponential Backoff

```json
{
  "name": "Wait Before Retry",
  "type": "n8n-nodes-base.wait",
  "parameters": {
    "unit": "ms",
    "amount": "={{ $json.waitTime }}"
  }
}
```

**Connect back to:** Original API Call node (creates retry loop)

**Important:** Add attempt counter to API Call request body or headers to pass retry state.

---

### Pattern 3: Error Trigger Global Handler

**When to use:** For centralized error monitoring and alerting across ALL workflows.

**Implementation:**

#### Create Error Handler Workflow

```json
{
  "name": "Global Error Handler",
  "nodes": [
    {
      "name": "Error Trigger",
      "type": "n8n-nodes-base.errorTrigger",
      "position": [0, 0]
    },
    {
      "name": "Extract Error Info",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const errorData = $input.first().json;\n\nreturn [{\n  json: {\n    workflowId: errorData.execution?.workflowData?.id || 'unknown',\n    workflowName: errorData.execution?.workflowData?.name || 'unknown',\n    executionId: errorData.execution?.id || 'unknown',\n    nodeName: errorData.execution?.data?.resultData?.error?.node?.name || 'unknown',\n    errorMessage: errorData.execution?.data?.resultData?.error?.message || 'No error message',\n    errorStack: errorData.execution?.data?.resultData?.error?.stack || '',\n    timestamp: new Date().toISOString(),\n    severity: errorData.execution?.data?.resultData?.error?.httpCode >= 500 ? 'CRITICAL' : 'ERROR'\n  }\n}];"
      }
    },
    {
      "name": "Log to Database",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "workflow_errors",
        "columns": "workflow_id,workflow_name,execution_id,node_name,error_message,error_stack,timestamp,severity",
        "values": "={{ $json.workflowId }},={{ $json.workflowName }},={{ $json.executionId }},={{ $json.nodeName }},={{ $json.errorMessage }},={{ $json.errorStack }},={{ $json.timestamp }},={{ $json.severity }}"
      }
    },
    {
      "name": "Check Severity",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.severity }}",
              "operation": "equal",
              "value2": "CRITICAL"
            }
          ]
        }
      }
    },
    {
      "name": "Alert Team - Critical",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts-critical",
        "text": "=🚨 CRITICAL ERROR\n\n*Workflow:* {{ $json.workflowName }}\n*Node:* {{ $json.nodeName }}\n*Error:* {{ $json.errorMessage }}\n*Execution:* {{ $json.executionId }}\n*Time:* {{ $json.timestamp }}\n\n@channel"
      }
    },
    {
      "name": "Alert Team - Standard",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts",
        "text": "=⚠️ Workflow Error\n\n*Workflow:* {{ $json.workflowName }}\n*Node:* {{ $json.nodeName }}\n*Error:* {{ $json.errorMessage }}\n*Time:* {{ $json.timestamp }}"
      }
    }
  ],
  "connections": {
    "Error Trigger": {
      "main": [[{"node": "Extract Error Info"}]]
    },
    "Extract Error Info": {
      "main": [[{"node": "Log to Database"}]]
    },
    "Log to Database": {
      "main": [[{"node": "Check Severity"}]]
    },
    "Check Severity": {
      "main": [
        [{"node": "Alert Team - Critical"}],
        [{"node": "Alert Team - Standard"}]
      ]
    }
  }
}
```

**Database Schema:**
```sql
CREATE TABLE workflow_errors (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255),
  workflow_name VARCHAR(255),
  execution_id VARCHAR(255),
  node_name VARCHAR(255),
  error_message TEXT,
  error_stack TEXT,
  timestamp TIMESTAMP,
  severity VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_errors_timestamp ON workflow_errors(timestamp);
CREATE INDEX idx_workflow_errors_severity ON workflow_errors(severity);
```

---

### Pattern 4: Graceful Degradation with Fallback

**When to use:** When you can provide alternative data or functionality if primary source fails.

**Example: Multi-Provider API Fallback**

```
Try Primary API (OpenAI)
  ↓ (fail)
Try Secondary API (Claude)
  ↓ (fail)
Try Tertiary API (Gemini)
  ↓ (fail)
Use Cached Response or Default
```

**Implementation:**

```javascript
// Code node: "Try Primary API"
try {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{role: 'user', content: $json.prompt}]
    })
  });

  if (response.ok) {
    const data = await response.json();
    return [{
      json: {
        success: true,
        provider: 'OpenAI',
        result: data.choices[0].message.content
      }
    }];
  } else {
    throw new Error(`OpenAI API failed: ${response.status}`);
  }
} catch (error) {
  return [{
    json: {
      success: false,
      provider: 'OpenAI',
      error: error.message,
      tryFallback: true,
      originalPrompt: $json.prompt
    }
  }];
}
```

**Then add IF node:**
```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.success }}",
        "operation": "equal",
        "value2": true
      }
    ]
  }
}
```

**Connections:**
- `main[0]` → Success path (return result)
- `main[1]` → Try Secondary API → Try Tertiary → Use Default

---

## Error Notification Templates

### Slack Critical Alert

```json
{
  "name": "Slack Alert - Critical",
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#alerts-critical",
    "text": "=🚨 *CRITICAL WORKFLOW FAILURE*\n\n*Workflow:* {{ $workflow.name }}\n*Execution ID:* {{ $execution.id }}\n*Failed Node:* {{ $json.nodeName }}\n*Error Type:* {{ $json.errorType }}\n*Error Message:*\n```\n{{ $json.errorMessage }}\n```\n*Time:* {{ $now.format('YYYY-MM-DD HH:mm:ss') }}\n*Retry Attempts:* {{ $json.attempt }}/{{ $json.maxRetries }}\n\n*Action Required:* @channel\n\n<https://your-n8n-instance.com/execution/{{ $execution.id }}|View Execution>",
    "otherOptions": {
      "includeLinkToWorkflow": true
    }
  }
}
```

### Email Detailed Error Report

```json
{
  "name": "Email Error Report",
  "type": "n8n-nodes-base.gmail",
  "parameters": {
    "sendTo": "ops-team@company.com",
    "subject": "=[{{ $json.severity }}] Workflow Error: {{ $workflow.name }}",
    "message": "=<h2>Workflow Error Report</h2>\n\n<table>\n  <tr><th>Workflow</th><td>{{ $workflow.name }}</td></tr>\n  <tr><th>Execution ID</th><td>{{ $execution.id }}</td></tr>\n  <tr><th>Failed Node</th><td>{{ $json.nodeName }}</td></tr>\n  <tr><th>Error</th><td>{{ $json.errorMessage }}</td></tr>\n  <tr><th>Timestamp</th><td>{{ $now.format('YYYY-MM-DD HH:mm:ss') }}</td></tr>\n  <tr><th>Severity</th><td><strong>{{ $json.severity }}</strong></td></tr>\n</table>\n\n<h3>Stack Trace</h3>\n<pre>{{ $json.errorStack }}</pre>\n\n<h3>Input Data</h3>\n<pre>{{ JSON.stringify($json.inputData, null, 2) }}</pre>\n\n<p><a href=\"https://your-n8n-instance.com/execution/{{ $execution.id }}\">View Execution Details</a></p>",
    "options": {
      "htmlBody": true
    }
  }
}
```

### SMS Alert for Critical Failures

```json
{
  "name": "SMS Alert",
  "type": "n8n-nodes-base.twilio",
  "parameters": {
    "resource": "sms",
    "operation": "send",
    "from": "+1234567890",
    "to": "+1987654321",
    "message": "=🚨 CRITICAL: {{ $workflow.name }} failed. Node: {{ $json.nodeName }}. Check n8n immediately."
  }
}
```

---

## Error Logging Implementations

### 1. Database Logging (Recommended for Production)

```sql
-- Create error log table
CREATE TABLE n8n_error_logs (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255),
  workflow_name VARCHAR(255),
  execution_id VARCHAR(255) UNIQUE,
  node_name VARCHAR(255),
  error_type VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,
  input_data JSONB,
  retry_count INTEGER DEFAULT 0,
  severity VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_error_logs_created ON n8n_error_logs(created_at DESC);
CREATE INDEX idx_error_logs_workflow ON n8n_error_logs(workflow_id);
CREATE INDEX idx_error_logs_severity ON n8n_error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON n8n_error_logs(resolved) WHERE resolved = FALSE;
```

**Insert Error:**
```json
{
  "name": "Log Error to Database",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "insert",
    "table": "n8n_error_logs",
    "columns": "workflow_id,workflow_name,execution_id,node_name,error_type,error_message,error_stack,input_data,retry_count,severity",
    "additionalFields": {
      "values": "={{ $workflow.id }},={{ $workflow.name }},={{ $execution.id }},={{ $json.nodeName }},={{ $json.errorType }},={{ $json.errorMessage }},={{ $json.errorStack }},={{ JSON.stringify($json.inputData) }},={{ $json.retryCount }},={{ $json.severity }}"
    },
    "options": {
      "queryBatching": "off"
    }
  }
}
```

### 2. File Logging (Simple Alternative)

```javascript
// Code node: "Log Error to File"
const fs = require('fs');
const path = require('path');

const errorLog = {
  timestamp: new Date().toISOString(),
  workflowId: $workflow.id,
  workflowName: $workflow.name,
  executionId: $execution.id,
  nodeName: $json.nodeName,
  errorMessage: $json.errorMessage,
  errorStack: $json.errorStack,
  inputData: $json.inputData,
  retryCount: $json.retryCount || 0
};

const logDir = '/data/error-logs';
const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);

// Ensure directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, {recursive: true});
}

// Append to log file
fs.appendFileSync(logFile, JSON.stringify(errorLog) + '\n');

return [{
  json: {
    logged: true,
    logFile: logFile,
    ...errorLog
  }
}];
```

### 3. External Service Logging (Sentry, Datadog, etc.)

```json
{
  "name": "Log to Sentry",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://sentry.io/api/0/projects/:org/:project/events/",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "=Bearer {{ $env.SENTRY_TOKEN }}"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "contentType": "raw",
    "body": "={{ JSON.stringify({\n  message: $json.errorMessage,\n  level: $json.severity.toLowerCase(),\n  logger: 'n8n-workflow',\n  platform: 'node',\n  tags: {\n    workflow_id: $workflow.id,\n    workflow_name: $workflow.name,\n    node_name: $json.nodeName\n  },\n  extra: {\n    execution_id: $execution.id,\n    input_data: $json.inputData,\n    retry_count: $json.retryCount\n  }\n}) }}"
  }
}
```

---

## Complete Example: Production-Ready API Integration

Here's a complete workflow combining all error handling patterns:

```json
{
  "name": "Production API Integration with Error Handling",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "api-integration",
        "responseMode": "responseNode"
      },
      "position": [0, 0]
    },
    {
      "name": "Validate Input",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const input = $input.first().json;\n\nif (!input.apiKey || !input.data) {\n  throw new Error('Missing required fields: apiKey or data');\n}\n\nreturn [{\n  json: {\n    apiKey: input.apiKey,\n    data: input.data,\n    attempt: 0,\n    timestamp: new Date().toISOString()\n  }\n}];"
      },
      "position": [200, 0],
      "continueOnFail": true
    },
    {
      "name": "API Call",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://api.example.com/process",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $json.apiKey }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "contentType": "raw",
        "body": "={{ JSON.stringify($json.data) }}",
        "options": {
          "response": {
            "response": {
              "fullResponse": true
            }
          },
          "timeout": 30000
        }
      },
      "position": [400, 0],
      "continueOnFail": true
    },
    {
      "name": "Check Success",
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
      },
      "position": [600, 0]
    },
    {
      "name": "Success Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "options": {
          "responseBody": "={{ JSON.stringify({success: true, data: $json.body}) }}"
        }
      },
      "position": [800, -100]
    },
    {
      "name": "Calculate Retry",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const attempt = $json.attempt || 0;\nconst maxRetries = 5;\nconst waitTime = Math.pow(2, attempt) * 1000;\n\nif (attempt < maxRetries) {\n  return [{\n    json: {\n      shouldRetry: true,\n      attempt: attempt + 1,\n      waitTime: waitTime,\n      originalData: $json\n    }\n  }];\n} else {\n  return [{\n    json: {\n      shouldRetry: false,\n      attempt: attempt,\n      error: 'Max retries exceeded',\n      originalData: $json\n    }\n  }];\n}"
      },
      "position": [800, 100]
    },
    {
      "name": "Should Retry?",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.shouldRetry }}",
              "operation": "equal",
              "value2": true
            }
          ]
        }
      },
      "position": [1000, 100]
    },
    {
      "name": "Wait",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "unit": "ms",
        "amount": "={{ $json.waitTime }}"
      },
      "position": [1200, 0]
    },
    {
      "name": "Log Error",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "n8n_error_logs",
        "columns": "workflow_name,execution_id,error_message,retry_count,severity",
        "additionalFields": {
          "values": "={{ $workflow.name }},={{ $execution.id }},={{ $json.error }},={{ $json.attempt }},CRITICAL"
        }
      },
      "position": [1200, 200]
    },
    {
      "name": "Alert Team",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts",
        "text": "=🚨 API Integration Failed\\n\\nMax retries exceeded\\nExecution: {{ $execution.id }}"
      },
      "position": [1400, 200]
    },
    {
      "name": "Error Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "options": {
          "responseCode": 500,
          "responseBody": "={{ JSON.stringify({success: false, error: $json.error}) }}"
        }
      },
      "position": [1600, 200]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Validate Input"}]]
    },
    "Validate Input": {
      "main": [[{"node": "API Call"}]]
    },
    "API Call": {
      "main": [[{"node": "Check Success"}]]
    },
    "Check Success": {
      "main": [
        [{"node": "Success Response"}],
        [{"node": "Calculate Retry"}]
      ]
    },
    "Calculate Retry": {
      "main": [[{"node": "Should Retry?"}]]
    },
    "Should Retry?": {
      "main": [
        [{"node": "Wait"}],
        [{"node": "Log Error"}]
      ]
    },
    "Wait": {
      "main": [[{"node": "API Call"}]]
    },
    "Log Error": {
      "main": [[{"node": "Alert Team"}]]
    },
    "Alert Team": {
      "main": [[{"node": "Error Response"}]]
    }
  }
}
```

---

## Best Practices Checklist

From BEST_PRACTICES.md (lines 176-226):

**Node Configuration:**
- [ ] Set `continueOnFail: true` for non-critical operations
- [ ] Configure `retryOnFail: true` for transient errors
- [ ] Set appropriate `maxTries` (3-5 for most cases)
- [ ] Use exponential backoff for rate-limited APIs

**Error Monitoring:**
- [ ] Create Error Trigger workflow for global monitoring
- [ ] Log errors to persistent storage (database preferred)
- [ ] Set up Slack/Email alerts for critical failures
- [ ] Configure execution retention (7-30 days)
- [ ] Monitor error rates and patterns

**Retry Strategy:**
- [ ] Use fixed retry for simple transient errors
- [ ] Use exponential backoff for rate limits
- [ ] Cap maximum wait time (30-60 seconds)
- [ ] Limit max retries (5-10 attempts)
- [ ] Include jitter for distributed systems

**Fallback Paths:**
- [ ] Define alternative data sources
- [ ] Provide default/cached responses
- [ ] Implement graceful degradation
- [ ] Document fallback behavior
- [ ] Test fallback paths regularly

**Notifications:**
- [ ] Critical errors → Immediate alert (SMS/Page)
- [ ] Standard errors → Slack channel
- [ ] Daily error summary → Email report
- [ ] Include execution links in alerts
- [ ] Set up on-call rotation

---

## Testing Error Handling

### Test Checklist

- [ ] **Test successful execution** - Verify normal flow works
- [ ] **Test transient failures** - Simulate temporary API errors
- [ ] **Test permanent failures** - Simulate max retries exceeded
- [ ] **Test rate limiting** - Verify exponential backoff works
- [ ] **Test error notifications** - Confirm alerts are sent
- [ ] **Test error logging** - Verify errors are persisted
- [ ] **Test fallback paths** - Ensure alternative flows work
- [ ] **Test webhook responses** - Verify error responses are correct

### Simulate Failures

**Method 1: Use IF node to force error:**
```json
{
  "name": "Simulate Error (Testing)",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $env.TEST_MODE }}",
          "operation": "equal",
          "value2": "error"
        }
      ]
    }
  }
}
```

**Method 2: Use Code node to throw error:**
```javascript
// For testing - throw error if test mode enabled
if ($env.TEST_MODE === 'error') {
  throw new Error('Simulated error for testing');
}

// Normal processing
return [{json: {result: 'success'}}];
```

**Method 3: Call invalid endpoint:**
```json
{
  "url": "=https://api.example.com/{{ $env.TEST_MODE === 'error' ? 'invalid' : 'valid' }}/endpoint"
}
```

---

## When to Use Each Pattern

| Pattern | Use Case | Complexity | Control |
|---------|----------|------------|---------|
| Node-level retry | Simple transient errors | Low | Limited |
| Exponential backoff | Rate-limited APIs | Medium | High |
| Error Trigger | Global monitoring | Medium | Medium |
| Fallback paths | Multi-provider systems | High | High |

**Decision Flow:**
1. Is it a simple transient error? → Use node-level retry
2. Does the API have rate limits? → Use exponential backoff
3. Need centralized monitoring? → Add Error Trigger workflow
4. Can you provide alternatives? → Implement fallback paths
5. Production deployment? → Combine all patterns

---

## Integration with Other Skills

- **For workflow creation:** Use `workflow-template-generator.md` with error handling
- **For troubleshooting:** Use `n8n-troubleshooter.md` to diagnose errors
- **For validation:** Use `workflow-validator.md` to check error handling is present
- **For production hardening:** Use `best-practices-applier.md` after implementing errors

---

## Quick Start Commands

**Add basic error handling to existing workflow:**
1. Set `continueOnFail: true` on critical nodes
2. Add IF node after risky operations
3. Route errors to notification node
4. Add logging for debugging

**Implement exponential backoff:**
1. Copy "Calculate Retry" Code node from examples
2. Add IF node for retry decision
3. Add Wait node with dynamic duration
4. Connect back to original API call

**Create Error Trigger workflow:**
1. New workflow → Add Error Trigger node
2. Add Code node to extract error info
3. Add database/file logging
4. Add Slack/Email notification
5. Activate workflow

---

## Summary

Error handling transforms workflows from fragile to production-ready:

**Without Error Handling:**
- Single point of failure
- No visibility into errors
- Manual investigation required
- Lost data on failures

**With Error Handling:**
- Automatic retry on transient errors
- Immediate alerts for critical issues
- Complete error audit trail
- Graceful degradation
- 99.9%+ reliability

**Time Investment:** 30-60 minutes per workflow
**Value:** Prevents hours of debugging and data loss

**Reference Templates:**
- `error-handling-retry.json` - Complete implementation
- `monitoring-health-check.json` - Health check patterns
- `api-sync-workflow.json` - Production API integration
