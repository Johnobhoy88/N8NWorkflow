# Code Node Expert

**Purpose:** Master JavaScript patterns for n8n Code nodes including data transformation, API calls, error handling, and advanced operations.

**When to use this skill:** When you need to write custom JavaScript logic in Code nodes for data manipulation, complex transformations, or custom integrations.

---

## Core Capabilities

1. **Correct return format** - Always return [{json: {...}}] array
2. **Data access patterns** - $input.all(), $input.first(), $input.item
3. **Environment variables** - $env for secrets and configuration
4. **Transformations** - Map, filter, reduce, aggregate
5. **Error handling** - Try/catch, validation, graceful failures
6. **External APIs** - Fetch with proper error handling
7. **Date/time operations** - Formatting, timezone handling
8. **String/Array/Object** - Common manipulation patterns

---

## Critical Rule: Return Format

From LESSONS_LEARNED.md Mistake #5 (lines 110-131):

**✅ ALWAYS CORRECT:**
```javascript
// Single item
return [{json: {result: "data"}}];

// Multiple items
return [
  {json: {id: 1, name: "Item 1"}},
  {json: {id: 2, name: "Item 2"}}
];

// Empty (no items)
return [];
```

**❌ ALWAYS WRONG:**
```javascript
// Missing array wrapper
return {json: {result: "data"}};

// Plain object
return {result: "data"};

// Undefined
return;
```

**Why:** n8n processes item arrays internally. Code nodes MUST return array format.

---

## Accessing Input Data

### Pattern 1: Access All Input Items

```javascript
// Get all items from previous node
const items = $input.all();

console.log(`Processing ${items.length} items`);

// Process each item
const results = items.map(item => {
  const data = item.json;

  return {
    json: {
      originalId: data.id,
      processed: data.value * 2,
      timestamp: new Date().toISOString()
    }
  };
});

return results;
```

### Pattern 2: Access First Item Only

```javascript
// Get first item (useful for single-item workflows)
const firstItem = $input.first();
const data = firstItem.json;

return [{
  json: {
    processedData: data.field.toUpperCase(),
    source: 'first-item'
  }
}];
```

### Pattern 3: Access Specific Item by Index

```javascript
// Get specific item (0-indexed)
const items = $input.all();
const thirdItem = items[2]?.json; // Optional chaining for safety

if (!thirdItem) {
  return [{json: {error: 'Item not found'}}];
}

return [{json: {data: thirdItem}}];
```

### Pattern 4: Access Data from Named Nodes

```javascript
// Access data from specific previous nodes
const formData = $('Form Trigger').item.json;
const apiResponse = $('API Call').item.json;

return [{
  json: {
    email: formData.email,
    apiResult: apiResponse.data,
    combined: true
  }
}];
```

---

## Environment Variables

From LESSONS_LEARNED.md Mistake #2:

**✅ Correct - Use $env:**
```javascript
// Access environment variables
const apiKey = $env.OPENAI_API_KEY;
const dbUrl = $env.DATABASE_URL;
const webhookSecret = $env.WEBHOOK_SECRET;

// Use in fetch calls
const response = await fetch('https://api.example.com/data', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
```

**❌ Wrong - Don't use $credentials:**
```javascript
// This will fail - $credentials not available in Code nodes
const apiKey = $credentials.openaiApi.apiKey; // ReferenceError
```

---

## Data Transformation Patterns

### Pattern 1: Map (Transform Each Item)

```javascript
// Transform all items
const items = $input.all();

return items.map(item => ({
  json: {
    // Keep some original fields
    id: item.json.id,

    // Transform fields
    name: item.json.name.toUpperCase(),
    email: item.json.email.toLowerCase(),

    // Add computed fields
    fullName: `${item.json.firstName} ${item.json.lastName}`,
    isActive: item.json.status === 'active',

    // Add metadata
    processedAt: new Date().toISOString(),
    version: 2
  }
}));
```

### Pattern 2: Filter (Keep Some Items)

```javascript
// Keep only items matching condition
const items = $input.all();

const filtered = items.filter(item => {
  const data = item.json;

  // Multiple conditions
  return data.age >= 18 &&
         data.status === 'active' &&
         data.email.includes('@company.com');
});

console.log(`Filtered: ${items.length} → ${filtered.length} items`);

return filtered;
```

### Pattern 3: Reduce (Aggregate Data)

```javascript
// Aggregate multiple items into one
const items = $input.all();

const summary = items.reduce((acc, item) => {
  const data = item.json;

  return {
    totalRevenue: acc.totalRevenue + data.revenue,
    totalOrders: acc.totalOrders + 1,
    uniqueCustomers: acc.uniqueCustomers.add(data.customerId),
    productsSold: acc.productsSold + data.quantity
  };
}, {
  totalRevenue: 0,
  totalOrders: 0,
  uniqueCustomers: new Set(),
  productsSold: 0
});

return [{
  json: {
    totalRevenue: summary.totalRevenue,
    totalOrders: summary.totalOrders,
    uniqueCustomers: summary.uniqueCustomers.size,
    productsSold: summary.productsSold,
    averageOrderValue: summary.totalRevenue / summary.totalOrders
  }
}];
```

### Pattern 4: Group By (Create Buckets)

```javascript
// Group items by field
const items = $input.all();

const grouped = items.reduce((acc, item) => {
  const category = item.json.category;

  if (!acc[category]) {
    acc[category] = [];
  }

  acc[category].push(item.json);

  return acc;
}, {});

// Convert to array of groups
return Object.entries(grouped).map(([category, items]) => ({
  json: {
    category: category,
    count: items.length,
    items: items,
    totalValue: items.reduce((sum, i) => sum + i.value, 0)
  }
}));
```

### Pattern 5: Flatten Nested Arrays

```javascript
// Flatten nested structure
const items = $input.all();

// Each item has an array of orders
const allOrders = items.flatMap(item =>
  item.json.orders.map(order => ({
    json: {
      customerId: item.json.customerId,
      customerName: item.json.name,
      orderId: order.id,
      orderTotal: order.total,
      orderDate: order.date
    }
  }))
);

console.log(`Flattened ${items.length} customers into ${allOrders.length} orders`);

return allOrders;
```

---

## Error Handling Patterns

### Pattern 1: Try/Catch with Graceful Failure

```javascript
const items = $input.all();

return items.map(item => {
  try {
    const data = item.json;

    // Risky operation
    const result = JSON.parse(data.jsonString);

    return {
      json: {
        success: true,
        parsed: result,
        originalId: data.id
      }
    };

  } catch (error) {
    // Log error but continue processing
    console.error(`Failed to process item ${item.json.id}:`, error.message);

    return {
      json: {
        success: false,
        error: error.message,
        originalId: item.json.id,
        rawData: item.json
      }
    };
  }
});
```

### Pattern 2: Input Validation

```javascript
const item = $input.first().json;

// Validate required fields
const requiredFields = ['email', 'name', 'age'];
const missing = requiredFields.filter(field => !item[field]);

if (missing.length > 0) {
  throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

// Validate formats
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
  throw new Error('Invalid email format');
}

if (item.age < 0 || item.age > 120) {
  throw new Error('Invalid age');
}

// All valid - continue processing
return [{
  json: {
    validated: true,
    ...item
  }
}];
```

### Pattern 3: Safe Data Access with Defaults

```javascript
const item = $input.first().json;

// Safe access with optional chaining and defaults
const result = {
  id: item.id ?? 'unknown',
  name: item.name ?? 'Anonymous',
  email: item.email?.toLowerCase() ?? '',
  age: item.age ?? 0,
  address: {
    street: item.address?.street ?? '',
    city: item.address?.city ?? 'Unknown',
    country: item.address?.country ?? 'Unknown'
  },
  tags: item.tags ?? [],
  metadata: item.metadata ?? {}
};

return [{json: result}];
```

---

## External API Calls

### Pattern 1: Simple Fetch with Error Handling

```javascript
const query = $input.first().json.query;

try {
  const response = await fetch('https://api.example.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${$env.API_KEY}`
    },
    body: JSON.stringify({query: query}),
    timeout: 30000
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return [{
    json: {
      success: true,
      data: data,
      query: query
    }
  }];

} catch (error) {
  console.error('API call failed:', error.message);

  return [{
    json: {
      success: false,
      error: error.message,
      query: query
    }
  }];
}
```

### Pattern 2: Parallel API Calls

```javascript
const items = $input.all();

// Make multiple API calls in parallel
const promises = items.map(item =>
  fetch(`https://api.example.com/user/${item.json.userId}`, {
    headers: {'Authorization': `Bearer ${$env.API_KEY}`}
  }).then(r => r.json())
);

const results = await Promise.all(promises);

// Combine with original items
return items.map((item, index) => ({
  json: {
    originalData: item.json,
    apiData: results[index]
  }
}));
```

### Pattern 3: Sequential API Calls with Rate Limiting

```javascript
const items = $input.all();
const results = [];
const delayMs = 1000; // 1 second between calls

for (const item of items) {
  try {
    const response = await fetch(`https://api.example.com/data/${item.json.id}`, {
      headers: {'Authorization': `Bearer ${$env.API_KEY}`}
    });

    const data = await response.json();

    results.push({
      json: {
        id: item.json.id,
        data: data,
        success: true
      }
    });

  } catch (error) {
    results.push({
      json: {
        id: item.json.id,
        error: error.message,
        success: false
      }
    });
  }

  // Rate limiting delay
  if (items.indexOf(item) < items.length - 1) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

return results;
```

---

## Date and Time Operations

### Pattern 1: Date Formatting

```javascript
const item = $input.first().json;

const now = new Date();
const date = new Date(item.timestamp);

return [{
  json: {
    // ISO format
    isoFormat: now.toISOString(),
    // 2025-01-15T10:30:45.123Z

    // Locale string
    localeFormat: now.toLocaleString('en-US'),
    // 1/15/2025, 10:30:45 AM

    // Custom format
    customFormat: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    // 2025-01-15

    // Time only
    timeOnly: now.toLocaleTimeString('en-US'),
    // 10:30:45 AM

    // Unix timestamp
    unixTimestamp: Math.floor(now.getTime() / 1000),
    // 1705318245

    // Age calculation
    age: Math.floor((now - date) / (1000 * 60 * 60 * 24)),
    // Days since timestamp
  }
}];
```

### Pattern 2: Timezone Handling

```javascript
const timestamp = $input.first().json.timestamp;
const date = new Date(timestamp);

// Convert to specific timezone
const options = {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
};

return [{
  json: {
    utc: date.toISOString(),
    newYork: date.toLocaleString('en-US', {timeZone: 'America/New_York'}),
    london: date.toLocaleString('en-GB', {timeZone: 'Europe/London'}),
    tokyo: date.toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}),
    formatted: new Intl.DateTimeFormat('en-US', options).format(date)
  }
}];
```

### Pattern 3: Date Arithmetic

```javascript
const now = new Date();

// Add/subtract days
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

const lastWeek = new Date(now);
lastWeek.setDate(lastWeek.getDate() - 7);

// Add/subtract months
const nextMonth = new Date(now);
nextMonth.setMonth(nextMonth.getMonth() + 1);

// Start/End of day
const startOfDay = new Date(now);
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date(now);
endOfDay.setHours(23, 59, 59, 999);

return [{
  json: {
    now: now.toISOString(),
    tomorrow: tomorrow.toISOString(),
    lastWeek: lastWeek.toISOString(),
    nextMonth: nextMonth.toISOString(),
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString()
  }
}];
```

---

## String Operations

### Pattern 1: Common String Manipulations

```javascript
const text = $input.first().json.text;

return [{
  json: {
    // Case transformations
    uppercase: text.toUpperCase(),
    lowercase: text.toLowerCase(),
    titleCase: text.replace(/\w\S*/g, word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ),

    // Trimming
    trimmed: text.trim(),
    leftTrimmed: text.trimStart(),
    rightTrimmed: text.trimEnd(),

    // Replacement
    replaced: text.replace(/old/g, 'new'),
    removedSpaces: text.replace(/\s+/g, ''),

    // Extraction
    firstWord: text.split(/\s+/)[0],
    lastWord: text.split(/\s+/).pop(),
    wordCount: text.split(/\s+/).length,

    // Checking
    includes: text.includes('search term'),
    startsWith: text.startsWith('prefix'),
    endsWith: text.endsWith('suffix'),
    isEmpty: text.trim().length === 0
  }
}];
```

### Pattern 2: Regular Expressions

```javascript
const text = $input.first().json.content;

// Extract email addresses
const emails = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || [];

// Extract URLs
const urls = text.match(/https?:\/\/[^\s]+/g) || [];

// Extract phone numbers (US format)
const phones = text.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/g) || [];

// Extract hashtags
const hashtags = text.match(/#\w+/g) || [];

// Extract mentions
const mentions = text.match(/@\w+/g) || [];

return [{
  json: {
    emails: emails,
    urls: urls,
    phones: phones,
    hashtags: hashtags,
    mentions: mentions,
    stats: {
      emailCount: emails.length,
      urlCount: urls.length,
      phoneCount: phones.length
    }
  }
}];
```

### Pattern 3: Template String Building

```javascript
const item = $input.first().json;

// Build formatted strings
const emailBody = `
Dear ${item.firstName} ${item.lastName},

Thank you for your order #${item.orderId}.

Order Details:
- Product: ${item.productName}
- Quantity: ${item.quantity}
- Total: $${item.total.toFixed(2)}

Your order will be delivered to:
${item.address.street}
${item.address.city}, ${item.address.state} ${item.address.zip}

Estimated delivery: ${new Date(item.deliveryDate).toLocaleDateString()}

Thank you for your business!

Best regards,
The Team
`.trim();

return [{json: {emailBody: emailBody}}];
```

---

## Array Operations

### Pattern 1: Sorting

```javascript
const items = $input.all().map(i => i.json);

// Sort by number (ascending)
const sortedByPrice = [...items].sort((a, b) => a.price - b.price);

// Sort by number (descending)
const sortedByPriceDesc = [...items].sort((a, b) => b.price - a.price);

// Sort by string
const sortedByName = [...items].sort((a, b) =>
  a.name.localeCompare(b.name)
);

// Sort by date
const sortedByDate = [...items].sort((a, b) =>
  new Date(a.date) - new Date(b.date)
);

// Multi-level sort
const multiSort = [...items].sort((a, b) => {
  // First by category
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  // Then by price
  return a.price - b.price;
});

return [{
  json: {
    original: items,
    sortedByPrice: sortedByPrice,
    sortedByName: sortedByName,
    multiSort: multiSort
  }
}];
```

### Pattern 2: Deduplication

```javascript
const items = $input.all().map(i => i.json);

// Remove duplicates by ID
const uniqueById = [...new Map(
  items.map(item => [item.id, item])
).values()];

// Remove duplicates by email
const uniqueByEmail = [...new Map(
  items.map(item => [item.email, item])
).values()];

// Remove completely duplicate objects
const uniqueObjects = items.filter((item, index, self) =>
  index === self.findIndex(i =>
    JSON.stringify(i) === JSON.stringify(item)
  )
);

return [{
  json: {
    originalCount: items.length,
    uniqueById: uniqueById,
    uniqueByIdCount: uniqueById.length,
    uniqueByEmail: uniqueByEmail,
    uniqueByEmailCount: uniqueByEmail.length
  }
}];
```

### Pattern 3: Chunking (Split into Batches)

```javascript
const items = $input.all();
const batchSize = 10;

// Split into chunks
const chunks = [];
for (let i = 0; i < items.length; i += batchSize) {
  chunks.push(items.slice(i, i + batchSize));
}

// Return metadata about chunks
return [{
  json: {
    totalItems: items.length,
    batchSize: batchSize,
    numberOfBatches: chunks.length,
    batches: chunks.map((chunk, index) => ({
      batchNumber: index + 1,
      itemCount: chunk.length,
      items: chunk.map(i => i.json)
    }))
  }
}];
```

---

## Object Operations

### Pattern 1: Merge Objects

```javascript
const item1 = $('Node1').item.json;
const item2 = $('Node2').item.json;

// Shallow merge
const merged = {...item1, ...item2};

// Deep merge (simple version)
function deepMerge(obj1, obj2) {
  const result = {...obj1};

  for (const key in obj2) {
    if (typeof obj2[key] === 'object' && !Array.isArray(obj2[key])) {
      result[key] = deepMerge(result[key] || {}, obj2[key]);
    } else {
      result[key] = obj2[key];
    }
  }

  return result;
}

const deepMerged = deepMerge(item1, item2);

return [{json: {merged, deepMerged}}];
```

### Pattern 2: Pick/Omit Fields

```javascript
const item = $input.first().json;

// Pick specific fields
const picked = {
  id: item.id,
  name: item.name,
  email: item.email
};

// Omit specific fields
const omitted = {...item};
delete omitted.password;
delete omitted.secretKey;
delete omitted.internalId;

// Dynamic pick
const fieldsToKeep = ['id', 'name', 'email', 'age'];
const dynamicPicked = Object.fromEntries(
  Object.entries(item).filter(([key]) => fieldsToKeep.includes(key))
);

return [{json: {picked, omitted, dynamicPicked}}];
```

### Pattern 3: Transform Object Keys

```javascript
const item = $input.first().json;

// Convert to camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

const camelCased = Object.fromEntries(
  Object.entries(item).map(([key, value]) => [toCamelCase(key), value])
);

// Convert to snake_case
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

const snakeCased = Object.fromEntries(
  Object.entries(item).map(([key, value]) => [toSnakeCase(key), value])
);

return [{json: {original: item, camelCased, snakeCased}}];
```

---

## Advanced Patterns

### Pattern 1: Pagination Helper

```javascript
const allItems = $input.all().map(i => i.json);
const page = $('Webhook').item.json.page || 1;
const pageSize = $('Webhook').item.json.pageSize || 20;

const startIndex = (page - 1) * pageSize;
const endIndex = startIndex + pageSize;
const paginatedItems = allItems.slice(startIndex, endIndex);

return [{
  json: {
    page: page,
    pageSize: pageSize,
    totalItems: allItems.length,
    totalPages: Math.ceil(allItems.length / pageSize),
    hasNextPage: endIndex < allItems.length,
    hasPreviousPage: page > 1,
    items: paginatedItems
  }
}];
```

### Pattern 2: CSV Generator

```javascript
const items = $input.all().map(i => i.json);

// Generate CSV
const headers = Object.keys(items[0]);
const csvRows = [
  headers.join(','),
  ...items.map(item =>
    headers.map(header => {
      const value = item[header];
      // Escape commas and quotes
      return typeof value === 'string' && (value.includes(',') || value.includes('"'))
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    }).join(',')
  )
];

const csvString = csvRows.join('\n');

return [{
  json: {
    csv: csvString,
    rowCount: items.length,
    columnCount: headers.length,
    headers: headers
  }
}];
```

### Pattern 3: JSON Path Extraction

```javascript
const item = $input.first().json;

// Extract nested value safely
function getValueByPath(obj, path) {
  return path.split('.').reduce((current, key) =>
    current?.[key], obj
  );
}

// Example: Extract deeply nested data
const email = getValueByPath(item, 'user.contact.email');
const street = getValueByPath(item, 'user.address.billing.street');
const firstOrderTotal = getValueByPath(item, 'orders.0.total');

return [{
  json: {
    email: email || 'N/A',
    street: street || 'N/A',
    firstOrderTotal: firstOrderTotal || 0
  }
}];
```

---

## Debugging Tips

### Console Logging

```javascript
// Log at different stages
console.log('=== Code Node Started ===');

const items = $input.all();
console.log('Input items count:', items.length);
console.log('First item:', JSON.stringify(items[0], null, 2));

// Process data
const results = items.map(item => {
  console.log('Processing item:', item.json.id);
  return {json: {processed: true, id: item.json.id}};
});

console.log('Results count:', results.length);
console.log('=== Code Node Completed ===');

return results;
```

### Performance Monitoring

```javascript
const startTime = Date.now();

// Your code here
const items = $input.all();
const results = items.map(item => ({
  json: {processed: item.json}
}));

const duration = Date.now() - startTime;
console.log(`Processed ${items.length} items in ${duration}ms`);
console.log(`Average: ${(duration / items.length).toFixed(2)}ms per item`);

return results;
```

---

## Integration with Other Skills

- **For API calls:** Use patterns from `ai-api-integration.md`
- **For error handling:** Use patterns from `error-handling-implementer.md`
- **For validation:** Use patterns from `workflow-validator.md`
- **For troubleshooting:** Reference `n8n-troubleshooter.md` Mistake #5

---

## Quick Reference Card

```javascript
// ✅ Return Format (ALWAYS)
return [{json: {result: "data"}}];

// ✅ Access Input
const items = $input.all();
const first = $input.first().json;
const fromNode = $('NodeName').item.json;

// ✅ Environment Variables
const apiKey = $env.API_KEY;

// ✅ Transform
const results = items.map(item => ({
  json: {transformed: item.json.value * 2}
}));

// ✅ Filter
const filtered = items.filter(item =>
  item.json.status === 'active'
);

// ✅ Aggregate
const sum = items.reduce((total, item) =>
  total + item.json.value, 0
);

// ✅ Error Handling
try {
  // risky operation
  return [{json: {success: true}}];
} catch (error) {
  return [{json: {success: false, error: error.message}}];
}

// ✅ Async Operations
const result = await fetch(url);
const data = await result.json();
return [{json: data}];
```

---

## Summary

**Code Node mastery enables:**
- Complex data transformations
- Custom business logic
- External API integrations
- Advanced error handling
- Performance optimization

**Remember:**
- ALWAYS return `[{json: {...}}]` format
- Use `$input.all()` for multiple items
- Use `$env` for secrets (never $credentials)
- Add console.log() for debugging
- Test with "Execute Node" button

**Reference:** LESSONS_LEARNED.md lines 110-131 (Mistake #5)
