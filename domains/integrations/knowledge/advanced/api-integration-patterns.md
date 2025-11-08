# API Integration Patterns - Complete Guide (2025)

## Table of Contents
- [Authentication Patterns](#authentication-patterns)
- [REST API Integration](#rest-api-integration)
- [GraphQL Integration](#graphql-integration)
- [Webhook Integration](#webhook-integration)
- [Rate Limiting & Retries](#rate-limiting--retries)
- [Common Service Integrations](#common-service-integrations)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Authentication Patterns

### 1. API Key Authentication

**Header-based:**
```javascript
const response = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/v1/data',
  headers: {
    'X-API-Key': $env.API_KEY,
    'Content-Type': 'application/json'
  }
});
```

**Query parameter:**
```javascript
const url = `https://api.example.com/v1/data?api_key=${$env.API_KEY}`;
```

---

### 2. Bearer Token Authentication

```javascript
const response = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/v1/protected',
  headers: {
    'Authorization': `Bearer ${$env.ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
});
```

---

### 3. OAuth 2.0 Client Credentials Flow

```javascript
// Step 1: Get access token
async function getAccessToken() {
  const response = await $http.request({
    method: 'POST',
    url: 'https://auth.example.com/oauth/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: $env.CLIENT_ID,
      client_secret: $env.CLIENT_SECRET,
      scope: 'read write'
    }).toString()
  });

  return response.access_token;
}

// Step 2: Use access token
const token = await getAccessToken();

const apiResponse = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/v1/data',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**With token caching:**
```javascript
let tokenCache = {
  token: null,
  expiresAt: null
};

async function getAccessToken() {
  // Check if cached token is still valid
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  // Request new token
  const response = await $http.request({
    method: 'POST',
    url: 'https://auth.example.com/oauth/token',
    body: {
      grant_type: 'client_credentials',
      client_id: $env.CLIENT_ID,
      client_secret: $env.CLIENT_SECRET
    }
  });

  // Cache token
  tokenCache = {
    token: response.access_token,
    expiresAt: Date.now() + (response.expires_in * 1000) - 60000  // Refresh 1 min early
  };

  return tokenCache.token;
}
```

---

### 4. OAuth 2.0 Authorization Code Flow

```javascript
// Step 1: Redirect user to authorization URL
const authUrl = new URL('https://auth.example.com/oauth/authorize');
authUrl.searchParams.append('client_id', $env.CLIENT_ID);
authUrl.searchParams.append('redirect_uri', 'https://your-app.com/callback');
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', 'read write');
authUrl.searchParams.append('state', generateRandomState());

// Redirect user to: authUrl.toString()

// Step 2: Handle callback and exchange code for token
async function handleCallback(authorizationCode) {
  const response = await $http.request({
    method: 'POST',
    url: 'https://auth.example.com/oauth/token',
    body: {
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: 'https://your-app.com/callback',
      client_id: $env.CLIENT_ID,
      client_secret: $env.CLIENT_SECRET
    }
  });

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_in: response.expires_in
  };
}

// Step 3: Refresh token when expired
async function refreshAccessToken(refreshToken) {
  const response = await $http.request({
    method: 'POST',
    url: 'https://auth.example.com/oauth/token',
    body: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: $env.CLIENT_ID,
      client_secret: $env.CLIENT_SECRET
    }
  });

  return response.access_token;
}
```

---

### 5. Basic Authentication

```javascript
const credentials = Buffer.from(`${$env.USERNAME}:${$env.PASSWORD}`).toString('base64');

const response = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/v1/data',
  headers: {
    'Authorization': `Basic ${credentials}`
  }
});
```

---

### 6. HMAC Signature Authentication

```javascript
const crypto = require('crypto');

function generateHMACSignature(method, url, timestamp, body, secret) {
  const payload = [method, url, timestamp, body].join('\n');

  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

const timestamp = Math.floor(Date.now() / 1000);
const body = JSON.stringify({ data: 'example' });

const signature = generateHMACSignature(
  'POST',
  '/api/v1/endpoint',
  timestamp,
  body,
  $env.API_SECRET
);

const response = await $http.request({
  method: 'POST',
  url: 'https://api.example.com/v1/endpoint',
  headers: {
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature,
    'Content-Type': 'application/json'
  },
  body: body
});
```

---

## REST API Integration

### GET Request with Query Parameters

```javascript
const params = new URLSearchParams({
  page: 1,
  limit: 100,
  sort: 'created_at:desc',
  filter: 'status:active'
});

const response = await $http.request({
  method: 'GET',
  url: `https://api.example.com/v1/users?${params}`,
  headers: {
    'Authorization': `Bearer ${$env.ACCESS_TOKEN}`
  }
});

return response.data.map(user => ({ json: user }));
```

---

### POST Request with JSON Body

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.example.com/v1/users',
  headers: {
    'Authorization': `Bearer ${$env.ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    name: $json.name,
    email: $json.email,
    role: 'user'
  }
});

return [{ json: response }];
```

---

### PATCH/PUT Update Requests

```javascript
// PATCH - partial update
const response = await $http.request({
  method: 'PATCH',
  url: `https://api.example.com/v1/users/${$json.userId}`,
  headers: {
    'Authorization': `Bearer ${$env.ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    status: 'active'  // Only update status field
  }
});

// PUT - full replacement
const fullUpdate = await $http.request({
  method: 'PUT',
  url: `https://api.example.com/v1/users/${$json.userId}`,
  body: {
    name: $json.name,
    email: $json.email,
    role: $json.role
    // All fields required for PUT
  }
});
```

---

### Pagination Handling

**Offset-based pagination:**
```javascript
async function fetchAllPages(baseUrl, pageSize = 100) {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await $http.request({
      method: 'GET',
      url: `${baseUrl}?page=${page}&limit=${pageSize}`,
      headers: {
        'Authorization': `Bearer ${$env.ACCESS_TOKEN}`
      }
    });

    allRecords = allRecords.concat(response.data);

    hasMore = response.data.length === pageSize;
    page++;

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allRecords;
}
```

**Cursor-based pagination:**
```javascript
async function fetchAllWithCursor(baseUrl) {
  let allRecords = [];
  let cursor = null;

  do {
    const url = cursor
      ? `${baseUrl}?cursor=${cursor}`
      : baseUrl;

    const response = await $http.request({
      method: 'GET',
      url: url,
      headers: {
        'Authorization': `Bearer ${$env.ACCESS_TOKEN}`
      }
    });

    allRecords = allRecords.concat(response.data);
    cursor = response.pagination?.next_cursor;

  } while (cursor);

  return allRecords;
}
```

---

## GraphQL Integration

### Basic GraphQL Query

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

const variables = {
  id: $json.userId
};

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

// Check for GraphQL errors
if (response.errors && response.errors.length > 0) {
  throw new Error(`GraphQL Error: ${response.errors[0].message}`);
}

return [{ json: response.data.user }];
```

---

### GraphQL Mutation

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
  body: {
    query: mutation,
    variables: variables
  }
});

return [{ json: response.data.createUser }];
```

---

## Common Service Integrations

### Stripe Integration

**Create Customer:**
```javascript
const customer = await $http.request({
  method: 'POST',
  url: 'https://api.stripe.com/v1/customers',
  headers: {
    'Authorization': `Bearer ${$env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    email: $json.email,
    name: $json.name,
    metadata: JSON.stringify({
      user_id: $json.userId
    })
  }).toString()
});

return [{ json: customer }];
```

**Create Payment Intent:**
```javascript
const paymentIntent = await $http.request({
  method: 'POST',
  url: 'https://api.stripe.com/v1/payment_intents',
  headers: {
    'Authorization': `Bearer ${$env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    amount: Math.round($json.amount * 100), // Convert to cents
    currency: 'usd',
    customer: $json.stripeCustomerId,
    'metadata[order_id]': $json.orderId
  }).toString()
});
```

---

### SendGrid Integration

**Send Email:**
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

---

### Slack Integration

**Post Message:**
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
    text: $json.message,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*New Order* #${$json.orderId}\nAmount: $${$json.amount}`
        }
      }
    ]
  }
});
```

---

### Google Sheets Integration

**Append Row:**
```javascript
const response = await $http.request({
  method: 'POST',
  url: `https://sheets.googleapis.com/v4/spreadsheets/${$env.SHEET_ID}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
  headers: {
    'Authorization': `Bearer ${$env.GOOGLE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    values: [
      [
        $json.name,
        $json.email,
        $json.phone,
        new Date().toISOString()
      ]
    ]
  }
});
```

---

## Rate Limiting & Retries

### Exponential Backoff with Jitter

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        ...options,
        url: url,
        returnFullResponse: true
      });

      return response.body;

    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      // Don't retry on client errors (4xx except 429)
      if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      if (isLastAttempt) {
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

      console.log(`Attempt ${attempt + 1} failed. Retrying in ${Math.round(backoffMs)}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

// Usage
const data = await fetchWithRetry('https://api.example.com/data', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${$env.ACCESS_TOKEN}`
  }
});
```

---

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
const rateLimiter = new TokenBucket(10, 2); // 10 capacity, 2 req/sec

for (const item of items) {
  await rateLimiter.consume(1);
  await makeAPICall(item);
}
```

---

## Best Practices Summary

### ✅ DO

1. **Use environment variables** for all credentials
2. **Implement retry logic** with exponential backoff
3. **Respect rate limits** (use Retry-After header)
4. **Validate responses** before using data
5. **Set appropriate timeouts** (30s default)
6. **Log all API errors** for debugging
7. **Use HTTPS** for all API calls
8. **Cache access tokens** until expiration
9. **Handle pagination** properly
10. **Version your API calls** when supported

### ❌ DON'T

1. **Don't hardcode credentials** in workflows
2. **Don't retry 4xx errors** (except 429)
3. **Don't ignore rate limit headers**
4. **Don't fetch unbounded data** - always paginate
5. **Don't expose API keys** in logs
6. **Don't skip error handling**
7. **Don't use HTTP** in production
8. **Don't make parallel requests** without rate limiting
9. **Don't assume API structure** won't change
10. **Don't skip response validation**

---

**Last Updated:** January 2025
**Standards:** OAuth 2.0, OpenAPI 3.1, REST, GraphQL
