# Comprehensive Database Automation Patterns Guide

**A production-ready reference for PostgreSQL, MySQL, MongoDB automation and ETL workflows**

**Created:** 2025-11-08  
**Last Updated:** 2025-11-08  
**Version:** 1.0

---

## Table of Contents

1. [PostgreSQL Automation](#postgresql-automation)
2. [MySQL Automation Patterns](#mysql-automation-patterns)
3. [MongoDB Automation & Change Streams](#mongodb-automation--change-streams)
4. [ETL Workflow Patterns](#etl-workflow-patterns)
5. [Query Optimization for Automation](#query-optimization-for-automation)
6. [Batch Processing Strategies](#batch-processing-strategies)
7. [Transaction Management](#transaction-management)
8. [Database-to-Webhook Patterns](#database-to-webhook-patterns)
9. [Schema Migration Automation](#schema-migration-automation)
10. [Backup & Recovery Automation](#backup--recovery-automation)
11. [Real-World Integration Examples](#real-world-integration-examples)

---

## PostgreSQL Automation

### 1. Triggers and Functions

Triggers automatically execute functions in response to database events (INSERT, UPDATE, DELETE).

#### **Pattern 1A: Audit Trail Trigger**

```sql
-- Create audit log table
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    operation VARCHAR(10),
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_values, user_id)
        VALUES (TG_TABLE_NAME, 'INSERT', to_jsonb(NEW), current_user_id());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user_id());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_values, user_id)
        VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), current_user_id());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to a table
CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();
```

#### **Pattern 1B: Auto-Update Timestamp Trigger**

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to any table with updated_at column
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

#### **Pattern 1C: Automatic Sequence Generator Trigger**

```sql
-- Function for generating sequential order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'ORD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYY') || '-' || 
                       LPAD(NEXTVAL('order_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_seq START WITH 1000;

CREATE TRIGGER orders_generate_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();
```

#### **Pattern 1D: Cascading Updates with Validation**

```sql
-- Function with validation and cascading updates
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_available_stock INT;
BEGIN
    -- Check if new quantity doesn't exceed warehouse capacity
    IF NEW.quantity > 10000 THEN
        RAISE EXCEPTION 'Quantity exceeds warehouse capacity: %', NEW.quantity;
    END IF;

    -- Update related inventory summary
    UPDATE product_summary
    SET last_stock_update = CURRENT_TIMESTAMP,
        total_quantity = total_quantity + (NEW.quantity - COALESCE(OLD.quantity, 0))
    WHERE product_id = NEW.product_id;

    -- Log stock changes
    INSERT INTO stock_history (product_id, change_amount, previous_qty, new_qty, changed_at)
    VALUES (NEW.product_id, NEW.quantity - COALESCE(OLD.quantity, 0), 
            COALESCE(OLD.quantity, 0), NEW.quantity, CURRENT_TIMESTAMP);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_stock_update
BEFORE INSERT OR UPDATE ON product_inventory
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();
```

---

### 2. Stored Procedures and Functions

#### **Pattern 2A: Data Processing Stored Procedure**

```sql
-- Procedure to process daily orders and generate invoices
CREATE OR REPLACE FUNCTION process_daily_orders()
RETURNS TABLE(processed_orders INT, total_amount DECIMAL, invoice_count INT) AS $$
DECLARE
    v_order_count INT := 0;
    v_total DECIMAL := 0;
    v_invoice_count INT := 0;
    v_order_id UUID;
    v_customer_id UUID;
    v_amount DECIMAL;
BEGIN
    -- Start transaction
    BEGIN
        -- Get all pending orders from today
        FOR v_order_id, v_customer_id, v_amount IN
            SELECT id, customer_id, total_amount
            FROM orders
            WHERE status = 'pending' 
            AND DATE(created_at) = CURRENT_DATE
            ORDER BY created_at ASC
        LOOP
            -- Process each order
            UPDATE orders
            SET status = 'processing',
                processing_started_at = CURRENT_TIMESTAMP
            WHERE id = v_order_id;

            -- Generate invoice
            INSERT INTO invoices (order_id, customer_id, amount, issued_at)
            VALUES (v_order_id, v_customer_id, v_amount, CURRENT_TIMESTAMP);

            -- Accumulate totals
            v_order_count := v_order_count + 1;
            v_total := v_total + v_amount;
            v_invoice_count := v_invoice_count + 1;

            -- Log processing
            INSERT INTO process_log (event_type, details, created_at)
            VALUES ('order_processed', jsonb_build_object('order_id', v_order_id), CURRENT_TIMESTAMP);
        END LOOP;

        -- Create summary record
        INSERT INTO daily_summary (summary_date, orders_processed, total_revenue, invoices_generated)
        VALUES (CURRENT_DATE, v_order_count, v_total, v_invoice_count);

        RETURN QUERY SELECT v_order_count, v_total, v_invoice_count;
        COMMIT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error processing orders: %', SQLERRM;
        ROLLBACK;
        RETURN QUERY SELECT 0, 0::DECIMAL, 0;
    END;
END;
$$ LANGUAGE plpgsql;
```

#### **Pattern 2B: ETL Data Transformation Function**

```sql
-- Function to extract, transform, and load customer data
CREATE OR REPLACE FUNCTION etl_customer_data(
    p_source_table TEXT,
    p_batch_size INT DEFAULT 1000
)
RETURNS TABLE(
    extracted INT,
    transformed INT,
    loaded INT,
    errors INT,
    duration_seconds DECIMAL
) AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_extracted INT := 0;
    v_transformed INT := 0;
    v_loaded INT := 0;
    v_errors INT := 0;
    v_sql TEXT;
BEGIN
    v_start_time := CURRENT_TIMESTAMP;

    -- Extract: Get unprocessed records
    v_extracted := (SELECT COUNT(*) FROM (
        SELECT * FROM p_source_table 
        WHERE processed = FALSE 
        LIMIT p_batch_size
    ) sub);

    -- Transform and Load
    BEGIN
        INSERT INTO customers_processed (
            id, name, email, phone, address, city, state, zip_code, 
            normalized_name, email_domain, data_quality_score, loaded_at
        )
        SELECT
            id,
            TRIM(UPPER(name)),
            LOWER(TRIM(email)),
            REGEXP_REPLACE(phone, '[^0-9]', '', 'g'),
            TRIM(address),
            TRIM(UPPER(city)),
            TRIM(UPPER(state)),
            TRIM(zip_code),
            -- Normalize name: remove extra spaces, standardize case
            TRIM(REGEXP_REPLACE(LOWER(name), '\s+', ' ')),
            -- Extract email domain
            SUBSTRING(LOWER(email) FROM POSITION('@' IN LOWER(email)) + 1),
            -- Calculate data quality score
            ROUND((
                CASE WHEN name IS NOT NULL THEN 20 ELSE 0 END +
                CASE WHEN email IS NOT NULL AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN 20 ELSE 0 END +
                CASE WHEN phone IS NOT NULL THEN 20 ELSE 0 END +
                CASE WHEN address IS NOT NULL THEN 20 ELSE 0 END +
                CASE WHEN state IS NOT NULL THEN 20 ELSE 0 END
            )::NUMERIC / 100, 2),
            CURRENT_TIMESTAMP
        FROM p_source_table
        WHERE processed = FALSE
        LIMIT p_batch_size
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            updated_at = CURRENT_TIMESTAMP;

        v_transformed := v_extracted;
        v_loaded := v_extracted;

        -- Mark source records as processed
        EXECUTE 'UPDATE ' || p_source_table || 
                ' SET processed = TRUE WHERE processed = FALSE LIMIT ' || p_batch_size;

    EXCEPTION WHEN OTHERS THEN
        v_errors := v_extracted;
        INSERT INTO etl_errors (process_name, error_message, error_timestamp)
        VALUES ('etl_customer_data', SQLERRM, CURRENT_TIMESTAMP);
    END;

    v_end_time := CURRENT_TIMESTAMP;

    RETURN QUERY SELECT 
        v_extracted, 
        v_transformed, 
        v_loaded, 
        v_errors,
        EXTRACT(EPOCH FROM (v_end_time - v_start_time))::DECIMAL;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. Event Scheduling and Automation

#### **Pattern 3A: pg_cron Job Scheduler**

```sql
-- Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily order processing at 2 AM
SELECT cron.schedule('process-daily-orders', '0 2 * * *', 'SELECT process_daily_orders()');

-- Schedule hourly data sync every hour
SELECT cron.schedule('hourly-data-sync', '0 * * * *', 'SELECT sync_external_data()');

-- Schedule weekly backup every Sunday at 3 AM
SELECT cron.schedule('weekly-backup', '0 3 * * 0', 'SELECT pg_dump_backup()');

-- Schedule data cleanup every day at 4 AM (delete records older than 90 days)
SELECT cron.schedule('cleanup-old-logs', '0 4 * * *', 
    'DELETE FROM audit_log WHERE created_at < CURRENT_TIMESTAMP - INTERVAL ''90 days''');

-- View all scheduled jobs
SELECT * FROM cron.job;

-- Remove a scheduled job
SELECT cron.unschedule('process-daily-orders');
```

#### **Pattern 3B: Data Retention and Cleanup Function**

```sql
-- Function to manage data retention policies
CREATE OR REPLACE FUNCTION enforce_data_retention_policies()
RETURNS TABLE(
    table_name VARCHAR,
    rows_deleted BIGINT,
    freed_space TEXT
) AS $$
DECLARE
    v_retention_days INT;
    v_rows_deleted BIGINT;
    v_before_size BIGINT;
    v_after_size BIGINT;
    r RECORD;
BEGIN
    -- Define retention policies
    FOR r IN
        SELECT table_n, retention_days 
        FROM retention_policies
        WHERE enabled = TRUE
    LOOP
        -- Get space before deletion
        EXECUTE 'SELECT pg_total_relation_size(''' || r.table_n || ''')' 
            INTO v_before_size;

        -- Delete old records
        EXECUTE 'DELETE FROM ' || r.table_n || 
                ' WHERE created_at < CURRENT_TIMESTAMP - INTERVAL ''' || 
                r.retention_days || ' days'''
            INTO v_rows_deleted;

        -- Get space after deletion
        EXECUTE 'SELECT pg_total_relation_size(''' || r.table_n || ''')' 
            INTO v_after_size;

        -- Vacuum the table
        EXECUTE 'VACUUM ANALYZE ' || r.table_n;

        RETURN QUERY SELECT
            r.table_n::VARCHAR,
            v_rows_deleted,
            pg_size_pretty((v_before_size - v_after_size)::BIGINT);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create retention policies table
CREATE TABLE IF NOT EXISTS retention_policies (
    id SERIAL PRIMARY KEY,
    table_n VARCHAR(255),
    retention_days INT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert policies
INSERT INTO retention_policies (table_n, retention_days) VALUES
    ('audit_log', 180),
    ('api_logs', 90),
    ('session_logs', 30),
    ('error_logs', 60);

-- Schedule the cleanup
SELECT cron.schedule('enforce-retention-policies', '0 5 * * *', 
    'SELECT enforce_data_retention_policies()');
```

---

### 4. Full-Text Search Automation

#### **Pattern 4A: Automatic Full-Text Index Management**

```sql
-- Create GIN index for full-text search
CREATE INDEX idx_products_search ON products 
USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Function to update search index
CREATE OR REPLACE FUNCTION update_product_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- PostgreSQL automatically maintains GIN indexes
    -- This function ensures consistency
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Search function
CREATE OR REPLACE FUNCTION search_products(p_query TEXT)
RETURNS TABLE(
    product_id UUID,
    name VARCHAR,
    description TEXT,
    relevance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        p.name,
        p.description,
        ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), 
                plainto_tsquery('english', p_query))::DECIMAL
    FROM products p
    WHERE to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ 
          plainto_tsquery('english', p_query)
    ORDER BY relevance DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;
```

---

## MySQL Automation Patterns

### 1. Triggers and Events

#### **Pattern 1A: MySQL Trigger for Order Status Updates**

```sql
-- Create trigger to update order status
DELIMITER $$

CREATE TRIGGER update_order_status_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
    
    -- Log status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, NOW());
    END IF;
END$$

DELIMITER ;
```

#### **Pattern 1B: MySQL Event Scheduler for Periodic Tasks**

```sql
-- Enable event scheduler (must be set in MySQL configuration or per session)
SET GLOBAL event_scheduler = ON;

-- Create event to process abandoned carts
CREATE EVENT process_abandoned_carts
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    UPDATE carts
    SET status = 'abandoned'
    WHERE last_updated < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    AND status = 'active';

    INSERT INTO abandoned_cart_log (cart_count, processed_at)
    SELECT COUNT(*), NOW()
    FROM carts
    WHERE status = 'abandoned'
    AND last_updated < DATE_SUB(NOW(), INTERVAL 24 HOUR);
END$$

-- Create event to archive old data
CREATE EVENT archive_old_logs
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE(), ' 23:00:00')
DO
BEGIN
    INSERT INTO logs_archive
    SELECT * FROM logs
    WHERE created_at < DATE_SUB(CURDATE(), INTERVAL 90 DAY);

    DELETE FROM logs
    WHERE created_at < DATE_SUB(CURDATE(), INTERVAL 90 DAY);

    OPTIMIZE TABLE logs;
END$$

-- List all events
SHOW EVENTS;

-- Disable an event
ALTER EVENT archive_old_logs DISABLE;

-- Drop an event
DROP EVENT IF EXISTS archive_old_logs;
```

#### **Pattern 1C: MySQL Stored Procedure for Data Processing**

```sql
DELIMITER $$

CREATE PROCEDURE process_monthly_invoices()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        INSERT INTO process_errors (error_message, error_time)
        VALUES (CONCAT('Error in process_monthly_invoices: ', @@error_message), NOW());
    END;

    START TRANSACTION;

    -- Get all orders from current month
    INSERT INTO monthly_invoices (order_id, customer_id, amount, invoice_date, status)
    SELECT 
        id,
        customer_id,
        total_amount,
        NOW(),
        'generated'
    FROM orders
    WHERE MONTH(created_at) = MONTH(CURDATE())
    AND YEAR(created_at) = YEAR(CURDATE())
    AND status = 'completed'
    ON DUPLICATE KEY UPDATE updated_at = NOW();

    -- Update customer invoice count
    UPDATE customers c
    SET c.invoice_count = (
        SELECT COUNT(*) FROM monthly_invoices 
        WHERE customer_id = c.id AND MONTH(invoice_date) = MONTH(CURDATE())
    )
    WHERE c.id IN (
        SELECT DISTINCT customer_id FROM monthly_invoices
        WHERE MONTH(invoice_date) = MONTH(CURDATE())
    );

    -- Log completion
    INSERT INTO process_log (process_name, status, executed_at)
    VALUES ('process_monthly_invoices', 'completed', NOW());

    COMMIT;
END$$

DELIMITER ;

-- Call the procedure
CALL process_monthly_invoices();
```

---

### 2. Advanced MySQL Automation

#### **Pattern 2A: MySQL JSON Automation for Flexible Data**

```sql
-- Trigger to validate and process JSON data
DELIMITER $$

CREATE TRIGGER validate_event_data
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
    DECLARE json_valid BOOLEAN DEFAULT FALSE;
    
    -- Validate JSON structure
    SET json_valid = JSON_VALID(NEW.event_data);
    
    IF NOT json_valid THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid JSON in event_data';
    END IF;

    -- Extract and store commonly used fields
    SET NEW.event_type = JSON_UNQUOTE(JSON_EXTRACT(NEW.event_data, '$.type'));
    SET NEW.user_id = JSON_UNQUOTE(JSON_EXTRACT(NEW.event_data, '$.user_id'));
    SET NEW.created_at = NOW();
END$$

DELIMITER ;
```

#### **Pattern 2B: MySQL Partitioning with Automation**

```sql
-- Create partitioned table for large datasets
CREATE TABLE user_activities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    activity_type VARCHAR(50),
    activity_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_id, created_at)
) 
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p_2023 VALUES LESS THAN (2024),
    PARTITION p_2024 VALUES LESS THAN (2025),
    PARTITION p_2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Procedure to manage partitions automatically
DELIMITER $$

CREATE PROCEDURE manage_activity_partitions()
BEGIN
    DECLARE v_year INT;
    DECLARE v_next_year INT;
    DECLARE v_partition_name VARCHAR(50);

    SET v_year = YEAR(CURDATE());
    SET v_next_year = v_year + 1;
    SET v_partition_name = CONCAT('p_', v_next_year);

    -- Check if next year partition exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.PARTITIONS
        WHERE TABLE_NAME = 'user_activities'
        AND PARTITION_NAME = v_partition_name
    ) THEN
        -- Add partition for next year
        ALTER TABLE user_activities ADD PARTITION (
            PARTITION p_next_year VALUES LESS THAN (v_next_year + 1)
        );
    END IF;
END$$

DELIMITER ;

-- Schedule partition management
CREATE EVENT manage_partitions
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE(), ' 01:00:00')
DO
    CALL manage_activity_partitions();
```

---

## MongoDB Automation & Change Streams

### 1. Change Streams for Real-Time Automation

#### **Pattern 1A: Change Stream Pipeline for Order Tracking**

```javascript
// Node.js example with MongoDB Change Streams
const { MongoClient } = require('mongodb');

async function watchOrderChanges() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db('ecommerce');
        const ordersCollection = db.collection('orders');

        // Create change stream with filter
        const pipeline = [
            {
                $match: {
                    'operationType': { $in: ['insert', 'update'] },
                    'fullDocument.status': { $in: ['pending', 'processing'] }
                }
            },
            {
                $project: {
                    _id: 1,
                    operationType: 1,
                    fullDocument: 1,
                    updateDescription: 1,
                    clusterTime: 1
                }
            }
        ];

        const changeStream = ordersCollection.watch(pipeline, {
            fullDocument: 'updateLookup', // Include full document for updates
            resumeAfter: null,
            batchSize: 100
        });

        // Listen for changes
        changeStream.on('change', async (change) => {
            console.log('Order changed:', change);

            if (change.operationType === 'insert') {
                await handleNewOrder(change.fullDocument);
            } else if (change.operationType === 'update') {
                await handleOrderUpdate(change.fullDocument, change.updateDescription);
            }
        });

        changeStream.on('error', (error) => {
            console.error('Change stream error:', error);
        });

    } finally {
        // Keep connection alive for streaming
        // await client.close();
    }
}

async function handleNewOrder(order) {
    console.log('Processing new order:', order._id);
    
    // Send webhook notification
    await fetch('https://your-webhook.com/order-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
    });

    // Update inventory
    const db = client.db('ecommerce');
    for (const item of order.items) {
        await db.collection('products').updateOne(
            { _id: item.productId },
            { $inc: { stock: -item.quantity } }
        );
    }
}

watchOrderChanges().catch(console.error);
```

### 2. MongoDB Aggregation Pipelines for Automation

#### **Pattern 2A: Real-Time Analytics Pipeline**

```javascript
// Aggregation pipeline for real-time sales analytics
const analyticsPipeline = [
    {
        $match: {
            createdAt: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 1))
            },
            status: 'completed'
        }
    },
    {
        $group: {
            _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                category: '$category'
            },
            totalSales: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' },
            maxOrderValue: { $max: '$totalAmount' },
            minOrderValue: { $min: '$totalAmount' }
        }
    },
    {
        $sort: { '_id.date': -1 }
    },
    {
        $merge: {
            into: 'daily_analytics',
            whenMatched: 'replace',
            whenNotMatched: 'insert'
        }
    }
];

async function runAnalyticsPipeline() {
    const db = client.db('ecommerce');
    const result = await db.collection('orders').aggregate(analyticsPipeline).toArray();
    console.log('Analytics updated:', result);
}

// Schedule every hour
setInterval(runAnalyticsPipeline, 60 * 60 * 1000);
```

#### **Pattern 2B: Automated Data Cleanup with Aggregation**

```javascript
// MongoDB bulk operations for automated cleanup
async function cleanupOldData() {
    const db = client.db('ecommerce');
    
    // Archive old orders
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const session = client.startSession();
    
    try {
        await session.withTransaction(async () => {
            // Move old orders to archive
            const oldOrders = await db.collection('orders')
                .find({ createdAt: { $lt: thirtyDaysAgo } })
                .toArray();

            if (oldOrders.length > 0) {
                await db.collection('orders_archive').insertMany(oldOrders);
                await db.collection('orders').deleteMany(
                    { createdAt: { $lt: thirtyDaysAgo } }
                );
            }

            // Clean up session logs
            await db.collection('session_logs').deleteMany({
                createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            });

            console.log('Cleanup completed');
        });
    } finally {
        await session.endSession();
    }
}

// Schedule daily cleanup at 3 AM
schedule.scheduleJob('0 3 * * *', cleanupOldData);
```

---

## ETL Workflow Patterns

### 1. Extract, Transform, Load Process

#### **Pattern 1A: Multi-Stage ETL Pipeline**

```sql
-- PostgreSQL ETL Example: Customer Data Pipeline

-- Stage 1: Extract (Load raw data into staging table)
CREATE TABLE staging_customers (
    source_id VARCHAR(255),
    source_name VARCHAR(255),
    source_email VARCHAR(255),
    source_phone VARCHAR(20),
    source_address TEXT,
    source_json JSONB,
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    load_id UUID
);

-- Stage 2: Transform (Data quality and normalization)
CREATE TABLE transformed_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    data_quality_score NUMERIC(3,2),
    transformation_errors JSONB,
    transformed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    load_id UUID
);

-- Stage 3: Load (Into production tables)
CREATE TABLE customers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_verified_at TIMESTAMP
);

-- ETL Orchestration Function
CREATE OR REPLACE FUNCTION etl_customers(
    p_load_id UUID DEFAULT gen_random_uuid(),
    p_source_type VARCHAR DEFAULT 'api'
)
RETURNS TABLE(
    stage VARCHAR,
    status VARCHAR,
    records_processed INT,
    records_succeeded INT,
    records_failed INT,
    execution_time_ms INT,
    error_message TEXT
) AS $$
DECLARE
    v_extract_start TIMESTAMP;
    v_extract_end TIMESTAMP;
    v_extract_count INT;
    v_transform_start TIMESTAMP;
    v_transform_end TIMESTAMP;
    v_transform_count INT;
    v_load_start TIMESTAMP;
    v_load_end TIMESTAMP;
    v_load_count INT;
    v_error_count INT;
BEGIN
    
    -- STAGE 1: EXTRACT
    v_extract_start := CLOCK_TIMESTAMP();
    BEGIN
        -- Example: Extract from external API (assume data is already in staging)
        SELECT COUNT(*) INTO v_extract_count
        FROM staging_customers
        WHERE load_id = p_load_id;

        v_extract_end := CLOCK_TIMESTAMP();
        
        RETURN QUERY SELECT 
            'EXTRACT'::VARCHAR,
            'SUCCESS'::VARCHAR,
            v_extract_count,
            v_extract_count,
            0,
            EXTRACT(EPOCH FROM (v_extract_end - v_extract_start))::INT,
            NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'EXTRACT'::VARCHAR,
            'FAILED'::VARCHAR,
            0,
            0,
            0,
            0,
            SQLERRM;
    END;

    -- STAGE 2: TRANSFORM
    v_transform_start := CLOCK_TIMESTAMP();
    BEGIN
        INSERT INTO transformed_customers (
            source_id, name, email, phone, address, city, state, postal_code, country,
            email_verified, data_quality_score, transformation_errors, load_id
        )
        SELECT
            source_id,
            TRIM(UPPER(source_name)),
            LOWER(TRIM(source_email)),
            REGEXP_REPLACE(source_phone, '[^0-9+\-]', ''),
            TRIM(source_address),
            TRIM(UPPER((source_json->>'city')::VARCHAR)),
            TRIM(UPPER((source_json->>'state')::VARCHAR)),
            TRIM((source_json->>'postal_code')::VARCHAR),
            TRIM(UPPER(COALESCE((source_json->>'country')::VARCHAR, 'USA'))),
            (source_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
            ROUND((
                CASE WHEN source_name IS NOT NULL THEN 25 ELSE 0 END +
                CASE WHEN source_email IS NOT NULL AND source_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN 25 ELSE 0 END +
                CASE WHEN source_phone IS NOT NULL THEN 25 ELSE 0 END +
                CASE WHEN source_address IS NOT NULL THEN 25 ELSE 0 END
            )::NUMERIC / 100, 2),
            NULL::JSONB,
            p_load_id
        FROM staging_customers
        WHERE load_id = p_load_id
        AND source_email IS NOT NULL
        AND source_name IS NOT NULL;

        SELECT COUNT(*) INTO v_transform_count
        FROM transformed_customers
        WHERE load_id = p_load_id;

        v_transform_end := CLOCK_TIMESTAMP();

        RETURN QUERY SELECT
            'TRANSFORM'::VARCHAR,
            'SUCCESS'::VARCHAR,
            v_extract_count,
            v_transform_count,
            v_extract_count - v_transform_count,
            EXTRACT(EPOCH FROM (v_transform_end - v_transform_start))::INT,
            NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'TRANSFORM'::VARCHAR,
            'FAILED'::VARCHAR,
            v_extract_count,
            0,
            v_extract_count,
            0,
            SQLERRM;
    END;

    -- STAGE 3: LOAD
    v_load_start := CLOCK_TIMESTAMP();
    BEGIN
        INSERT INTO customers (id, name, email, phone, address, city, state, postal_code, country)
        SELECT id, name, email, phone, address, city, state, postal_code, country
        FROM transformed_customers
        WHERE load_id = p_load_id
        AND data_quality_score >= 0.5
        ON CONFLICT (email) DO UPDATE
        SET 
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            postal_code = EXCLUDED.postal_code,
            country = EXCLUDED.country,
            updated_at = CURRENT_TIMESTAMP;

        SELECT COUNT(*) INTO v_load_count
        FROM customers c
        WHERE c.created_at >= v_load_start;

        v_load_end := CLOCK_TIMESTAMP();

        RETURN QUERY SELECT
            'LOAD'::VARCHAR,
            'SUCCESS'::VARCHAR,
            v_transform_count,
            v_load_count,
            v_transform_count - v_load_count,
            EXTRACT(EPOCH FROM (v_load_end - v_load_start))::INT,
            NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'LOAD'::VARCHAR,
            'FAILED'::VARCHAR,
            v_transform_count,
            0,
            v_transform_count,
            0,
            SQLERRM;
    END;

END;
$$ LANGUAGE plpgsql;

-- Execute ETL
SELECT * FROM etl_customers();
```

---

## Query Optimization for Automation

### 1. Index Strategies for Automated Workflows

#### **Pattern 1A: Composite Indexes for Common Queries**

```sql
-- PostgreSQL composite index for common automation queries
CREATE INDEX idx_orders_status_created_user ON orders(status, created_at DESC, user_id);

-- Partial index for active records (saves space)
CREATE INDEX idx_active_subscriptions ON subscriptions(customer_id, renewal_date)
WHERE status = 'active';

-- BRIN index for time-series data (better for large tables)
CREATE INDEX idx_events_timestamp ON events USING BRIN (created_at);

-- Expression index for case-insensitive email lookup
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM orders 
WHERE status = 'pending' 
AND created_at > CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;
```

#### **Pattern 1B: MySQL Query Optimization**

```sql
-- MySQL version with EXPLAIN
EXPLAIN FORMAT=JSON
SELECT o.id, o.customer_id, o.total_amount, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
AND o.status = 'completed';

-- Create covering index
CREATE INDEX idx_orders_covering ON orders(status, created_at, id, customer_id, total_amount);

-- Use covering index with EXPLAIN
EXPLAIN
SELECT status, created_at, id, customer_id, total_amount
FROM orders
WHERE status = 'completed'
AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### 2. Query Batching and Pagination

#### **Pattern 2A: Efficient Batch Processing**

```sql
-- PostgreSQL: Keyset pagination for efficient batch processing
CREATE OR REPLACE FUNCTION batch_process_orders(
    p_batch_size INT DEFAULT 1000,
    p_last_id BIGINT DEFAULT 0
)
RETURNS TABLE(
    id BIGINT,
    customer_id UUID,
    total_amount DECIMAL,
    status VARCHAR,
    row_number BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.customer_id,
        o.total_amount,
        o.status,
        ROW_NUMBER() OVER (ORDER BY o.id)
    FROM orders o
    WHERE o.id > p_last_id
    AND o.status = 'pending'
    ORDER BY o.id ASC
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;

-- MySQL version with LIMIT OFFSET (note: slower for large offsets)
SELECT id, customer_id, total_amount, status
FROM orders
WHERE status = 'pending'
ORDER BY id
LIMIT 1000 OFFSET 0;
```

---

## Batch Processing Strategies

### 1. Efficient Bulk Operations

#### **Pattern 1A: PostgreSQL Bulk Insert with COPY**

```sql
-- High-performance bulk loading
COPY customers (id, name, email, phone, created_at) FROM STDIN WITH (FORMAT csv, DELIMITER ',', NULL 'NULL');

-- Programmatic bulk insert (Node.js)
const copyStream = pg.raw(`COPY customers (name, email, phone) FROM STDIN`);

const stream = fs.createReadStream('customers.csv');
stream.pipe(copyStream).on('finish', () => {
    console.log('Bulk insert completed');
}).on('error', (err) => {
    console.error('Bulk insert error:', err);
});

-- PL/pgSQL version for in-database bulk operations
CREATE OR REPLACE PROCEDURE bulk_insert_orders(
    p_order_data JSON[]
)
AS $$
DECLARE
    v_order JSON;
    v_count INT := 0;
BEGIN
    FOREACH v_order IN ARRAY p_order_data LOOP
        INSERT INTO orders (customer_id, total_amount, status, created_at)
        VALUES (
            (v_order->>'customer_id')::UUID,
            (v_order->>'total_amount')::DECIMAL,
            v_order->>'status',
            (v_order->>'created_at')::TIMESTAMP
        );
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Inserted % orders', v_count;
END;
$$ LANGUAGE plpgsql;
```

#### **Pattern 1B: MySQL Bulk Operations**

```sql
-- Disable indexes before bulk insert for performance
ALTER TABLE orders DISABLE KEYS;

-- Bulk insert with multiple rows
INSERT INTO orders (customer_id, total_amount, status, created_at) VALUES
(UUID(), 100.00, 'pending', NOW()),
(UUID(), 250.50, 'completed', NOW()),
(UUID(), 75.25, 'pending', NOW()),
-- ... many more rows
(UUID(), 150.00, 'completed', NOW());

-- Re-enable indexes
ALTER TABLE orders ENABLE KEYS;

-- LOAD DATA INFILE for CSV import (fastest method)
LOAD DATA INFILE '/path/to/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(customer_id, total_amount, status, created_at);
```

---

## Transaction Management

### 1. ACID Transactions for Data Integrity

#### **Pattern 1A: PostgreSQL Transaction with Savepoints**

```sql
CREATE OR REPLACE FUNCTION transfer_order_to_warehouse()
RETURNS TABLE(
    success BOOLEAN,
    message VARCHAR,
    order_id UUID
) AS $$
DECLARE
    v_order_id UUID;
    v_warehouse_id UUID;
BEGIN
    -- Begin transaction (implicit in function)
    
    FOR v_order_id IN
        SELECT id FROM orders
        WHERE status = 'ready_to_ship'
        LIMIT 100
    LOOP
        BEGIN
            -- Create a savepoint for each order
            SAVEPOINT process_order;

            -- Start processing order
            UPDATE orders
            SET status = 'transferring'
            WHERE id = v_order_id;

            -- Find available warehouse
            SELECT warehouse_id INTO v_warehouse_id
            FROM warehouses
            WHERE available_slots > 0
            LIMIT 1
            FOR UPDATE; -- Lock for update

            IF v_warehouse_id IS NULL THEN
                RAISE EXCEPTION 'No available warehouses';
            END IF;

            -- Update warehouse
            UPDATE warehouses
            SET available_slots = available_slots - 1
            WHERE id = v_warehouse_id;

            -- Create warehouse transfer record
            INSERT INTO warehouse_transfers (order_id, warehouse_id, transferred_at)
            VALUES (v_order_id, v_warehouse_id, CURRENT_TIMESTAMP);

            -- Update order status
            UPDATE orders
            SET status = 'in_warehouse'
            WHERE id = v_order_id;

            RETURN QUERY SELECT TRUE, 'Order transferred successfully'::VARCHAR, v_order_id;

        EXCEPTION WHEN OTHERS THEN
            -- Rollback to savepoint
            ROLLBACK TO SAVEPOINT process_order;
            RETURN QUERY SELECT FALSE, SQLERRM::VARCHAR, v_order_id;
            CONTINUE;
        END;
    END LOOP;

END;
$$ LANGUAGE plpgsql;
```

#### **Pattern 1B: MySQL Multi-Statement Transactions**

```sql
DELIMITER $$

CREATE PROCEDURE transfer_funds(
    IN p_from_account INT,
    IN p_to_account INT,
    IN p_amount DECIMAL(10,2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction failed and rolled back';
    END;

    START TRANSACTION;

    -- Debit from account
    UPDATE accounts
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = p_from_account
    AND balance >= p_amount;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient funds';
    END IF;

    -- Credit to account
    UPDATE accounts
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_to_account;

    -- Record transaction
    INSERT INTO transactions (from_account, to_account, amount, transaction_type, status)
    VALUES (p_from_account, p_to_account, p_amount, 'transfer', 'completed');

    COMMIT;
    SELECT 'Transfer successful' AS message;
END$$

DELIMITER ;
```

---

## Database-to-Webhook Patterns

### 1. Real-Time Event Notification System

#### **Pattern 1A: PostgreSQL NOTIFY/LISTEN**

```sql
-- Create notification function
CREATE OR REPLACE FUNCTION notify_order_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_payload JSONB;
BEGIN
    v_payload := jsonb_build_object(
        'event', TG_OP,
        'order_id', COALESCE(NEW.id, OLD.id),
        'status', COALESCE(NEW.status, OLD.status),
        'customer_id', COALESCE(NEW.customer_id, OLD.customer_id),
        'timestamp', CURRENT_TIMESTAMP
    );

    -- Send notification to webhook_events channel
    PERFORM pg_notify(
        'webhook_events',
        v_payload::TEXT
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER orders_notify
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_changes();
```

#### **Pattern 1B: Node.js Webhook Dispatcher**

```javascript
// Listen for PostgreSQL notifications and dispatch webhooks
const { Client } = require('pg');
const axios = require('axios');

class WebhookDispatcher {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.webhookRegistry = new Map();
    }

    async connect() {
        this.client = new Client(this.dbConfig);
        await this.client.connect();
        
        // Listen for all notifications
        this.client.on('notification', (msg) => {
            this.handleNotification(msg);
        });

        await this.client.query('LISTEN webhook_events');
        console.log('Listening for webhook events...');
    }

    async handleNotification(msg) {
        try {
            const event = JSON.parse(msg.payload);
            console.log('Received event:', event);

            // Get registered webhooks for this event type
            const webhooks = await this.getWebhooksForEvent(event.event);

            // Dispatch to all registered webhooks
            for (const webhook of webhooks) {
                await this.dispatchWebhook(webhook, event);
            }
        } catch (error) {
            console.error('Error processing notification:', error);
        }
    }

    async getWebhooksForEvent(eventType) {
        const result = await this.client.query(
            `SELECT id, url, secret, retry_count, retry_delay
             FROM webhooks
             WHERE event_type = $1
             AND enabled = TRUE`,
            [eventType]
        );
        return result.rows;
    }

    async dispatchWebhook(webhook, event) {
        const maxRetries = webhook.retry_count || 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const response = await axios.post(webhook.url, event, {
                    headers: {
                        'X-Webhook-Signature': this.generateSignature(event, webhook.secret),
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                console.log(`Webhook ${webhook.id} delivered successfully`);

                // Record successful delivery
                await this.client.query(
                    `INSERT INTO webhook_logs (webhook_id, event, status, response)
                     VALUES ($1, $2, $3, $4)`,
                    [webhook.id, JSON.stringify(event), 'success', JSON.stringify(response.data)]
                );

                return; // Success, exit retry loop
            } catch (error) {
                retries++;
                console.error(`Webhook dispatch failed (attempt ${retries}/${maxRetries}):`, error.message);

                if (retries < maxRetries) {
                    // Wait before retry with exponential backoff
                    const delay = (webhook.retry_delay || 1000) * Math.pow(2, retries - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Record failed delivery
        await this.client.query(
            `INSERT INTO webhook_logs (webhook_id, event, status, error)
             VALUES ($1, $2, $3, $4)`,
            [webhook.id, JSON.stringify(event), 'failed', 'Max retries exceeded']
        );
    }

    generateSignature(payload, secret) {
        const crypto = require('crypto');
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    async close() {
        await this.client.end();
    }
}

// Usage
const dispatcher = new WebhookDispatcher({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

dispatcher.connect().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await dispatcher.close();
    process.exit(0);
});
```

---

## Schema Migration Automation

### 1. Versioned Schema Management

#### **Pattern 1A: Migration Tracking in PostgreSQL**

```sql
-- Create migration tracking table
CREATE TABLE schema_migrations (
    version BIGINT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    up_sql TEXT,
    down_sql TEXT,
    checksum VARCHAR(64),
    execution_time_ms INT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_by VARCHAR(255),
    success BOOLEAN
);

-- Migration function
CREATE OR REPLACE FUNCTION execute_migration(
    p_version BIGINT,
    p_name VARCHAR,
    p_up_sql TEXT,
    p_down_sql TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message VARCHAR,
    execution_time INT
) AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_checksum VARCHAR;
BEGIN
    v_start_time := CLOCK_TIMESTAMP();

    -- Generate checksum
    v_checksum := encode(digest(p_up_sql, 'sha256'), 'hex');

    -- Check if migration already executed
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = p_version AND success = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'Migration already executed'::VARCHAR, 0;
        RETURN;
    END IF;

    BEGIN
        -- Execute migration
        EXECUTE p_up_sql;

        v_end_time := CLOCK_TIMESTAMP();

        -- Record successful migration
        INSERT INTO schema_migrations (version, name, checksum, up_sql, down_sql, execution_time_ms, executed_by, success)
        VALUES (
            p_version,
            p_name,
            v_checksum,
            p_up_sql,
            p_down_sql,
            EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT,
            current_user,
            TRUE
        );

        RETURN QUERY SELECT TRUE, 'Migration executed successfully'::VARCHAR, 
            EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT;

    EXCEPTION WHEN OTHERS THEN
        v_end_time := CLOCK_TIMESTAMP();
        
        -- Record failed migration
        INSERT INTO schema_migrations (version, name, checksum, up_sql, down_sql, execution_time_ms, executed_by, success)
        VALUES (
            p_version,
            p_name,
            v_checksum,
            p_up_sql,
            p_down_sql,
            EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT,
            current_user,
            FALSE
        );

        RETURN QUERY SELECT FALSE, 'Migration failed: '::VARCHAR || SQLERRM, 0;
    END;
END;
$$ LANGUAGE plpgsql;

-- Example migration
SELECT execute_migration(
    1,
    'Create users table',
    'CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255), email VARCHAR(255) UNIQUE);',
    'DROP TABLE users;'
);

-- View migration history
SELECT * FROM schema_migrations ORDER BY version;
```

#### **Pattern 1B: Flyway-Style Migrations (Node.js)**

```javascript
// Migration runner for database versioning
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

class MigrationRunner {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.migrationsDir = path.join(__dirname, 'migrations');
    }

    async connect() {
        this.client = new Client(this.dbConfig);
        await this.client.connect();
        await this.ensureMigrationTable();
    }

    async ensureMigrationTable() {
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version BIGINT PRIMARY KEY,
                name VARCHAR(255),
                execution_time_ms INT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN
            )
        `);
    }

    async run() {
        const migrations = this.getMigrations();
        const executedMigrations = await this.getExecutedMigrations();

        for (const migration of migrations) {
            if (executedMigrations.includes(migration.version)) {
                console.log(`Skipping migration ${migration.version} (already executed)`);
                continue;
            }

            await this.executeMigration(migration);
        }
    }

    getMigrations() {
        const files = fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        return files.map(file => {
            const [version, ...nameParts] = file.replace('.sql', '').split('__');
            return {
                version: parseInt(version),
                name: nameParts.join('__'),
                file: path.join(this.migrationsDir, file)
            };
        });
    }

    async getExecutedMigrations() {
        const result = await this.client.query(
            'SELECT version FROM schema_migrations WHERE success = TRUE ORDER BY version'
        );
        return result.rows.map(row => row.version);
    }

    async executeMigration(migration) {
        const startTime = Date.now();
        try {
            const sql = fs.readFileSync(migration.file, 'utf8');
            
            // Start transaction
            await this.client.query('BEGIN');

            // Execute migration
            await this.client.query(sql);

            // Record migration
            await this.client.query(
                'INSERT INTO schema_migrations (version, name, success, execution_time_ms) VALUES ($1, $2, TRUE, $3)',
                [migration.version, migration.name, Date.now() - startTime]
            );

            // Commit
            await this.client.query('COMMIT');

            console.log(`✓ Migration ${migration.version} (${migration.name}) executed successfully`);
        } catch (error) {
            await this.client.query('ROLLBACK');
            console.error(`✗ Migration ${migration.version} failed:`, error.message);
            throw error;
        }
    }

    async close() {
        await this.client.end();
    }
}

// Usage
const runner = new MigrationRunner({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

runner.connect()
    .then(() => runner.run())
    .then(() => runner.close())
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
```

---

## Backup & Recovery Automation

### 1. Automated Backup Procedures

#### **Pattern 1A: PostgreSQL Automated Backups with Point-in-Time Recovery**

```bash
#!/bin/bash
# PostgreSQL automated backup script

BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=30
PGHOST="${DB_HOST}"
PGUSER="${DB_USER}"
PGPASSWORD="${DB_PASSWORD}"
PGDATABASE="${DB_NAME}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Full backup
echo "Starting full backup at $(date)..."
pg_dump -h "${PGHOST}" -U "${PGUSER}" -Fc "${PGDATABASE}" > "${BACKUP_DIR}/backup_full_${BACKUP_DATE}.dump"

if [ $? -eq 0 ]; then
    echo "Full backup completed successfully"
    
    # Archive WAL files for point-in-time recovery
    pg_basebackup -h "${PGHOST}" -U "${PGUSER}" -D "${BACKUP_DIR}/base_${BACKUP_DATE}" -Ft -z -P
    
    # Upload to S3
    aws s3 cp "${BACKUP_DIR}/backup_full_${BACKUP_DATE}.dump" "s3://your-bucket/backups/postgresql/"
    
    # Clean old backups
    find "${BACKUP_DIR}" -name "backup_full_*.dump" -mtime +${RETENTION_DAYS} -delete
    
    echo "Backup and upload completed"
else
    echo "Backup failed!"
    exit 1
fi
```

#### **Pattern 1B: PostgreSQL Backup Verification Function**

```sql
-- Function to verify backup integrity
CREATE OR REPLACE FUNCTION verify_backup(p_backup_file TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    backup_size BIGINT,
    table_count INT,
    index_count INT,
    last_verified TIMESTAMP
) AS $$
DECLARE
    v_is_valid BOOLEAN := TRUE;
    v_file_exists BOOLEAN := FALSE;
    v_table_count INT := 0;
    v_index_count INT := 0;
BEGIN
    -- Check if backup file exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'pg_backup_manifest'
    ) INTO v_file_exists;

    IF v_file_exists THEN
        SELECT COUNT(*) INTO v_table_count
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema');

        SELECT COUNT(*) INTO v_index_count
        FROM information_schema.tables t
        JOIN information_schema.constraint_column_usage c ON t.table_name = c.table_name
        WHERE c.constraint_name LIKE '%idx%';
    ELSE
        v_is_valid := FALSE;
    END IF;

    RETURN QUERY SELECT v_is_valid, 0::BIGINT, v_table_count, v_index_count, CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
```

#### **Pattern 1C: MySQL Automated Backups**

```bash
#!/bin/bash
# MySQL automated backup script with encryption

BACKUP_DIR="/backups/mysql"
RETENTION_DAYS=30
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"
DB_HOST="${DB_HOST}"

mkdir -p "${BACKUP_DIR}"

# Create backup
echo "Starting MySQL backup at $(date)..."
mysqldump -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" \
    --all-databases \
    --single-transaction \
    --quick \
    --lock-tables=false \
    --verbose \
    | gzip > "${BACKUP_DIR}/backup_${BACKUP_DATE}.sql.gz"

if [ $? -eq 0 ]; then
    # Encrypt backup
    openssl enc -aes-256-cbc -salt -in "${BACKUP_DIR}/backup_${BACKUP_DATE}.sql.gz" \
        -out "${BACKUP_DIR}/backup_${BACKUP_DATE}.sql.gz.enc" \
        -k "${BACKUP_ENCRYPTION_KEY}"
    
    # Remove unencrypted backup
    rm "${BACKUP_DIR}/backup_${BACKUP_DATE}.sql.gz"
    
    # Upload to S3
    aws s3 cp "${BACKUP_DIR}/backup_${BACKUP_DATE}.sql.gz.enc" "s3://your-bucket/backups/mysql/"
    
    # Clean old backups
    find "${BACKUP_DIR}" -name "backup_*.sql.gz.enc" -mtime +${RETENTION_DAYS} -delete
    
    echo "MySQL backup completed and encrypted"
else
    echo "MySQL backup failed!"
    exit 1
fi
```

---

## Real-World Integration Examples

### 1. E-Commerce Order Processing Workflow

#### **Complete Example: Order → Invoice → Webhook**

```sql
-- PostgreSQL complete order processing workflow

-- 1. Create all necessary tables
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL,
    quantity INT,
    unit_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL,
    amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'draft',
    issued_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100),
    payload JSONB,
    webhook_url VARCHAR(500),
    status VARCHAR(50),
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);

CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES webhook_events(id),
    http_status INT,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Order creation trigger
CREATE OR REPLACE FUNCTION trigger_new_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Create initial webhook event
    INSERT INTO webhook_events (event_type, payload, webhook_url, status)
    VALUES (
        'order.created',
        jsonb_build_object(
            'order_id', NEW.id,
            'customer_id', NEW.customer_id,
            'amount', NEW.total_amount,
            'timestamp', CURRENT_TIMESTAMP
        ),
        NULL,
        'pending'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_new_order
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_new_order();

-- 3. Order status change trigger
CREATE OR REPLACE FUNCTION trigger_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
        
        -- Create webhook event for status change
        INSERT INTO webhook_events (event_type, payload, status)
        VALUES (
            'order.status_changed',
            jsonb_build_object(
                'order_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'timestamp', CURRENT_TIMESTAMP
            ),
            'pending'
        );
        
        -- Auto-generate invoice when order is completed
        IF NEW.status = 'completed' THEN
            INSERT INTO invoices (order_id, customer_id, amount, status)
            VALUES (NEW.id, NEW.customer_id, NEW.total_amount, 'generated');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_status_change
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_order_status_change();

-- 4. Invoice creation trigger
CREATE OR REPLACE FUNCTION trigger_invoice_created()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = CURRENT_TIMESTAMP;
    
    -- Create webhook event
    INSERT INTO webhook_events (event_type, payload, status)
    VALUES (
        'invoice.created',
        jsonb_build_object(
            'invoice_id', NEW.id,
            'order_id', NEW.order_id,
            'customer_id', NEW.customer_id,
            'amount', NEW.amount,
            'timestamp', CURRENT_TIMESTAMP
        ),
        'pending'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_created
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_invoice_created();

-- 5. Webhook dispatcher function
CREATE OR REPLACE FUNCTION dispatch_webhooks()
RETURNS TABLE(
    event_id UUID,
    event_type VARCHAR,
    status VARCHAR,
    message TEXT
) AS $$
DECLARE
    v_event RECORD;
    v_webhook_url VARCHAR;
    v_retry_count INT;
BEGIN
    -- Get pending webhook events
    FOR v_event IN
        SELECT id, event_type, payload, webhook_url, retry_count
        FROM webhook_events
        WHERE status = 'pending'
        AND retry_count < 3
        ORDER BY created_at ASC
        LIMIT 100
    LOOP
        -- Get webhook URL from configuration
        SELECT url, retry_attempts INTO v_webhook_url, v_retry_count
        FROM webhook_config
        WHERE event_pattern = v_event.event_type
        LIMIT 1;

        IF v_webhook_url IS NOT NULL THEN
            -- Update status to sending
            UPDATE webhook_events
            SET status = 'sending', retry_count = retry_count + 1
            WHERE id = v_event.id;

            RETURN QUERY SELECT
                v_event.id,
                v_event.event_type,
                'sending'::VARCHAR,
                'Webhook dispatch initiated'::TEXT;
        ELSE
            -- No webhook configured
            UPDATE webhook_events
            SET status = 'skipped'
            WHERE id = v_event.id;

            RETURN QUERY SELECT
                v_event.id,
                v_event.event_type,
                'skipped'::VARCHAR,
                'No webhook configured'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Create and execute an order
INSERT INTO orders (customer_id, total_amount, status)
VALUES ('550e8400-e29b-41d4-a716-446655440000'::UUID, 199.99, 'pending')
RETURNING *;

-- 7. Check webhook events created
SELECT * FROM webhook_events ORDER BY created_at DESC;

-- 8. Update order status
UPDATE orders
SET status = 'completed'
WHERE id = 'YOUR_ORDER_ID'::UUID;

-- 9. Dispatch webhooks
SELECT * FROM dispatch_webhooks();
```

---

### 2. Customer Data Synchronization Workflow

```javascript
// Node.js implementation of database-to-webhook sync

const { Client } = require('pg');
const axios = require('axios');

class CustomerSyncEngine {
    constructor(config) {
        this.dbConfig = config.database;
        this.webhookConfig = config.webhooks;
        this.batchSize = 1000;
    }

    async initialize() {
        this.db = new Client(this.dbConfig);
        await this.db.connect();
        
        // Listen for changes
        await this.setupListeners();
    }

    async setupListeners() {
        // PostgreSQL LISTEN for customer changes
        this.db.on('notification', (msg) => {
            if (msg.channel === 'customer_changes') {
                this.handleCustomerChange(JSON.parse(msg.payload));
            }
        });

        await this.db.query('LISTEN customer_changes');
    }

    async handleCustomerChange(change) {
        console.log('Customer change detected:', change);

        // Prepare webhook payload
        const payload = {
            event: 'customer.' + change.operation.toLowerCase(),
            customer_id: change.customer_id,
            data: change.data,
            timestamp: new Date().toISOString()
        };

        // Dispatch to all registered webhooks
        for (const [eventType, webhooks] of Object.entries(this.webhookConfig)) {
            if (eventType.includes(change.operation)) {
                for (const webhook of webhooks) {
                    await this.sendWebhook(webhook, payload);
                }
            }
        }

        // Mark as synced in database
        await this.db.query(
            'UPDATE webhook_events SET status = $1, sent_at = NOW() WHERE id = $2',
            ['delivered', change.event_id]
        );
    }

    async sendWebhook(webhook, payload) {
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const response = await axios.post(webhook.url, payload, {
                    headers: {
                        'X-Webhook-Signature': this.generateSignature(payload, webhook.secret),
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                console.log(`Webhook sent successfully to ${webhook.url}`);
                return;
            } catch (error) {
                attempt++;
                console.error(`Webhook attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        console.error(`Webhook delivery failed after ${maxRetries} attempts`);
    }

    generateSignature(payload, secret) {
        const crypto = require('crypto');
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    async shutdown() {
        await this.db.end();
    }
}

// Usage
const syncEngine = new CustomerSyncEngine({
    database: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
    },
    webhooks: {
        'customer.created': [
            { url: 'https://your-crm.com/webhook/customer-created', secret: process.env.CRM_SECRET }
        ],
        'customer.updated': [
            { url: 'https://your-analytics.com/webhook/customer-updated', secret: process.env.ANALYTICS_SECRET }
        ]
    }
});

syncEngine.initialize().catch(console.error);

process.on('SIGINT', async () => {
    console.log('Shutting down sync engine...');
    await syncEngine.shutdown();
    process.exit(0);
});
```

---

## Best Practices Summary

### Performance
- Use indexes strategically (composite, partial, expression)
- Batch operations for better throughput
- Monitor query execution plans with EXPLAIN
- Archive old data to maintain performance
- Use connection pooling in applications

### Reliability
- Implement retry logic with exponential backoff
- Use transactions for data consistency
- Maintain detailed audit logs
- Schedule regular backups with verification
- Test recovery procedures

### Maintainability
- Version all schema changes with migrations
- Document all triggers and procedures
- Use consistent naming conventions
- Implement comprehensive logging
- Create dashboards for monitoring

### Security
- Never hardcode credentials
- Use parameterized queries
- Encrypt sensitive data at rest and in transit
- Implement row-level security policies
- Regular security audits

---

## Conclusion

Database automation is essential for modern applications. These patterns provide production-ready implementations for:

- Automatic data processing and transformations
- Real-time event notifications via webhooks
- ETL workflows with error handling
- Data integrity through triggers and transactions
- Reliable backup and recovery
- Schema version control

Choose patterns based on your specific use case, database technology, and scalability requirements.

---

**Created:** November 8, 2025
**Version:** 1.0.0
**Status:** Production-Ready
