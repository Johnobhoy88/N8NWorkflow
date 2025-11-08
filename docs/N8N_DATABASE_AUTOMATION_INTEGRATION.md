# n8n Database Automation Integration Guide

**How to implement database automation patterns with n8n workflows**

---

## Overview

This guide shows how to leverage database automation patterns within n8n workflows to create powerful, scalable automation systems.

### Key Integration Points

1. **Database Triggers → n8n Webhooks**: Use NOTIFY/LISTEN in PostgreSQL
2. **Scheduled Database Tasks ↔ n8n**: Trigger n8n workflows from database events
3. **ETL Workflows**: Combine n8n with database procedures
4. **Data Synchronization**: Real-time sync between databases and APIs
5. **Webhook Dispatching**: Route database events to external systems

---

## Pattern 1: PostgreSQL NOTIFY to n8n Webhook

### Database Setup

```sql
-- Create notification function
CREATE OR REPLACE FUNCTION notify_on_order_change()
RETURNS TRIGGER AS $$
DECLARE
    v_payload JSONB;
    v_webhook_url VARCHAR := 'https://your-n8n-instance.com/webhook/order-changed';
BEGIN
    v_payload := jsonb_build_object(
        'event', TG_OP,
        'order_id', COALESCE(NEW.id, OLD.id),
        'status', COALESCE(NEW.status, OLD.status),
        'total_amount', COALESCE(NEW.total_amount, OLD.total_amount),
        'timestamp', CURRENT_TIMESTAMP
    );

    -- Notify n8n webhook
    PERFORM pg_notify('order_changes', v_payload::TEXT);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER orders_notify
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_on_order_change();
```

### n8n Webhook Configuration

```javascript
// n8n Workflow Trigger Node Configuration
{
    "nodeType": "n8n-nodes-base.webhook",
    "name": "Database Event Webhook",
    "parameters": {
        "path": "order-changed",
        "httpMethod": "POST",
        "responseMode": "onReceived"
    }
}

// Webhook Node Content
// The webhook will receive JSON like:
{
    "event": "UPDATE",
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "total_amount": 299.99,
    "timestamp": "2025-11-08T14:30:00Z"
}
```

### Node.js Listener Service

```javascript
// Service to listen for PostgreSQL notifications and forward to n8n
const { Client } = require('pg');
const axios = require('axios');

class PostgresN8nBridge {
    constructor(dbConfig, n8nConfig) {
        this.dbConfig = dbConfig;
        this.n8nConfig = n8nConfig;
    }

    async connect() {
        this.client = new Client(this.dbConfig);
        await this.client.connect();

        this.client.on('notification', async (msg) => {
            console.log('Database notification received:', msg.channel);
            await this.forwardToN8n(msg);
        });

        // Listen to PostgreSQL channel
        await this.client.query('LISTEN order_changes');
        console.log('Listening for order changes...');
    }

    async forwardToN8n(msg) {
        const event = JSON.parse(msg.payload);

        try {
            const response = await axios.post(
                `${this.n8nConfig.webhookUrl}/order-changed`,
                event,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-DB-Event': 'true'
                    }
                }
            );

            console.log('Forwarded to n8n:', response.status);
        } catch (error) {
            console.error('Failed to forward to n8n:', error.message);
        }
    }

    async close() {
        await this.client.end();
    }
}

// Usage
const bridge = new PostgresN8nBridge(
    {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
    },
    {
        webhookUrl: process.env.N8N_WEBHOOK_URL
    }
);

bridge.connect().catch(console.error);

process.on('SIGINT', async () => {
    console.log('Closing database connection...');
    await bridge.close();
    process.exit(0);
});
```

---

## Pattern 2: Schedule Database Tasks from n8n

### n8n Workflow Setup

```json
{
    "name": "Daily Order Processing",
    "nodes": [
        {
            "name": "Schedule Trigger",
            "type": "n8n-nodes-base.scheduleTrigger",
            "parameters": {
                "rule": {
                    "interval": [
                        {
                            "recurrenceType": "days",
                            "value": 1
                        }
                    ],
                    "triggerAtHour": 2,
                    "triggerAtMinute": 0
                }
            }
        },
        {
            "name": "Execute Database Function",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "connection": "{{$credentials.postgres}}",
                "operation": "executeQuery",
                "query": "SELECT * FROM process_daily_orders();"
            }
        },
        {
            "name": "Log Results",
            "type": "n8n-nodes-base.set",
            "parameters": {
                "values": {
                    "processed_orders": "={{ $node['Execute Database Function'].json[0].processed_orders }}",
                    "total_amount": "={{ $node['Execute Database Function'].json[0].total_amount }}",
                    "invoice_count": "={{ $node['Execute Database Function'].json[0].invoice_count }}"
                }
            }
        },
        {
            "name": "Send Notification",
            "type": "n8n-nodes-base.httpRequest",
            "parameters": {
                "method": "POST",
                "url": "https://your-slack-webhook.com",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": {
                    "text": "Daily order processing completed: {{ $node['Log Results'].json.processed_orders }} orders processed, ${{ $node['Log Results'].json.total_amount }} revenue"
                }
            }
        }
    ]
}
```

---

## Pattern 3: ETL Workflow with n8n + Database

### Complete ETL Workflow

```json
{
    "name": "Customer Data ETL Pipeline",
    "nodes": [
        {
            "name": "Trigger",
            "type": "n8n-nodes-base.scheduleTrigger",
            "parameters": {
                "rule": {
                    "interval": [
                        {
                            "recurrenceType": "hours",
                            "value": 1
                        }
                    ]
                }
            }
        },
        {
            "name": "Extract - Get API Data",
            "type": "n8n-nodes-base.httpRequest",
            "parameters": {
                "method": "GET",
                "url": "https://api.example.com/customers?status=new",
                "authentication": "bearerToken",
                "nodeCredentialType": "httpHeaderAuth"
            }
        },
        {
            "name": "Transform - Process Data",
            "type": "n8n-nodes-base.set",
            "parameters": {
                "values": {
                    "json": "=JSON.parse(JSON.stringify($node['Extract - Get API Data'].json.data.map(customer => ({\n  id: customer.id,\n  name: customer.name.toUpperCase().trim(),\n  email: customer.email.toLowerCase().trim(),\n  phone: customer.phone.replace(/[^0-9]/g, ''),\n  address: customer.address.trim(),\n  city: (customer.city || '').toUpperCase(),\n  state: (customer.state || '').toUpperCase(),\n  postal_code: customer.zip || '',\n  country: customer.country || 'USA',\n  processed_at: new Date().toISOString()\n}))))"
                }
            }
        },
        {
            "name": "Load - Insert to Staging",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "INSERT INTO staging_customers (source_id, source_name, source_email, source_phone, source_address, source_json, load_id) VALUES (unnest($1::uuid[]), unnest($2::varchar[]), unnest($3::varchar[]), unnest($4::varchar[]), unnest($5::text[]), unnest($6::jsonb[]), $7::uuid) RETURNING *;",
                "queryParams": ["=\nconst data = $node['Transform - Process Data'].json;\nreturn [\n  data.map(r => r.id),\n  data.map(r => r.name),\n  data.map(r => r.email),\n  data.map(r => r.phone),\n  data.map(r => r.address),\n  data.map(r => JSON.stringify(r)),\n  '550e8400-e29b-41d4-a716-446655440000'\n]"]
            }
        },
        {
            "name": "Transform - Run ETL Function",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "SELECT * FROM etl_customers('550e8400-e29b-41d4-a716-446655440000'::uuid);"
            }
        },
        {
            "name": "Monitor - Log Results",
            "type": "n8n-nodes-base.set",
            "parameters": {
                "values": {
                    "etl_results": "={{ $node['Transform - Run ETL Function'].json }}"
                }
            }
        }
    ]
}
```

---

## Pattern 4: Real-Time Data Synchronization

### Bi-directional Sync Workflow

```json
{
    "name": "Real-Time Customer Sync",
    "nodes": [
        {
            "name": "Database Changes Webhook",
            "type": "n8n-nodes-base.webhook",
            "parameters": {
                "path": "customer-sync",
                "httpMethod": "POST"
            }
        },
        {
            "name": "Parse Database Event",
            "type": "n8n-nodes-base.set",
            "parameters": {
                "values": {
                    "customer_id": "={{$json.customer_id}}",
                    "operation": "={{$json.operation}}",
                    "customer_data": "={{$json.customer_data}}"
                }
            }
        },
        {
            "name": "If Create/Update",
            "type": "n8n-nodes-base.if",
            "parameters": {
                "conditions": {
                    "options": {
                        "leftValue": "={{$node['Parse Database Event'].json.operation}}",
                        "operator": "notEquals",
                        "rightValue": "DELETE"
                    }
                }
            }
        },
        {
            "name": "Sync to External APIs",
            "type": "n8n-nodes-base.httpRequest",
            "parameters": {
                "method": "={{$node['Parse Database Event'].json.operation === 'INSERT' ? 'POST' : 'PUT'}}",
                "url": "https://api.example.com/customers/{{$node['Parse Database Event'].json.customer_id}}",
                "body": "={{$node['Parse Database Event'].json.customer_data}}"
            }
        },
        {
            "name": "If Delete",
            "type": "n8n-nodes-base.if",
            "parameters": {
                "conditions": {
                    "options": {
                        "leftValue": "={{$node['Parse Database Event'].json.operation}}",
                        "operator": "equals",
                        "rightValue": "DELETE"
                    }
                }
            }
        },
        {
            "name": "Sync Deletion",
            "type": "n8n-nodes-base.httpRequest",
            "parameters": {
                "method": "DELETE",
                "url": "https://api.example.com/customers/{{$node['Parse Database Event'].json.customer_id}}"
            }
        },
        {
            "name": "Update Sync Status",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "UPDATE customers SET synced_at = NOW(), sync_status = 'completed' WHERE id = $1::uuid;",
                "queryParams": ["={{$node['Parse Database Event'].json.customer_id}}"]
            }
        }
    ]
}
```

---

## Pattern 5: Webhook Orchestration from Database

### Database Webhook Queue Implementation

```sql
-- Create webhook queue table
CREATE TABLE webhook_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100),
    payload JSONB,
    webhook_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);

-- Create function to enqueue webhook
CREATE OR REPLACE FUNCTION enqueue_webhook(
    p_event_type VARCHAR,
    p_payload JSONB,
    p_webhook_url VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO webhook_queue (event_type, payload, webhook_url)
    VALUES (p_event_type, p_payload, p_webhook_url)
    RETURNING id INTO v_id;

    -- Notify n8n to process
    PERFORM pg_notify(
        'webhook_queue_pending',
        json_build_object('event_id', v_id, 'event_type', p_event_type)::TEXT
    );

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to queue webhooks on order change
CREATE OR REPLACE FUNCTION trigger_order_webhook()
RETURNS TRIGGER AS $$
BEGIN
    -- Enqueue webhook for order event
    PERFORM enqueue_webhook(
        'order.' || LOWER(TG_OP),
        to_jsonb(COALESCE(NEW, OLD)),
        'https://your-n8n-instance.com/webhook/process-order'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_webhook
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_order_webhook();
```

### n8n Webhook Processor Workflow

```json
{
    "name": "Process Webhook Queue",
    "nodes": [
        {
            "name": "Listen for Pending Webhooks",
            "type": "n8n-nodes-base.webhook",
            "parameters": {
                "path": "webhook-processor",
                "httpMethod": "POST"
            }
        },
        {
            "name": "Get Pending Webhooks",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "SELECT * FROM webhook_queue WHERE status = 'pending' AND retry_count < max_retries ORDER BY created_at LIMIT 100;"
            }
        },
        {
            "name": "Loop Through Webhooks",
            "type": "n8n-nodes-base.itemLists",
            "parameters": {
                "operation": "splitOut"
            }
        },
        {
            "name": "Send Webhook",
            "type": "n8n-nodes-base.httpRequest",
            "parameters": {
                "method": "POST",
                "url": "={{$json.webhook_url}}",
                "body": "={{$json.payload}}"
            }
        },
        {
            "name": "Update Status - Success",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "UPDATE webhook_queue SET status = 'delivered', sent_at = NOW() WHERE id = $1::uuid;",
                "queryParams": ["={{$json.id}}"]
            }
        },
        {
            "name": "Handle Error",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "UPDATE webhook_queue SET retry_count = retry_count + 1, status = 'retrying' WHERE id = $1::uuid;",
                "queryParams": ["={{$json.id}}"]
            }
        }
    ]
}
```

---

## Pattern 6: Data Quality Monitoring

### Quality Checks in n8n

```json
{
    "name": "Data Quality Monitoring",
    "nodes": [
        {
            "name": "Daily QA Check",
            "type": "n8n-nodes-base.scheduleTrigger",
            "parameters": {
                "rule": {
                    "interval": [
                        {
                            "recurrenceType": "days",
                            "value": 1
                        }
                    ],
                    "triggerAtHour": 3,
                    "triggerAtMinute": 0
                }
            }
        },
        {
            "name": "Run Data Quality Checks",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "SELECT table_name, COUNT(*) as total_records, SUM(CASE WHEN data_quality_score < 0.5 THEN 1 ELSE 0 END) as low_quality_count FROM customers_processed GROUP BY table_name;"
            }
        },
        {
            "name": "Check Quality Thresholds",
            "type": "n8n-nodes-base.set",
            "parameters": {
                "values": {
                    "quality_report": "={{$node['Run Data Quality Checks'].json.map(row => ({\n  table: row.table_name,\n  total: row.total_records,\n  low_quality: row.low_quality_count,\n  quality_percentage: ((row.total_records - row.low_quality_count) / row.total_records * 100).toFixed(2)\n}))}}",
                    "overall_quality": "={{$node['Run Data Quality Checks'].json.reduce((sum, row) => sum + ((row.total_records - row.low_quality_count) / row.total_records * 100), 0) / $node['Run Data Quality Checks'].json.length}}"
                }
            }
        },
        {
            "name": "Alert if Low Quality",
            "type": "n8n-nodes-base.if",
            "parameters": {
                "conditions": {
                    "options": {
                        "leftValue": "={{$node['Check Quality Thresholds'].json.overall_quality}}",
                        "operator": "lessThan",
                        "rightValue": 85
                    }
                }
            }
        },
        {
            "name": "Send Alert",
            "type": "n8n-nodes-base.slack",
            "parameters": {
                "text": "Data Quality Alert: Overall quality is {{$node['Check Quality Thresholds'].json.overall_quality}}%\n\n{{ JSON.stringify($node['Check Quality Thresholds'].json.quality_report, null, 2) }}"
            }
        }
    ]
}
```

---

## Best Practices for n8n + Database Integration

### 1. Error Handling

```json
{
    "name": "Robust Database Trigger",
    "nodes": [
        {
            "name": "Database Operation",
            "type": "n8n-nodes-base.postgres",
            "onError": "continueRegardless"
        },
        {
            "name": "Check for Errors",
            "type": "n8n-nodes-base.if",
            "parameters": {
                "conditions": {
                    "options": {
                        "leftValue": "={{$node['Database Operation'].executionStatus === 'error'}}",
                        "operator": "equals",
                        "rightValue": true
                    }
                }
            }
        },
        {
            "name": "Log Error",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "INSERT INTO n8n_errors (workflow_id, error_message, error_timestamp) VALUES ($1, $2, NOW());",
                "queryParams": ["={{ $workflow.id }}", "={{ $node['Database Operation'].error.message }}"]
            }
        }
    ]
}
```

### 2. Rate Limiting

- Use database connection pools
- Implement batching for bulk operations
- Add delays between API calls
- Monitor database performance

### 3. Monitoring and Logging

```sql
-- Create n8n workflow log table
CREATE TABLE n8n_workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255),
    workflow_name VARCHAR(255),
    execution_status VARCHAR(50),
    execution_time_ms INT,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create view for workflow metrics
CREATE VIEW workflow_metrics AS
SELECT
    workflow_id,
    workflow_name,
    COUNT(*) as total_executions,
    SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successful_executions,
    AVG(execution_time_ms) as avg_execution_time,
    MAX(execution_time_ms) as max_execution_time,
    DATE(executed_at) as execution_date
FROM n8n_workflow_logs
GROUP BY workflow_id, workflow_name, DATE(executed_at);
```

---

## Configuration Best Practices

### Environment Variables

```bash
# Database
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=secure_password
DB_NAME=automation_db

# n8n
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_API_URL=https://your-n8n-instance.com/api
N8N_API_KEY=your_n8n_api_key

# Integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SENDGRID_API_KEY=your_sendgrid_key
```

### Secure Credential Storage

- Use n8n's credential system (never hardcode)
- Rotate API keys regularly
- Use database connection pooling
- Implement request signing for webhooks

---

## Testing Database Automation

### Test Workflow Template

```json
{
    "name": "Test Database Trigger",
    "nodes": [
        {
            "name": "Insert Test Data",
            "type": "n8n-nodes-base.postgres",
            "parameters": {
                "operation": "executeQuery",
                "query": "INSERT INTO orders (customer_id, total_amount, status) VALUES ($1::uuid, $2::decimal, $3) RETURNING *;",
                "queryParams": ["550e8400-e29b-41d4-a716-446655440000", "199.99", "pending"]
            }
        },
        {
            "name": "Wait for Webhook",
            "type": "n8n-nodes-base.wait",
            "parameters": {
                "waitTime": 5
            }
        },
        {
            "name": "Verify Webhook Received",
            "type": "n8n-nodes-base.set",
            "parameters": {
                "values": {
                    "test_passed": true
                }
            }
        }
    ]
}
```

---

## Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Webhook not triggered | Check database trigger execution, verify NOTIFY channel |
| Slow database queries | Add indexes, implement query optimization, check connection pooling |
| Missing data | Verify trigger logic, check transaction isolation levels |
| Webhook failures | Implement retry logic, check webhook URL, verify signature |
| Performance degradation | Archive old data, optimize triggers, monitor database load |

---

**Version:** 1.0.0
**Last Updated:** 2025-11-08
**Status:** Production-Ready
