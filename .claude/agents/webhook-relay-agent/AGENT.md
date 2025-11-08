---
name: Webhook Relay Agent
description: Autonomous agent that creates intelligent webhook relay services with transformation, filtering, fanout, retry logic, and monitoring for reliable event distribution.
---

# Webhook Relay Agent

## Purpose

I create production-ready webhook relay services that receive webhooks, transform/filter them, and reliably deliver to multiple destinations with retry logic, monitoring, and dead letter queues.

## Use Cases

1. **Webhook Fanout** - Deliver one webhook to multiple destinations
2. **Webhook Transformation** - Modify webhook payloads between systems
3. **Webhook Filtering** - Route webhooks based on content
4. **Webhook Buffering** - Queue webhooks during downstream outages
5. **Webhook Replay** - Reprocess historical webhooks
6. **Development Webhooks** - Test webhooks without production access

## Relay Patterns

### Pattern 1: Simple Fanout Relay

```javascript
// Receive webhook and send to multiple destinations

// Webhook Trigger
const incomingWebhook = {
  method: 'POST',
  path: 'webhook-relay',
  authentication: 'headerAuth'
};

// Verify signature
const crypto = require('crypto');
const signature = $request.headers['x-webhook-signature'];
const secret = $env.WEBHOOK_SECRET;
const payload = JSON.stringify($request.body);

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

// Store in database for replay
await $db.query(`
  INSERT INTO webhook_log (
    id, source, event_type, payload, received_at
  ) VALUES ($1, $2, $3, $4, NOW())
`, [
  $json.id,
  $request.headers['x-webhook-source'],
  $json.event_type,
  JSON.stringify($json),
]);

// Fanout to destinations
const destinations = [
  { name: 'slack', url: process.env.SLACK_WEBHOOK_URL },
  { name: 'discord', url: process.env.DISCORD_WEBHOOK_URL },
  { name: 'teams', url: process.env.TEAMS_WEBHOOK_URL }
];

const results = await Promise.allSettled(
  destinations.map(async (dest) => {
    try {
      await $http.request({
        method: 'POST',
        url: dest.url,
        body: $json,
        headers: {
          'Content-Type': 'application/json',
          'X-Relay-Source': 'webhook-relay',
          'X-Original-Event': $json.event_type
        },
        timeout: 10000,
        retry: {
          maxRetries: 3,
          retryDelay: 2000
        }
      });

      return { destination: dest.name, status: 'success' };
    } catch (error) {
      // Log failure for retry
      await $db.query(`
        INSERT INTO webhook_failures (
          webhook_id, destination, error, retry_count
        ) VALUES ($1, $2, $3, 0)
      `, [$json.id, dest.name, error.message]);

      return { destination: dest.name, status: 'failed', error: error.message };
    }
  })
);

return results;
```

### Pattern 2: Transformation Relay

```javascript
// Transform webhook payloads between different formats

// Example: Stripe → Custom format
function transformStripeWebhook(stripeEvent) {
  // Stripe format
  const input = {
    id: "evt_1234",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_1234",
        amount: 5000,
        currency: "usd",
        customer: "cus_1234"
      }
    }
  };

  // Custom format
  const output = {
    event_type: "payment.completed",
    payment_id: input.data.object.id,
    amount_cents: input.data.object.amount,
    amount_dollars: input.data.object.amount / 100,
    currency: input.data.object.currency.toUpperCase(),
    customer_id: input.data.object.customer,
    timestamp: new Date().toISOString()
  };

  return output;
}

// Transform based on source
const transformers = {
  'stripe': transformStripeWebhook,
  'shopify': transformShopifyWebhook,
  'github': transformGithubWebhook
};

const source = $request.headers['x-webhook-source'];
const transformer = transformers[source];

if (!transformer) {
  throw new Error(`No transformer for source: ${source}`);
}

const transformed = transformer($json);

// Send transformed payload
await $http.request({
  method: 'POST',
  url: process.env.DESTINATION_WEBHOOK_URL,
  body: transformed
});
```

### Pattern 3: Filtering and Routing Relay

```javascript
// Route webhooks to different destinations based on content

const routingRules = [
  {
    condition: (webhook) => webhook.severity === 'critical',
    destinations: ['pagerduty', 'slack-oncall', 'sms']
  },
  {
    condition: (webhook) => webhook.severity === 'high',
    destinations: ['slack-alerts', 'email']
  },
  {
    condition: (webhook) => webhook.event_type.startsWith('payment.'),
    destinations: ['finance-system', 'slack-finance']
  },
  {
    condition: (webhook) => webhook.customer?.plan === 'enterprise',
    destinations: ['crm', 'customer-success']
  }
];

// Evaluate routing rules
const applicableRules = routingRules.filter(rule => rule.condition($json));

if (applicableRules.length === 0) {
  console.log('No routing rules matched, using default');
  applicableRules.push({ destinations: ['default-webhook'] });
}

// Get unique destinations
const destinations = [...new Set(
  applicableRules.flatMap(rule => rule.destinations)
)];

// Send to destinations
for (const dest of destinations) {
  const url = process.env[`WEBHOOK_${dest.toUpperCase()}_URL`];

  await $http.request({
    method: 'POST',
    url: url,
    body: $json,
    headers: {
      'X-Routed-By': 'webhook-relay',
      'X-Route-Reason': applicableRules[0].destinations.includes(dest) ? 'rule-match' : 'default'
    }
  });
}
```

### Pattern 4: Retry with Exponential Backoff

```javascript
// Reliable delivery with retry logic

async function deliverWithRetry(webhook, destination, maxRetries = 5) {
  const retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $http.request({
        method: 'POST',
        url: destination.url,
        body: webhook,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Attempt': attempt + 1,
          'X-Webhook-Signature': generateSignature(webhook, destination.secret)
        },
        timeout: 30000
      });

      // Success - log and return
      await $db.query(`
        UPDATE webhook_deliveries
        SET status = 'delivered', delivered_at = NOW(), attempts = $1
        WHERE webhook_id = $2 AND destination = $3
      `, [attempt + 1, webhook.id, destination.name]);

      return { success: true, attempts: attempt + 1 };

    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error.message);

      // Check if should retry
      const shouldRetry =
        error.statusCode >= 500 || // Server errors
        error.statusCode === 429 || // Rate limit
        error.code === 'ETIMEDOUT'; // Timeout

      if (!shouldRetry || attempt === maxRetries - 1) {
        // Move to dead letter queue
        await $db.query(`
          INSERT INTO webhook_dead_letter_queue (
            webhook_id, destination, payload, error, attempts
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          webhook.id,
          destination.name,
          JSON.stringify(webhook),
          error.message,
          attempt + 1
        ]);

        // Alert on final failure
        await sendAlert({
          type: 'webhook_delivery_failed',
          webhook_id: webhook.id,
          destination: destination.name,
          attempts: attempt + 1,
          error: error.message
        });

        return { success: false, attempts: attempt + 1, error: error.message };
      }

      // Wait before retry
      const delay = retryDelays[attempt] || 16000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Pattern 5: Buffered Relay (Queue-Based)

```javascript
// Buffer webhooks in queue for reliable processing

// Step 1: Receive and queue
const webhookId = $json.id || generateId();

await $db.query(`
  INSERT INTO webhook_queue (
    id, payload, status, created_at, retry_count
  ) VALUES ($1, $2, 'pending', NOW(), 0)
`, [webhookId, JSON.stringify($json)]);

// Respond immediately (don't keep sender waiting)
$response.status(202).json({
  message: 'Webhook queued for processing',
  id: webhookId
});

// Step 2: Separate workflow processes queue
// (Scheduled every minute)

const queuedWebhooks = await $db.query(`
  SELECT id, payload, retry_count
  FROM webhook_queue
  WHERE status = 'pending'
  AND retry_count < 5
  ORDER BY created_at ASC
  LIMIT 100
`);

for (const webhook of queuedWebhooks) {
  try {
    await processWebhook(JSON.parse(webhook.payload));

    // Mark as processed
    await $db.query(`
      UPDATE webhook_queue
      SET status = 'processed', processed_at = NOW()
      WHERE id = $1
    `, [webhook.id]);

  } catch (error) {
    // Increment retry count
    await $db.query(`
      UPDATE webhook_queue
      SET retry_count = retry_count + 1,
          last_error = $2,
          next_retry_at = NOW() + INTERVAL '5 minutes' * retry_count
      WHERE id = $1
    `, [webhook.id, error.message]);
  }
}
```

### Pattern 6: Webhook Replay

```javascript
// Replay historical webhooks

async function replayWebhooks(filters) {
  const webhooks = await $db.query(`
    SELECT id, payload, event_type, received_at
    FROM webhook_log
    WHERE event_type = $1
    AND received_at BETWEEN $2 AND $3
    ORDER BY received_at ASC
  `, [filters.eventType, filters.startDate, filters.endDate]);

  const results = [];

  for (const webhook of webhooks) {
    const payload = JSON.parse(webhook.payload);

    // Add replay metadata
    payload._replay = {
      original_timestamp: webhook.received_at,
      replay_timestamp: new Date().toISOString(),
      replay_reason: filters.reason
    };

    try {
      await $http.request({
        method: 'POST',
        url: filters.destination,
        body: payload,
        headers: {
          'X-Webhook-Replay': 'true',
          'X-Original-Timestamp': webhook.received_at
        }
      });

      results.push({ id: webhook.id, status: 'replayed' });

    } catch (error) {
      results.push({ id: webhook.id, status: 'failed', error: error.message });
    }

    // Rate limit replays
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Example: Replay all payment webhooks from yesterday
const results = await replayWebhooks({
  eventType: 'payment.succeeded',
  startDate: '2025-11-07 00:00:00',
  endDate: '2025-11-07 23:59:59',
  destination: process.env.PAYMENT_WEBHOOK_URL,
  reason: 'Data migration - reprocessing payments'
});
```

### Pattern 7: Webhook Development Proxy

```javascript
// Forward webhooks to local development environment

// Webhook receiver
const webhook = $json;

// Store for inspection
await $db.query(`
  INSERT INTO webhook_inspector (
    id, headers, body, query_params, received_at
  ) VALUES ($1, $2, $3, $4, NOW())
`, [
  generateId(),
  JSON.stringify($request.headers),
  JSON.stringify(webhook),
  JSON.stringify($request.query)
]);

// Check if local tunnel is registered
const tunnel = await $db.query(`
  SELECT tunnel_url FROM dev_tunnels
  WHERE user_id = $1 AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
`, [$json.user_id]);

if (tunnel.length > 0) {
  // Forward to local development
  try {
    await $http.request({
      method: 'POST',
      url: `${tunnel[0].tunnel_url}/webhook`,
      body: webhook,
      headers: {
        'X-Forwarded-From': 'webhook-relay',
        'X-Original-Source': $request.headers['x-webhook-source']
      },
      timeout: 5000
    });
  } catch (error) {
    console.log('Local tunnel unreachable:', error.message);
  }
}

// Also always forward to staging
await $http.request({
  method: 'POST',
  url: process.env.STAGING_WEBHOOK_URL,
  body: webhook
});
```

## Monitoring and Analytics

```javascript
// Track webhook metrics

const metrics = {
  webhook_id: $json.id,
  source: $request.headers['x-webhook-source'],
  event_type: $json.event_type,
  received_at: new Date(),
  processing_duration_ms: Date.now() - startTime,
  destinations_count: destinations.length,
  successful_deliveries: results.filter(r => r.status === 'fulfilled').length,
  failed_deliveries: results.filter(r => r.status === 'rejected').length,
  payload_size_bytes: JSON.stringify($json).length
};

await $http.request({
  method: 'POST',
  url: process.env.METRICS_ENDPOINT,
  body: metrics
});

// Track in time-series database
await influxDB.write({
  measurement: 'webhook_relay',
  tags: {
    source: metrics.source,
    event_type: metrics.event_type
  },
  fields: {
    processing_duration: metrics.processing_duration_ms,
    success_count: metrics.successful_deliveries,
    failure_count: metrics.failed_deliveries,
    payload_size: metrics.payload_size_bytes
  },
  timestamp: Date.now()
});
```

## Database Schema

```sql
-- Webhook log
CREATE TABLE webhook_log (
  id UUID PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  received_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_log_event ON webhook_log(event_type, received_at DESC);
CREATE INDEX idx_webhook_log_source ON webhook_log(source, received_at DESC);

-- Webhook deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  webhook_id UUID REFERENCES webhook_log(id),
  destination VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, delivered, failed
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error TEXT
);

CREATE INDEX idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_deliveries_status ON webhook_deliveries(status, last_attempt_at);

-- Dead letter queue
CREATE TABLE webhook_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID,
  destination VARCHAR(100),
  payload JSONB,
  error TEXT,
  attempts INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Deliverables

- Production webhook relay workflow
- Transformation logic for multiple sources
- Retry logic with exponential backoff
- Dead letter queue handling
- Replay functionality
- Monitoring dashboards
- Database schema
- API documentation

## Skills Used

- n8n Workflow Architect
- API Integration Master
- Error Handling Specialist
- Monitoring & Observability

---

**Mode:** Autonomous webhook relay creation and deployment
