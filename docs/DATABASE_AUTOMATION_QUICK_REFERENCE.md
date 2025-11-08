# Database Automation Quick Reference Guide

**Fast lookup guide for database automation patterns and commands**

---

## PostgreSQL Quick Commands

### Triggers
```sql
-- Create trigger
CREATE TRIGGER trigger_name
AFTER INSERT ON table_name
FOR EACH ROW
EXECUTE FUNCTION function_name();

-- List all triggers
SELECT * FROM pg_trigger;

-- Drop trigger
DROP TRIGGER trigger_name ON table_name;
```

### Stored Procedures/Functions
```sql
-- Create function
CREATE OR REPLACE FUNCTION func_name(params)
RETURNS return_type AS $$
BEGIN
    -- function body
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Call function
SELECT func_name(arguments);

-- List functions
\df
```

### Scheduling with pg_cron
```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job
SELECT cron.schedule('job_name', 'cron_expression', 'SQL_COMMAND');

-- Examples
SELECT cron.schedule('hourly-job', '0 * * * *', 'SELECT process_data()');
SELECT cron.schedule('daily-job', '0 2 * * *', 'SELECT cleanup_logs()');
SELECT cron.schedule('weekly-job', '0 3 * * 0', 'SELECT backup_data()');

-- List jobs
SELECT * FROM cron.job;

-- Remove job
SELECT cron.unschedule('job_name');
```

### Transactions
```sql
-- Begin transaction
BEGIN;

-- Savepoint
SAVEPOINT savepoint_name;

-- Rollback to savepoint
ROLLBACK TO SAVEPOINT savepoint_name;

-- Commit
COMMIT;

-- Rollback
ROLLBACK;
```

### Indexes for Performance
```sql
-- Create composite index
CREATE INDEX idx_name ON table_name(col1, col2 DESC);

-- Create partial index
CREATE INDEX idx_active ON table_name(col1) WHERE status = 'active';

-- Create expression index
CREATE INDEX idx_lower_email ON users(LOWER(email));

-- View indexes
SELECT * FROM pg_indexes WHERE tablename = 'table_name';

-- Analyze query plan
EXPLAIN ANALYZE SELECT ...;
```

---

## MySQL Quick Commands

### Events (Scheduled Tasks)
```sql
-- Enable scheduler
SET GLOBAL event_scheduler = ON;

-- Create event
CREATE EVENT event_name
ON SCHEDULE EVERY 1 HOUR
DO BEGIN
    -- SQL statements
END$$

-- View events
SHOW EVENTS;

-- Disable event
ALTER EVENT event_name DISABLE;

-- Drop event
DROP EVENT event_name;
```

### Triggers
```sql
-- Create trigger
DELIMITER $$
CREATE TRIGGER trigger_name
BEFORE INSERT ON table_name
FOR EACH ROW
BEGIN
    -- trigger body
    SET NEW.column = value;
END$$
DELIMITER ;

-- View triggers
SHOW TRIGGERS;

-- Drop trigger
DROP TRIGGER trigger_name;
```

### Stored Procedures
```sql
-- Create procedure
DELIMITER $$
CREATE PROCEDURE proc_name(IN param1 INT)
BEGIN
    -- procedure body
END$$
DELIMITER ;

-- Call procedure
CALL proc_name(value);

-- View procedures
SHOW PROCEDURE STATUS;
```

### Performance Tips
```sql
-- Explain query plan
EXPLAIN FORMAT=JSON SELECT ...;

-- Optimize table
OPTIMIZE TABLE table_name;

-- Analyze table
ANALYZE TABLE table_name;

-- Show table statistics
SHOW TABLE STATUS FROM database_name;
```

---

## MongoDB Quick Commands

### Change Streams
```javascript
// Watch collection for changes
const changeStream = collection.watch();

changeStream.on('change', (change) => {
    console.log('Change:', change);
});

// Watch with filter
const pipeline = [
    {
        $match: {
            operationType: 'insert',
            'fullDocument.status': 'pending'
        }
    }
];
const changeStream = collection.watch(pipeline);
```

### Aggregation Pipeline
```javascript
// Example aggregation
const result = await collection.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
]).toArray();
```

### Bulk Operations
```javascript
// Bulk operations
const bulk = collection.initializeUnorderedBulkOp();
bulk.insert(doc1);
bulk.insert(doc2);
bulk.update({ _id: 1 }, { $set: { status: 'updated' } });
bulk.delete({ _id: 3 });
await bulk.execute();
```

---

## ETL Process Checklist

- [ ] **Extract**: Load raw data from source
- [ ] **Transform**: Clean, validate, normalize data
- [ ] **Load**: Insert into production tables
- [ ] **Verify**: Check data integrity
- [ ] **Archive**: Move processed data
- [ ] **Monitor**: Log success/failure

---

## Common Automation Patterns

### Pattern: Auto-Increment with Prefix
```sql
-- PostgreSQL
CREATE SEQUENCE order_seq START WITH 1000;
CREATE TRIGGER auto_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- MySQL
ALTER TABLE orders 
ADD COLUMN order_number VARCHAR(50) GENERATED ALWAYS AS (CONCAT('ORD-', DATE_FORMAT(created_at, '%Y'), '-', LPAD(id, 6, '0'))) STORED;
```

### Pattern: Audit Trail
```sql
-- PostgreSQL
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    operation VARCHAR(10),
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MySQL
CREATE TABLE audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(255),
    operation VARCHAR(10),
    old_values JSON,
    new_values JSON,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pattern: Data Cleanup
```sql
-- PostgreSQL
DELETE FROM logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
VACUUM ANALYZE logs;

-- MySQL
DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
OPTIMIZE TABLE logs;
```

### Pattern: Batch Processing
```sql
-- PostgreSQL with keyset pagination
SELECT * FROM orders 
WHERE id > last_id 
ORDER BY id 
LIMIT 1000;

-- MySQL with LIMIT
SELECT * FROM orders 
ORDER BY id 
LIMIT 1000 OFFSET 0;
```

---

## Webhook Pattern

```javascript
// Listen for database changes and dispatch webhooks
async function setupWebhookDispatcher() {
    const client = new Client(dbConfig);
    await client.connect();

    // Listen for notifications
    client.on('notification', async (msg) => {
        const event = JSON.parse(msg.payload);
        await sendWebhook(webhookUrl, event);
    });

    await client.query('LISTEN database_events');
}

async function sendWebhook(url, payload, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await axios.post(url, payload, {
                timeout: 10000,
                headers: {
                    'X-Webhook-Signature': generateSignature(payload)
                }
            });
            return response.data;
        } catch (error) {
            if (i < maxRetries - 1) {
                await sleep(Math.pow(2, i) * 1000); // Exponential backoff
            } else {
                throw error;
            }
        }
    }
}
```

---

## Performance Optimization Checklist

### Query Optimization
- [ ] Use indexes on filtered/joined columns
- [ ] Avoid SELECT *
- [ ] Use LIMIT for large result sets
- [ ] Analyze query plans (EXPLAIN)
- [ ] Use covering indexes where possible

### Data Volume
- [ ] Archive old data regularly
- [ ] Use partitioning for large tables
- [ ] Implement data retention policies
- [ ] Monitor table sizes

### Automation
- [ ] Batch operations when possible
- [ ] Use connection pooling
- [ ] Implement retry logic with backoff
- [ ] Log all automated tasks
- [ ] Set up monitoring and alerts

---

## Monitoring and Logging

### PostgreSQL
```sql
-- Check slow queries
CREATE EXTENSION pg_stat_statements;
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC;

-- Monitor connections
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;
```

### MySQL
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- View slow queries
SELECT * FROM mysql.slow_log;

-- Monitor locks
SHOW OPEN TABLES WHERE In_use > 0;
```

---

## Backup & Recovery Quick Guide

### PostgreSQL
```bash
# Full backup
pg_dump -U user -h host database > backup.sql

# Compressed backup
pg_dump -U user -h host -Fc database > backup.dump

# Restore from dump
psql -U user -h host database < backup.sql

# Restore from compressed
pg_restore -U user -h host -d database backup.dump
```

### MySQL
```bash
# Full backup
mysqldump -u user -p database > backup.sql

# All databases
mysqldump -u user -p --all-databases > backup.sql

# Restore
mysql -u user -p database < backup.sql

# Compressed backup
mysqldump -u user -p database | gzip > backup.sql.gz
```

### MongoDB
```bash
# Backup
mongodump --uri="mongodb://..." --out=/path/to/backup

# Restore
mongorestore --uri="mongodb://..." /path/to/backup
```

---

## Cron Expression Reference

```
*     *     *     *     *
│     │     │     │     │
│     │     │     │     └─ Day of week (0-6) (0 = Sunday)
│     │     │     └─ Month (1-12)
│     │     └─ Day of month (1-31)
│     └─ Hour (0-23)
└─ Minute (0-59)
```

### Examples
```
0 * * * *       # Every hour
0 2 * * *       # Daily at 2 AM
0 3 * * 0       # Weekly (Sunday at 3 AM)
0 0 1 * *       # Monthly (1st at midnight)
*/15 * * * *    # Every 15 minutes
```

---

## Common Issues and Solutions

### Issue: Slow Trigger Execution
**Solution**: Check trigger function performance, consider batching

### Issue: Lock Contention
**Solution**: Use shorter transactions, implement row-level locking

### Issue: Webhook Delivery Failures
**Solution**: Implement retry logic with exponential backoff, log all attempts

### Issue: Missing Data in Automated Processes
**Solution**: Add error handling, implement transaction rollbacks, verify data quality

### Issue: High Database Load
**Solution**: Implement connection pooling, batch operations, optimize queries

---

## Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- MySQL Documentation: https://dev.mysql.com/doc/
- MongoDB Documentation: https://docs.mongodb.com/
- pg_cron: https://github.com/citusdata/pg_cron
- Flyway (Migrations): https://flywaydb.org/

---

**Last Updated:** 2025-11-08
**Version:** 1.0.0
