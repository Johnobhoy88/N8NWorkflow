# n8n JavaScript Expressions Library - 100+ Examples (2025)

## Table of Contents
- [Expression Basics](#expression-basics)
- [String Manipulation (15 examples)](#string-manipulation)
- [Date & Time Operations (15 examples)](#date--time-operations)
- [Number & Math Operations (10 examples)](#number--math-operations)
- [Array Manipulation (20 examples)](#array-manipulation)
- [Object Operations (15 examples)](#object-operations)
- [Conditional Logic (10 examples)](#conditional-logic)
- [Data Validation (10 examples)](#data-validation)
- [API & URL Construction (10 examples)](#api--url-construction)
- [JSON & Data Parsing (10 examples)](#json--data-parsing)
- [Email & Communication (5 examples)](#email--communication)
- [Advanced Patterns (10 examples)](#advanced-patterns)

---

## Expression Basics

### Syntax Rules
```javascript
// Access current item data
={{ $json.fieldName }}

// Access previous node data
={{ $node["Node Name"].json.field }}

// Access environment variables
={{ $env.API_KEY }}

// Multi-line expressions (IIFE pattern)
={{
  (function() {
    const value = $json.amount * 1.1;
    return value.toFixed(2);
  })()
}}
```

### Available Global Objects
- `$json` - Current item JSON data
- `$binary` - Current item binary data
- `$item` - Full current item (json + binary + metadata)
- `$items` - All items from current node
- `$node["Node Name"]` - Access specific node output
- `$workflow` - Workflow metadata (id, name, active)
- `$execution` - Execution metadata (id, mode, resumeUrl)
- `$now` - Current DateTime object (Luxon)
- `$today` - Today at midnight (Luxon)
- `$env` - Environment variables
- `$jmespath()` - JMESPath query function

---

## String Manipulation

### 1. Concatenate Strings
```javascript
={{ $json.firstName + ' ' + $json.lastName }}
```

### 2. Template Literals
```javascript
={{ `Hello ${$json.name}, your order #${$json.orderId} is ready!` }}
```

### 3. Convert to Lowercase
```javascript
={{ $json.email.toLowerCase() }}
```

### 4. Convert to Uppercase
```javascript
={{ $json.country.toUpperCase() }}
```

### 5. Title Case (Capitalize Each Word)
```javascript
={{
  $json.title
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}}
```

### 6. Trim Whitespace
```javascript
={{ $json.input.trim() }}
```

### 7. Remove All Spaces
```javascript
={{ $json.phoneNumber.replace(/\s+/g, '') }}
```

### 8. Create URL Slug
```javascript
={{
  $json.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}}
```

### 9. Extract Domain from Email
```javascript
={{ $json.email.split('@')[1] }}
```

### 10. Get Initials
```javascript
={{
  $json.firstName.charAt(0).toUpperCase() +
  $json.lastName.charAt(0).toUpperCase()
}}
```

### 11. Truncate String with Ellipsis
```javascript
={{
  $json.description.length > 100
    ? $json.description.substring(0, 100) + '...'
    : $json.description
}}
```

### 12. Replace Multiple Patterns
```javascript
={{
  $json.text
    .replace(/\bUSA\b/g, 'United States')
    .replace(/\bUK\b/g, 'United Kingdom')
}}
```

### 13. Extract Numbers from String
```javascript
={{ $json.text.match(/\d+/g).join('') }}
```

### 14. Pad String with Zeros
```javascript
={{ String($json.invoiceNumber).padStart(6, '0') }}
// Example: 42 becomes 000042
```

### 15. Check if String Contains Substring
```javascript
={{ $json.message.includes('urgent') }}
```

---

## Date & Time Operations

### 16. Get Current Date/Time (ISO)
```javascript
={{ $now.toISO() }}
// Output: 2025-01-08T14:30:00.000Z
```

### 17. Format Date (Custom Format)
```javascript
={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}
// Output: 2025-01-08 14:30:00
```

### 18. Format Date (Human Readable)
```javascript
={{ $now.toFormat('MMMM dd, yyyy') }}
// Output: January 08, 2025
```

### 19. Add Days to Date
```javascript
={{ $now.plus({ days: 7 }).toISO() }}
// 7 days from now
```

### 20. Subtract Hours from Date
```javascript
={{ $now.minus({ hours: 3 }).toISO() }}
// 3 hours ago
```

### 21. Get Start of Day
```javascript
={{ $now.startOf('day').toISO() }}
// Today at 00:00:00
```

### 22. Get End of Month
```javascript
={{ $now.endOf('month').toISO() }}
// Last moment of current month
```

### 23. Parse Date String
```javascript
={{
  DateTime.fromFormat($json.dateString, 'MM/dd/yyyy').toISO()
}}
// Convert "01/08/2025" to ISO
```

### 24. Convert Unix Timestamp to Date
```javascript
={{ DateTime.fromSeconds($json.timestamp).toISO() }}
```

### 25. Get Difference Between Dates (Days)
```javascript
={{
  Math.floor(
    DateTime.fromISO($json.endDate)
      .diff(DateTime.fromISO($json.startDate), 'days')
      .days
  )
}}
```

### 26. Get Day of Week
```javascript
={{ $now.toFormat('EEEE') }}
// Output: Monday, Tuesday, etc.
```

### 27. Check if Date is Weekend
```javascript
={{
  ['Saturday', 'Sunday'].includes($now.toFormat('EEEE'))
}}
```

### 28. Format Date in Different Timezone
```javascript
={{ $now.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm z') }}
```

### 29. Get Relative Time
```javascript
={{
  DateTime.fromISO($json.createdAt).toRelative()
}}
// Output: "2 hours ago", "in 3 days"
```

### 30. Check if Date is in Past
```javascript
={{ DateTime.fromISO($json.date) < $now }}
```

---

## Number & Math Operations

### 31. Round to 2 Decimal Places
```javascript
={{ Math.round($json.price * 100) / 100 }}
// Or using toFixed (returns string):
={{ Number($json.price).toFixed(2) }}
```

### 32. Calculate Percentage
```javascript
={{ ($json.part / $json.total * 100).toFixed(1) + '%' }}
```

### 33. Sum Array of Numbers
```javascript
={{ $json.values.reduce((sum, val) => sum + val, 0) }}
```

### 34. Average of Numbers
```javascript
={{
  $json.scores.reduce((sum, val) => sum + val, 0) / $json.scores.length
}}
```

### 35. Find Maximum Value
```javascript
={{ Math.max(...$json.numbers) }}
```

### 36. Find Minimum Value
```javascript
={{ Math.min(...$json.numbers) }}
```

### 37. Random Number (0-100)
```javascript
={{ Math.floor(Math.random() * 101) }}
```

### 38. Convert String to Number
```javascript
={{ Number($json.stringValue) }}
// Or using parseInt:
={{ parseInt($json.stringValue, 10) }}
```

### 39. Format Number with Thousands Separator
```javascript
={{ $json.revenue.toLocaleString('en-US') }}
// Output: 1,234,567
```

### 40. Calculate Tax (15%)
```javascript
={{
  (function() {
    const subtotal = $json.amount;
    const tax = subtotal * 0.15;
    const total = subtotal + tax;
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  })()
}}
```

---

## Array Manipulation

### 41. Filter Array
```javascript
={{
  $json.users.filter(user => user.age >= 18)
}}
```

### 42. Map Array (Transform Each Item)
```javascript
={{
  $json.products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price * 1.1
  }))
}}
```

### 43. Find First Match
```javascript
={{
  $json.orders.find(order => order.status === 'pending')
}}
```

### 44. Check if Any Match
```javascript
={{
  $json.items.some(item => item.quantity < 10)
}}
```

### 45. Check if All Match
```javascript
={{
  $json.items.every(item => item.price > 0)
}}
```

### 46. Sort Array (Ascending)
```javascript
={{
  $json.items.sort((a, b) => a.price - b.price)
}}
```

### 47. Sort Array (Descending)
```javascript
={{
  $json.items.sort((a, b) => b.createdAt - a.createdAt)
}}
```

### 48. Remove Duplicates
```javascript
={{
  [...new Set($json.tags)]
}}
```

### 49. Flatten Nested Array
```javascript
={{
  $json.nestedArray.flat()
}}
// Or for deeply nested:
={{
  $json.deeplyNested.flat(Infinity)
}}
```

### 50. Chunk Array (Split into Groups)
```javascript
={{
  (function() {
    const array = $json.items;
    const size = 10;
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  })()
}}
```

### 51. Get First N Items
```javascript
={{ $json.items.slice(0, 5) }}
```

### 52. Get Last N Items
```javascript
={{ $json.items.slice(-3) }}
```

### 53. Reverse Array
```javascript
={{ [...$json.items].reverse() }}
```

### 54. Join Array to String
```javascript
={{ $json.tags.join(', ') }}
```

### 55. Get Array Length
```javascript
={{ $json.items.length }}
```

### 56. Group By Property
```javascript
={{
  (function() {
    return $json.orders.reduce((groups, order) => {
      const status = order.status;
      if (!groups[status]) groups[status] = [];
      groups[status].push(order);
      return groups;
    }, {});
  })()
}}
```

### 57. Pluck Property from Array
```javascript
={{ $json.users.map(u => u.email) }}
```

### 58. Count Occurrences
```javascript
={{
  $json.items.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {})
}}
```

### 59. Filter and Map Combined
```javascript
={{
  $json.products
    .filter(p => p.inStock)
    .map(p => ({ id: p.id, name: p.name }))
}}
```

### 60. Concatenate Multiple Arrays
```javascript
={{
  [...$json.array1, ...$json.array2, ...$json.array3]
}}
```

---

## Object Operations

### 61. Merge Two Objects
```javascript
={{
  { ...$json.user, ...$json.address }
}}
```

### 62. Pick Specific Properties
```javascript
={{
  (function() {
    const { id, name, email } = $json;
    return { id, name, email };
  })()
}}
```

### 63. Omit Properties
```javascript
={{
  (function() {
    const { password, secret, ...safe } = $json;
    return safe;
  })()
}}
```

### 64. Rename Object Keys
```javascript
={{
  {
    userId: $json.id,
    fullName: $json.name,
    emailAddress: $json.email
  }
}}
```

### 65. Get Object Keys
```javascript
={{ Object.keys($json.data) }}
```

### 66. Get Object Values
```javascript
={{ Object.values($json.counts) }}
```

### 67. Check if Property Exists
```javascript
={{ 'email' in $json }}
// Or using hasOwnProperty:
={{ $json.hasOwnProperty('email') }}
```

### 68. Deep Clone Object
```javascript
={{ JSON.parse(JSON.stringify($json.data)) }}
```

### 69. Convert Object to Array of Entries
```javascript
={{ Object.entries($json.data) }}
// Output: [['key1', 'value1'], ['key2', 'value2']]
```

### 70. Create Object from Entries
```javascript
={{
  Object.fromEntries([
    ['name', $json.name],
    ['email', $json.email]
  ])
}}
```

### 71. Nested Property Access (Safe)
```javascript
={{ $json.user?.address?.city || 'Unknown' }}
```

### 72. Dynamic Property Access
```javascript
={{ $json[$json.propertyName] }}
```

### 73. Set Nested Property
```javascript
={{
  {
    ...$json,
    metadata: {
      ...($json.metadata || {}),
      updatedAt: $now.toISO()
    }
  }
}}
```

### 74. Count Object Properties
```javascript
={{ Object.keys($json.data).length }}
```

### 75. Transform Object Values
```javascript
={{
  Object.fromEntries(
    Object.entries($json.prices).map(([key, val]) => [key, val * 1.1])
  )
}}
```

---

## Conditional Logic

### 76. Ternary Operator
```javascript
={{ $json.age >= 18 ? 'adult' : 'minor' }}
```

### 77. Multiple Conditions
```javascript
={{
  $json.score >= 90 ? 'A' :
  $json.score >= 80 ? 'B' :
  $json.score >= 70 ? 'C' :
  $json.score >= 60 ? 'D' : 'F'
}}
```

### 78. Null Coalescing
```javascript
={{ $json.name ?? 'Anonymous' }}
```

### 79. Default Value for Empty String
```javascript
={{ $json.email || 'no-email@example.com' }}
```

### 80. Switch-like Expression
```javascript
={{
  (function() {
    const type = $json.type;
    const mapping = {
      'premium': 0.20,
      'standard': 0.10,
      'basic': 0.05
    };
    return mapping[type] || 0;
  })()
}}
```

### 81. Complex Conditional Logic
```javascript
={{
  (function() {
    if ($json.priority === 'urgent' && $json.assignee === null) {
      return 'escalate';
    } else if ($json.age > 7) {
      return 'close';
    } else {
      return 'process';
    }
  })()
}}
```

### 82. Conditional Object Properties
```javascript
={{
  {
    id: $json.id,
    name: $json.name,
    ...($json.email && { email: $json.email }),
    ...($json.phone && { phone: $json.phone })
  }
}}
```

### 83. Short Circuit Evaluation
```javascript
={{ $json.items.length > 0 && $json.items[0].name }}
```

### 84. Validate Multiple Fields
```javascript
={{
  $json.email && $json.name && $json.phone ? 'valid' : 'invalid'
}}
```

### 85. Case-Insensitive String Comparison
```javascript
={{
  $json.status.toLowerCase() === 'active'
}}
```

---

## Data Validation

### 86. Validate Email Format
```javascript
={{
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($json.email)
}}
```

### 87. Validate Phone Number (US)
```javascript
={{
  /^\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test($json.phone)
}}
```

### 88. Validate URL
```javascript
={{
  /^https?:\/\/.+/.test($json.url)
}}
```

### 89. Check if String is Number
```javascript
={{ !isNaN($json.value) && !isNaN(parseFloat($json.value)) }}
```

### 90. Validate Date Format (YYYY-MM-DD)
```javascript
={{
  /^\d{4}-\d{2}-\d{2}$/.test($json.date)
}}
```

### 91. Check if Array is Empty
```javascript
={{ Array.isArray($json.items) && $json.items.length === 0 }}
```

### 92. Validate Credit Card (Luhn Algorithm)
```javascript
={{
  (function() {
    const number = $json.cardNumber.replace(/\s/g, '');
    let sum = 0;
    let isEven = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  })()
}}
```

### 93. Check for Required Fields
```javascript
={{
  ['name', 'email', 'phone'].every(field => $json[field])
}}
```

### 94. Validate Age Range
```javascript
={{
  $json.age >= 18 && $json.age <= 65
}}
```

### 95. Check if Object is Empty
```javascript
={{ Object.keys($json.data).length === 0 }}
```

---

## API & URL Construction

### 96. Build Query String
```javascript
={{
  '?' + Object.entries({
    page: $json.page,
    limit: $json.limit,
    sort: $json.sort
  })
  .filter(([_, val]) => val !== undefined)
  .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
  .join('&')
}}
```

### 97. Construct Full API URL
```javascript
={{
  `${$env.API_BASE_URL}/users/${$json.userId}?include=orders,profile`
}}
```

### 98. URL Encode Parameters
```javascript
={{ encodeURIComponent($json.searchQuery) }}
```

### 99. Parse URL Parameters
```javascript
={{
  Object.fromEntries(
    new URLSearchParams($json.queryString)
  )
}}
```

### 100. Build GraphQL Query
```javascript
={{
  JSON.stringify({
    query: `
      query GetUser($id: ID!) {
        user(id: $id) {
          name
          email
          orders {
            id
            total
          }
        }
      }
    `,
    variables: {
      id: $json.userId
    }
  })
}}
```

---

## JSON & Data Parsing

### 101. Parse JSON String
```javascript
={{ JSON.parse($json.jsonString) }}
```

### 102. Stringify Object
```javascript
={{ JSON.stringify($json.data, null, 2) }}
```

### 103. Safe JSON Parse with Fallback
```javascript
={{
  (function() {
    try {
      return JSON.parse($json.jsonString);
    } catch (e) {
      return null;
    }
  })()
}}
```

### 104. Extract Value Using JMESPath
```javascript
={{ $jmespath($json, 'users[?age > `18`].name') }}
```

### 105. Pretty Print JSON
```javascript
={{ JSON.stringify($json, null, 2) }}
```

---

## Email & Communication

### 106. Extract Name from Email
```javascript
={{
  $json.email.split('@')[0]
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}}
```

### 107. Create Email Salutation
```javascript
={{
  `Dear ${$json.firstName || 'Valued Customer'},`
}}
```

### 108. Format Phone Number (US)
```javascript
={{
  $json.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
}}
```

### 109. Generate Email Subject with Date
```javascript
={{
  `[${$json.category}] ${$json.title} - ${$now.toFormat('yyyy-MM-dd')}`
}}
```

### 110. Create Slack Mention
```javascript
={{ `<@${$json.slackUserId}>` }}
```

---

## Advanced Patterns

### 111. Retry Counter for Webhooks
```javascript
={{
  ($json.retryCount || 0) + 1
}}
```

### 112. Generate UUID
```javascript
={{
  (function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  })()
}}
```

### 113. Hash String (Simple)
```javascript
={{
  (function() {
    let hash = 0;
    const str = $json.text;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  })()
}}
```

### 114. Pagination Offset Calculation
```javascript
={{
  ($json.page - 1) * $json.pageSize
}}
```

### 115. Create Correlation ID
```javascript
={{
  `${$workflow.id}_${$execution.id}_${Date.now()}`
}}
```

### 116. Calculate Time Until Deadline
```javascript
={{
  DateTime.fromISO($json.deadline)
    .diff($now, ['days', 'hours'])
    .toObject()
}}
```

### 117. Create Idempotency Key
```javascript
={{
  `${$json.userId}_${$json.action}_${$now.toFormat('yyyyMMdd')}`
}}
```

### 118. Rate Limit Check
```javascript
={{
  (function() {
    const limit = 100;
    const window = 60; // seconds
    const requests = $json.requestCount || 0;
    return requests < limit;
  })()
}}
```

### 119. Exponential Backoff Calculation
```javascript
={{
  Math.min(1000 * Math.pow(2, $json.attemptNumber), 30000)
}}
// Returns: 1000, 2000, 4000, 8000, 16000, 30000, 30000...
```

### 120. Feature Flag Evaluation
```javascript
={{
  (function() {
    const flags = $json.featureFlags || {};
    const userId = $json.userId;

    // Hash user ID to determine rollout percentage
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    }
    const percentage = Math.abs(hash % 100);

    return percentage < (flags.newFeatureRollout || 0);
  })()
}}
```

---

## Performance Tips

1. **Avoid Complex Calculations in Expressions**
   - Move heavy computation to Code nodes
   - Use expressions for simple transformations only

2. **Cache Expensive Operations**
   - Store results in variables if used multiple times
   - Use Set node to compute once, reference many times

3. **Use IIFE for Multi-Step Logic**
```javascript
={{
  (function() {
    // Your complex logic here
    const step1 = doSomething();
    const step2 = doSomethingElse(step1);
    return step2;
  })()
}}
```

4. **Prefer Built-in Methods Over Regex**
   - `.includes()` is faster than regex for simple matches
   - Use `.startsWith()`, `.endsWith()` when appropriate

5. **Minimize Data Copying**
   - Use spread operator sparingly
   - Reference data instead of cloning when possible

---

## Common Pitfalls

### Pitfall 1: Modifying Original Array
```javascript
// ❌ Bad - mutates original
={{ $json.items.sort() }}

// ✅ Good - creates copy
={{ [...$json.items].sort() }}
```

### Pitfall 2: Comparing Objects
```javascript
// ❌ Bad - compares references
={{ $json.obj1 === $json.obj2 }}

// ✅ Good - compares values
={{ JSON.stringify($json.obj1) === JSON.stringify($json.obj2) }}
```

### Pitfall 3: Division by Zero
```javascript
// ❌ Bad - can produce Infinity or NaN
={{ $json.total / $json.count }}

// ✅ Good - handles edge case
={{ $json.count > 0 ? $json.total / $json.count : 0 }}
```

### Pitfall 4: Accessing Undefined Properties
```javascript
// ❌ Bad - throws error if user is undefined
={{ $json.user.email }}

// ✅ Good - safe navigation
={{ $json.user?.email || '' }}
```

---

## Quick Reference Card

### Most Used String Methods
- `.toLowerCase()`, `.toUpperCase()`
- `.trim()`, `.trimStart()`, `.trimEnd()`
- `.split(delimiter)`, `.join(delimiter)`
- `.substring(start, end)`, `.slice(start, end)`
- `.replace(pattern, replacement)`
- `.includes(substring)`, `.startsWith()`, `.endsWith()`

### Most Used Array Methods
- `.map(fn)`, `.filter(fn)`, `.reduce(fn, initial)`
- `.find(fn)`, `.findIndex(fn)`
- `.some(fn)`, `.every(fn)`
- `.sort(compareFn)`, `.reverse()`
- `.slice(start, end)`, `.splice(start, count)`
- `.concat(arr)`, `.flat(depth)`

### Most Used Object Methods
- `Object.keys(obj)`, `Object.values(obj)`, `Object.entries(obj)`
- `Object.assign(target, ...sources)`
- `Object.fromEntries(entries)`
- Spread operator: `{ ...obj1, ...obj2 }`

### Most Used Date Methods (Luxon)
- `$now.toISO()`, `$now.toFormat(fmt)`
- `$now.plus({ days: 1 })`, `$now.minus({ hours: 2 })`
- `DateTime.fromISO(str)`, `DateTime.fromFormat(str, fmt)`
- `$now.startOf('day')`, `$now.endOf('month')`

---

**Last Updated:** January 2025
**n8n Version:** 1.0+
