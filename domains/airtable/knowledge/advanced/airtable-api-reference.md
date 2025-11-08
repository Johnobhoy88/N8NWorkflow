# Airtable API Complete Reference (2025)

## Table of Contents
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [REST API Operations](#rest-api-operations)
- [Webhooks API](#webhooks-api)
- [Field Types & Formatting](#field-types--formatting)
- [Filtering & Sorting](#filtering--sorting)
- [Linked Records](#linked-records)
- [Attachments](#attachments)
- [Best Practices](#best-practices)

---

## API Overview

### Base API Structure

```
https://api.airtable.com/v0/{baseId}/{tableName}
```

**Components:**
- `baseId`: Found in base URL (e.g., `appXXXXXXXXXXXXXX`)
- `tableName`: URL-encoded table name or table ID

**Response Format:**
```json
{
  "records": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "createdTime": "2025-01-08T10:00:00.000Z",
      "fields": {
        "Name": "Example Record",
        "Status": "Active",
        "Count": 42
      }
    }
  ],
  "offset": "itrXXXXXXXXXXXXXX/recXXXXXXXXXXXXXX"
}
```

---

## Authentication

### Personal Access Token (Recommended 2025)

**Create Token:**
1. Visit https://airtable.com/create/tokens
2. Create token with specific scopes
3. Assign to specific bases

**HTTP Header:**
```
Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN
```

**Example (cURL):**
```bash
curl "https://api.airtable.com/v0/appXXXXXX/TableName" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### OAuth 2.0 (For Apps)

**Authorization Code Flow:**
```
1. Redirect user to:
   https://airtable.com/oauth2/v1/authorize?
   client_id=YOUR_CLIENT_ID&
   redirect_uri=YOUR_REDIRECT_URI&
   response_type=code&
   scope=data.records:read data.records:write

2. Receive authorization code at redirect_uri

3. Exchange code for access token:
   POST https://airtable.com/oauth2/v1/token
   {
     "code": "AUTHORIZATION_CODE",
     "client_id": "YOUR_CLIENT_ID",
     "client_secret": "YOUR_CLIENT_SECRET",
     "redirect_uri": "YOUR_REDIRECT_URI",
     "grant_type": "authorization_code"
   }

4. Receive:
   {
     "access_token": "ACCESS_TOKEN",
     "refresh_token": "REFRESH_TOKEN",
     "expires_in": 3600
   }
```

---

## Rate Limits

### Current Limits (2025)

```
┌─────────────────────────────────────┐
│  REST API Limits                    │
│  - 5 requests per second per base   │
│  - 50,000 requests per day per base │
├─────────────────────────────────────┤
│  Webhooks API                       │
│  - 5 requests per second            │
│  - 100KB max payload size           │
│  - 50 webhooks per base (max)       │
└─────────────────────────────────────┘
```

### Rate Limit Headers

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1704715200
```

### Handle Rate Limiting

```javascript
async function airtableRequestWithRetry(config, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        ...config,
        returnFullResponse: true
      });

      return response.body;
    } catch (error) {
      if (error.statusCode === 429) {
        // Rate limited - check Retry-After header
        const retryAfter = error.response?.headers['retry-after'] || 30;
        console.log(`Rate limited. Waiting ${retryAfter}s`);

        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      throw error;
    }
  }
}

// Usage
const records = await airtableRequestWithRetry({
  method: 'GET',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`
  }
});
```

---

## REST API Operations

### List Records (GET)

**Basic Request:**
```bash
GET /v0/{baseId}/{tableName}
```

**With Parameters:**
```javascript
const params = new URLSearchParams({
  maxRecords: '100',
  pageSize: '100',
  view: 'Grid view',
  sort: JSON.stringify([{ field: 'Name', direction: 'asc' }]),
  filterByFormula: "AND({Status} = 'Active', {Count} > 10)"
});

const url = `https://api.airtable.com/v0/${baseId}/TableName?${params}`;
```

**Response:**
```json
{
  "records": [
    {
      "id": "rec123",
      "createdTime": "2025-01-08T10:00:00.000Z",
      "fields": {
        "Name": "John Doe",
        "Email": "john@example.com",
        "Status": "Active"
      }
    }
  ],
  "offset": "itr456/rec789"
}
```

**Pagination:**
```javascript
async function getAllRecords(baseId, tableName, token) {
  let allRecords = [];
  let offset = null;

  do {
    const params = new URLSearchParams({
      pageSize: '100',
      ...(offset && { offset })
    });

    const response = await $http.request({
      method: 'GET',
      url: `https://api.airtable.com/v0/${baseId}/${tableName}?${params}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    allRecords = allRecords.concat(response.records);
    offset = response.offset;

  } while (offset);

  return allRecords;
}

// Usage
const allContacts = await getAllRecords(
  $env.AIRTABLE_BASE_ID,
  'Contacts',
  $env.AIRTABLE_TOKEN
);

return [{ json: { total: allContacts.length, records: allContacts } }];
```

---

### Retrieve Single Record (GET)

```bash
GET /v0/{baseId}/{tableName}/{recordId}
```

**Example:**
```javascript
const response = await $http.request({
  method: 'GET',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts/rec123`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`
  }
});

// Response
{
  "id": "rec123",
  "createdTime": "2025-01-08T10:00:00.000Z",
  "fields": {
    "Name": "John Doe",
    "Email": "john@example.com"
  }
}
```

---

### Create Records (POST)

**Single Record:**
```javascript
const newRecord = await $http.request({
  method: 'POST',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    fields: {
      'Name': 'Jane Smith',
      'Email': 'jane@example.com',
      'Status': 'Active',
      'Count': 1
    }
  }
});

// Response
{
  "id": "rec456",
  "createdTime": "2025-01-08T11:00:00.000Z",
  "fields": {
    "Name": "Jane Smith",
    "Email": "jane@example.com",
    "Status": "Active",
    "Count": 1
  }
}
```

**Multiple Records (Batch):**
```javascript
// Max 10 records per request
const response = await $http.request({
  method: 'POST',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    records: [
      {
        fields: {
          'Name': 'Alice Johnson',
          'Email': 'alice@example.com'
        }
      },
      {
        fields: {
          'Name': 'Bob Williams',
          'Email': 'bob@example.com'
        }
      }
    ]
  }
});

// Response
{
  "records": [
    {
      "id": "rec789",
      "createdTime": "2025-01-08T11:00:00.000Z",
      "fields": { "Name": "Alice Johnson", "Email": "alice@example.com" }
    },
    {
      "id": "rec101",
      "createdTime": "2025-01-08T11:00:00.000Z",
      "fields": { "Name": "Bob Williams", "Email": "bob@example.com" }
    }
  ]
}
```

---

### Update Records (PATCH)

**Single Record:**
```javascript
const updated = await $http.request({
  method: 'PATCH',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts/rec123`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    fields: {
      'Status': 'Inactive',
      'Count': 5
    }
  }
});

// Only specified fields are updated, others remain unchanged
```

**Multiple Records:**
```javascript
// Max 10 records per request
const response = await $http.request({
  method: 'PATCH',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    records: [
      {
        id: 'rec123',
        fields: { 'Status': 'Active' }
      },
      {
        id: 'rec456',
        fields: { 'Status': 'Inactive' }
      }
    ]
  }
});
```

---

### Replace Records (PUT)

```javascript
// PUT replaces ALL fields - unspecified fields are cleared
const replaced = await $http.request({
  method: 'PUT',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts/rec123`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    fields: {
      'Name': 'Updated Name',
      'Email': 'updated@example.com'
      // All other fields will be cleared
    }
  }
});
```

---

### Delete Records (DELETE)

**Single Record:**
```javascript
const deleted = await $http.request({
  method: 'DELETE',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts/rec123`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`
  }
});

// Response
{
  "deleted": true,
  "id": "rec123"
}
```

**Multiple Records:**
```javascript
const params = new URLSearchParams();
params.append('records[]', 'rec123');
params.append('records[]', 'rec456');
params.append('records[]', 'rec789');

const deleted = await $http.request({
  method: 'DELETE',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Contacts?${params}`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`
  }
});

// Response
{
  "records": [
    { "deleted": true, "id": "rec123" },
    { "deleted": true, "id": "rec456" },
    { "deleted": true, "id": "rec789" }
  ]
}
```

---

## Webhooks API

### Create Webhook

```javascript
const webhook = await $http.request({
  method: 'POST',
  url: 'https://api.airtable.com/v0/bases/{baseId}/webhooks',
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    notificationUrl: 'https://your-n8n.com/webhook/airtable-updates',
    specification: {
      options: {
        filters: {
          dataTypes: ['tableData'],
          recordChangeScope: 'tblXXXXXXXXXXXXXX' // Specific table ID
        }
      }
    }
  }
});

// Response
{
  "id": "achXXXXXXXXXXXXXX",
  "macSecretBase64": "BASE64_SECRET_FOR_HMAC",
  "expirationTime": "2025-01-15T10:00:00.000Z"
}
```

### Webhook Payload Structure

**Record Created:**
```json
{
  "base": {
    "id": "appXXXXXXXXXXXXXX"
  },
  "webhook": {
    "id": "achXXXXXXXXXXXXXX"
  },
  "timestamp": "2025-01-08T10:00:00.000Z",
  "actionMetadata": {
    "source": "publicApi"
  },
  "createdTablesById": {},
  "changedMetadataByTableId": {},
  "createdRecordsById": {
    "rec123": {
      "createdTime": "2025-01-08T10:00:00.000Z",
      "cellValuesByFieldId": {
        "fldXXX": "John Doe",
        "fldYYY": "john@example.com"
      }
    }
  }
}
```

### Verify Webhook Signature

```javascript
const crypto = require('crypto');

function verifyAirtableWebhook(payload, timestamp, signature, secret) {
  // Construct the signed payload
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;

  // Compute HMAC SHA256
  const expectedSignature = crypto
    .createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(signedPayload)
    .digest('base64');

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In webhook workflow
const payload = $input.first().json.body;
const timestamp = $input.first().json.headers['x-airtable-content-mac-timestamp'];
const signature = $input.first().json.headers['x-airtable-content-mac'];

const isValid = verifyAirtableWebhook(
  payload,
  timestamp,
  signature,
  $env.AIRTABLE_WEBHOOK_SECRET
);

if (!isValid) {
  throw new Error('Invalid webhook signature');
}

return [{ json: { verified: true, payload } }];
```

### Refresh Webhook (Extend Expiration)

```javascript
// Webhooks expire after 7 days - refresh to extend
const refreshed = await $http.request({
  method: 'POST',
  url: `https://api.airtable.com/v0/bases/${$env.AIRTABLE_BASE_ID}/webhooks/${webhookId}/refresh`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`
  }
});

// Response
{
  "expirationTime": "2025-01-22T10:00:00.000Z"
}
```

---

## Field Types & Formatting

### Field Type Examples

```javascript
const record = {
  fields: {
    // Text
    'Single Line Text': 'Hello World',
    'Long Text': 'Multi-line\\ntext content',

    // Number
    'Number': 42,
    'Currency': 99.99,
    'Percent': 0.85, // 85%
    'Duration': 3600, // seconds

    // Date/Time
    'Date': '2025-01-08',
    'Date Time': '2025-01-08T10:00:00.000Z',

    // Boolean
    'Checkbox': true,

    // Select
    'Single Select': 'Option A',
    'Multiple Select': ['Tag1', 'Tag2', 'Tag3'],

    // User
    'User': { id: 'usrXXXXXXXXXXXXXX', email: 'user@example.com' },
    'Multiple Users': [
      { id: 'usrXXX', email: 'user1@example.com' },
      { id: 'usrYYY', email: 'user2@example.com' }
    ],

    // Linked Records
    'Linked Records': ['recAAA', 'recBBB', 'recCCC'],

    // Attachments
    'Attachments': [
      {
        url: 'https://dl.airtable.com/.attachments/...',
        filename: 'document.pdf',
        size: 12345,
        type: 'application/pdf'
      }
    ],

    // Formula (read-only)
    'Formula Field': 'Computed Value',

    // Rollup (read-only)
    'Rollup': [1, 2, 3, 4, 5],

    // Count (read-only)
    'Count': 10,

    // Lookup (read-only)
    'Lookup': ['Value A', 'Value B']
  }
};
```

---

## Filtering & Sorting

### Filter Formula Syntax

**Basic Comparisons:**
```javascript
// Single condition
filterByFormula: "{Status} = 'Active'"

// Multiple conditions (AND)
filterByFormula: "AND({Status} = 'Active', {Count} > 10)"

// Multiple conditions (OR)
filterByFormula: "OR({Priority} = 'High', {Priority} = 'Critical')"

// Complex nested
filterByFormula: "AND(OR({Status} = 'Active', {Status} = 'Pending'), {Count} > 0)"
```

**Common Formulas:**
```javascript
// Text contains
filterByFormula: "FIND('keyword', {Description}) > 0"

// Case-insensitive search
filterByFormula: "FIND(LOWER('keyword'), LOWER({Name})) > 0"

// Date filtering
filterByFormula: "IS_AFTER({Created}, '2025-01-01')"
filterByFormula: "IS_BEFORE({Due Date}, TODAY())"

// Empty/not empty
filterByFormula: "{Email} != ''"
filterByFormula: "NOT({Email})"

// Number range
filterByFormula: "AND({Price} >= 10, {Price} <= 100)"

// Linked records (has any links)
filterByFormula: "COUNT({Linked Records}) > 0"
```

### Sorting

```javascript
const params = new URLSearchParams({
  sort: JSON.stringify([
    { field: 'Priority', direction: 'desc' },
    { field: 'Created', direction: 'asc' }
  ])
});

// URL: ...?sort=[{"field":"Priority","direction":"desc"},{"field":"Created","direction":"asc"}]
```

---

## Linked Records

### Create with Linked Records

```javascript
const record = await $http.request({
  method: 'POST',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Orders`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    fields: {
      'Order Number': 'ORD-001',
      'Customer': ['recCustomer123'], // Link to customer record
      'Products': ['recProd1', 'recProd2', 'recProd3'] // Link to multiple products
    }
  }
});
```

### Update Linked Records

```javascript
// Add links (preserves existing)
const updated = await $http.request({
  method: 'PATCH',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Orders/recOrder123`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    fields: {
      'Products': ['recProd1', 'recProd2', 'recProd4'] // Replaces all links
    }
  }
});

// To add without replacing, fetch current, merge, then update
const current = await fetchRecord('recOrder123');
const existingProducts = current.fields.Products || [];
const newProducts = [...existingProducts, 'recProd5'];

await updateRecord('recOrder123', { Products: newProducts });
```

---

## Attachments

### Upload Attachment

**Step 1: Upload file to external hosting (Airtable doesn't provide upload endpoint)**

**Step 2: Add attachment URL to record:**
```javascript
const record = await $http.request({
  method: 'PATCH',
  url: `https://api.airtable.com/v0/${$env.AIRTABLE_BASE_ID}/Documents/rec123`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    fields: {
      'Attachments': [
        {
          url: 'https://example.com/path/to/file.pdf'
        }
      ]
    }
  }
});

// Airtable will download and host the file
```

### Download Attachment

```javascript
const record = await fetchRecord('rec123');
const attachments = record.fields.Attachments || [];

for (const attachment of attachments) {
  // Download file
  const fileData = await $http.request({
    method: 'GET',
    url: attachment.url,
    encoding: 'arraybuffer'
  });

  // Process file...
}
```

---

## Best Practices

### ✅ DO

1. **Use Personal Access Tokens** with minimum required scopes
2. **Implement rate limiting** (5 req/sec max)
3. **Batch operations** (10 records per request)
4. **Use filterByFormula** instead of fetching all records
5. **Paginate large datasets** (100 records per page)
6. **Cache schema information** (table/field IDs)
7. **Validate field types** before sending
8. **Handle webhook expiration** (refresh every 7 days)
9. **Use field IDs** instead of names for reliability
10. **Log API usage** for debugging

### ❌ DON'T

1. **Don't exceed 5 requests/second** per base
2. **Don't fetch all records** if you only need filtered subset
3. **Don't hardcode base/table IDs** - use environment variables
4. **Don't ignore 429 rate limit errors**
5. **Don't send more than 10 records** in batch operations
6. **Don't assume field names** never change
7. **Don't skip webhook signature verification**
8. **Don't use API key authentication** (deprecated - use PAT)
9. **Don't forget to handle** offset for pagination
10. **Don't process attachments** without size limits

---

### Error Handling

```javascript
async function airtableRequest(config) {
  try {
    const response = await $http.request(config);
    return { success: true, data: response };
  } catch (error) {
    const statusCode = error.statusCode;

    switch (statusCode) {
      case 401:
        return { success: false, error: 'Invalid or expired token' };
      case 403:
        return { success: false, error: 'Insufficient permissions' };
      case 404:
        return { success: false, error: 'Base or table not found' };
      case 422:
        return { success: false, error: 'Invalid request body', details: error.response?.body };
      case 429:
        return { success: false, error: 'Rate limit exceeded', retryAfter: error.response?.headers['retry-after'] };
      default:
        return { success: false, error: error.message };
    }
  }
}
```

---

**Last Updated:** January 2025
**API Version:** v0
**Documentation:** https://airtable.com/developers/web/api/introduction
