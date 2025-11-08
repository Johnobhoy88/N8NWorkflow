---
name: n8n JavaScript Expert
description: Master of JavaScript expressions and Code node development in n8n. Use for complex data transformations, calculations, validations, and custom logic in workflows.
---

# n8n JavaScript Expert Skill

You are an expert in writing efficient, production-ready JavaScript for n8n workflows, including expressions and Code nodes.

## Expression Syntax (IIFE Pattern)

**Modern n8n expressions use IIFE (Immediately Invoked Function Expression):**

```javascript
={{
  (function() {
    const value = $json.amount * 1.1;
    return value.toFixed(2);
  })()
}}
```

## Available Global Objects

- `$json` - Current item JSON data
- `$binary` - Current item binary data
- `$item` - Full current item (json + binary + metadata)
- `$items` - All items from current node
- `$input` - Input data object (use `$input.all()` or `$input.first()`)
- `$node["Node Name"]` - Access specific node output
- `$workflow` - Workflow metadata (id, name, active)
- `$execution` - Execution metadata (id, mode, resumeUrl)
- `$now` - Current DateTime object (Luxon)
- `$today` - Today at midnight (Luxon)
- `$env` - Environment variables
- `$jmespath()` - JMESPath query function

## Code Node Patterns

### Pattern 1: Process All Items (Batch)

```javascript
// Run Once for All Items (faster for batch operations)
const items = $input.all();

const processed = items.map(item => {
  const data = item.json;

  return {
    json: {
      id: data.id,
      fullName: `${data.firstName} ${data.lastName}`,
      email: data.email.toLowerCase(),
      total: data.quantity * data.price,
      discount: data.quantity >= 10 ? 0.1 : 0
    }
  };
});

return processed;
```

### Pattern 2: Process Each Item Individually

```javascript
// Run Once for Each Item
const item = $input.item.json;

// Process single item
const processed = {
  userId: item.user_id,
  orderTotal: item.items.reduce((sum, i) => sum + i.price, 0),
  itemCount: item.items.length,
  processedAt: new Date().toISO String()
};

return { json: processed };
```

### Pattern 3: Error Handling & Validation

```javascript
const items = $input.all();
const results = [];
const errors = [];

for (const item of items) {
  try {
    // Validate required fields
    if (!item.json.email || !item.json.name) {
      throw new Error(`Missing required fields for item ${item.json.id}`);
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.json.email)) {
      throw new Error(`Invalid email format: ${item.json.email}`);
    }

    // Process valid item
    results.push({
      json: {
        id: item.json.id,
        email: item.json.email.toLowerCase(),
        name: item.json.name,
        valid: true
      }
    });
  } catch (error) {
    errors.push({
      json: {
        ...item.json,
        error: error.message,
        valid: false
      }
    });
  }
}

// Return successful results
// (errors can be routed to separate output or logged)
return results.length > 0 ? results : errors;
```

### Pattern 4: API Calls with Retry Logic

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method: 'GET',
        url: url,
        headers: {
          'Authorization': `Bearer ${$env.API_TOKEN}`
        },
        timeout: 30000
      });

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff: 2s, 4s, 8s
      const backoffMs = 1000 * Math.pow(2, attempt + 1);
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

// Process all items with retry logic
const items = $input.all();
const results = [];

for (const item of items) {
  const data = await fetchWithRetry(
    `https://api.example.com/users/${item.json.userId}`
  );
  results.push({ json: data });
}

return results;
```

### Pattern 5: Data Aggregation & Grouping

```javascript
const items = $input.all();

// Group by category
const grouped = items.reduce((acc, item) => {
  const category = item.json.category;

  if (!acc[category]) {
    acc[category] = {
      count: 0,
      totalRevenue: 0,
      items: []
    };
  }

  acc[category].count++;
  acc[category].totalRevenue += item.json.price;
  acc[category].items.push(item.json.name);

  return acc;
}, {});

// Convert to array format
return Object.entries(grouped).map(([category, data]) => ({
  json: {
    category,
    count: data.count,
    totalRevenue: data.totalRevenue,
    averagePrice: data.totalRevenue / data.count,
    items: data.items
  }
}));
```

## Common Expression Patterns (120+ in knowledge base)

### String Operations

```javascript
// Concatenate
={{ $json.firstName + ' ' + $json.lastName }}

// Template literal
={{ `Order #${$json.orderId} - ${$json.status}` }}

// Title case
={{
  $json.title.toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}}

// URL slug
={{
  $json.title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}}

// Extract domain from email
={{ $json.email.split('@')[1] }}
```

### Date & Time Operations

```javascript
// Current date/time
={{ $now.toISO() }}
={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}

// Add/subtract days
={{ $now.plus({ days: 7 }).toISO() }}
={{ $now.minus({ hours: 3 }).toISO() }}

// Date difference
={{ DATETIME_DIFF($json.endDate, $json.startDate, 'days') }}

// Format for display
={{ $now.toFormat('MMMM dd, yyyy') }}
// Output: "January 08, 2025"

// Check if weekend
={{ ['Saturday', 'Sunday'].includes($now.toFormat('EEEE')) }}
```

### Number & Math Operations

```javascript
// Round to 2 decimals
={{ Math.round($json.price * 100) / 100 }}

// Calculate percentage
={{ ($json.completed / $json.total * 100).toFixed(1) + '%' }}

// Sum array
={{ $json.values.reduce((sum, val) => sum + val, 0) }}

// Average
={{ $json.scores.reduce((sum, val) => sum + val, 0) / $json.scores.length }}

// Max/Min
={{ Math.max(...$json.numbers) }}
={{ Math.min(...$json.numbers) }}
```

### Array Operations

```javascript
// Filter
={{ $json.users.filter(u => u.age >= 18) }}

// Map/Transform
={{ $json.products.map(p => ({ id: p.id, name: p.name, price: p.price * 1.1 })) }}

// Find first match
={{ $json.orders.find(o => o.status === 'pending') }}

// Sort
={{ $json.items.sort((a, b) => b.price - a.price) }}

// Remove duplicates
={{ [...new Set($json.tags)] }}

// Join to string
={{ $json.tags.join(', ') }}
```

### Conditional Logic

```javascript
// Ternary operator
={{ $json.age >= 18 ? 'adult' : 'minor' }}

// Multiple conditions
={{
  $json.score >= 90 ? 'A' :
  $json.score >= 80 ? 'B' :
  $json.score >= 70 ? 'C' : 'F'
}}

// Null coalescing
={{ $json.name ?? 'Anonymous' }}

// Default for empty string
={{ $json.email || 'no-email@example.com' }}
```

### Data Validation

```javascript
// Email validation
={{ /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($json.email) }}

// Phone validation (US)
={{ /^\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test($json.phone) }}

// URL validation
={{ /^https?:\/\/.+/.test($json.url) }}

// Check if number
={{ !isNaN($json.value) && !isNaN(parseFloat($json.value)) }}
```

## Performance Tips

### ✅ DO:

1. **Use `runOnceForAllItems` for batch operations** (10-100x faster)
```javascript
// Batch processing
const items = $input.all();
const processed = items.map(item => transform(item));
return processed;
```

2. **Cache expensive calculations**
```javascript
const items = $input.all();
const lookup = {}; // Cache

for (const item of items) {
  const key = item.json.category;
  if (!lookup[key]) {
    lookup[key] = expensiveCalculation(key);
  }
  // Use cached value
}
```

3. **Use built-in methods over regex when possible**
```javascript
// ✅ Faster
if ($json.email.includes('@gmail.com'))

// ❌ Slower
if (/gmail\.com/.test($json.email))
```

### ❌ DON'T:

1. **Don't use sync sleep** (blocks execution)
```javascript
// ❌ Bad
function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {}
}

// ✅ Good
await new Promise(resolve => setTimeout(resolve, ms));
```

2. **Don't copy large objects unnecessarily**
```javascript
// ❌ Bad (creates full copy)
const newObj = JSON.parse(JSON.stringify(largeObject));

// ✅ Good (only copy what you need)
const newObj = { id: largeObject.id, name: largeObject.name };
```

## Common Pitfalls

### Pitfall 1: Modifying Original Array
```javascript
// ❌ Bad - mutates original
={{ $json.items.sort() }}

// ✅ Good - creates copy
={{ [...$json.items].sort() }}
```

### Pitfall 2: Division by Zero
```javascript
// ❌ Bad - can produce Infinity/NaN
={{ $json.total / $json.count }}

// ✅ Good - handles edge case
={{ $json.count > 0 ? $json.total / $json.count : 0 }}
```

### Pitfall 3: Accessing Undefined Properties
```javascript
// ❌ Bad - throws error if user undefined
={{ $json.user.email }}

// ✅ Good - safe navigation
={{ $json.user?.email || '' }}
```

## When to Use This Skill

Invoke this skill when:
- Writing JavaScript expressions in n8n nodes
- Developing Code node logic
- Transforming data structures
- Implementing complex calculations
- Validating and sanitizing data
- Working with dates, strings, arrays, or objects
- Optimizing workflow performance
- Debugging JavaScript errors in workflows

## Knowledge Base Reference

For 120+ complete examples:
`domains/n8n/knowledge/advanced/javascript-expressions-library.md`

---

*Leverages 2025 n8n JavaScript best practices with production-ready patterns.*
