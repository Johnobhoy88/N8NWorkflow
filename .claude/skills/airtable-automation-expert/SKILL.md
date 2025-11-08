---
name: Airtable Automation Expert
description: Expert in Airtable automation, formulas, API integration, and base design. Use for creating bases, writing formulas, building automations, and integrating Airtable with other systems.
---

# Airtable Automation Expert Skill

You are an expert in Airtable automation, formula development, API integration, and database design following 2025 best practices.

## Core Competencies

### 1. Base Design Principles

**Normalized Design (Recommended):**
```
Customers Table → Orders Table → Order Items Table
Single source of truth, no duplication, easy to maintain
```

**Key Tables in Every Base:**
```
Essential Fields:
- Primary Field (Name/Title) - Always first, descriptive
- Status (Single select) - Color-coded workflow states
- Created Time (Created time) - Automatic timestamp
- Last Modified Time (Last modified time) - Track changes
- Owner/Assignee (Collaborator) - Accountability
```

**Relationship Patterns:**

**One-to-Many:**
```
Customers Table:
- Customer Name (Primary)
- Orders (Link to Orders) ← One customer, many orders
- Total Orders (Count)
- Total Revenue (Rollup: SUM of Order → Total)

Orders Table:
- Order Number (Primary)
- Customer (Link to Customers) ← Many orders, one customer
- Total (Currency)
```

**Many-to-Many (Use Junction Table):**
```
Students ←→ Enrollments ←→ Courses

Enrollments (Junction):
- Student (Link to Students)
- Course (Link to Courses)
- Grade (Number)
- Enrollment Date (Date)
```

### 2. Formula Mastery

**Text Functions:**
```
// Concatenate with proper spacing
{First Name} & ' ' & {Last Name}

// Email domain
MID({Email}, FIND('@', {Email}) + 1, LEN({Email}))

// URL slug
LOWER(
  SUBSTITUTE(
    SUBSTITUTE({Title}, ' ', '-'),
    '--', '-'
  )
)

// Phone formatting (US)
'(' & LEFT({Phone}, 3) & ') ' & MID({Phone}, 4, 3) & '-' & RIGHT({Phone}, 4)
```

**Date & Time:**
```
// Add 7 days
DATEADD({Start Date}, 7, 'days')

// Days between dates
DATETIME_DIFF({End Date}, {Start Date}, 'days')

// Format date
DATETIME_FORMAT({Date}, 'MMMM DD, YYYY')
// Output: "January 08, 2025"

// Days until deadline
DATETIME_DIFF({Deadline}, TODAY(), 'days')

// Is overdue?
AND(
  {Status} != 'Completed',
  IS_BEFORE({Due Date}, TODAY())
)
```

**Conditional Logic:**
```
// Use SWITCH instead of nested IF
SWITCH(
  {Status},
  'New', '🆕',
  'In Progress', '🔄',
  'Completed', '✅',
  'Cancelled', '❌',
  '❓'
)

// Priority sorting value
SWITCH(
  {Priority},
  'Critical', 1,
  'High', 2,
  'Medium', 3,
  'Low', 4,
  5
)
```

**Rollup Calculations:**
```
// In Customers table, aggregate from linked Orders:

Total Revenue:
SUM({values})

Average Order Value:
AVERAGE({values})

Order Count:
COUNT({values})

Last Order Date:
MAX({values})

// Conditional rollup
SUM(
  {Orders->Amount},
  {Orders->Status} = 'Paid'
)
```

**Status Indicators:**
```
IF(
  {Completed},
  '✅ Completed',
  IF(
    IS_BEFORE({Due Date}, TODAY()),
    '🔴 Overdue - ' & DATETIME_DIFF(TODAY(), {Due Date}, 'days') & ' days',
    IF(
      IS_SAME({Due Date}, TODAY(), 'day'),
      '🟡 Due Today',
      '🟢 On Track - ' & DATETIME_DIFF({Due Date}, TODAY(), 'days') & ' days left'
    )
  )
)
```

### 3. Automation Patterns

**Pattern 1: New Record Auto-Setup**
```
TRIGGER: When record created in "Projects"

ACTIONS:
1. Update record
   - {Status}: "Planning"
   - {Created Date}: NOW()
   - {Project ID}: "PROJ-" & RECORD_ID()

2. Create record in "Tasks" (Initial Planning)
3. Create record in "Tasks" (Kickoff Meeting)
4. Send to Slack (#projects)
```

**Pattern 2: Status Change Workflow**
```
TRIGGER: When {Status} updated → "Won"

ACTIONS:
1. Update {Close Date}: NOW()
2. Create record in "Customers" table
3. Create record in "Onboarding" table
4. Send welcome email
5. Slack notification (#sales-wins)
```

**Pattern 3: Daily Reminders**
```
TRIGGER: When record matches conditions
  Condition: {Due Date} = TODAY() AND {Status} = "Pending"
  Run: Daily at 9:00 AM

ACTIONS:
1. Send email to {Assigned To}
2. Send Slack ping
```

**Pattern 4: Approval Workflow**
```
TRIGGER: {Approval Status} = "Pending Manager"
ACTIONS: Send approval email to manager

TRIGGER: {Approval Status} = "Approved by Manager"
ACTIONS:
  IF {Amount} > 1000:
    Route to Finance
  ELSE:
    Final approval + payment creation
```

### 4. API Integration

**Authentication (Personal Access Token - 2025):**
```javascript
const response = await $http.request({
  method: 'GET',
  url: `https://api.airtable.com/v0/${baseId}/TableName`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`
  }
});
```

**Rate Limits:**
```
- 5 requests per second per base
- 50,000 requests per day per base

// Always implement rate limiting
const rateLimitDelay = 200; // ms (5 req/sec)
await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
```

**List Records with Pagination:**
```javascript
async function getAllRecords(baseId, tableName) {
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
        'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`
      }
    });

    allRecords = allRecords.concat(response.records);
    offset = response.offset;

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));

  } while (offset);

  return allRecords;
}
```

**Create Records (Batch):**
```javascript
// Max 10 records per request
const response = await $http.request({
  method: 'POST',
  url: `https://api.airtable.com/v0/${baseId}/Contacts`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    records: [
      { fields: { 'Name': 'Alice', 'Email': 'alice@example.com' } },
      { fields: { 'Name': 'Bob', 'Email': 'bob@example.com' } }
    ]
  }
});
```

**Update Records:**
```javascript
// PATCH - partial update (only specified fields)
await $http.request({
  method: 'PATCH',
  url: `https://api.airtable.com/v0/${baseId}/Contacts/${recordId}`,
  headers: {
    'Authorization': `Bearer ${$env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: {
    fields: {
      'Status': 'Active'  // Only update Status
    }
  }
});
```

**Filtering:**
```javascript
const params = new URLSearchParams({
  filterByFormula: "AND({Status} = 'Active', {Count} > 10)",
  sort: JSON.stringify([{ field: 'Name', direction: 'asc' }]),
  maxRecords: '100'
});
```

### 5. Webhook Integration

**Verify Webhook Signature:**
```javascript
const crypto = require('crypto');

function verifyAirtableWebhook(payload, timestamp, signature, secret) {
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;

  const expectedSignature = crypto
    .createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(signedPayload)
    .digest('base64');

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
```

### 6. Best Practices

**Base Design:**
```
✅ DO:
- Use normalized structure (no data duplication)
- Clear field naming with units (e.g., "Weight (lbs)")
- Consistent terminology across tables
- Proper relationship types (one-to-many, many-to-many)
- Primary field is descriptive

❌ DON'T:
- Create mega-tables (split into related tables)
- Use vague field names ("Field 1", "Data")
- Mix data types in single field
- Ignore relationship structure
- Skip Created Time fields
```

**Formulas:**
```
✅ DO:
- Use SWITCH() instead of nested IF (>3 conditions)
- Round currency to 2 decimals
- Validate inputs before calculations
- Cache complex calculations in separate fields

❌ DON'T:
- Create circular references
- Nest IF more than 4 levels deep
- Ignore blank values in calculations
- Overcomplicate formulas (split into steps)
```

**Automations:**
```
✅ DO:
- Test on copy first
- Use conditions to filter unnecessary runs
- Monitor run counts
- Log errors to separate table
- Use views to pre-filter

❌ DON'T:
- Create circular triggers (A→B→A)
- Run hourly if daily sufficient
- Trigger on every update if specific field matters
- Ignore error notifications
- Exceed run limits
```

## Common Use Cases

**CRM System:**
```
Tables: Contacts, Companies, Deals, Activities
Key Features:
- Link contacts to companies
- Track deal pipeline with kanban view
- Log all interactions
- Automated follow-up reminders
```

**Project Management:**
```
Tables: Projects, Tasks, Team Members, Time Tracking
Key Features:
- Gantt view for timeline
- Kanban for task status
- Rollup for project metrics
- Auto-create task templates
```

**Inventory Management:**
```
Tables: Products, Suppliers, Orders, Transactions
Key Features:
- Track stock levels
- Auto-reorder when low
- Calculate inventory value
- Transaction history
```

## When to Use This Skill

Invoke when:
- Designing Airtable bases
- Writing complex formulas
- Creating automations
- Integrating Airtable API
- Optimizing base performance
- Implementing webhooks
- Migrating data to/from Airtable
- Setting up views and filters
- Creating linked record structures

## Knowledge Base References

- `domains/airtable/knowledge/advanced/airtable-api-reference.md`
- `domains/airtable/knowledge/advanced/formula-functions-library.md`
- `domains/airtable/knowledge/advanced/automation-patterns.md`
- `domains/airtable/knowledge/advanced/base-design-best-practices.md`

---

*Leverages 2025 Airtable best practices with production-ready patterns.*
