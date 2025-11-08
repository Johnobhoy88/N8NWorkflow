# n8n API Integration Examples & Patterns

**Date:** November 2025
**Platform:** n8n v1.x+
**Status:** Production Ready

Ready-to-use workflows and code examples for common API integration scenarios in n8n.

---

## Table of Contents

1. [HTTP Request with Authentication](#http-request-with-authentication)
2. [Error Handling & Retry Logic](#error-handling--retry-logic)
3. [Rate Limiting Implementation](#rate-limiting-implementation)
4. [Webhook Receiver Pattern](#webhook-receiver-pattern)
5. [Data Transformation Patterns](#data-transformation-patterns)
6. [Batch Processing](#batch-processing)
7. [OAuth2 Flow Implementation](#oauth2-flow-implementation)
8. [API Response Caching](#api-response-caching)

---

## HTTP Request with Authentication

### OAuth2 Bearer Token

```json
{
  "nodeType": "n8n-nodes-base.httpRequest",
  "settings": {
    "url": "https://api.example.com/v1/data",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer {{ $env.API_TOKEN }}"
    },
    "continueOnFail": false
  }
}
```

**In n8n JSON expression:**
```javascript
// Code node to refresh token if needed
const token = $env.API_TOKEN;
const refreshToken = $env.REFRESH_TOKEN;

// Check if token expires soon (store expiration in db)
const tokenExpiring = await checkTokenExpiration();

if (tokenExpiring) {
  const newTokens = await refreshAccessToken(refreshToken);
  // Store new tokens (via http request to your backend)
}

return [{ json: { token: newTokens.access_token } }];
```

### API Key in Header

```json
{
  "url": "https://api.stripe.com/v1/customers",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{ $env.STRIPE_SECRET_KEY }}",
    "Content-Type": "application/json"
  },
  "authentication": "none"
}
```

### JWT Token Creation & Usage

```javascript
// Code node to create JWT
const jwt = require('jsonwebtoken');

const payload = {
  sub: '{{ $json.userId }}',
  email: '{{ $json.email }}',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
};

const token = jwt.sign(payload, process.env.JWT_SECRET, {
  algorithm: 'HS256',
  issuer: 'n8n-workflow'
});

return [{
  json: {
    token,
    expiresIn: 3600
  }
}];
```

Then use in HTTP Request node:
```
Header: "Authorization": "Bearer {{ $json.token }}"
```

### Basic Authentication

```json
{
  "url": "https://api.example.com/v1/resource",
  "method": "GET",
  "authentication": "basic",
  "basicAuth": {
    "user": "{{ $env.API_USERNAME }}",
    "password": "{{ $env.API_PASSWORD }}"
  }
}
```

**In Code node:**
```javascript
const credentials = Buffer.from(
  `${process.env.API_USERNAME}:${process.env.API_PASSWORD}`
).toString('base64');

return [{
  json: {
    header: `Basic ${credentials}`
  }
}];
```

---

## Error Handling & Retry Logic

### Pattern 1: Exponential Backoff Retry

**Workflow Structure:**
```
HTTP Request → IF (Error Check) → Sleep Node → Loop Back
                ↓ (Success)
              Continue
```

**Implementation in Code node:**

```javascript
// Store attempt count in execution context
let attempt = context.getWorkflowDataProperty('attempt') || 0;
const maxRetries = 5;
const initialDelay = 1000; // 1 second

// Calculate exponential backoff
const delayMs = Math.pow(2, attempt) * initialDelay;
const jitter = delayMs * 0.1 * (Math.random() - 0.5);
const totalDelay = Math.min(delayMs + jitter, 3600000); // Max 1 hour

if (attempt < maxRetries) {
  context.setWorkflowDataProperty('attempt', attempt + 1);
  context.setWorkflowDataProperty('nextRetryMs', totalDelay);
  
  return [{
    json: {
      shouldRetry: true,
      attempt: attempt + 1,
      delayMs: Math.ceil(totalDelay),
      error: '{{ $json.error }}'
    }
  }];
} else {
  return [{
    json: {
      shouldRetry: false,
      maxRetriesExceeded: true,
      error: '{{ $json.error }}'
    }
  }];
}
```

**HTTP Request Configuration:**
```json
{
  "url": "{{ $json.endpoint }}",
  "method": "{{ $json.method }}",
  "body": "={{ JSON.stringify($json.body) }}",
  "contentType": "raw",
  "continueOnFail": true
}
```

**IF Node (Check for retry):**
```javascript
$json.statusCode >= 500 || $json.statusCode === 429 || $json.statusCode === 408
```

**Sleep Node:**
```javascript
{{ Math.ceil($json.delayMs) }}  // milliseconds
```

### Pattern 2: Circuit Breaker Implementation

```javascript
// Code node: Circuit Breaker Logic
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
const STORAGE_KEY = 'circuit_breaker_stripe';

let state = await $db.get(STORAGE_KEY) || {
  state: 'CLOSED',
  failureCount: 0,
  lastFailureTime: null
};

// Check if circuit should transition to HALF_OPEN
if (state.state === 'OPEN') {
  const timeSinceFailure = Date.now() - state.lastFailureTime;
  if (timeSinceFailure >= CIRCUIT_BREAKER_TIMEOUT) {
    state.state = 'HALF_OPEN';
  }
}

if (state.state === 'OPEN') {
  return [{
    json: {
      error: true,
      message: `Circuit breaker is OPEN. Service unavailable. Retry after ${CIRCUIT_BREAKER_TIMEOUT}ms`,
      circuitState: 'OPEN'
    },
    pairedItem: $json
  }];
}

// For CLOSED or HALF_OPEN, continue to API request
context.setWorkflowDataProperty('circuitBreakerState', state);

return [{
  json: {
    canProceed: true,
    circuitState: state.state
  }
}];
```

**After API Response:**
```javascript
// Update circuit breaker based on response
const state = context.getWorkflowDataProperty('circuitBreakerState');

if ($json.statusCode >= 500) {
  state.failureCount += 1;
  state.lastFailureTime = Date.now();
  
  if (state.failureCount >= 5) {
    state.state = 'OPEN';
  }
} else if ($json.statusCode < 400) {
  // Success - reset if HALF_OPEN
  if (state.state === 'HALF_OPEN') {
    state.state = 'CLOSED';
    state.failureCount = 0;
  }
}

await $db.set('circuit_breaker_stripe', state);

return [{
  json: {
    ...($json),
    circuitState: state.state
  }
}];
```

### Pattern 3: Fallback to Alternative Endpoint

```javascript
// Code node: Route to primary or fallback
const primaryEndpoint = 'https://primary-api.example.com';
const fallbackEndpoint = 'https://fallback-api.example.com';

const primaryFailed = $json.statusCode >= 500 || $json.statusCode === 429;
const useFallback = context.getWorkflowDataProperty('useFallback') || primaryFailed;

return [{
  json: {
    endpoint: useFallback ? fallbackEndpoint : primaryEndpoint,
    useFallback,
    sourceNote: useFallback ? 'Using fallback endpoint' : 'Using primary endpoint'
  }
}];
```

---

## Rate Limiting Implementation

### Token Bucket Implementation

```javascript
// Code node: Token Bucket Rate Limiter
const BUCKET_CAPACITY = 100;
const REFILL_RATE = 10; // tokens per second
const STORAGE_KEY = 'rate_limit_bucket';

let bucket = await $db.get(STORAGE_KEY) || {
  tokens: BUCKET_CAPACITY,
  lastRefillTime: Date.now()
};

// Refill tokens
const now = Date.now();
const timePassed = (now - bucket.lastRefillTime) / 1000;
const tokensToAdd = timePassed * REFILL_RATE;

bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + tokensToAdd);
bucket.lastRefillTime = now;

// Check if request can proceed
const tokensNeeded = 1;
const canProceed = bucket.tokens >= tokensNeeded;

if (canProceed) {
  bucket.tokens -= tokensNeeded;
  await $db.set(STORAGE_KEY, bucket);

  return [{
    json: {
      allowed: true,
      tokensRemaining: Math.floor(bucket.tokens),
      canProceed: true
    }
  }];
} else {
  const waitTime = (tokensNeeded - bucket.tokens) / REFILL_RATE * 1000;
  
  return [{
    json: {
      allowed: false,
      waitTimeMs: Math.ceil(waitTime),
      message: `Rate limited. Wait ${Math.ceil(waitTime)}ms before retry`,
      canProceed: false
    }
  }];
}
```

### Extract Headers from Response

```javascript
// Code node: Parse rate limit headers
const rateLimitHeaders = {
  limit: parseInt($json.headers['x-ratelimit-limit'] || '0'),
  remaining: parseInt($json.headers['x-ratelimit-remaining'] || '0'),
  reset: parseInt($json.headers['x-ratelimit-reset'] || '0')
};

const percentUsed = ((rateLimitHeaders.limit - rateLimitHeaders.remaining) / rateLimitHeaders.limit * 100).toFixed(1);

return [{
  json: {
    ...($json),
    rateLimit: rateLimitHeaders,
    percentUsed,
    isNearLimit: rateLimitHeaders.remaining / rateLimitHeaders.limit < 0.1
  }
}];
```

---

## Webhook Receiver Pattern

### Stripe Webhook Example

**n8n Webhook Trigger Node Configuration:**

```json
{
  "httpMethod": "POST",
  "path": "webhooks/stripe",
  "responseMode": "responseNode",
  "authentication": "none"
}
```

**Code Node: Verify Signature & Idempotency**

```javascript
const crypto = require('crypto');
const signature = req.headers['stripe-signature'];
const body = $binary.body; // Raw body needed for signature verification

// Verify Stripe signature
function verifyStripeSignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

const isValid = verifyStripeSignature(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

if (!isValid) {
  return [{
    json: { error: 'Invalid signature' },
    statusCode: 401
  }];
}

// Parse JSON body
const event = JSON.parse(body);

// Idempotency check
const idempotencyKey = event.id;
const alreadyProcessed = await $db.get(`webhook_${idempotencyKey}`);

if (alreadyProcessed) {
  // Return 200 but skip processing
  return [{
    json: { received: true, duplicate: true },
    statusCode: 200
  }];
}

// Mark as processing
await $db.set(`webhook_${idempotencyKey}`, {
  status: 'processing',
  receivedAt: new Date().toISOString()
});

return [{
  json: {
    received: true,
    eventType: event.type,
    eventId: event.id
  }
}];
```

**Switch Node: Route by Event Type**

```javascript
switch ($json.eventType) {
  case 'payment_intent.succeeded':
    return 0; // Route to payment success handler
  case 'payment_intent.payment_failed':
    return 1; // Route to payment failure handler
  case 'charge.refunded':
    return 2; // Route to refund handler
  default:
    return 3; // Route to logging
}
```

**Payment Success Handler:**

```javascript
// Code node: Process payment success
const event = $json;

return [{
  json: {
    action: 'process_payment',
    customerId: event.data.object.customer,
    amount: event.data.object.amount / 100,
    paymentIntentId: event.data.object.id,
    metadata: event.data.object.metadata
  }
}];
```

---

## Data Transformation Patterns

### Flatten Nested API Responses

```javascript
// Code node: Flatten response
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = value;
    } else if (Array.isArray(value)) {
      result[newKey] = value.length > 0 ? JSON.stringify(value) : null;
    } else if (typeof value === 'object') {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

const flattened = $json.data.map(item => flattenObject(item));

return [
  ...flattened.map(item => ({
    json: item,
    pairedItem: $json.pairedItem
  }))
];
```

### Rename & Map Fields

```javascript
// Code node: Map API response to internal format
const mapping = {
  'stripe_id': 'id',
  'customer_name': 'name',
  'customer_email': 'email',
  'amount_usd': 'amount',
  'status_code': 'status',
  'created_timestamp': 'createdAt'
};

const mapped = {};

for (const [apiField, internalField] of Object.entries(mapping)) {
  if (apiField in $json) {
    mapped[internalField] = $json[apiField];
  }
}

// Add computed fields
mapped.processedAt = new Date().toISOString();
mapped.source = 'stripe_api';

return [{
  json: mapped
}];
```

### Format Dates & Numbers

```javascript
// Code node: Format data
function formatDate(date, format = 'ISO') {
  const d = new Date(date);
  
  if (format === 'ISO') {
    return d.toISOString();
  } else if (format === 'UNIX') {
    return Math.floor(d.getTime() / 1000);
  } else if (format === 'US') {
    return d.toLocaleDateString('en-US');
  }
  
  return d.toISOString();
}

function formatCurrency(amount, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  });
  return formatter.format(amount);
}

return [{
  json: {
    ...($json),
    createdAtISO: formatDate($json.createdAt, 'ISO'),
    createdAtUnix: formatDate($json.createdAt, 'UNIX'),
    amountFormatted: formatCurrency($json.amount),
    amountCents: Math.round($json.amount * 100)
  }
}];
```

---

## Batch Processing

### Process Items in Batches

```javascript
// Code node: Split into batches
const batchSize = 100;
const items = $json.items;
const batches = [];

for (let i = 0; i < items.length; i += batchSize) {
  batches.push({
    json: {
      batch: Math.floor(i / batchSize) + 1,
      items: items.slice(i, i + batchSize),
      batchSize: Math.min(batchSize, items.length - i)
    }
  });
}

return batches;
```

**Then use Loop node to process each batch**

### Batch API Request

```javascript
// Code node: Prepare batch request
const items = $json.items;

const batchRequest = {
  requests: items.map((item, index) => ({
    id: `${index + 1}`,
    method: 'POST',
    url: '/v1/records',
    body: item
  }))
};

return [{
  json: batchRequest
}];
```

**HTTP Request:**
```json
{
  "url": "https://api.example.com/v1/batch",
  "method": "POST",
  "body": "={{ JSON.stringify($json.batchRequest) }}",
  "contentType": "raw"
}
```

### Aggregate Batch Results

```javascript
// Code node: Aggregate results
const results = $json.responses || [];
const summary = {
  total: results.length,
  successful: results.filter(r => r.status === 200 || r.status === 201).length,
  failed: results.filter(r => r.status >= 400).length,
  items: results
};

return [{
  json: summary
}];
```

---

## OAuth2 Flow Implementation

### Step 1: Generate Authorization URL

```javascript
// Code node: Generate auth URL
const crypto = require('crypto');

const clientId = process.env.OAUTH_CLIENT_ID;
const redirectUri = process.env.OAUTH_REDIRECT_URI;
const scope = 'user:email user:profile';
const state = crypto.randomBytes(32).toString('hex');

// Store state for verification
await $db.set(`oauth_state_${state}`, {
  createdAt: Date.now(),
  expiresAt: Date.now() + 600000 // 10 minutes
});

const authUrl = new URL('https://oauth-provider.com/oauth/authorize');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', scope);
authUrl.searchParams.set('state', state);

return [{
  json: {
    authUrl: authUrl.toString(),
    state
  }
}];
```

### Step 2: Handle Callback & Exchange Code

```javascript
// Webhook trigger for callback
// Receives: ?code=XXX&state=YYY

const { code, state } = $json.query;

// Verify state
const storedState = await $db.get(`oauth_state_${state}`);
if (!storedState || Date.now() > storedState.expiresAt) {
  return [{
    json: { error: 'Invalid or expired state parameter' },
    statusCode: 400
  }];
}

// Exchange code for token
const tokenResponse = await fetch('https://oauth-provider.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.OAUTH_CLIENT_ID,
    client_secret: process.env.OAUTH_CLIENT_SECRET,
    redirect_uri: process.env.OAUTH_REDIRECT_URI
  })
});

const tokens = await tokenResponse.json();

if (tokens.error) {
  return [{
    json: { error: tokens.error_description },
    statusCode: 400
  }];
}

// Store tokens securely
const userId = $json.userId; // From context
await $db.set(`oauth_tokens_${userId}`, {
  accessToken: tokens.access_token,
  refreshToken: tokens.refresh_token,
  expiresAt: Date.now() + tokens.expires_in * 1000
});

return [{
  json: {
    success: true,
    message: 'Authorization successful'
  }
}];
```

### Step 3: Use Token with Refresh

```javascript
// Code node: Get valid token with refresh
const userId = $json.userId;
const tokens = await $db.get(`oauth_tokens_${userId}`);

if (!tokens) {
  throw new Error('No tokens found for user');
}

// Check if token expired
if (Date.now() > tokens.expiresAt) {
  const refreshResponse = await fetch('https://oauth-provider.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET
    })
  });

  const newTokens = await refreshResponse.json();

  if (newTokens.error) {
    throw new Error(`Token refresh failed: ${newTokens.error}`);
  }

  // Update stored tokens
  await $db.set(`oauth_tokens_${userId}`, {
    accessToken: newTokens.access_token,
    refreshToken: newTokens.refresh_token,
    expiresAt: Date.now() + newTokens.expires_in * 1000
  });

  tokens.accessToken = newTokens.access_token;
}

return [{
  json: {
    accessToken: tokens.accessToken,
    expiresAt: tokens.expiresAt
  }
}];
```

**HTTP Request using token:**
```
Header: "Authorization": "Bearer {{ $json.accessToken }}"
```

---

## API Response Caching

### Cache GET Requests

```javascript
// Code node: Check cache before API call
const cacheKey = `api_cache_${$json.endpoint}`;
const cachedData = await $db.get(cacheKey);

if (cachedData && Date.now() < cachedData.expiresAt) {
  return [{
    json: {
      ...cachedData.data,
      _cached: true,
      _cachedAt: new Date(cachedData.cachedAt).toISOString()
    }
  }];
}

// If not cached, proceed to API call
return [{
  json: {
    endpoint: $json.endpoint,
    method: 'GET',
    _cached: false,
    cacheKey
  }
}];
```

**After HTTP Request:**

```javascript
// Code node: Cache successful response
const cacheKey = $json.cacheKey;
const cacheTTL = 3600000; // 1 hour

if ($json.statusCode === 200) {
  await $db.set(cacheKey, {
    data: $json.body,
    cachedAt: Date.now(),
    expiresAt: Date.now() + cacheTTL
  });
}

return [{
  json: $json
}];
```

### Cache with Key Prefix

```javascript
// Code node: Cache by endpoint and parameters
function getCacheKey(endpoint, method, params) {
  const paramString = JSON.stringify(params);
  const hash = crypto
    .createHash('md5')
    .update(paramString)
    .digest('hex');
  
  return `api_${method}_${endpoint}_${hash}`;
}

const cacheKey = getCacheKey(
  $json.endpoint,
  $json.method,
  $json.params || {}
);

return [{
  json: {
    ...($json),
    cacheKey
  }
}];
```

### Invalidate Cache

```javascript
// Code node: Clear cache on mutation
async function invalidateCache(pattern) {
  // Get all keys matching pattern
  const keys = await $db.keys(`api_*${pattern}*`);
  
  // Delete all matching keys
  for (const key of keys) {
    await $db.delete(key);
  }
  
  return keys.length;
}

const deletedCount = await invalidateCache('users');

return [{
  json: {
    invalidated: deletedCount,
    pattern: 'users',
    action: 'cache_cleared'
  }
}];
```

---

## n8n Best Practices for API Integration

### Credential Management

**DO:**
```javascript
// Use credentials from n8n secrets
const apiKey = await $credentials.getSecret('api_key');
const url = $env.API_ENDPOINT;
```

**DON'T:**
```javascript
// Never hardcode secrets
const apiKey = 'sk_live_abc123'; // Wrong!
```

### Expression Syntax

```javascript
// Current node data
{{ $json.field }}

// Previous node results
{{ $('Node Name').first().json.field }}
{{ $('Node Name').all() }}  // All items

// Environment variables
{{ $env.VARIABLE_NAME }}

// Math operations
{{ Math.floor($json.amount / 100) }}

// Date operations
{{ new Date().toISOString() }}

// Conditional
{{ $json.status === 'success' ? 'Proceed' : 'Stop' }}

// Array operations
{{ $json.items.map(item => item.id) }}
{{ $json.items.filter(item => item.active) }}
```

### Common Patterns

**HTTP with Raw Body & Expressions:**
```json
{
  "contentType": "raw",
  "body": "={{ JSON.stringify({ data: $json.field }) }}"
}
```

**Code Node Returns:**
```javascript
// ALWAYS return array of objects
return [{
  json: { ...data }
}];

// Multiple items
return items.map(item => ({
  json: item
}));

// With error
return [{
  json: { error: true },
  error: new Error('Message'),
  pairedItem: $json.pairedItem
}];
```

**Conditional Routing:**
```javascript
// IF node condition
$json.statusCode === 200 && $json.data.length > 0
```

---

## Testing in n8n

### Mock HTTP Responses

```javascript
// Code node: Create mock response
if (process.env.NODE_ENV === 'test') {
  return [{
    json: {
      id: 'mock_123',
      status: 'success',
      data: {
        // mock data
      }
    }
  }];
}

// Regular execution
return [{
  json: { /* real API call results */ }
}];
```

### Validate Before Processing

```javascript
// Code node: Validate response
const requiredFields = ['id', 'status', 'timestamp'];
const missingFields = requiredFields.filter(f => !($json[f]));

if (missingFields.length > 0) {
  return [{
    json: {
      error: true,
      message: `Missing required fields: ${missingFields.join(', ')}`,
      data: $json
    }
  }];
}

return [{
  json: $json
}];
```

---

## Common n8n API Integration Checklist

- [ ] Configure credentials in n8n credential manager
- [ ] Use `{{ $env.VARIABLE_NAME }}` for sensitive data
- [ ] Set `continueOnFail: true` on HTTP requests for error handling
- [ ] Use `contentType: "raw"` with expressions in HTTP nodes
- [ ] Implement retry logic with exponential backoff
- [ ] Add error handling code nodes before continuing
- [ ] Validate API responses before processing
- [ ] Implement rate limiting checks
- [ ] Cache GET requests where possible
- [ ] Log errors for debugging
- [ ] Test with sample data before deploying
- [ ] Monitor workflow executions
- [ ] Set up alerts for failures
- [ ] Document API credentials and authentication method
- [ ] Review security audit requirements

---

## Reference: HTTP Node Configuration

```json
{
  "nodeType": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.example.com/v1/resource",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer {{ $env.API_TOKEN }}",
      "X-Custom-Header": "{{ $json.customValue }}"
    },
    "contentType": "raw",
    "body": "={{ JSON.stringify($json.requestBody) }}",
    "continueOnFail": true,
    "timeout": 30000,
    "authentication": "none"
  }
}
```

---

**Version:** 1.0.0  
**Last Updated:** November 8, 2025  
**Status:** Production Ready

