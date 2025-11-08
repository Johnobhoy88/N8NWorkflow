---
name: Database Automation Specialist
description: Expert in PostgreSQL, MySQL, MongoDB automation, ETL pipelines, incremental sync, and performance optimization. Use for database integration, data migration, and sync workflows.
---

# Database Automation Specialist Skill

You are an expert in database automation, ETL pipelines, data synchronization, and performance optimization for PostgreSQL, MySQL, and MongoDB.

## PostgreSQL Automation

### Incremental Data Sync

```javascript
// Get last sync timestamp
const lastSync = await $db.query(`
  SELECT last_sync_time FROM sync_metadata WHERE table_name = 'users'
`);

// Query source for new/updated records
const sourceRecords = await $db.query(`
  SELECT id, name, email, updated_at
  FROM users
  WHERE updated_at > $1
  ORDER BY updated_at ASC
  LIMIT 1000
`, [lastSync[0].last_sync_time]);

// Upsert to destination
for (const record of sourceRecords) {
  await $db.query(`
    INSERT INTO users (id, name, email, updated_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = EXCLUDED.updated_at
  `, [record.id, record.name, record.email, record.updated_at]);
}

// Update sync metadata
await $db.query(`
  UPDATE sync_metadata
  SET last_sync_time = NOW()
  WHERE table_name = 'users'
`);
```

### Batch Processing

```javascript
async function processBatches(query, batchSize = 1000) {
  let offset = 0;
  let hasMore = true;
  let totalProcessed = 0;

  while (hasMore) {
    const batch = await $db.query(
      `${query} LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );

    if (batch.length === 0) break;

    for (const record of batch) {
      await processRecord(record);
      totalProcessed++;
    }

    offset += batchSize;
    await new Promise(resolve => setTimeout(resolve, 100)); // Prevent overwhelming DB
  }

  return { totalProcessed };
}
```

### Materialized View Refresh

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

-- Refresh (scheduled daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

## MongoDB Automation

### Aggregation Pipeline

```javascript
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

  // Stage 5: Sort
  {
    $sort: { total_revenue: -1 }
  }
];

const results = await db.collection('users').aggregate(pipeline).toArray();
```

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

  if (bulkOps.length >= 1000) {
    await db.collection('users').bulkWrite(bulkOps);
    bulkOps.length = 0;
  }
}

if (bulkOps.length > 0) {
  await db.collection('users').bulkWrite(bulkOps);
}
```

## ETL Patterns

### Extract-Transform-Load

```javascript
// EXTRACT
async function extract() {
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
      name: `${u.first_name} ${u.last_name}`,
      email: u.email.toLowerCase().trim(),
      created_at: new Date(u.created_at)
    })),
    orders: data.orders.map(o => ({
      id: o.order_id,
      user_id: o.customer_id,
      total: parseFloat(o.amount),
      status: normalizeStatus(o.status)
    }))
  };
}

// LOAD
async function load(transformedData) {
  await Promise.all([
    loadToWarehouse('users', transformedData.users),
    loadToWarehouse('orders', transformedData.orders)
  ]);
}

// ORCHESTRATE
async function runETL() {
  const rawData = await extract();
  const transformedData = transform(rawData);
  await load(transformedData);

  return {
    success: true,
    recordsProcessed: {
      users: transformedData.users.length,
      orders: transformedData.orders.length
    }
  };
}
```

### Incremental ETL

```javascript
const watermarks = await getWatermarks();

const newRecords = await $db.query(`
  SELECT * FROM users
  WHERE updated_at > $1
  ORDER BY updated_at ASC
`, [watermarks.users]);

for (const record of newRecords) {
  await loadToWarehouse(transformRecord(record));
}

if (newRecords.length > 0) {
  const latestTimestamp = newRecords[newRecords.length - 1].updated_at;
  await updateWatermark('users', latestTimestamp);
}
```

## Performance Optimization

### Connection Pooling

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: $env.POSTGRES_HOST,
  database: $env.POSTGRES_DB,
  user: $env.POSTGRES_USER,
  password: $env.POSTGRES_PASSWORD,
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Query Optimization

```sql
-- Create indexes on frequently queried columns
CREATE INDEX idx_orders_status_created ON orders (status, created_at);
CREATE INDEX idx_orders_user_id ON orders (user_id);

-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT o.id, o.total, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
AND o.created_at >= NOW() - INTERVAL '30 days'
LIMIT 1000;
```

### Bulk Insert Optimization

```javascript
// PostgreSQL COPY (10-100x faster than individual INSERTs)
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
```

## Security Best Practices

### SQL Injection Prevention

```javascript
// ❌ NEVER do this
const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// ✅ ALWAYS use parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
const result = await pool.query(query, [userInput]);
```

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

## Best Practices

### ✅ DO

1. **Use connection pooling**
2. **Implement parameterized queries**
3. **Add proper indexes**
4. **Batch operations for large datasets**
5. **Monitor query performance**
6. **Use transactions for data consistency**
7. **Implement retry logic**
8. **Log all database errors**
9. **Set query timeouts**
10. **Regular backups before major operations**

### ❌ DON'T

1. **Don't use SELECT * - specify columns**
2. **Don't run migrations without backups**
3. **Don't hardcode credentials**
4. **Don't ignore connection limits**
5. **Don't skip error handling**
6. **Don't fetch unbounded results - use LIMIT**
7. **Don't create indexes on every column**
8. **Don't run TRUNCATE without verification**
9. **Don't skip transaction boundaries**
10. **Don't assume schema won't change**

## When to Use This Skill

Invoke when:
- Designing database integration workflows
- Implementing ETL/ELT pipelines
- Setting up incremental data sync
- Optimizing database queries
- Implementing batch processing
- Migrating data between systems
- Performance tuning database operations
- Implementing change data capture (CDC)

## Knowledge Base Reference

`domains/databases/knowledge/advanced/database-automation-patterns.md`

---

*Leverages 2025 database automation best practices with production-ready patterns.*
