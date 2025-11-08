# Comprehensive API Integration Patterns Guide

**Date:** November 2025
**Status:** Production Ready
**Coverage:** Authentication, Rate Limiting, Webhooks, Error Handling, GraphQL vs REST, Integration Examples, Testing & Monitoring

---

## Table of Contents

1. [Authentication Methods](#authentication-methods)
2. [Rate Limiting Strategies](#rate-limiting-strategies)
3. [Webhook Architecture & Security](#webhook-architecture--security)
4. [Error Recovery Patterns](#error-recovery-patterns)
5. [GraphQL vs REST for Automation](#graphql-vs-rest-for-automation)
6. [Common API Integration Examples](#common-api-integration-examples)
7. [Request/Response Handling Patterns](#requestresponse-handling-patterns)
8. [Testing & Monitoring Strategies](#testing--monitoring-strategies)
9. [Security Best Practices](#security-best-practices)

---

## Authentication Methods

### 1. OAuth2 Authentication

OAuth2 is the industry standard for delegated authentication and authorization.

#### OAuth2 Authorization Code Flow (Most Common)

**When to use:** User-initiated actions, third-party integrations (Google, Microsoft, Slack)

```javascript
// Step 1: Request authorization
const authorizationUrl = 'https://oauth-provider.com/oauth/authorize';
const params = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET, // Keep secret - backend only
  redirect_uri: process.env.REDIRECT_URI,
  response_type: 'code',
  scope: 'user:email,user:profile',
  state: generateRandomString(32) // Prevent CSRF attacks
};

// Step 2: User gets redirected with authorization code
// Step 3: Exchange code for access token (backend)
async function exchangeCodeForToken(authCode) {
  const response = await fetch('https://oauth-provider.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI
    })
  });

  const { access_token, refresh_token, expires_in } = await response.json();
  return { access_token, refresh_token, expiresAt: Date.now() + expires_in * 1000 };
}

// Step 4: Use access token for API requests
async function apiRequest(endpoint, accessToken) {
  return fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
}
```

#### OAuth2 Client Credentials Flow (Service-to-Service)

**When to use:** Server-to-server authentication without user interaction

```javascript
async function getServiceToken() {
  const response = await fetch('https://oauth-provider.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: 'api:read api:write'
    })
  });

  const { access_token, expires_in } = await response.json();
  return { access_token, expiresAt: Date.now() + expires_in * 1000 };
}

// Cache and refresh tokens
class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAt = null;
  }

  async getValidToken() {
    if (this.token && Date.now() < this.expiresAt - 60000) {
      return this.token; // Token still valid (with 1min buffer)
    }
    const { access_token, expiresAt } = await getServiceToken();
    this.token = access_token;
    this.expiresAt = expiresAt;
    return access_token;
  }
}
```

#### OAuth2 Refresh Token Pattern

**Important:** Always refresh tokens before expiration

```javascript
async function makeAuthenticatedRequest(endpoint, options = {}) {
  let token = await tokenManager.getValidToken();

  let response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  // Token expired - refresh and retry
  if (response.status === 401) {
    const refreshResponse = await fetch('https://oauth-provider.com/oauth/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenManager.refreshToken,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET
      })
    });

    const { access_token, refresh_token, expires_in } = await refreshResponse.json();
    tokenManager.setTokens(access_token, refresh_token, expires_in);

    // Retry original request
    response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${access_token}`
      }
    });
  }

  return response;
}
```

---

### 2. JWT (JSON Web Token) Authentication

JWT is self-contained and doesn't require server-side sessions.

#### JWT Structure & Creation

```javascript
const jwt = require('jsonwebtoken');

// Create JWT
function createJWT(payload, secret = process.env.JWT_SECRET) {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '24h', // Expiration time
    issuer: 'api.myapp.com',
    audience: 'users',
    subject: payload.userId
  });
}

// Verify JWT
function verifyJWT(token, secret = process.env.JWT_SECRET) {
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'api.myapp.com',
      audience: 'users'
    });
    return { valid: true, payload: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Example payload structure
const jwtPayload = {
  userId: 'user123',
  email: 'user@example.com',
  roles: ['admin', 'user'],
  permissions: ['read', 'write'],
  iat: Math.floor(Date.now() / 1000), // Issued at
  exp: Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours
};

const token = createJWT(jwtPayload);
```

#### JWT with RS256 (Asymmetric - More Secure)

```javascript
const crypto = require('crypto');

// Generate key pair (typically done once)
function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

// Create JWT with private key
function createSignedJWT(payload, privateKey) {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '24h'
  });
}

// Verify JWT with public key
function verifySignedJWT(token, publicKey) {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256']
  });
}
```

---

### 3. API Key Authentication

Simplest form of authentication, but less secure than OAuth2.

#### API Key in Header

```javascript
async function apiRequestWithKey(endpoint, apiKey) {
  return fetch(endpoint, {
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

// Usage in n8n
// Configure in HTTP Request node:
// Headers: { "X-API-Key": "{{ $env.API_KEY }}" }
```

#### API Key Rotation Pattern

```javascript
class APIKeyManager {
  constructor(rotationIntervalDays = 90) {
    this.rotationInterval = rotationIntervalDays * 24 * 60 * 60 * 1000;
    this.activeKey = null;
    this.rotationSchedule = [];
  }

  generateNewKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  async rotateKeys() {
    const newKey = this.generateNewKey();
    const oldKey = this.activeKey;

    // Store both keys temporarily (grace period)
    this.rotationSchedule.push({
      key: oldKey,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 day grace period
    });

    this.activeKey = newKey;
    await this.persistKeyToSecureStorage(newKey);

    return newKey;
  }

  isValidKey(key) {
    if (key === this.activeKey) return true;

    const oldKeyEntry = this.rotationSchedule.find(k => k.key === key);
    if (oldKeyEntry && Date.now() < oldKeyEntry.expiresAt) {
      return true; // Still valid within grace period
    }

    return false;
  }
}
```

---

### 4. Basic Authentication

Simple but requires HTTPS to be secure.

```javascript
async function basicAuth(endpoint, username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  
  return fetch(endpoint, {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    }
  });
}

// In n8n HTTP Request node:
// Headers: { "Authorization": "Basic {{ Buffer.from(username + ':' + password).toString('base64') }}" }
```

---

### 5. Mutual TLS (mTLS) Authentication

High-security option for service-to-service communication.

```javascript
const https = require('https');
const fs = require('fs');

async function mTLSRequest(endpoint, clientCert, clientKey, caCert) {
  const agent = new https.Agent({
    cert: fs.readFileSync(clientCert),
    key: fs.readFileSync(clientKey),
    ca: fs.readFileSync(caCert),
    rejectUnauthorized: true
  });

  return fetch(endpoint, {
    agent,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## Rate Limiting Strategies

### 1. Token Bucket Algorithm

Most popular for API rate limiting.

```javascript
class TokenBucket {
  constructor(capacity = 100, refillRate = 10) { // 10 tokens per second
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefillTime = Date.now();
  }

  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTime) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  async consume(tokensNeeded = 1) {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return { allowed: true, waitTime: 0 };
    }

    // Calculate wait time until enough tokens available
    const waitTime = (tokensNeeded - this.tokens) / this.refillRate * 1000;
    return { allowed: false, waitTime: Math.ceil(waitTime) };
  }
}

// Usage
const bucket = new TokenBucket(100, 10); // 100 tokens, refill 10/sec

async function makeRateLimitedRequest(endpoint) {
  const { allowed, waitTime } = await bucket.consume(1);

  if (!allowed) {
    console.log(`Rate limited. Wait ${waitTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  return fetch(endpoint);
}
```

### 2. Sliding Window Log

Tracks individual requests within a time window.

```javascript
class SlidingWindowLog {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requestLog = [];
  }

  isAllowed() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old requests outside window
    this.requestLog = this.requestLog.filter(time => time > windowStart);

    if (this.requestLog.length < this.maxRequests) {
      this.requestLog.push(now);
      return { allowed: true };
    }

    // Calculate wait time until oldest request expires
    const oldestRequest = this.requestLog[0];
    const waitTime = oldestRequest + this.windowMs - now;

    return { allowed: false, waitTime };
  }
}

// Usage: 100 requests per minute
const limiter = new SlidingWindowLog(100, 60000);
```

### 3. Handling Rate Limit Headers

```javascript
class APIClient {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.rateLimitInfo = {};
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers
      }
    });

    // Extract rate limit headers (varies by provider)
    this.rateLimitInfo = {
      limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
      remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
      reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0')
    };

    // Handle 429 Too Many Requests
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      
      console.log(`Rate limited. Retry after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return this.request(endpoint, options); // Retry
    }

    return response;
  }

  isNearLimit(threshold = 0.1) {
    return this.rateLimitInfo.remaining / this.rateLimitInfo.limit < threshold;
  }
}
```

### 4. Batch API Requests (Reduce Rate Limit Impact)

```javascript
class BatchAPIClient {
  constructor(baseURL, apiKey, batchSize = 100) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.batchSize = batchSize;
  }

  async batchRequest(items, endpoint, transformFn) {
    const results = [];

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      // Many APIs support batch operations
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: batch,
          // API-specific options
        })
      });

      const data = await response.json();
      results.push(...data.results);

      // Add delay between batches to avoid rate limits
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
```

---

## Webhook Architecture & Security

### 1. Webhook Receiver Pattern

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json({ strict: false })); // Accept raw JSON for signature verification

// Webhook endpoint
app.post('/webhooks/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const body = req.rawBody; // Raw body needed for signature verification

  // Step 1: Verify webhook signature
  const isValid = verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET);
  
  if (!isValid) {
    console.error('Invalid webhook signature - possible attack');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Step 2: Idempotency check - prevent duplicate processing
  const event = req.body;
  const idempotencyKey = event.id || event.event_id;

  const isDuplicate = await checkProcessed(idempotencyKey);
  if (isDuplicate) {
    console.log(`Duplicate webhook ${idempotencyKey}, skipping`);
    return res.status(200).json({ received: true }); // Return 200 anyway
  }

  // Step 3: Mark as processing
  await markProcessing(idempotencyKey);

  // Step 4: Process asynchronously
  processWebhookEvent(event).catch(error => {
    console.error('Webhook processing error:', error);
    // TODO: Alert and retry
  });

  // Return 200 immediately (don't keep webhook waiting)
  res.status(200).json({ received: true });
});

// Signature verification
function verifyWebhookSignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Idempotency using database or Redis
async function checkProcessed(idempotencyKey) {
  // Implementation depends on your database
  const processed = await db.webhookLog.findOne({ id: idempotencyKey });
  return !!processed;
}

async function markProcessing(idempotencyKey) {
  await db.webhookLog.create({
    id: idempotencyKey,
    createdAt: new Date(),
    status: 'processing'
  });
}

async function processWebhookEvent(event) {
  try {
    console.log('Processing webhook:', event.type);
    
    // Your business logic here
    switch (event.type) {
      case 'payment.success':
        await handlePaymentSuccess(event.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;
      // ...
    }

    // Mark as complete
    await db.webhookLog.updateOne(
      { id: event.id },
      { status: 'completed', completedAt: new Date() }
    );
  } catch (error) {
    await db.webhookLog.updateOne(
      { id: event.id },
      { 
        status: 'failed', 
        error: error.message,
        retries: { increment: 1 }
      }
    );
    throw error;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook receiver on port ${PORT}`));
```

### 2. Webhook Sender (Reliable Delivery)

```javascript
class WebhookDispatcher {
  constructor(maxRetries = 5) {
    this.maxRetries = maxRetries;
  }

  async dispatch(event, webhookUrls) {
    const attempts = [];

    for (const webhookUrl of webhookUrls) {
      attempts.push(this.sendWithRetry(event, webhookUrl));
    }

    const results = await Promise.allSettled(attempts);
    return results;
  }

  async sendWithRetry(event, webhookUrl, attempt = 0) {
    try {
      // Generate signature
      const payload = JSON.stringify(event);
      const signature = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('hex');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': event.id,
          'X-Webhook-Timestamp': new Date().toISOString()
        },
        body: payload,
        timeout: 30000 // 30 second timeout
      });

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      // Retry on server errors (5xx) but not client errors (4xx)
      if (response.status >= 500 && attempt < this.maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.sendWithRetry(event, webhookUrl, attempt + 1);
      }

      return { success: false, statusCode: response.status, attempt };
    } catch (error) {
      // Network error - retry
      if (attempt < this.maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.sendWithRetry(event, webhookUrl, attempt + 1);
      }

      return { success: false, error: error.message, attempt };
    }
  }
}

// Usage
const dispatcher = new WebhookDispatcher();
const event = { type: 'order.created', data: { orderId: 123 } };
dispatcher.dispatch(event, ['https://client1.com/webhook', 'https://client2.com/webhook']);
```

### 3. Preventing Replay Attacks

```javascript
class WebhookVerifier {
  constructor(maxTimestampAgeSeconds = 300) {
    this.maxAge = maxTimestampAgeSeconds * 1000;
    this.processedIds = new Set();
  }

  verify(headers, body, secret) {
    // Check 1: Verify signature
    const signature = headers['x-webhook-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      return { valid: false, reason: 'Invalid signature' };
    }

    // Check 2: Verify timestamp (prevent replay attacks)
    const timestamp = headers['x-webhook-timestamp'];
    const messageAge = Date.now() - new Date(timestamp).getTime();

    if (messageAge > this.maxAge) {
      return { 
        valid: false, 
        reason: `Webhook too old: ${messageAge}ms (max ${this.maxAge}ms)` 
      };
    }

    // Check 3: Check for duplicate webhook ID
    const webhookId = headers['x-webhook-id'];
    if (this.processedIds.has(webhookId)) {
      return { valid: false, reason: 'Duplicate webhook ID' };
    }

    this.processedIds.add(webhookId);

    // Cleanup old IDs (every 1000 webhooks)
    if (this.processedIds.size > 1000) {
      this.processedIds.clear();
    }

    return { valid: true };
  }
}
```

---

## Error Recovery Patterns

### 1. Exponential Backoff with Jitter

```javascript
class RetryStrategy {
  constructor(maxRetries = 5, initialDelayMs = 1000) {
    this.maxRetries = maxRetries;
    this.initialDelay = initialDelayMs;
  }

  getDelayMs(attemptNumber) {
    // Exponential backoff: 2^attempt * initialDelay
    const exponentialDelay = Math.pow(2, attemptNumber) * this.initialDelay;
    
    // Add jitter (±10%) to prevent thundering herd
    const jitter = exponentialDelay * 0.1 * (Math.random() - 0.5);
    const delay = exponentialDelay + jitter;

    // Cap at 1 hour
    return Math.min(delay, 60 * 60 * 1000);
  }

  async executeWithRetry(fn, context = null) {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn.call(context);
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || isLastAttempt) {
          throw error;
        }

        const delayMs = this.getDelayMs(attempt);
        console.log(
          `Attempt ${attempt + 1}/${this.maxRetries + 1} failed. ` +
          `Retrying in ${delayMs}ms...`
        );

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  isRetryableError(error) {
    // Retry on network errors and 5xx server errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return true;
    }

    if (error.statusCode >= 500) {
      return true;
    }

    // Don't retry on client errors (4xx) unless specific ones
    if (error.statusCode === 429) { // Too many requests
      return true;
    }

    if (error.statusCode === 408) { // Request timeout
      return true;
    }

    return false;
  }
}

// Usage
const retry = new RetryStrategy(5, 1000);

await retry.executeWithRetry(async function() {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});
```

### 2. Circuit Breaker Pattern

Prevents cascading failures by stopping requests when a service is down.

```javascript
class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeoutMs;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      if (Date.now() >= this.nextAttemptTime) {
        console.log('Circuit breaker entering HALF_OPEN state');
        this.state = 'HALF_OPEN';
      } else {
        const waitTime = this.nextAttemptTime - Date.now();
        throw new Error(
          `Circuit breaker is OPEN. Retry in ${waitTime}ms`
        );
      }
    }

    try {
      const result = await fn();

      // Success - reset on HALF_OPEN
      if (this.state === 'HALF_OPEN') {
        console.log('Circuit breaker CLOSED (service recovered)');
        this.state = 'CLOSED';
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        console.error(
          `Circuit breaker OPEN after ${this.failureCount} failures`
        );
        this.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.resetTimeout;
      }

      throw error;
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

// Usage
const breaker = new CircuitBreaker(5, 60000);

async function makeAPICall() {
  return breaker.execute(async () => {
    return fetch('https://api.example.com/data');
  });
}
```

### 3. Fallback & Degradation Pattern

```javascript
class ResilientAPIClient {
  constructor(primaryEndpoint, fallbackEndpoint) {
    this.primary = primaryEndpoint;
    this.fallback = fallbackEndpoint;
    this.primaryBreaker = new CircuitBreaker(5, 60000);
    this.fallbackBreaker = new CircuitBreaker(3, 30000);
  }

  async request(endpoint, options = {}) {
    try {
      // Try primary endpoint
      return await this.primaryBreaker.execute(async () => {
        const response = await fetch(this.primary + endpoint, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
    } catch (primaryError) {
      console.warn('Primary endpoint failed, trying fallback:', primaryError.message);

      try {
        // Try fallback endpoint
        const fallbackResponse = await this.fallbackBreaker.execute(async () => {
          const response = await fetch(this.fallback + endpoint, options);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        });

        return { ...fallbackResponse, _source: 'fallback' };
      } catch (fallbackError) {
        console.error('Both endpoints failed');
        throw new Error(
          `Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`
        );
      }
    }
  }

  getStatus() {
    return {
      primary: this.primaryBreaker.getStatus(),
      fallback: this.fallbackBreaker.getStatus()
    };
  }
}
```

### 4. Dead Letter Queue Pattern

Handle failed events separately for manual review.

```javascript
class EventProcessor {
  constructor(db) {
    this.db = db;
  }

  async processEvent(event) {
    try {
      // Process the event
      await this.executeBusinessLogic(event);
      return { success: true };
    } catch (error) {
      const maxRetries = 3;
      const retryCount = (event.retryCount || 0) + 1;

      if (retryCount < maxRetries) {
        // Retry by re-queueing
        await this.db.eventQueue.update(
          { id: event.id },
          { 
            retryCount,
            nextRetryAt: new Date(Date.now() + Math.pow(2, retryCount) * 1000)
          }
        );
        return { success: false, retrying: true };
      } else {
        // Move to dead letter queue
        await this.db.deadLetterQueue.create({
          originalEvent: event,
          error: error.message,
          failedAt: new Date(),
          status: 'pending_review'
        });

        // Alert
        await this.sendAlert({
          type: 'EVENT_PROCESSING_FAILED',
          eventId: event.id,
          error: error.message
        });

        return { success: false, movedToDeadLetterQueue: true };
      }
    }
  }

  async reprocessDeadLetter(deadLetterId) {
    const deadLetter = await this.db.deadLetterQueue.findOne({ id: deadLetterId });
    
    try {
      await this.executeBusinessLogic(deadLetter.originalEvent);
      
      await this.db.deadLetterQueue.update(
        { id: deadLetterId },
        { status: 'resolved', resolvedAt: new Date() }
      );
      
      return { success: true };
    } catch (error) {
      await this.db.deadLetterQueue.update(
        { id: deadLetterId },
        { 
          status: 'failed_again',
          error: error.message,
          lastAttempt: new Date()
        }
      );
      throw error;
    }
  }
}
```

---

## GraphQL vs REST for Automation

### Comparison Table

| Aspect | REST | GraphQL |
|--------|------|---------|
| **Data Fetching** | Multiple endpoints for different resources | Single endpoint, query what you need |
| **Over-fetching** | Common (get all fields, use some) | None (request only needed fields) |
| **Under-fetching** | Requires multiple requests | Single request gets related data |
| **Learning Curve** | Easier | Steeper |
| **Caching** | Built-in (HTTP caching) | More complex (HTTP caching less effective) |
| **Best For** | Simple CRUD, established APIs | Complex queries, real-time data, mobile apps |

### REST Example (Stripe Payments API)

```javascript
// REST: Multiple requests needed
async function getCustomerWithOrders(customerId) {
  // Request 1: Get customer
  const customerRes = await fetch(
    `https://api.stripe.com/v1/customers/${customerId}`,
    { headers: { Authorization: `Bearer ${process.env.STRIPE_KEY}` } }
  );
  const customer = await customerRes.json();

  // Request 2: Get charges (orders)
  const chargesRes = await fetch(
    `https://api.stripe.com/v1/charges?customer=${customerId}`,
    { headers: { Authorization: `Bearer ${process.env.STRIPE_KEY}` } }
  );
  const charges = await chargesRes.json();

  return { customer, charges };
}
```

### GraphQL Example (GitHub API)

```javascript
// GraphQL: Single request with exactly what you need
async function getRepositoryInfo(owner, repo) {
  const query = `
    query {
      repository(owner: "${owner}", name: "${repo}") {
        name
        description
        stargazerCount
        forkCount
        issues(first: 5) {
          edges {
            node {
              title
              state
              comments(first: 1) {
                edges {
                  node {
                    body
                    author {
                      login
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  return response.json();
}
```

### GraphQL Client Pattern

```javascript
class GraphQLClient {
  constructor(endpoint, headers = {}) {
    this.endpoint = endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    };
  }

  async query(query, variables = {}) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables })
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL Error: ${data.errors[0].message}`);
    }

    return data.data;
  }

  async mutation(mutation, variables = {}) {
    return this.query(mutation, variables);
  }

  buildQuery(operationName, fields, variables) {
    return `
      query ${operationName}(${this.buildVariables(variables)}) {
        ${fields}
      }
    `;
  }

  buildVariables(variables) {
    return Object.entries(variables)
      .map(([key, type]) => `$${key}: ${type}`)
      .join(', ');
  }
}

// Usage
const client = new GraphQLClient(
  'https://api.github.com/graphql',
  { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
);

const query = `
  query GetUser($login: String!) {
    user(login: $login) {
      name
      bio
      followers {
        totalCount
      }
      repositories(first: 5) {
        edges {
          node {
            name
            stargazerCount
          }
        }
      }
    }
  }
`;

const result = await client.query(query, { login: 'octocat' });
```

---

## Common API Integration Examples

### 1. Stripe Payment API

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createPayment(customerId, amount, currency = 'usd') {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        orderId: 'order-123',
        userId: 'user-456'
      }
    });

    return paymentIntent;
  } catch (error) {
    throw new Error(`Stripe payment failed: ${error.message}`);
  }
}

async function handleStripeWebhook(event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await onPaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await onPaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await onRefund(event.data.object);
      break;
  }
}
```

### 2. Twilio SMS API

```javascript
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(toNumber, message) {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber
    });

    return { sid: result.sid, status: result.status };
  } catch (error) {
    throw new Error(`SMS sending failed: ${error.message}`);
  }
}

async function sendBulkSMS(numbers, message) {
  const results = await Promise.allSettled(
    numbers.map(num => sendSMS(num, message))
  );

  return {
    total: numbers.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  };
}

// Webhook handler for incoming SMS
app.post('/webhooks/twilio/sms', express.urlencoded({ extended: false }), (req, res) => {
  const incomingMessage = req.body.Body;
  const fromNumber = req.body.From;

  console.log(`SMS from ${fromNumber}: ${incomingMessage}`);

  // Handle message
  handleIncomingSMS(fromNumber, incomingMessage);

  res.status(200).send('OK');
});
```

### 3. SendGrid Email API

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, htmlContent) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html: htmlContent,
    trackingSettings: {
      clickTracking: { enabled: true },
      openTracking: { enabled: true }
    }
  };

  try {
    const result = await sgMail.send(msg);
    return { messageId: result[0].headers['x-message-id'], status: 'sent' };
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

async function sendBulkEmail(recipients, subject, htmlContent) {
  const personalizations = recipients.map(email => ({
    to: [{ email }],
    customArgs: { email }
  }));

  const msg = {
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html: htmlContent,
    personalizations
  };

  return sgMail.send(msg);
}

// Template-based email with dynamic data
async function sendTemplateEmail(to, templateId, dynamicData) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    templateId,
    dynamicTemplateData: dynamicData
  };

  return sgMail.send(msg);
}
```

### 4. Slack API

```javascript
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function sendSlackMessage(channel, text) {
  try {
    const result = await slack.chat.postMessage({
      channel,
      text,
      unfurl_links: false
    });
    return { ts: result.ts, ok: result.ok };
  } catch (error) {
    throw new Error(`Slack message failed: ${error.message}`);
  }
}

async function sendSlackNotification(channel, notification) {
  return slack.chat.postMessage({
    channel,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: notification.title,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: notification.message
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Details' },
            url: notification.url,
            action_id: 'view_details'
          }
        ]
      }
    ]
  });
}

// Handle Slack events
app.post('/webhooks/slack', async (req, res) => {
  const { type, challenge, event } = req.body;

  if (type === 'url_verification') {
    return res.json({ challenge });
  }

  if (type === 'event_callback') {
    await handleSlackEvent(event);
  }

  res.status(200).json({ ok: true });
});

async function handleSlackEvent(event) {
  if (event.type === 'message' && !event.bot_id) {
    // Handle user message
    const reply = await generateReply(event.text);
    await sendSlackMessage(event.channel, reply);
  }
}
```

### 5. Google Sheets API

```javascript
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

async function getGoogleSheetsClient() {
  const auth = new GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({
    version: 'v4',
    auth
  });
}

async function appendToSheet(spreadsheetId, range, values) {
  const sheets = await getGoogleSheetsClient();

  const result = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });

  return result.data;
}

async function readSheet(spreadsheetId, range) {
  const sheets = await getGoogleSheetsClient();

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  return result.data.values;
}

async function updateSheet(spreadsheetId, range, values) {
  const sheets = await getGoogleSheetsClient();

  const result = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });

  return result.data;
}

// Batch update for multiple operations
async function batchUpdateSheet(spreadsheetId, requests) {
  const sheets = await getGoogleSheetsClient();

  const result = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests }
  });

  return result.data;
}
```

### 6. Microsoft Graph API

```javascript
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require(
  '@microsoft/microsoft-graph-client/authProviders/tokenCredentialAuthenticationProvider'
);
const { ClientSecretCredential } = require('@azure/identity');

async function getMicrosoftGraphClient() {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
  });

  return Client.initWithMiddleware({ authProvider });
}

// Send email via Microsoft Graph
async function sendEmailViaGraph(to, subject, body) {
  const graphClient = await getMicrosoftGraphClient();

  const mailBody = {
    message: {
      subject,
      body: { contentType: 'HTML', content: body },
      toRecipients: [
        {
          emailAddress: { address: to }
        }
      ]
    }
  };

  await graphClient.api('/me/sendMail').post(mailBody);
}

// Create calendar event
async function createCalendarEvent(subject, startTime, endTime, attendees = []) {
  const graphClient = await getMicrosoftGraphClient();

  const event = {
    subject,
    start: { dateTime: startTime, timeZone: 'UTC' },
    end: { dateTime: endTime, timeZone: 'UTC' },
    attendees: attendees.map(email => ({
      emailAddress: { address: email },
      type: 'required'
    }))
  };

  return graphClient.api('/me/events').post(event);
}

// List files from OneDrive
async function listFiles(folderId = 'root') {
  const graphClient = await getMicrosoftGraphClient();
  
  const files = await graphClient
    .api(`/me/drive/items/${folderId}/children`)
    .get();

  return files.value;
}
```

---

## Request/Response Handling Patterns

### 1. Standardized Request Builder

```javascript
class APIRequestBuilder {
  constructor(baseURL, defaultHeaders = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
    this.timeout = 30000; // 30 seconds
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    const headers = { ...this.defaultHeaders, ...options.headers };

    const fetchOptions = {
      method,
      headers,
      timeout: options.timeout || this.timeout
    };

    if (options.body) {
      fetchOptions.body = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      return this.handleResponse(response);
    } catch (error) {
      throw new APIError(error.message, 'REQUEST_FAILED', { cause: error });
    }
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    let body = null;

    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      throw new APIError(
        `HTTP ${response.status}`,
        'HTTP_ERROR',
        { status: response.status, body }
      );
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body
    };
  }
}

class APIError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
  }
}

// Usage
const stripe = new APIRequestBuilder(
  'https://api.stripe.com/v1',
  { 'Authorization': `Bearer ${process.env.STRIPE_KEY}` }
);

const result = await stripe.post('/payment_intents', { amount: 2000, currency: 'usd' });
```

### 2. Response Parser & Transformer

```javascript
class ResponseTransformer {
  constructor(transformationMap = {}) {
    this.transformMap = transformationMap;
  }

  transform(data, schema) {
    if (Array.isArray(data)) {
      return data.map(item => this.transformObject(item, schema));
    }
    return this.transformObject(data, schema);
  }

  transformObject(obj, schema) {
    const result = {};

    for (const [newKey, config] of Object.entries(schema)) {
      const { path, transform, defaultValue } = config;

      // Get value from nested path
      let value = this.getNestedValue(obj, path);

      // Apply transformation if provided
      if (value !== undefined && transform) {
        value = transform(value);
      }

      // Use default if value is undefined
      if (value === undefined && defaultValue !== undefined) {
        value = defaultValue;
      }

      if (value !== undefined) {
        result[newKey] = value;
      }
    }

    return result;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }
}

// Usage
const transformer = new ResponseTransformer();

const stripeSchema = {
  id: { path: 'id' },
  amount: { path: 'amount', transform: v => v / 100 }, // Convert cents to dollars
  status: { path: 'status' },
  created: { path: 'created', transform: v => new Date(v * 1000) },
  customerEmail: { path: 'customer.email', defaultValue: 'unknown' }
};

const transformedData = transformer.transform(stripeResponse, stripeSchema);
```

### 3. Response Caching

```javascript
class ResponseCache {
  constructor(ttlSeconds = 300) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  generateKey(method, endpoint, params) {
    return `${method}:${endpoint}:${JSON.stringify(params)}`;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl
    });
  }

  get(key) {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async getOrFetch(key, fetchFn) {
    const cached = this.get(key);
    if (cached) return cached;

    const value = await fetchFn();
    this.set(key, value);
    return value;
  }

  clear() {
    this.cache.clear();
  }

  clearExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage with API client
const cache = new ResponseCache(300); // 5 minute cache

async function getUserWithCache(userId) {
  const cacheKey = cache.generateKey('GET', `/users/${userId}`, {});

  return cache.getOrFetch(cacheKey, async () => {
    return stripe.get(`/users/${userId}`);
  });
}
```

---

## Testing & Monitoring Strategies

### 1. API Integration Testing

```javascript
const assert = require('assert');

// Test suite for API integration
describe('Stripe Payment API', () => {
  before(() => {
    // Setup
    process.env.STRIPE_SECRET_KEY = 'sk_test_...';
  });

  describe('Payment Intent Creation', () => {
    it('should create a payment intent with valid parameters', async () => {
      const result = await stripe.post('/payment_intents', {
        amount: 2000,
        currency: 'usd'
      });

      assert.strictEqual(result.status, 200);
      assert(result.body.id);
      assert.strictEqual(result.body.amount, 2000);
      assert.strictEqual(result.body.status, 'requires_payment_method');
    });

    it('should fail with invalid amount', async () => {
      try {
        await stripe.post('/payment_intents', {
          amount: -100,
          currency: 'usd'
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.strictEqual(error.details.status, 400);
      }
    });

    it('should handle rate limiting', async () => {
      // Simulate rapid requests
      const promises = Array(150).fill().map(() =>
        stripe.post('/payment_intents', { amount: 100, currency: 'usd' })
      );

      try {
        await Promise.all(promises);
      } catch (error) {
        assert.strictEqual(error.code, 'HTTP_ERROR');
        assert.strictEqual(error.details.status, 429);
      }
    });
  });

  describe('Error Handling', () => {
    it('should retry on temporary failure', async () => {
      let attempts = 0;
      const mockFetch = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return { ok: true, status: 200, json: async () => ({ id: '123' }) };
      };

      const retry = new RetryStrategy(5, 100);
      const result = await retry.executeWithRetry(mockFetch);

      assert.strictEqual(attempts, 3);
    });

    it('should use fallback on primary failure', async () => {
      const client = new ResilientAPIClient(
        'https://primary.api.com',
        'https://fallback.api.com'
      );

      // Setup: primary fails, fallback succeeds
      const result = await client.request('/data');
      assert.strictEqual(result._source, 'fallback');
    });
  });
});
```

### 2. Monitoring & Alerting

```javascript
class APIMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      totalTime: 0,
      slowRequests: 0
    };
    this.slowThreshold = 5000; // 5 seconds
    this.errorThreshold = 0.05; // 5% error rate
    this.alerts = [];
  }

  recordRequest(duration, statusCode) {
    this.metrics.requestCount++;
    this.metrics.totalTime += duration;

    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }

    if (duration > this.slowThreshold) {
      this.metrics.slowRequests++;
    }

    this.checkThresholds();
  }

  checkThresholds() {
    const errorRate = this.metrics.errorCount / this.metrics.requestCount;

    if (errorRate > this.errorThreshold) {
      this.createAlert('HIGH_ERROR_RATE', {
        errorRate: (errorRate * 100).toFixed(2) + '%',
        errorCount: this.metrics.errorCount,
        totalRequests: this.metrics.requestCount
      });
    }

    const avgTime = this.metrics.totalTime / this.metrics.requestCount;
    if (avgTime > this.slowThreshold) {
      this.createAlert('SLOW_RESPONSE_TIME', {
        averageTime: `${Math.round(avgTime)}ms`
      });
    }

    const slowPercentage = this.metrics.slowRequests / this.metrics.requestCount;
    if (slowPercentage > 0.1) {
      this.createAlert('HIGH_SLOW_REQUEST_PERCENTAGE', {
        percentage: (slowPercentage * 100).toFixed(2) + '%'
      });
    }
  }

  createAlert(type, details) {
    const alert = {
      type,
      details,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(type)
    };

    this.alerts.push(alert);
    this.sendAlert(alert);
  }

  getSeverity(type) {
    const severityMap = {
      'HIGH_ERROR_RATE': 'critical',
      'SLOW_RESPONSE_TIME': 'warning',
      'HIGH_SLOW_REQUEST_PERCENTAGE': 'warning'
    };
    return severityMap[type] || 'info';
  }

  async sendAlert(alert) {
    // Send to monitoring system (DataDog, Sentry, New Relic, etc.)
    if (alert.severity === 'critical') {
      await notificationService.sendSlackAlert(alert);
      await notificationService.sendPagerDutyAlert(alert);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: ((this.metrics.errorCount / this.metrics.requestCount) * 100).toFixed(2) + '%',
      averageResponseTime: Math.round(this.metrics.totalTime / this.metrics.requestCount) + 'ms'
    };
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      totalTime: 0,
      slowRequests: 0
    };
  }
}

// Usage
const monitor = new APIMonitor();

async function monitoredAPICall(endpoint, options) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(endpoint, options);
    const duration = Date.now() - startTime;
    
    monitor.recordRequest(duration, response.status);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    monitor.recordRequest(duration, 500); // Record as error
    throw error;
  }
}

// Get metrics periodically
setInterval(() => {
  console.log('API Metrics:', monitor.getMetrics());
}, 60000); // Every minute
```

### 3. Health Checks & Status Pages

```javascript
class HealthCheckManager {
  constructor() {
    this.checks = [];
    this.results = new Map();
  }

  registerCheck(name, checkFn, criticalityLevel = 'warning') {
    this.checks.push({ name, checkFn, critical: criticalityLevel });
  }

  async runChecks() {
    const results = await Promise.allSettled(
      this.checks.map(async (check) => ({
        name: check.name,
        critical: check.critical,
        result: await check.checkFn()
      }))
    );

    const status = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        this.results.set(results[index].value.name, result.value.result);
        return result.value;
      } else {
        return {
          name: this.checks[index].name,
          critical: this.checks[index].critical,
          status: 'down',
          error: result.reason.message
        };
      }
    });

    return this.generateReport(status);
  }

  generateReport(status) {
    const allHealthy = status.every(s => s.status === 'up');
    const criticalDown = status.some(s => s.critical === 'critical' && s.status === 'down');

    return {
      status: criticalDown ? 'degraded' : allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: status,
      uptime: this.calculateUptime()
    };
  }

  calculateUptime() {
    // Calculate based on check history
    const total = this.results.size;
    const healthy = Array.from(this.results.values()).filter(r => r.status === 'up').length;
    return total > 0 ? ((healthy / total) * 100).toFixed(2) + '%' : 'N/A';
  }
}

// Register health checks
const healthCheck = new HealthCheckManager();

healthCheck.registerCheck(
  'Database',
  async () => {
    const response = await db.ping();
    return { status: response ? 'up' : 'down' };
  },
  'critical'
);

healthCheck.registerCheck(
  'Stripe API',
  async () => {
    const response = await stripe.get('/account');
    return { status: response.status === 200 ? 'up' : 'down' };
  },
  'warning'
);

healthCheck.registerCheck(
  'Email Service',
  async () => {
    const response = await mailService.ping();
    return { status: response ? 'up' : 'down' };
  },
  'warning'
);

// Health check endpoint
app.get('/health', async (req, res) => {
  const report = await healthCheck.runChecks();
  const statusCode = report.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(report);
});
```

---

## Security Best Practices

### 1. Credentials & Secrets Management

```javascript
// WRONG: Never hardcode secrets
const API_KEY = 'sk_live_abc123'; // DON'T DO THIS

// RIGHT: Use environment variables
const API_KEY = process.env.STRIPE_API_KEY;

// BETTER: Use a secrets manager
const secretsManager = require('@aws-sdk/client-secrets-manager');

async function getSecret(secretName) {
  const client = new secretsManager.SecretsManagerClient({ region: 'us-east-1' });
  
  try {
    const response = await client.send(
      new secretsManager.GetSecretValueCommand({ SecretId: secretName })
    );
    return JSON.parse(response.SecretString);
  } catch (error) {
    throw new Error(`Failed to retrieve secret: ${error.message}`);
  }
}

// BEST: Use credentials manager in production
async function initializeAPIClients() {
  const credentials = await getSecret('production/api-credentials');
  
  return {
    stripe: new StripeClient(credentials.stripe.secretKey),
    twilio: new TwilioClient(credentials.twilio.accountSid, credentials.twilio.authToken),
    sendgrid: new SendGridClient(credentials.sendgrid.apiKey)
  };
}
```

### 2. Input Validation & Sanitization

```javascript
const Joi = require('joi');

// Define validation schemas
const paymentSchema = Joi.object({
  amount: Joi.number().positive().max(99999).required(),
  currency: Joi.string().length(3).uppercase().required(),
  customerId: Joi.string().alphanum().required(),
  description: Joi.string().max(1000).optional()
});

const emailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().max(200).required(),
  body: Joi.string().max(5000).required(),
  html: Joi.boolean().optional()
});

// Validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      stripUnknown: true, // Remove unknown fields
      abortEarly: false // Return all errors
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    req.validatedBody = value;
    next();
  };
}

// Usage
app.post('/payments', validateRequest(paymentSchema), async (req, res) => {
  const { amount, currency, customerId } = req.validatedBody;
  // Process validated data
});

// SQL Injection prevention
function sanitizeDatabaseInput(input) {
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, ''); // Remove semicolons
}

// XSS prevention
function sanitizeHTML(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

### 3. HTTPS & TLS Configuration

```javascript
const https = require('https');
const fs = require('fs');

// HTTPS with strong SSL/TLS configuration
const tlsOptions = {
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem'),
  // Use strong ciphers
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305'
  ].join(':'),
  honorCipherOrder: true,
  secureOptions: 
    require('constants').SSL_OP_NO_TLSv1 |
    require('constants').SSL_OP_NO_TLSv1_1 // Disable old TLS versions
};

const server = https.createServer(tlsOptions, app);

// Certificate pinning for client validation
const crypto = require('crypto');

function getPublicKeyHash(cert) {
  return crypto
    .createHash('sha256')
    .update(cert)
    .digest('hex');
}

async function validateServerCertificate(certPath) {
  const cert = fs.readFileSync(certPath, 'utf8');
  const hash = getPublicKeyHash(cert);
  
  // Compare with expected hash
  const expectedHash = process.env.EXPECTED_CERT_HASH;
  
  if (hash !== expectedHash) {
    throw new Error('Certificate pinning failed - certificate mismatch');
  }

  return true;
}
```

### 4. Rate Limiting & DDoS Protection

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Per-IP rate limiter (stricter)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyGenerator: (req, res) => req.ip, // Rate limit by IP
  skip: (req, res) => req.user?.isAdmin, // Skip for admins
});

// Apply limiters
app.use(globalLimiter); // Apply to all routes
app.use('/api/', apiLimiter); // Stricter limit for API

// Custom rate limit with Redis for distributed systems
const redis = require('redis');
const RedisStore = require('rate-limit-redis');

const redisClient = redis.createClient();

const redisLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:',
  }),
  windowMs: 60 * 1000,
  max: 30,
});

app.use('/api/payments', redisLimiter);
```

### 5. Audit Logging

```javascript
class AuditLogger {
  constructor(database) {
    this.db = database;
  }

  async log(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      changes: event.changes, // What was changed
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      status: event.status, // success/failure
      details: event.details
    };

    // Ensure data cannot be modified
    if (this.db.auditLog) {
      await this.db.auditLog.create(auditEntry);
    }

    // Also send to external audit service for compliance
    await this.sendToAuditService(auditEntry);
  }

  async sendToAuditService(entry) {
    // Send to services like Sentry, LogRocket, etc.
    // Important for regulatory compliance (PCI-DSS, HIPAA, etc.)
  }

  async query(filters) {
    return this.db.auditLog.find(filters);
  }
}

// Usage: Log all API changes
app.post('/api/payments', async (req, res) => {
  const auditLogger = new AuditLogger(db);

  try {
    const payment = await createPayment(req.body);

    await auditLogger.log({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'Payment',
      resourceId: payment.id,
      changes: { ...payment },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json(payment);
  } catch (error) {
    await auditLogger.log({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'Payment',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'failure',
      details: error.message
    });

    res.status(500).json({ error: error.message });
  }
});
```

---

## Implementation Checklist

### Authentication
- [ ] Choose appropriate auth method (OAuth2, JWT, API Key)
- [ ] Implement token refresh logic
- [ ] Store credentials securely in secrets manager
- [ ] Implement credential rotation
- [ ] Add HTTPS/TLS for all API calls
- [ ] Use certificate pinning for sensitive APIs

### Rate Limiting
- [ ] Implement token bucket or sliding window
- [ ] Parse rate limit response headers
- [ ] Add exponential backoff retry logic
- [ ] Batch requests where possible
- [ ] Monitor approaching rate limits

### Webhooks
- [ ] Verify webhook signatures
- [ ] Implement idempotency checking
- [ ] Add replay attack prevention
- [ ] Implement exponential backoff for retries
- [ ] Use dead letter queue for failed events
- [ ] Add webhook event logging

### Error Handling
- [ ] Implement exponential backoff with jitter
- [ ] Use circuit breaker pattern
- [ ] Implement fallback/degradation strategies
- [ ] Add comprehensive error logging
- [ ] Create monitoring and alerting system

### Security
- [ ] Use environment variables for secrets
- [ ] Validate all inputs
- [ ] Implement HTTPS everywhere
- [ ] Add audit logging
- [ ] Implement rate limiting
- [ ] Use secrets manager in production

### Testing & Monitoring
- [ ] Write integration tests
- [ ] Monitor API metrics (latency, errors)
- [ ] Set up health checks
- [ ] Create status page
- [ ] Implement alerting for failures
- [ ] Add performance monitoring

---

## Resources

### Documentation References
- [OAuth2 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [JWT Introduction](https://jwt.io/introduction)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [GraphQL Official Documentation](https://graphql.org/)
- [REST API Best Practices](https://restfulapi.net/)

### Tools & Libraries
- **Node.js HTTP:** `fetch`, `node-fetch`
- **Rate Limiting:** `express-rate-limit`, `bottleneck`
- **JWT:** `jsonwebtoken`, `jose`
- **OAuth:** `passport.js`, `oauth2orize`
- **Testing:** `jest`, `supertest`, `nock`
- **Monitoring:** `prometheus`, `datadog`, `newrelic`

---

## Version History

- **v1.0 (November 2025):** Comprehensive API integration patterns guide with working code examples

---

**Last Updated:** November 8, 2025  
**Status:** Production Ready  
**Next Review:** December 8, 2025

