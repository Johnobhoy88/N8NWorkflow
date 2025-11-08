# Database Automation Patterns - Complete Guide (2025)

## Table of Contents
- [Overview](#overview)
- [PostgreSQL Automation](#postgresql-automation)
- [MySQL Automation](#mysql-automation)
- [MongoDB Automation](#mongodb-automation)
- [ETL Patterns](#etl-patterns)
- [Data Sync Strategies](#data-sync-strategies)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)

---

## Overview

### Common Database Automation Use Cases

```
┌─────────────────────────────────────────┐
│  Data Integration                       │
│  - Sync between systems                 │
│  - Real-time replication                │
│  - Master data management               │
├─────────────────────────────────────────┤
│  ETL/ELT Pipelines                     │
│  - Extract from sources                 │
│  - Transform data                       │
│  - Load to destinations                 │
├─────────────────────────────────────────┤
│  Backup & Recovery                      │
│  - Automated backups                    │
│  - Point-in-time recovery               │
│  - Disaster recovery                    │
├─────────────────────────────────────────┤
│  Data Quality                           │
│  - Validation rules                     │
│  - Deduplication                        │
│  - Data cleansing                       │
├─────────────────────────────────────────┤
│  Reporting & Analytics                  │
│  - Scheduled reports                    │
│  - Aggregate calculations               │
│  - Metric tracking                      │
└─────────────────────────────────────────┘
```

---

## PostgreSQL Automation

### Connection Setup

**n8n PostgreSQL Node:**
```json
{
  "credentials": {
    "postgres": {
      "host": "{{ $env.POSTGRES_HOST }}",
      "database": "{{ $env.POSTGRES_DB }}",
      "user": "{{ $env.POSTGRES_USER }}",
      "password": "{{ $env.POSTGRES_PASSWORD }}",
      "port": 5432,
      "ssl": {
        "enabled": true,
        "ca": "{{ $env.POSTGRES_SSL_CA }}"
      }
    }
  }
}
```

---

### Incremental Data Sync Pattern

**Workflow: Sync New/Updated Records**

```
┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│Get Last Sync │───▶│Query Source │───▶│Insert/Update │
│  Timestamp   │    │  Database   │    │Destination DB│
└──────────────┘    └─────────────┘    └──────┬───────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │Update Last   │
                                        │Sync Timestamp│
                                        └──────────────┘
```

**Implementation:**

```sql
-- Get last sync timestamp
SELECT last_sync_time
FROM sync_metadata
WHERE table_name = 'users';

-- Query source for new/updated records
SELECT * FROM users
WHERE updated_at > $1
ORDER BY updated_at ASC
LIMIT 1000;

-- Upsert to destination
INSERT INTO users (id, name, email, updated_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;

-- Update sync metadata
UPDATE sync_metadata
SET last_sync_time = NOW()
WHERE table_name = 'users';
```

**n8n Code Node:**
```javascript
const lastSync = $input.first().json.last_sync_time;

// Query source database
const sourceRecords = await $db.query(`
  SELECT id, name, email, updated_at
  FROM users
  WHERE updated_at > $1
  ORDER BY updated_at ASC
  LIMIT 1000
`, [lastSync]);

// Transform and prepare for destination
const transformed = sourceRecords.map(record => ({
  id: record.id,
  name: record.name.trim(),
  email: record.email.toLowerCase(),
  updated_at: record.updated_at
}));

return transformed.map(r => ({ json: r }));
```

---

### Batch Processing Pattern

**Large Dataset Processing:**

```javascript
async function processBatches(query, batchSize = 1000) {
  let offset = 0;
  let hasMore = true;
  let totalProcessed = 0;

  while (hasMore) {
    // Fetch batch
    const batch = await $db.query(
      `${query} LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    // Process batch
    for (const record of batch) {
      // Your processing logic
      await processRecord(record);
      totalProcessed++;
    }

    offset += batchSize;

    // Prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { totalProcessed };
}

// Usage
const result = await processBatches(
  'SELECT * FROM large_table WHERE status = \'pending\''
);

return [{ json: result }];
```

---

### Change Data Capture (CDC) Pattern

**Using PostgreSQL LISTEN/NOTIFY:**

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION notify_record_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'record_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'id', NEW.id,
      'data', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER users_change_trigger
AFTER INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION notify_record_change();

-- In n8n, listen for notifications
SELECT * FROM users WHERE id = -1;  -- Keep connection alive
LISTEN record_changes;
```

---

### Materialized View Refresh Automation

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total) as total_revenue,
  AVG(total) as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at);

CREATE INDEX ON daily_sales_summary (date);

-- Refresh workflow (scheduled daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

**n8n Schedule:**
```
Schedule Trigger: Daily at 2:00 AM
│
└─▶ PostgreSQL Node
    Operation: Execute Query
    Query: REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
    │
    └─▶ Slack Notification (on completion)
```

---

## MongoDB Automation

### Connection Setup

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient($env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

await client.connect();
const db = client.db($env.MONGODB_DATABASE);
```

---

### Aggregation Pipeline Pattern

```javascript
// Complex aggregation example
const pipeline = [
  // Stage 1: Match active users
  {
    $match: {
      status: 'active',
      created_at: { $gte: new Date('2024-01-01') }
    }
  },

  // Stage 2: Lookup related orders
  {
    $lookup: {
      from: 'orders',
      localField: '_id',
      foreignField: 'user_id',
      as: 'orders'
    }
  },

  // Stage 3: Calculate metrics
  {
    $addFields: {
      total_orders: { $size: '$orders' },
      total_spent: { $sum: '$orders.total' },
      avg_order_value: { $avg: '$orders.total' }
    }
  },

  // Stage 4: Group by segment
  {
    $group: {
      _id: '$segment',
      user_count: { $sum: 1 },
      total_revenue: { $sum: '$total_spent' },
      avg_ltv: { $avg: '$total_spent' }
    }
  },

  // Stage 5: Sort by revenue
  {
    $sort: { total_revenue: -1 }
  }
];

const results = await db.collection('users').aggregate(pipeline).toArray();

return results.map(r => ({ json: r }));
```

---

### Bulk Write Operations

```javascript
const bulkOps = [];

for (const item of $input.all()) {
  bulkOps.push({
    updateOne: {
      filter: { _id: item.json.id },
      update: {
        $set: {
          name: item.json.name,
          email: item.json.email,
          updated_at: new Date()
        },
        $inc: { version: 1 }
      },
      upsert: true
    }
  });

  // Process in batches of 1000
  if (bulkOps.length >= 1000) {
    await db.collection('users').bulkWrite(bulkOps);
    bulkOps.length = 0; // Clear array
  }
}

// Process remaining
if (bulkOps.length > 0) {
  await db.collection('users').bulkWrite(bulkOps);
}

return [{ json: { processed: $input.all().length } }];
```

---

### Change Streams (Real-time CDC)

```javascript
// Watch for changes
const changeStream = db.collection('orders').watch([
  {
    $match: {
      'operationType': { $in: ['insert', 'update'] },
      'fullDocument.status': 'completed'
    }
  }
]);

changeStream.on('change', async (change) => {
  // Trigger n8n webhook with change data
  await $http.request({
    method: 'POST',
    url: 'https://n8n.company.com/webhook/order-completed',
    body: {
      orderId: change.fullDocument._id,
      amount: change.fullDocument.total,
      customer: change.fullDocument.customer_id
    }
  });
});

// Keep connection alive
await new Promise(() => {}); // Runs indefinitely
```

---

## ETL Patterns

### Extract-Transform-Load Workflow

```
┌──────────────┐
│   EXTRACT    │
│ (Source DBs) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  TRANSFORM   │
│ (Clean/Enrich│
│   Validate)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     LOAD     │
│(Destination) │
└──────────────┘
```

**Complete ETL Implementation:**

```javascript
// EXTRACT
async function extract() {
  // Extract from multiple sources in parallel
  const [users, orders, products] = await Promise.all([
    extractFromPostgres('users'),
    extractFromMySQL('orders'),
    extractFromMongoDB('products')
  ]);

  return { users, orders, products };
}

// TRANSFORM
function transform(data) {
  return {
    users: data.users.map(u => ({
      id: u.id,
      name: u.first_name + ' ' + u.last_name,
      email: u.email.toLowerCase().trim(),
      created_at: new Date(u.created_at)
    })),

    orders: data.orders.map(o => ({
      id: o.order_id,
      user_id: o.customer_id,
      total: parseFloat(o.amount),
      status: normalizeStatus(o.status),
      items: JSON.parse(o.items_json)
    })),

    products: data.products.map(p => ({
      id: p._id.toString(),
      name: p.name.trim(),
      price: p.price,
      category: p.category,
      in_stock: p.quantity > 0
    }))
  };
}

// LOAD
async function load(transformedData) {
  // Load to data warehouse in parallel
  await Promise.all([
    loadToWarehouse('users', transformedData.users),
    loadToWarehouse('orders', transformedData.orders),
    loadToWarehouse('products', transformedData.products)
  ]);
}

// ORCHESTRATE
async function runETL() {
  console.log('Starting ETL pipeline...');

  const rawData = await extract();
  console.log(`Extracted: ${Object.keys(rawData).length} tables`);

  const transformedData = transform(rawData);
  console.log(`Transformed: ${transformedData.users.length} users, ${transformedData.orders.length} orders`);

  await load(transformedData);
  console.log('ETL pipeline completed successfully');

  return {
    success: true,
    recordsProcessed: {
      users: transformedData.users.length,
      orders: transformedData.orders.length,
      products: transformedData.products.length
    }
  };
}

// Execute
const result = await runETL();
return [{ json: result }];
```

---

### Incremental ETL Pattern

```javascript
// Track watermarks for incremental loads
const watermarks = {
  users: await getWatermark('users'),
  orders: await getWatermark('orders')
};

// Extract only new/updated records
const newRecords = await $db.query(`
  SELECT * FROM users
  WHERE updated_at > $1
  ORDER BY updated_at ASC
`, [watermarks.users]);

// Process new records
for (const record of newRecords) {
  // Transform and load
  await loadToWarehouse(transformRecord(record));
}

// Update watermark
if (newRecords.length > 0) {
  const latestTimestamp = newRecords[newRecords.length - 1].updated_at;
  await updateWatermark('users', latestTimestamp);
}

return [{ json: { processed: newRecords.length } }];
```

---

## Data Sync Strategies

### Bidirectional Sync Pattern

```javascript
// Two-way sync between systems
async function bidirectionalSync(source, destination) {
  // Get changes from both sides since last sync
  const [sourceChanges, destChanges] = await Promise.all([
    getChangesSince(source, lastSyncTime),
    getChangesSince(destination, lastSyncTime)
  ]);

  // Conflict resolution
  const resolved = resolveConflicts(sourceChanges, destChanges);

  // Apply changes
  await Promise.all([
    applyChanges(destination, resolved.toDestination),
    applyChanges(source, resolved.toSource)
  ]);

  // Update sync timestamp
  await updateSyncTimestamp(new Date());
}

function resolveConflicts(sourceChanges, destChanges) {
  // Last-write-wins strategy
  const conflicts = [];

  for (const sourceChange of sourceChanges) {
    const destChange = destChanges.find(d => d.id === sourceChange.id);

    if (destChange) {
      // Conflict: both sides changed
      if (sourceChange.updated_at > destChange.updated_at) {
        conflicts.push({ winner: 'source', record: sourceChange });
      } else {
        conflicts.push({ winner: 'destination', record: destChange });
      }
    }
  }

  return conflicts;
}
```

---

## Performance Optimization

### Connection Pooling

```javascript
// PostgreSQL connection pool
const { Pool } = require('pg');

const pool = new Pool({
  host: $env.POSTGRES_HOST,
  database: $env.POSTGRES_DB,
  user: $env.POSTGRES_USER,
  password: $env.POSTGRES_PASSWORD,
  port: 5432,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Use pool for queries
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Pool automatically manages connections
```

---

### Query Optimization

```sql
-- BAD: Slow query
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
AND o.created_at >= NOW() - INTERVAL '30 days';

-- GOOD: Optimized with indexes
CREATE INDEX idx_orders_status_created ON orders (status, created_at);
CREATE INDEX idx_orders_user_id ON orders (user_id);

SELECT
  o.id,
  o.total,
  u.name,
  u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
AND o.created_at >= NOW() - INTERVAL '30 days'
LIMIT 1000;  -- Always limit results
```

---

### Bulk Insert Optimization

```javascript
// PostgreSQL bulk insert with COPY
const { from } = require('pg-copy-streams');

async function bulkInsertOptimized(data) {
  const client = await pool.connect();

  try {
    const stream = client.query(
      from('COPY users (id, name, email) FROM STDIN WITH (FORMAT csv)')
    );

    for (const record of data) {
      stream.write(`${record.id},${record.name},${record.email}\n`);
    }

    stream.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

  } finally {
    client.release();
  }
}

// 10-100x faster than individual INSERTs
```

---

## Security Best Practices

### SQL Injection Prevention

```javascript
// ❌ NEVER do this
const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// ✅ ALWAYS use parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
const result = await pool.query(query, [userInput]);
```

---

### Encrypted Connections

```javascript
const pool = new Pool({
  host: $env.POSTGRES_HOST,
  database: $env.POSTGRES_DB,
  user: $env.POSTGRES_USER,
  password: $env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem').toString()
  }
});
```

---

### Credential Management

```javascript
// ✅ Use environment variables
const dbConfig = {
  host: $env.DB_HOST,
  user: $env.DB_USER,
  password: $env.DB_PASSWORD
};

// ✅ Rotate credentials regularly
// ✅ Use different credentials per environment
// ✅ Principle of least privilege (read-only where possible)
```

---

## Best Practices Summary

### ✅ DO

1. **Use connection pooling** for better performance
2. **Implement parameterized queries** to prevent SQL injection
3. **Add proper indexes** on frequently queried columns
4. **Batch operations** for large datasets
5. **Monitor query performance** with EXPLAIN
6. **Use transactions** for data consistency
7. **Implement retry logic** for transient failures
8. **Log all database errors** for debugging
9. **Set query timeouts** to prevent long-running queries
10. **Regular backups** before major operations

### ❌ DON'T

1. **Don't use SELECT *** - specify columns
2. **Don't run migrations** without backups
3. **Don't hardcode credentials** in workflows
4. **Don't ignore connection limits**
5. **Don't skip error handling**
6. **Don't fetch unbounded results** - always use LIMIT
7. **Don't create indexes** on every column
8. **Don't run TRUNCATE** without verification
9. **Don't skip transaction boundaries**
10. **Don't assume schema** won't change

---

**Last Updated:** January 2025
**Database Versions:** PostgreSQL 15+, MySQL 8+, MongoDB 6+
