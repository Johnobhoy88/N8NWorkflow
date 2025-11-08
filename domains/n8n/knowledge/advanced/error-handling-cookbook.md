# n8n Error Handling Cookbook (2025)

## Table of Contents
- [Error Handling Fundamentals](#error-handling-fundamentals)
- [Retry Strategies](#retry-strategies)
- [Error Trigger Workflows](#error-trigger-workflows)
- [Try-Catch Patterns](#try-catch-patterns)
- [API Error Handling](#api-error-handling)
- [Database Error Recovery](#database-error-recovery)
- [Notification Patterns](#notification-patterns)
- [Self-Healing Workflows](#self-healing-workflows)
- [Production Patterns](#production-patterns)

---

## Error Handling Fundamentals

### Error Types in n8n

```
┌─────────────────────────────────────────┐
│  1. Node Execution Errors               │
│     - API failures (timeout, 4xx, 5xx)  │
│     - Invalid data format               │
│     - Missing credentials               │
├─────────────────────────────────────────┤
│  2. Workflow Logic Errors               │
│     - Validation failures               │
│     - Business rule violations          │
│     - Data transformation errors        │
├─────────────────────────────────────────┤
│  3. System Errors                       │
│     - Out of memory                     │
│     - Network failures                  │
│     - Database connection errors        │
└─────────────────────────────────────────┘
```

### Error Handling Options

**Per-Node Settings:**
```json
{
  "continueOnFail": true,  // Continue workflow on node failure
  "retryOnFail": true,     // Retry failed execution
  "maxTries": 3,           // Maximum retry attempts
  "waitBetweenTries": 1000 // Wait time in ms between retries
}
```

---

## Retry Strategies

### 1. Simple Retry (Linear Backoff)

**Node Configuration:**
```json
{
  "parameters": {
    "method": "GET",
    "url": "https://api.example.com/data"
  },
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 2000
}
```

**Retry Timeline:**
```
Attempt 1 ──────> Fail
         Wait 2s
Attempt 2 ──────> Fail
         Wait 2s
Attempt 3 ──────> Success ✓
```

---

### 2. Exponential Backoff

**Implementation in Code Node:**
```javascript
async function fetchWithExponentialBackoff(url, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method: 'GET',
        url: url,
        timeout: 30000
      });

      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff: 2s, 4s, 8s, 16s, 32s (max 30s)
      const backoffMs = Math.min(1000 * Math.pow(2, attempt + 1), 30000);

      console.log(`Attempt ${attempt + 1} failed. Retrying in ${backoffMs}ms...`);

      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

// Usage
const result = await fetchWithExponentialBackoff(
  `https://api.example.com/users/${$json.userId}`
);

return [{ json: result }];
```

**Backoff Timeline:**
```
Attempt 1 ──> Fail ──> Wait 2s
Attempt 2 ──> Fail ──> Wait 4s
Attempt 3 ──> Fail ──> Wait 8s
Attempt 4 ──> Fail ──> Wait 16s
Attempt 5 ──> Success ✓
```

---

### 3. Exponential Backoff with Jitter

**Prevents thundering herd problem:**
```javascript
async function fetchWithJitter(url, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method: 'GET',
        url: url
      });

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const baseBackoff = 1000 * Math.pow(2, attempt + 1);
      const jitter = Math.random() * 1000; // Random 0-1000ms
      const backoffMs = Math.min(baseBackoff + jitter, 30000);

      console.log(`Retry in ${Math.round(backoffMs)}ms (attempt ${attempt + 1}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

const result = await fetchWithJitter($json.apiUrl, 5);
return [{ json: result }];
```

---

### 4. Retry with Rate Limit Handling

**Respects 429 Too Many Requests:**
```javascript
async function fetchWithRateLimitHandling(url, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method: 'GET',
        url: url,
        returnFullResponse: true
      });

      return response.body;
    } catch (error) {
      // Check if rate limited
      if (error.statusCode === 429) {
        // Use Retry-After header if present
        const retryAfter = error.response?.headers['retry-after'];
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : 1000 * Math.pow(2, attempt + 1);

        console.log(`Rate limited. Waiting ${waitMs}ms before retry...`);

        if (waitMs > 60000) {
          throw new Error('Rate limit wait time exceeds 60s');
        }

        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      // For other errors, use exponential backoff
      if (attempt < maxRetries - 1) {
        const backoffMs = 1000 * Math.pow(2, attempt + 1);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      throw error;
    }
  }
}

const result = await fetchWithRateLimitHandling($json.url);
return [{ json: result }];
```

---

### 5. Conditional Retry (Only for Specific Errors)

```javascript
async function fetchWithConditionalRetry(url, maxRetries = 3) {
  const RETRYABLE_ERRORS = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED'
  ];

  const RETRYABLE_STATUS_CODES = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504  // Gateway Timeout
  ];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method: 'GET',
        url: url
      });

      return response;
    } catch (error) {
      const isRetryable =
        RETRYABLE_ERRORS.includes(error.code) ||
        RETRYABLE_STATUS_CODES.includes(error.statusCode);

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      const backoffMs = 1000 * Math.pow(2, attempt + 1);
      console.log(`Retryable error (${error.code || error.statusCode}). Retry in ${backoffMs}ms`);

      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

const result = await fetchWithConditionalRetry($json.url);
return [{ json: result }];
```

---

## Error Trigger Workflows

### Basic Error Handler Workflow

```
┌──────────────┐
│ Error Trigger│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Format Error │ ──┐
│   Details    │   │
└──────────────┘   │
                   │
       ┌───────────┘
       ▼
┌──────────────┐
│ Send to Slack│
└──────────────┘
```

**Error Trigger Node:**
```json
{
  "parameters": {},
  "name": "Workflow Error Handler",
  "type": "n8n-nodes-base.errorTrigger"
}
```

**Format Error (Code Node):**
```javascript
const error = $input.first().json;

const formattedError = {
  workflow: error.workflow.name,
  workflowId: error.workflow.id,
  executionId: error.execution.id,
  node: error.node?.name || 'Unknown',
  errorMessage: error.error.message,
  errorStack: error.error.stack,
  timestamp: new Date().toISOString(),
  mode: error.execution.mode,
  severity: error.error.message.includes('CRITICAL') ? 'critical' : 'error'
};

return [{ json: formattedError }];
```

**Slack Notification:**
```json
{
  "parameters": {
    "resource": "message",
    "operation": "post",
    "channel": "#workflow-errors",
    "text": "",
    "blocksUi": {
      "blocksValues": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "🚨 *Workflow Error*\n*Workflow:* {{ $json.workflow }}\n*Node:* {{ $json.node }}\n*Error:* {{ $json.errorMessage }}"
          }
        },
        {
          "type": "section",
          "fields": [
            {"type": "mrkdwn", "text": "*Execution ID:*\n{{ $json.executionId }}"},
            {"type": "mrkdwn", "text": "*Timestamp:*\n{{ $json.timestamp }}"}
          ]
        }
      ]
    }
  }
}
```

---

### Advanced Error Handler with Routing

```
┌──────────────┐
│ Error Trigger│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Classify     │
│   Error      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Switch    │
└──┬──┬──┬────┘
   │  │  │
   │  │  └──────────> [Critical] ──> PagerDuty + Email
   │  │
   │  └─────────────> [Warning]  ──> Slack
   │
   └────────────────> [Info]     ──> Log to DB
```

**Classify Error (Code Node):**
```javascript
const error = $input.first().json;

function classifyError(error) {
  const msg = error.error.message.toLowerCase();

  // Critical errors - immediate attention
  if (
    msg.includes('payment') ||
    msg.includes('database') ||
    msg.includes('critical') ||
    error.workflow.name.includes('[PROD]')
  ) {
    return 'critical';
  }

  // Warnings - can be addressed soon
  if (
    msg.includes('timeout') ||
    msg.includes('rate limit') ||
    error.execution.mode === 'manual'
  ) {
    return 'warning';
  }

  // Informational - for logging
  return 'info';
}

const severity = classifyError(error);

return [{
  json: {
    ...error,
    severity,
    alertRequired: severity === 'critical'
  }
}];
```

---

### Error Recovery Workflow

**Automatic retry of failed workflow:**
```javascript
// In Error Trigger workflow

const error = $input.first().json;

// Check if workflow should be retried
const MAX_AUTO_RETRIES = 3;
const retryCount = error.data?.retryCount || 0;

if (retryCount < MAX_AUTO_RETRIES) {
  // Wait before retry
  const backoffMs = 1000 * Math.pow(2, retryCount);
  await new Promise(resolve => setTimeout(resolve, backoffMs));

  // Re-trigger original workflow with retry count
  return [{
    json: {
      action: 'retry',
      workflowId: error.workflow.id,
      retryCount: retryCount + 1,
      originalPayload: error.data.originalPayload
    }
  }];
} else {
  // Max retries exceeded - escalate
  return [{
    json: {
      action: 'escalate',
      error: error,
      message: `Failed after ${MAX_AUTO_RETRIES} automatic retries`
    }
  }];
}
```

---

## Try-Catch Patterns

### Code Node Try-Catch with Graceful Degradation

```javascript
// Process items with error isolation

const items = $input.all();
const results = [];
const errors = [];

for (const item of items) {
  try {
    // Risky operation
    const processed = {
      id: item.json.id,
      total: item.json.items.reduce((sum, i) => sum + i.price, 0),
      processedAt: new Date().toISOString()
    };

    results.push({ json: processed });
  } catch (error) {
    // Log error but continue processing other items
    errors.push({
      json: {
        itemId: item.json.id,
        error: error.message,
        skipped: true
      }
    });
  }
}

// Return successful results
// Errors can be sent to separate output or logged
return results;
```

---

### Validate-Then-Process Pattern

```javascript
// Separate validation from processing

function validateItem(item) {
  const errors = [];

  if (!item.email) errors.push('Missing email');
  if (!item.amount || item.amount <= 0) errors.push('Invalid amount');
  if (!item.userId) errors.push('Missing userId');

  return errors;
}

function processItem(item) {
  // Safe to process - validation passed
  return {
    userId: item.userId,
    email: item.email.toLowerCase(),
    amount: parseFloat(item.amount),
    processedAt: new Date().toISOO()
  };
}

// Main logic
const items = $input.all();
const valid = [];
const invalid = [];

for (const item of items) {
  const validationErrors = validateItem(item.json);

  if (validationErrors.length > 0) {
    invalid.push({
      json: {
        ...item.json,
        validationErrors
      }
    });
  } else {
    try {
      const processed = processItem(item.json);
      valid.push({ json: processed });
    } catch (error) {
      invalid.push({
        json: {
          ...item.json,
          processingError: error.message
        }
      });
    }
  }
}

// Return valid items to continue workflow
// Invalid items can be sent to error handling branch
return valid;
```

---

## API Error Handling

### Complete API Error Handler

```javascript
async function apiRequest(config) {
  const {
    url,
    method = 'GET',
    data = null,
    maxRetries = 3
  } = config;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method,
        url,
        body: data,
        returnFullResponse: true,
        timeout: 30000
      });

      return {
        success: true,
        data: response.body,
        statusCode: response.statusCode
      };

    } catch (error) {
      const statusCode = error.statusCode || 0;

      // Handle specific error codes
      switch (statusCode) {
        case 400:
          // Bad Request - don't retry
          return {
            success: false,
            error: 'Invalid request parameters',
            details: error.response?.body,
            retryable: false
          };

        case 401:
          // Unauthorized - refresh token and retry
          console.log('Unauthorized - attempting token refresh');
          // await refreshAuthToken();
          if (attempt < maxRetries - 1) continue;
          break;

        case 404:
          // Not Found - don't retry
          return {
            success: false,
            error: 'Resource not found',
            retryable: false
          };

        case 429:
          // Rate Limited - respect Retry-After
          const retryAfter = error.response?.headers['retry-after'] || 60;
          console.log(`Rate limited. Waiting ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server Errors - retry with backoff
          if (attempt < maxRetries - 1) {
            const backoffMs = 1000 * Math.pow(2, attempt + 1);
            console.log(`Server error ${statusCode}. Retry in ${backoffMs}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
          break;

        default:
          // Network errors (ETIMEDOUT, ECONNRESET, etc)
          if (attempt < maxRetries - 1) {
            const backoffMs = 1000 * Math.pow(2, attempt + 1);
            console.log(`Network error: ${error.message}. Retry in ${backoffMs}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
      }

      // Max retries exceeded
      return {
        success: false,
        error: error.message,
        statusCode: statusCode,
        retryable: true,
        attemptsExhausted: true
      };
    }
  }
}

// Usage
const result = await apiRequest({
  url: 'https://api.example.com/users',
  method: 'POST',
  data: { name: $json.name, email: $json.email },
  maxRetries: 3
});

if (!result.success) {
  // Handle error
  throw new Error(`API request failed: ${result.error}`);
}

return [{ json: result.data }];
```

---

### GraphQL Error Handling

```javascript
async function graphqlRequest(query, variables, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method: 'POST',
        url: 'https://api.example.com/graphql',
        body: {
          query,
          variables
        }
      });

      // Check for GraphQL errors
      if (response.errors && response.errors.length > 0) {
        const error = response.errors[0];

        // Determine if retryable
        const isRetryable = error.extensions?.code === 'INTERNAL_SERVER_ERROR';

        if (isRetryable && attempt < maxRetries - 1) {
          const backoffMs = 1000 * Math.pow(2, attempt + 1);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }

        throw new Error(`GraphQL Error: ${error.message}`);
      }

      return response.data;

    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const backoffMs = 1000 * Math.pow(2, attempt + 1);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

// Usage
const query = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

const data = await graphqlRequest(query, { id: $json.userId });
return [{ json: data }];
```

---

## Database Error Recovery

### PostgreSQL Error Handling with Deadlock Recovery

```javascript
async function executeWithDeadlockRetry(query, params, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Execute query (pseudo-code - adapt to your DB node)
      const result = await $db.query(query, params);
      return result;

    } catch (error) {
      // PostgreSQL deadlock error code
      if (error.code === '40P01' && attempt < maxRetries - 1) {
        // Random backoff to reduce collision probability
        const backoffMs = Math.random() * 1000 + 500;
        console.log(`Deadlock detected. Retrying in ${backoffMs}ms (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      // Connection errors
      if (error.code === 'ECONNRESET' && attempt < maxRetries - 1) {
        const backoffMs = 1000 * Math.pow(2, attempt + 1);
        console.log(`Connection reset. Retrying in ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }
}

// Usage
const result = await executeWithDeadlockRetry(
  'UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING *',
  [100, $json.accountId],
  5
);

return [{ json: result }];
```

---

## Notification Patterns

### Multi-Channel Error Notifications

```javascript
// In Error Trigger workflow

const error = $input.first().json;

// Determine notification channels based on severity
const severity = error.error.message.includes('CRITICAL') ? 'critical' : 'warning';

const notifications = [];

if (severity === 'critical') {
  // Critical: PagerDuty + Email + Slack
  notifications.push(
    { channel: 'pagerduty', priority: 'high' },
    { channel: 'email', recipients: ['oncall@company.com'] },
    { channel: 'slack', channel: '#critical-alerts' }
  );
} else {
  // Warning: Slack only
  notifications.push(
    { channel: 'slack', channel: '#workflow-errors' }
  );
}

return [{
  json: {
    error,
    notifications,
    timestamp: new Date().toISOString()
  }
}];
```

---

## Self-Healing Workflows

### Automatic Data Correction

```javascript
// Workflow: Data Validation → Auto-Fix → Re-Process

function autoFixData(item) {
  const fixed = { ...item };
  const corrections = [];

  // Auto-fix common issues
  if (fixed.email && !fixed.email.includes('@')) {
    corrections.push('Invalid email - skipped');
    delete fixed.email;
  }

  if (fixed.phone) {
    // Normalize phone number
    const normalized = fixed.phone.replace(/\D/g, '');
    if (normalized.length === 10) {
      fixed.phone = normalized;
      corrections.push('Normalized phone number');
    }
  }

  if (fixed.amount && typeof fixed.amount === 'string') {
    fixed.amount = parseFloat(fixed.amount);
    corrections.push('Converted amount to number');
  }

  return { fixed, corrections };
}

const items = $input.all();
const results = [];

for (const item of items) {
  try {
    const { fixed, corrections } = autoFixData(item.json);

    results.push({
      json: {
        ...fixed,
        _corrections: corrections,
        _autoFixed: corrections.length > 0
      }
    });
  } catch (error) {
    results.push({
      json: {
        ...item.json,
        _error: error.message,
        _unfixable: true
      }
    });
  }
}

return results;
```

---

## Production Patterns

### Complete Error Handling Stack

```
┌──────────────┐
│ Main Workflow│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Try Block   │ ──> Success ──> Continue
│(continueOnFail│
│   = true)    │
└──────┬───────┘
       │
       │ (on error)
       ▼
┌──────────────┐
│   IF Node    │ ──> Retryable? ──> Retry Queue
│(check error) │
└──────┬───────┘
       │
       │ (not retryable)
       ▼
┌──────────────┐
│ Log to DB    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Notify Team  │
└──────────────┘
```

---

### Error Logging to Database

```javascript
// Log errors for analysis

const error = $input.first().json;

const errorLog = {
  workflow_id: error.workflow.id,
  workflow_name: error.workflow.name,
  execution_id: error.execution.id,
  node_name: error.node?.name,
  error_message: error.error.message,
  error_stack: error.error.stack,
  error_code: error.error.code,
  timestamp: new Date().toISOString(),
  severity: 'error',
  metadata: JSON.stringify({
    mode: error.execution.mode,
    retryOf: error.execution.retryOf,
    data: error.data
  })
};

// Insert to postgres (example)
// INSERT INTO error_logs (workflow_id, workflow_name, ...) VALUES ($1, $2, ...)

return [{ json: errorLog }];
```

---

## Best Practices Summary

### ✅ DO

1. **Use exponential backoff** for retries
2. **Implement circuit breakers** for failing services
3. **Log all errors** to external system
4. **Set appropriate timeouts** on all HTTP requests
5. **Validate inputs** before processing
6. **Handle errors gracefully** - don't crash entire workflow
7. **Monitor error rates** and alert on spikes
8. **Test error scenarios** regularly
9. **Document error codes** and their meanings
10. **Use Error Trigger workflows** for centralized handling

### ❌ DON'T

1. **Don't retry non-retryable errors** (400, 401, 403, 404)
2. **Don't retry indefinitely** - set max retries
3. **Don't ignore errors** silently
4. **Don't expose sensitive data** in error messages
5. **Don't use same retry strategy** for all error types
6. **Don't forget to cleanup** resources on error
7. **Don't spam notifications** - implement rate limiting
8. **Don't retry without backoff** - causes thundering herd
9. **Don't assume external APIs** will return consistent errors
10. **Don't test only happy paths**

---

**Last Updated:** January 2025
**Version:** n8n 1.0+
