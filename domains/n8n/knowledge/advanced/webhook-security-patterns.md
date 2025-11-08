# n8n Webhook Security Patterns (2025)

## Table of Contents
- [Security Fundamentals](#security-fundamentals)
- [Signature Verification](#signature-verification)
- [Authentication Methods](#authentication-methods)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [Replay Attack Prevention](#replay-attack-prevention)
- [IP Whitelisting](#ip-whitelisting)
- [Production Implementations](#production-implementations)

---

## Security Fundamentals

### The Webhook Security Threat Model

**Common Threats:**
1. **Unauthorized Access** - Attackers sending fake webhook requests
2. **Data Tampering** - Modifying payload data in transit
3. **Replay Attacks** - Re-sending captured legitimate requests
4. **DoS Attacks** - Overwhelming webhook endpoint with requests
5. **Injection Attacks** - Malicious code in webhook payloads

**Defense Layers:**
```
┌─────────────────────────────────────┐
│  Layer 1: Network (HTTPS, IP Filter)│
├─────────────────────────────────────┤
│  Layer 2: Authentication (API Keys) │
├─────────────────────────────────────┤
│  Layer 3: Signature Verification    │
├─────────────────────────────────────┤
│  Layer 4: Timestamp/Replay Prevention│
├─────────────────────────────────────┤
│  Layer 5: Input Validation          │
├─────────────────────────────────────┤
│  Layer 6: Rate Limiting             │
└─────────────────────────────────────┘
```

---

## Signature Verification

### HMAC SHA-256 Signature Verification (Most Common)

**How It Works:**
1. Provider generates signature: `HMAC-SHA256(webhook_secret, request_body)`
2. Provider includes signature in request header
3. Your webhook recalculates signature using same secret
4. Compare signatures - if match, request is authentic

**Implementation Pattern:**

```javascript
// In Code node after Webhook Trigger

const crypto = require('crypto');

function verifyWebhookSignature(payload, receivedSignature, secret) {
  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );
}

// Get webhook data
const payload = $input.first().json.body;
const receivedSignature = $input.first().json.headers['x-signature'];
const secret = $env.WEBHOOK_SECRET;

// Verify signature
const isValid = verifyWebhookSignature(payload, receivedSignature, secret);

if (!isValid) {
  throw new Error('Invalid webhook signature');
}

return [{ json: { verified: true, payload } }];
```

---

### Stripe Webhook Signature Verification

**Stripe Format:** `t=timestamp,v1=signature`

```javascript
const crypto = require('crypto');

function verifyStripeSignature(payload, signature, secret) {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
  const sig = parts.find(p => p.startsWith('v1=')).split('=')[1];

  // Check timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    throw new Error('Webhook timestamp too old');
  }

  // Create signed payload
  const signedPayload = `${timestamp}.${payload}`;

  // Compute expected signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSig)
  );
}

// Usage
const rawBody = $input.first().json.body;
const signature = $input.first().json.headers['stripe-signature'];
const isValid = verifyStripeSignature(
  JSON.stringify(rawBody),
  signature,
  $env.STRIPE_WEBHOOK_SECRET
);

if (!isValid) {
  throw new Error('Invalid Stripe signature');
}

return [{ json: { verified: true, event: rawBody } }];
```

---

### GitHub Webhook Signature Verification

**GitHub Format:** `sha256=<signature>`

```javascript
const crypto = require('crypto');

function verifyGitHubSignature(payload, signature, secret) {
  const sig = signature.replace('sha256=', '');

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSig)
  );
}

// Usage
const payload = $input.first().json.body;
const signature = $input.first().json.headers['x-hub-signature-256'];
const isValid = verifyGitHubSignature(
  payload,
  signature,
  $env.GITHUB_WEBHOOK_SECRET
);

if (!isValid) {
  throw new Error('Invalid GitHub signature');
}

return [{ json: { verified: true, event: payload } }];
```

---

### Slack Webhook Signature Verification

**Slack uses versioned signatures with timestamps**

```javascript
const crypto = require('crypto');

function verifySlackSignature(body, timestamp, signature, signingSecret) {
  // Check timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    throw new Error('Webhook timestamp too old');
  }

  // Create base string
  const sigBasestring = `v0:${timestamp}:${body}`;

  // Compute signature
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  // Compare
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

// Usage
const body = $input.first().json.rawBody; // Must be raw body string
const timestamp = $input.first().json.headers['x-slack-request-timestamp'];
const signature = $input.first().json.headers['x-slack-signature'];

const isValid = verifySlackSignature(
  body,
  timestamp,
  signature,
  $env.SLACK_SIGNING_SECRET
);

if (!isValid) {
  throw new Error('Invalid Slack signature');
}

return [{ json: { verified: true, payload: JSON.parse(body) } }];
```

---

### Generic HMAC Verification Function (Reusable)

```javascript
const crypto = require('crypto');

/**
 * Generic HMAC signature verifier
 * @param {string} payload - Request body (stringified if object)
 * @param {string} receivedSignature - Signature from request header
 * @param {string} secret - Webhook secret
 * @param {string} algorithm - 'sha256', 'sha1', 'sha512'
 * @param {string} encoding - 'hex', 'base64'
 */
function verifyHmacSignature(payload, receivedSignature, secret, algorithm = 'sha256', encoding = 'hex') {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest(encoding);

  // Handle prefixed signatures (e.g., "sha256=abcd...")
  const cleanReceived = receivedSignature.includes('=')
    ? receivedSignature.split('=')[1]
    : receivedSignature;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cleanReceived),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    // Length mismatch - signatures definitely don't match
    return false;
  }
}

// Export for reuse
return [{
  json: {
    verifyHmacSignature,
    // Example usage:
    // isValid: verifyHmacSignature(payload, signature, secret, 'sha256', 'hex')
  }
}];
```

---

## Authentication Methods

### 1. Header-Based Authentication

**Webhook Configuration:**
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "secure-webhook",
    "authentication": "headerAuth",
    "options": {}
  }
}
```

**Create Credential:**
```json
{
  "name": "Custom Header Auth",
  "type": "httpHeaderAuth",
  "data": {
    "name": "X-API-Key",
    "value": "{{ $env.WEBHOOK_API_KEY }}"
  }
}
```

---

### 2. Basic Authentication

**Webhook Configuration:**
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "basic-auth-webhook",
    "authentication": "basicAuth"
  }
}
```

**Credential:**
```json
{
  "type": "httpBasicAuth",
  "data": {
    "user": "webhook_user",
    "password": "{{ $env.WEBHOOK_PASSWORD }}"
  }
}
```

---

### 3. Query Parameter Authentication

**Less secure but simple:**
```javascript
// In Code node after webhook
const receivedToken = $input.first().json.query.token;
const expectedToken = $env.WEBHOOK_TOKEN;

if (receivedToken !== expectedToken) {
  throw new Error('Invalid token');
}

return [{ json: { authenticated: true } }];
```

**Not recommended** - tokens visible in logs

---

### 4. Bearer Token Authentication

```javascript
// In Code node
const authHeader = $input.first().json.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  throw new Error('Missing or invalid authorization header');
}

const token = authHeader.substring(7);

if (token !== $env.WEBHOOK_BEARER_TOKEN) {
  throw new Error('Invalid bearer token');
}

return [{ json: { authenticated: true } }];
```

---

### 5. mTLS (Mutual TLS) - Enterprise Grade

**Client Certificate Verification:**
```javascript
// Verify client certificate (if n8n configured for mTLS)
const clientCert = $input.first().json.connection.peerCertificate;

if (!clientCert || !clientCert.subject) {
  throw new Error('No client certificate provided');
}

// Verify certificate details
const allowedCNs = ['client.example.com', 'partner.example.com'];
if (!allowedCNs.includes(clientCert.subject.CN)) {
  throw new Error('Unauthorized client certificate');
}

return [{ json: { authenticated: true, client: clientCert.subject.CN } }];
```

---

## Rate Limiting

### Simple In-Memory Rate Limiter

```javascript
// In Code node (stateful with workflow static data)

const rateLimits = {};  // In production, use Redis

function checkRateLimit(identifier, limit = 100, windowSeconds = 60) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (!rateLimits[identifier]) {
    rateLimits[identifier] = [];
  }

  // Remove old requests outside window
  rateLimits[identifier] = rateLimits[identifier].filter(
    timestamp => now - timestamp < windowMs
  );

  // Check if limit exceeded
  if (rateLimits[identifier].length >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((rateLimits[identifier][0] + windowMs - now) / 1000)
    };
  }

  // Add current request
  rateLimits[identifier].push(now);

  return {
    allowed: true,
    remaining: limit - rateLimits[identifier].length
  };
}

// Get identifier (IP, API key, user ID, etc.)
const identifier = $input.first().json.headers['x-api-key'] ||
                   $input.first().json.headers['x-forwarded-for'] ||
                   'anonymous';

// Check rate limit
const limitCheck = checkRateLimit(identifier, 100, 60); // 100 req/min

if (!limitCheck.allowed) {
  throw new Error(`Rate limit exceeded. Retry after ${limitCheck.retryAfter}s`);
}

return [{
  json: {
    rateLimit: {
      remaining: limitCheck.remaining,
      reset: Date.now() + 60000
    },
    payload: $input.first().json.body
  }
}];
```

---

### Token Bucket Rate Limiter (Advanced)

```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  consume(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return { allowed: true, remaining: Math.floor(this.tokens) };
    }

    return {
      allowed: false,
      retryAfter: Math.ceil((tokens - this.tokens) / this.refillRate)
    };
  }
}

// Store buckets per identifier
const buckets = {};

const identifier = $input.first().json.headers['x-api-key'];
if (!buckets[identifier]) {
  buckets[identifier] = new TokenBucket(100, 10); // 100 capacity, 10/sec refill
}

const result = buckets[identifier].consume(1);

if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}s`);
}

return [{ json: { rateLimit: result } }];
```

---

## Input Validation

### Comprehensive Input Validation

```javascript
const Joi = require('joi'); // If available, or use manual validation

// Define expected schema
const schema = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  userId: /^[a-zA-Z0-9_-]{1,50}$/,
  amount: { min: 0, max: 1000000 },
  status: ['pending', 'approved', 'rejected']
};

function validateInput(data, schema) {
  const errors = [];

  // Email validation
  if (data.email && !schema.email.test(data.email)) {
    errors.push('Invalid email format');
  }

  // User ID validation
  if (data.userId && !schema.userId.test(data.userId)) {
    errors.push('Invalid userId format');
  }

  // Amount validation
  if (data.amount !== undefined) {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount < schema.amount.min || amount > schema.amount.max) {
      errors.push(`Amount must be between ${schema.amount.min} and ${schema.amount.max}`);
    }
  }

  // Enum validation
  if (data.status && !schema.status.includes(data.status)) {
    errors.push(`Status must be one of: ${schema.status.join(', ')}`);
  }

  return errors;
}

// Validate webhook payload
const payload = $input.first().json.body;
const validationErrors = validateInput(payload, schema);

if (validationErrors.length > 0) {
  throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
}

return [{ json: { validated: true, payload } }];
```

---

### SQL Injection Prevention

```javascript
// NEVER build SQL queries like this:
// ❌ const query = `SELECT * FROM users WHERE email = '${$json.email}'`;

// ALWAYS use parameterized queries:
const params = {
  operation: 'executeQuery',
  query: 'SELECT * FROM users WHERE email = $1 AND status = $2',
  options: {
    queryParameters: JSON.stringify([$json.email, 'active'])
  }
};
```

---

### XSS Prevention (Output Encoding)

```javascript
function sanitizeHtml(input) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return input.replace(/[&<>"'/]/g, char => map[char]);
}

// Sanitize all string inputs
const payload = $input.first().json.body;
const sanitized = {};

for (const [key, value] of Object.entries(payload)) {
  sanitized[key] = typeof value === 'string' ? sanitizeHtml(value) : value;
}

return [{ json: sanitized }];
```

---

## Replay Attack Prevention

### Timestamp-Based Replay Prevention

```javascript
function preventReplay(timestamp, maxAgeSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);

  // Check if timestamp is in the future
  if (requestTime > now + 60) {
    throw new Error('Request timestamp is in the future');
  }

  // Check if timestamp is too old
  if (now - requestTime > maxAgeSeconds) {
    throw new Error(`Request timestamp too old (max age: ${maxAgeSeconds}s)`);
  }

  return true;
}

// Get timestamp from header
const timestamp = $input.first().json.headers['x-timestamp'];

if (!timestamp) {
  throw new Error('Missing timestamp header');
}

// Verify timestamp
preventReplay(timestamp, 300); // 5 minute window

return [{ json: { replayCheckPassed: true } }];
```

---

### Nonce-Based Replay Prevention

```javascript
// Requires database or Redis to store used nonces

const usedNonces = new Set(); // In production, use Redis with TTL

function preventReplayWithNonce(nonce, timestamp) {
  // Check timestamp first
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error('Timestamp too old or in future');
  }

  // Check if nonce already used
  if (usedNonces.has(nonce)) {
    throw new Error('Nonce already used (replay attack detected)');
  }

  // Mark nonce as used
  usedNonces.add(nonce);

  // In production: Set TTL in Redis to auto-cleanup old nonces
  // redis.setex(`nonce:${nonce}`, 300, '1');

  return true;
}

// Get nonce and timestamp from headers
const nonce = $input.first().json.headers['x-nonce'];
const timestamp = $input.first().json.headers['x-timestamp'];

if (!nonce || !timestamp) {
  throw new Error('Missing nonce or timestamp');
}

preventReplayWithNonce(nonce, timestamp);

return [{ json: { replayCheckPassed: true } }];
```

---

## IP Whitelisting

### Simple IP Whitelist

```javascript
function checkIpWhitelist(clientIp, whitelist) {
  // Support CIDR notation with a simple library or exact matches
  const allowed = whitelist.includes(clientIp);

  if (!allowed) {
    throw new Error(`IP ${clientIp} not whitelisted`);
  }

  return true;
}

// Get client IP (handle proxies)
const clientIp = $input.first().json.headers['x-forwarded-for']?.split(',')[0].trim() ||
                 $input.first().json.headers['x-real-ip'] ||
                 $input.first().json.connection?.remoteAddress;

// Whitelist (from environment variable)
const whitelist = $env.ALLOWED_IPS.split(',');

checkIpWhitelist(clientIp, whitelist);

return [{ json: { ipCheckPassed: true, clientIp } }];
```

---

## Production Implementations

### Complete Webhook Security Stack

```javascript
/**
 * Production-grade webhook security implementation
 * Implements: Signature verification, rate limiting, timestamp validation, input validation
 */

const crypto = require('crypto');

// 1. RATE LIMITING
const rateLimits = {};
function checkRateLimit(identifier, limit = 100, windowSeconds = 60) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (!rateLimits[identifier]) rateLimits[identifier] = [];
  rateLimits[identifier] = rateLimits[identifier].filter(t => now - t < windowMs);

  if (rateLimits[identifier].length >= limit) {
    const retryAfter = Math.ceil((rateLimits[identifier][0] + windowMs - now) / 1000);
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);
  }

  rateLimits[identifier].push(now);
  return { remaining: limit - rateLimits[identifier].length };
}

// 2. SIGNATURE VERIFICATION
function verifySignature(payload, receivedSignature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );
}

// 3. TIMESTAMP VALIDATION (Replay Prevention)
function validateTimestamp(timestamp, maxAgeSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);

  if (requestTime > now + 60) throw new Error('Timestamp in future');
  if (now - requestTime > maxAgeSeconds) throw new Error('Timestamp too old');

  return true;
}

// 4. INPUT VALIDATION
function validatePayload(data) {
  const errors = [];

  if (!data.userId || !/^[a-zA-Z0-9_-]{1,50}$/.test(data.userId)) {
    errors.push('Invalid userId');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email');
  }

  if (errors.length > 0) {
    throw new Error(`Validation errors: ${errors.join(', ')}`);
  }

  return true;
}

// MAIN EXECUTION
try {
  const input = $input.first().json;

  // Extract data
  const payload = input.body;
  const signature = input.headers['x-signature'];
  const timestamp = input.headers['x-timestamp'];
  const apiKey = input.headers['x-api-key'];

  // Security checks
  checkRateLimit(apiKey || 'anonymous', 100, 60);
  validateTimestamp(timestamp, 300);

  if (!verifySignature(payload, signature, $env.WEBHOOK_SECRET)) {
    throw new Error('Invalid signature');
  }

  validatePayload(payload);

  // All checks passed
  return [{
    json: {
      securityChecksPassed: true,
      payload: payload,
      timestamp: new Date().toISOString()
    }
  }];

} catch (error) {
  // Log security failures
  console.error('Security check failed:', error.message);

  throw error; // Workflow will fail, returning 500 to webhook sender
}
```

---

### Webhook Response Pattern

```javascript
// In "Respond to Webhook" node after security checks

// For valid requests:
{
  "parameters": {
    "respondWith": "json",
    "responseCode": 200,
    "responseBody": "={{ JSON.stringify({ status: 'received', id: $json.requestId }) }}"
  }
}

// For security failures (in error handler):
{
  "parameters": {
    "respondWith": "json",
    "responseCode": 403,
    "responseBody": "={{ JSON.stringify({ error: 'Forbidden', message: $json.error.message }) }}"
  }
}
```

---

## Best Practices Summary

### ✅ DO

1. **Always use HTTPS** in production
2. **Verify signatures** for all critical webhooks
3. **Validate timestamps** to prevent replay attacks
4. **Implement rate limiting** to prevent abuse
5. **Validate all inputs** before processing
6. **Use environment variables** for secrets
7. **Log security failures** for monitoring
8. **Return appropriate HTTP status codes**
9. **Use constant-time comparison** for signatures
10. **Sanitize outputs** to prevent XSS

### ❌ DON'T

1. **Don't hardcode secrets** in workflows
2. **Don't trust user input** without validation
3. **Don't expose detailed errors** to webhook senders
4. **Don't skip signature verification** for convenience
5. **Don't use GET requests** for webhooks that modify data
6. **Don't log sensitive data** (passwords, tokens, etc.)
7. **Don't rely solely on IP whitelisting**
8. **Don't use weak secrets** (use 32+ random characters)
9. **Don't process webhooks** without rate limiting
10. **Don't forget to test** security measures regularly

---

## Testing Your Webhook Security

### cURL Test Commands

```bash
# Test with valid signature
PAYLOAD='{"userId":"test123","action":"create"}'
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "YOUR_SECRET" | cut -d' ' -f2)

curl -X POST https://your-n8n.com/webhook/secure-endpoint \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-API-Key: your-api-key" \
  -d "$PAYLOAD"

# Test with invalid signature (should fail)
curl -X POST https://your-n8n.com/webhook/secure-endpoint \
  -H "Content-Type: application/json" \
  -H "X-Signature: invalid-signature-12345" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-API-Key: your-api-key" \
  -d "$PAYLOAD"

# Test rate limiting (send 101 requests rapidly)
for i in {1..101}; do
  curl -X POST https://your-n8n.com/webhook/secure-endpoint \
    -H "Content-Type: application/json" \
    -H "X-Signature: $SIGNATURE" \
    -H "X-Timestamp: $(date +%s)" \
    -H "X-API-Key: test-key" \
    -d "$PAYLOAD"
done
```

---

## Security Checklist

```markdown
- [ ] HTTPS enabled on all webhook endpoints
- [ ] Signature verification implemented
- [ ] Timestamp validation configured (5 min window)
- [ ] Rate limiting active (100 req/min recommended)
- [ ] Input validation on all fields
- [ ] Environment variables used for secrets
- [ ] Error messages don't expose internal details
- [ ] Security failures logged to monitoring system
- [ ] Webhook secrets are 32+ characters random
- [ ] Regular security testing performed
- [ ] Replay prevention implemented (timestamp + optional nonce)
- [ ] IP whitelisting configured (if applicable)
- [ ] Authentication method chosen and implemented
- [ ] Output sanitization for any user-generated content
- [ ] Documentation updated with security requirements
```

---

**Last Updated:** January 2025
**Security Standards:** OWASP API Security Top 10 (2023)
