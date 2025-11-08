# API Integration Patterns - Quick Reference

Quick lookup guide for common API integration patterns and solutions.

---

## Authentication Quick Reference

### Which Auth Method to Use?

| Scenario | Use | Example |
|----------|-----|---------|
| User grants permission | OAuth2 | Google, GitHub, Slack |
| Backend-to-backend | JWT/API Key | Stripe, Twilio, SendGrid |
| Simple API | API Key | Most SaaS APIs |
| Legacy systems | Basic Auth | Internal APIs |
| Mutual verification | mTLS | Bank APIs, high security |

### Auth Code Templates

**OAuth2 (User Permission)**
```bash
curl -X POST https://provider.com/oauth/token \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=YOUR_ID&client_secret=YOUR_SECRET"
```

**JWT (Service-to-Service)**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.example.com/v1/data
```

**API Key**
```bash
curl -H "Authorization: Bearer sk_live_xxxxx" \
  https://api.example.com/v1/customers
```

**Basic Auth**
```bash
curl -u "username:password" \
  https://api.example.com/v1/data
```

---

## Rate Limiting Solutions

### Quick Decision Tree

```
Am I hitting rate limits?
├─ YES → See your rate limit headers
│        ├─ X-RateLimit-Remaining low?
│        │  └─ Add delay between requests
│        ├─ 429 Too Many Requests?
│        │  └─ Use exponential backoff + retry
│        └─ Need more capacity?
│           └─ Batch requests together
└─ NO → Continue as normal
```

### Rate Limit Header Parsing

```javascript
const limit = parseInt(response.headers.get('X-RateLimit-Limit'));
const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
const reset = parseInt(response.headers.get('X-RateLimit-Reset'));

const percentUsed = (1 - remaining / limit) * 100;
const nearLimit = percentUsed > 80;
const resetTime = new Date(reset * 1000).toISOString();
```

### Delay Calculations

| Scenario | Formula | Example |
|----------|---------|---------|
| Exponential backoff | `2^attempt * initialDelay` | Attempt 3: 8 * 1000ms = 8s |
| With jitter | `backoff ± (backoff * 0.1)` | 8s ± 0.8s = 7.2s - 8.8s |
| Retry-After header | Parse header value | `Retry-After: 60` = wait 60s |

---

## Error Handling Strategies

### Error Classification

```javascript
const ERROR_TYPES = {
  // Client Errors (don't retry)
  '400': 'Bad Request - Fix request',
  '401': 'Unauthorized - Check credentials',
  '403': 'Forbidden - Insufficient permissions',
  '404': 'Not Found - Check endpoint',
  
  // Rate Limit (retry with delay)
  '429': 'Too Many Requests - Use exponential backoff',
  
  // Server Errors (retry with backoff)
  '500': 'Internal Server Error - Retry',
  '502': 'Bad Gateway - Retry',
  '503': 'Service Unavailable - Retry',
  '504': 'Gateway Timeout - Retry',
  
  // Network Errors (retry)
  'ECONNREFUSED': 'Connection refused - Retry',
  'ENOTFOUND': 'Domain not found - Check URL',
  'ETIMEDOUT': 'Connection timeout - Retry',
  
  // Timeout (retry)
  '408': 'Request Timeout - Retry'
};
```

### Retry Decision Tree

```
Error occurred
├─ Is it retryable? (5xx, 429, timeout, network error)
│  ├─ YES
│  │  ├─ Have we retried N times?
│  │  │  ├─ NO → Wait exponential_backoff, retry
│  │  │  └─ YES → Move to Dead Letter Queue
│  │  └─ Alert on final failure
│  └─ NO (4xx except 429)
│     ├─ Log error
│     ├─ Alert user/admin
│     └─ Stop processing
```

---

## Webhook Patterns

### Webhook Signature Verification

```javascript
// Stripe
const signature = crypto
  .createHmac('sha256', secret)
  .update(rawBody, 'utf8')
  .digest('hex');

// GitHub
const signature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

// Generic HMAC
crypto.timingSafeEqual(
  Buffer.from(receivedSignature),
  Buffer.from(computedSignature)
);
```

### Webhook Delivery Pattern

```
Client Event
├─ Generate webhook data
├─ Sign with HMAC-SHA256
├─ Add timestamp header
├─ Add unique webhook ID
├─ Send HTTP POST (timeout: 30s)
├─ Receive response
│  ├─ 2xx → Mark as delivered
│  ├─ 5xx → Retry exponential backoff
│  ├─ 4xx → Don't retry, log error
│  └─ Timeout → Retry exponential backoff
└─ Retry up to N times with increasing delays
```

### Preventing Replay Attacks

```javascript
const maxAge = 300000; // 5 minutes
const messageAge = Date.now() - new Date(headers['timestamp']).getTime();

if (messageAge > maxAge) {
  reject('Webhook too old - possible replay attack');
}

// Check if webhook ID already processed
const isDuplicate = await isWebhookProcessed(headers['webhook-id']);
if (isDuplicate) {
  return 200; // Accept but don't reprocess
}
```

---

## Batch vs Single Requests

### When to Batch

```
# Sending 1000 items
├─ Single requests: 1000 API calls (hit rate limits)
├─ Batch API (100 items/batch): 10 API calls ✓
├─ Batch with max concurrency: 5 parallel batches
└─ Result: 10x faster, no rate limit issues
```

### Batch Request Template

```javascript
const items = [...]; // 1000+ items
const batchSize = 100;

for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  
  const response = await fetch('/api/batch', {
    method: 'POST',
    body: JSON.stringify({
      items: batch,
      batchId: `batch-${i / batchSize}`
    })
  });
  
  // Process response
  
  // Add delay between batches
  if (i + batchSize < items.length) {
    await delay(1000);
  }
}
```

---

## API Response Transformation

### Common Transformations

```javascript
// Transform 1: Flatten nested objects
$json.user.profile.email → email

// Transform 2: Rename fields
stripe_id → id
customer_email → email

// Transform 3: Calculate/derive fields
amount_cents → amount_usd: amount_cents / 100

// Transform 4: Filter sensitive data
Remove: api_keys, secrets, passwords

// Transform 5: Format for downstream
timestamp (unix) → ISO 8601 string
```

### Validation Before Processing

```javascript
const schema = {
  id: { required: true, type: 'string' },
  email: { required: true, type: 'email' },
  amount: { required: false, type: 'number', min: 0 },
  status: { required: true, enum: ['pending', 'completed', 'failed'] }
};

// Validate against schema
const errors = validateAgainstSchema(data, schema);
if (errors.length > 0) {
  throw new ValidationError(errors);
}
```

---

## API Selection: REST vs GraphQL

### Use REST If

- Simple CRUD operations
- Standardized endpoints
- HTTP caching important
- Team comfortable with REST
- Building simple APIs
- Need good browser caching

### Use GraphQL If

- Complex nested queries needed
- Avoiding over/under-fetching
- Mobile app (bandwidth matters)
- Real-time subscriptions needed
- Rapid product evolution
- Multiple client types with different needs

### Side-by-Side Comparison

```javascript
// REST: Get user and their posts
GET /users/123         // 1st request
GET /users/123/posts   // 2nd request (under-fetch issue)

// GraphQL: Single request, exactly what you need
query {
  user(id: 123) {
    name
    email
    posts {
      id
      title
      comments { author }
    }
  }
}
```

---

## Monitoring & Alerting

### Key Metrics to Track

| Metric | Good Range | Alert Threshold |
|--------|------------|-----------------|
| Response time | < 500ms | > 5000ms |
| Error rate | < 0.1% | > 5% |
| Availability | > 99.9% | < 99% |
| Rate limit % used | < 80% | > 80% |

### Alert Priorities

```
CRITICAL (Page immediately)
├─ Service completely down
├─ Repeated 500 errors
├─ Error rate > 10%
└─ Webhook delivery failing for 30+ minutes

HIGH (Notify within 1 hour)
├─ Intermittent errors
├─ Response time degradation
├─ Approaching rate limits
└─ Authentication issues

MEDIUM (Daily digest)
├─ Slow requests
├─ High but acceptable error rate
└─ Unusual patterns

LOW (Monthly report)
├─ Performance trends
├─ Usage patterns
└─ Optimization opportunities
```

---

## Security Checklist

```
Authentication
☐ Store secrets in environment variables
☐ Use secrets manager for production
☐ Rotate API keys every 90 days
☐ Never log credentials
☐ Use HTTPS for all API calls
☐ Implement token expiration
☐ Refresh tokens before expiration

Webhooks
☐ Verify webhook signatures
☐ Check webhook timestamp (prevent replay)
☐ Store webhook IDs to prevent duplicates
☐ Use HTTPS only
☐ Validate webhook source IP (if available)
☐ Timeout after 30 seconds

Data Protection
☐ Encrypt sensitive data at rest
☐ Don't store raw card numbers
☐ Mask PII in logs
☐ Sanitize user inputs
☐ Validate all inputs server-side
☐ Use parameterized queries (prevent SQL injection)
☐ Implement rate limiting
☐ Add CSRF protection

Access Control
☐ Implement least privilege principle
☐ Use API key scopes/permissions
☐ Audit API usage logs
☐ Revoke unused credentials
☐ Implement IP whitelisting (if applicable)
```

---

## Common Integration Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Expired token | Refresh token or reauthenticate |
| 429 Too Many Requests | Rate limit exceeded | Implement exponential backoff |
| 500 Internal Server Error | API bug or overload | Retry with exponential backoff |
| Connection timeout | Network/server slow | Increase timeout, add retry |
| Invalid signature | Wrong secret key | Verify secret key is correct |
| Duplicate webhook processing | No idempotency check | Add webhook ID tracking |
| Over-fetching data | Querying too many fields | Use sparse fieldsets or GraphQL |
| Under-fetching data | Need multiple requests | Use batch API or batch requests |
| CORS errors | Cross-origin request | Use backend proxy or CORS headers |
| Certificate pinning failure | Cert expired/changed | Update pinned certificate |

---

## API Rate Limit Handling Comparison

| Provider | Rate Limit Header | Delay Header | Reset |
|----------|-------------------|--------------|-------|
| Stripe | X-RateLimit-Limit | Retry-After | X-RateLimit-Reset |
| GitHub | X-RateLimit-Limit | N/A | X-RateLimit-Reset |
| Twilio | X-Rate-Limit-Limit | Retry-After | N/A |
| Google | rate-limit-user-* | Retry-After | N/A |
| AWS | N/A | Retry-After | N/A |

---

## Quick Command Reference

### Test API with cURL

```bash
# GET request
curl https://api.example.com/v1/data

# POST with JSON
curl -X POST https://api.example.com/v1/data \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# With authentication
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/v1/data

# With headers
curl -H "X-API-Key: your-key" \
  -H "X-Custom-Header: value" \
  https://api.example.com/v1/data

# Save response to file
curl https://api.example.com/v1/data > response.json

# Verbose output
curl -v https://api.example.com/v1/data

# Follow redirects
curl -L https://api.example.com/v1/data
```

### Test Webhook Locally

```bash
# Using ngrok to expose local server
ngrok http 3000

# Test webhook with cURL
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: SIGNATURE_HERE" \
  -d @webhook-payload.json
```

---

## Additional Resources

### Documentation
- OAuth 2.0 Authorization Framework: https://tools.ietf.org/html/rfc6749
- JSON Web Token (JWT): https://jwt.io
- GraphQL Specification: https://spec.graphql.org

### Tools
- Postman (API testing): https://www.postman.com
- Insomnia (API client): https://insomnia.rest
- JWT.io (JWT debugging): https://jwt.io
- ngrok (Webhook testing): https://ngrok.com
- Stripe API Docs: https://stripe.com/docs/api

---

**Version:** 1.0.0  
**Last Updated:** November 8, 2025  
**Quick Links:** [Full Guide](API_INTEGRATION_PATTERNS_GUIDE.md) | [n8n Examples](N8N_API_INTEGRATION_EXAMPLES.md)

