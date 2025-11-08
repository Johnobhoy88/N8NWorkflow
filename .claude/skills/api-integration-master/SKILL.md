---
name: API Integration Master
description: Expert in REST, GraphQL, and webhook integrations with OAuth2, rate limiting, and error handling. Use for API design, authentication, retry logic, and third-party service integration.
---

# API Integration Master Skill

You are an expert in API integration patterns, authentication methods, rate limiting, error handling, and production-ready integration design.

## Authentication Methods (2025)

### 1. OAuth 2.0 Client Credentials

```javascript
let tokenCache = { token: null, expiresAt: null };

async function getAccessToken() {
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const response = await $http.request({
    method: 'POST',
    url: 'https://auth.example.com/oauth/token',
    body: {
      grant_type: 'client_credentials',
      client_id: $env.CLIENT_ID,
      client_secret: $env.CLIENT_SECRET,
      scope: 'read write'
    }
  });

  tokenCache = {
    token: response.access_token,
    expiresAt: Date.now() + (response.expires_in * 1000) - 60000
  };

  return tokenCache.token;
}
```

### 2. API Key (Header/Query)

```javascript
// Header-based
const response = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/v1/data',
  headers: {
    'X-API-Key': $env.API_KEY,
    'Content-Type': 'application/json'
  }
});

// Query parameter (less secure, avoid if possible)
const url = `https://api.example.com/v1/data?api_key=${$env.API_KEY}`;
```

### 3. Bearer Token

```javascript
const response = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/v1/protected',
  headers: {
    'Authorization': `Bearer ${$env.ACCESS_TOKEN}`
  }
});
```

### 4. HMAC Signature

```javascript
const crypto = require('crypto');

function generateHMACSignature(method, url, timestamp, body, secret) {
  const payload = [method, url, timestamp, body].join('\n');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

const timestamp = Math.floor(Date.now() / 1000);
const body = JSON.stringify({ data: 'example' });
const signature = generateHMACSignature('POST', '/api/v1/endpoint', timestamp, body, $env.API_SECRET);

await $http.request({
  method: 'POST',
  url: 'https://api.example.com/v1/endpoint',
  headers: {
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature
  },
  body: body
});
```

## Retry Logic & Rate Limiting

### Exponential Backoff with Jitter

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        ...options,
        url: url,
        returnFullResponse: true,
        timeout: 30000
      });

      return response.body;

    } catch (error) {
      // Don't retry 4xx errors (except 429)
      if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      if (attempt === maxRetries - 1) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Handle 429 with Retry-After header
      if (error.statusCode === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        if (retryAfter) {
          const waitMs = parseInt(retryAfter) * 1000;
          console.log(`Rate limited. Waiting ${waitMs}ms`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
      }

      // Exponential backoff with jitter
      const baseBackoff = 1000 * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const backoffMs = Math.min(baseBackoff + jitter, 30000);

      console.log(`Retry in ${Math.round(backoffMs)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}
```

### Token Bucket Rate Limiter

```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1) {
    this.refill();

    while (this.tokens < tokens) {
      const waitTime = Math.ceil((tokens - this.tokens) / this.refillRate * 1000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= tokens;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Usage
const rateLimiter = new TokenBucket(100, 10); // 100 capacity, 10 req/sec

for (const item of items) {
  await rateLimiter.consume(1);
  await makeAPICall(item);
}
```

## Pagination Patterns

### Offset-Based

```javascript
async function fetchAllPages(baseUrl, pageSize = 100) {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await $http.request({
      method: 'GET',
      url: `${baseUrl}?page=${page}&limit=${pageSize}`,
      headers: { 'Authorization': `Bearer ${$env.ACCESS_TOKEN}` }
    });

    allRecords = allRecords.concat(response.data);
    hasMore = response.data.length === pageSize;
    page++;

    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
  }

  return allRecords;
}
```

### Cursor-Based

```javascript
async function fetchAllWithCursor(baseUrl) {
  let allRecords = [];
  let cursor = null;

  do {
    const url = cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl;

    const response = await $http.request({
      method: 'GET',
      url: url,
      headers: { 'Authorization': `Bearer ${$env.ACCESS_TOKEN}` }
    });

    allRecords = allRecords.concat(response.data);
    cursor = response.pagination?.next_cursor;

  } while (cursor);

  return allRecords;
}
```

## GraphQL Integration

### Query with Variables

```javascript
const query = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      orders {
        id
        total
        status
      }
    }
  }
`;

const variables = { id: $json.userId };

const response = await $http.request({
  method: 'POST',
  url: 'https://api.example.com/graphql',
  headers: {
    'Authorization': `Bearer ${$env.ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    query: query,
    variables: variables
  }
});

if (response.errors && response.errors.length > 0) {
  throw new Error(`GraphQL Error: ${response.errors[0].message}`);
}

return [{ json: response.data.user }];
```

### Mutation

```javascript
const mutation = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      createdAt
    }
  }
`;

const variables = {
  input: {
    name: $json.name,
    email: $json.email,
    role: 'USER'
  }
};

const response = await $http.request({
  method: 'POST',
  url: 'https://api.example.com/graphql',
  body: { query: mutation, variables: variables }
});
```

## Common Service Integrations

### Stripe

```javascript
// Create customer
const customer = await $http.request({
  method: 'POST',
  url: 'https://api.stripe.com/v1/customers',
  headers: {
    'Authorization': `Bearer ${$env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    email: $json.email,
    name: $json.name
  }).toString()
});

// Create payment intent
const paymentIntent = await $http.request({
  method: 'POST',
  url: 'https://api.stripe.com/v1/payment_intents',
  headers: {
    'Authorization': `Bearer ${$env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    amount: Math.round($json.amount * 100),
    currency: 'usd',
    customer: customer.id
  }).toString()
});
```

### SendGrid

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.sendgrid.com/v3/mail/send',
  headers: {
    'Authorization': `Bearer ${$env.SENDGRID_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    personalizations: [
      {
        to: [{ email: $json.email, name: $json.name }],
        subject: $json.subject
      }
    ],
    from: {
      email: 'noreply@company.com',
      name: 'Company Name'
    },
    content: [
      {
        type: 'text/html',
        value: $json.htmlContent
      }
    ]
  }
});
```

### Slack

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://slack.com/api/chat.postMessage',
  headers: {
    'Authorization': `Bearer ${$env.SLACK_BOT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    channel: '#general',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${$json.title}*\n${$json.message}`
        }
      }
    ]
  }
});
```

## Best Practices

### ✅ DO

1. **Use environment variables for credentials**
2. **Implement retry logic with exponential backoff**
3. **Respect rate limits (use Retry-After header)**
4. **Validate responses before using data**
5. **Set appropriate timeouts (30s default)**
6. **Log API errors for debugging**
7. **Use HTTPS for all API calls**
8. **Cache access tokens until expiration**
9. **Handle pagination properly**
10. **Version your API calls when supported**

### ❌ DON'T

1. **Don't hardcode credentials**
2. **Don't retry 4xx errors (except 429)**
3. **Don't ignore rate limit headers**
4. **Don't fetch unbounded data - paginate**
5. **Don't expose API keys in logs**
6. **Don't skip error handling**
7. **Don't use HTTP in production**
8. **Don't make parallel requests without rate limiting**
9. **Don't assume API structure won't change**
10. **Don't skip response validation**

## When to Use This Skill

Invoke when:
- Integrating with REST or GraphQL APIs
- Implementing authentication (OAuth2, API keys, HMAC)
- Adding retry logic and error handling
- Managing rate limiting
- Connecting to third-party services (Stripe, SendGrid, Slack, etc.)
- Debugging API integration issues
- Optimizing API call performance
- Implementing webhooks (inbound/outbound)

## Knowledge Base Reference

`domains/integrations/knowledge/advanced/api-integration-patterns.md`

---

*Leverages 2025 API integration best practices with production-ready patterns.*
