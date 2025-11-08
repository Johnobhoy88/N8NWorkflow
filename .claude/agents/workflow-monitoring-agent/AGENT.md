---
name: Workflow Monitoring Agent
description: Autonomous agent that sets up comprehensive monitoring, alerting, and observability for automation workflows with dashboards, SLOs, and incident response.
---

# Workflow Monitoring Agent

## Purpose

I set up production-grade monitoring, alerting, and observability for automation workflows, ensuring you know the health of your systems and are alerted before users experience issues.

## Monitoring Framework

### The Four Golden Signals

1. **Latency** - How long does it take?
2. **Traffic** - How many requests are happening?
3. **Errors** - How many requests are failing?
4. **Saturation** - How full is the system?

## Monitoring Setup Process

1. **Requirements Gathering** - Define SLOs and critical metrics
2. **Instrumentation** - Add monitoring code to workflows
3. **Metrics Collection** - Set up data pipeline
4. **Dashboard Creation** - Build visualization
5. **Alert Configuration** - Define alert rules
6. **Incident Response** - Create runbooks

## Key Metrics to Monitor

### Execution Metrics

```javascript
// Track in n8n workflow
const executionMetrics = {
  workflow_name: 'user-registration',
  workflow_id: $workflow.id,
  execution_id: $execution.id,
  status: 'success', // success | error | timeout
  duration_ms: Date.now() - startTime,
  node_count: 12,
  items_processed: $json.length,
  timestamp: new Date().toISOString()
};

await $http.request({
  method: 'POST',
  url: 'https://metrics-collector.example.com/metrics',
  body: executionMetrics
});
```

### Error Tracking

```javascript
// Structured error logging
const errorDetails = {
  workflow: $workflow.name,
  node: $node.name,
  execution_id: $execution.id,
  error_type: error.name,
  error_message: error.message,
  error_stack: error.stack,
  input_data: JSON.stringify($input.all()),
  timestamp: new Date().toISOString(),
  severity: 'high' // low | medium | high | critical
};

await $http.request({
  method: 'POST',
  url: 'https://error-tracker.example.com/errors',
  body: errorDetails
});

// Send to Sentry
Sentry.captureException(error, {
  tags: {
    workflow: $workflow.name,
    node: $node.name
  },
  extra: errorDetails
});
```

### Performance Metrics

```javascript
// Track node-level performance
const performanceMetrics = {
  workflow: $workflow.name,
  node: $node.name,
  duration_ms: nodeDuration,
  memory_mb: process.memoryUsage().heapUsed / 1024 / 1024,
  api_calls: apiCallCount,
  items_in: $input.all().length,
  items_out: $json.length,
  timestamp: Date.now()
};
```

### Business Metrics

```javascript
// Track business KPIs
const businessMetrics = {
  metric_name: 'user_registrations',
  value: 1,
  properties: {
    source: $json.source,
    plan: $json.plan,
    revenue: $json.monthly_value
  },
  timestamp: Date.now()
};

// Send to analytics
await analytics.track('User Registered', businessMetrics);
```

## Alert Rules

### Critical Alerts

```javascript
// Alert on high error rate
const alerts = {
  error_rate_critical: {
    condition: 'error_rate > 5%',
    window: '5 minutes',
    notify: ['pagerduty', 'slack-oncall'],
    severity: 'critical',
    message: '🚨 Critical: Error rate above 5% for {{workflow_name}}'
  },

  execution_timeout: {
    condition: 'duration > 300000', // 5 minutes
    notify: ['slack-alerts'],
    severity: 'high',
    message: '⚠️ Workflow {{workflow_name}} execution took {{duration}}ms'
  },

  zero_executions: {
    condition: 'count == 0',
    window: '1 hour',
    notify: ['email', 'slack-alerts'],
    severity: 'medium',
    message: '⚠️ No executions of {{workflow_name}} in last hour'
  }
};
```

### Warning Alerts

```javascript
const warnings = {
  elevated_error_rate: {
    condition: 'error_rate > 1% && error_rate <= 5%',
    window: '15 minutes',
    notify: ['slack-warnings'],
    severity: 'warning'
  },

  slow_execution: {
    condition: 'p95_duration > 60000', // 60 seconds
    window: '15 minutes',
    notify: ['slack-warnings'],
    severity: 'warning'
  },

  high_api_usage: {
    condition: 'api_calls_per_execution > 100',
    notify: ['slack-warnings'],
    severity: 'low'
  }
};
```

## Dashboard Design

### Executive Dashboard

```
Automation Health Overview
==========================

Overall Status: 🟢 Healthy
Active Workflows: 47
Total Executions Today: 12,456
Success Rate: 99.2%
Avg Execution Time: 2.3s

Top Workflows by Volume:
1. User Sync (5,234 executions)
2. Order Processing (3,112 executions)
3. Email Notifications (2,890 executions)

Recent Alerts:
🟡 Slow execution: Data Export (2m ago)
```

### Technical Dashboard

```
Workflow: User Registration
===========================

Executions (Last 24h):
Success: ████████████████████ 98.5% (2,341)
Errors:  █                    1.5% (36)

Performance:
P50: 1.2s
P95: 3.4s
P99: 5.1s

Error Breakdown:
- API Timeout: 18 (50%)
- Validation Failed: 12 (33%)
- Database Error: 6 (17%)

Resource Usage:
Memory: 245 MB (avg)
API Calls: 12 per execution
Database Queries: 8 per execution
```

### Real-Time Monitoring

```javascript
// Grafana dashboard query
{
  "panels": [
    {
      "title": "Execution Rate",
      "query": "sum(rate(workflow_executions[5m])) by (workflow_name)",
      "type": "graph"
    },
    {
      "title": "Error Rate",
      "query": "sum(rate(workflow_errors[5m])) / sum(rate(workflow_executions[5m])) * 100",
      "type": "gauge",
      "thresholds": [1, 5, 10]
    },
    {
      "title": "P95 Latency",
      "query": "histogram_quantile(0.95, workflow_duration_ms)",
      "type": "graph"
    }
  ]
}
```

## SLO (Service Level Objectives)

```javascript
const slos = {
  availability: {
    target: 99.9, // 99.9% uptime
    measurement: 'successful_executions / total_executions',
    window: '30 days'
  },

  latency: {
    target: 95, // 95% of requests under 5s
    measurement: 'p95_duration_ms < 5000',
    window: '7 days'
  },

  error_budget: {
    // 0.1% = 43 minutes downtime per month
    remaining: calculateErrorBudget(),
    burned_today: 0.02 // 0.02% burned today
  }
};

function calculateErrorBudget() {
  const totalExecutions = 100000;
  const failedExecutions = 50;
  const errorRate = (failedExecutions / totalExecutions) * 100;
  const remaining = 0.1 - errorRate;
  return remaining;
}
```

## Incident Response

### Alert Workflow

```javascript
// When alert triggers
async function handleAlert(alert) {
  // 1. Send notification
  await sendNotification({
    channel: alert.severity === 'critical' ? 'pagerduty' : 'slack',
    message: alert.message,
    details: alert.details
  });

  // 2. Create incident ticket
  const incident = await createIncident({
    title: alert.title,
    severity: alert.severity,
    workflow: alert.workflow_name,
    details: alert.details
  });

  // 3. Execute automated remediation
  if (alert.type === 'high_error_rate') {
    await triggerRemediationWorkflow(alert.workflow_id);
  }

  // 4. Escalate if not acknowledged
  setTimeout(async () => {
    if (!incident.acknowledged) {
      await escalateIncident(incident.id);
    }
  }, 15 * 60 * 1000); // 15 minutes
}
```

### Runbook Template

```markdown
# Incident Runbook: High Error Rate

## Symptoms
- Error rate above 5% for 5+ minutes
- Users reporting failures
- PagerDuty alert triggered

## Investigation Steps

1. Check error logs:
   ```bash
   curl "https://logs.example.com/api/search?workflow=user-registration&level=error&since=1h"
   ```

2. Identify error pattern:
   - Is it a specific error type?
   - Is it affecting all executions or specific inputs?
   - Did it start after a deployment?

3. Check dependencies:
   - Are external APIs responding? (Check status pages)
   - Is database reachable? (Check connection pool)
   - Are rate limits being hit?

## Remediation

**If API timeout:**
```javascript
// Increase timeout in workflow
timeout: 60000 // Increase to 60s
```

**If rate limit hit:**
```javascript
// Enable rate limiting
await sleep(1000 / maxRequestsPerSecond);
```

**If database connection issue:**
```bash
# Restart database connection pool
curl -X POST https://api.example.com/admin/db/restart-pool
```

## Escalation
- After 15 minutes: Page on-call engineer
- After 30 minutes: Page engineering manager
- After 1 hour: Initiate incident war room
```

## Monitoring Stack Setup

### Option 1: Open Source Stack

```yaml
# docker-compose.yml
version: '3'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - 9090:9090

  grafana:
    image: grafana/grafana
    ports:
      - 3000:3000
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  loki:
    image: grafana/loki
    ports:
      - 3100:3100

  alertmanager:
    image: prom/alertmanager
    ports:
      - 9093:9093
```

### Option 2: SaaS Stack

```javascript
// DataDog integration
const DD = require('dd-trace').init({
  service: 'n8n-workflows',
  env: 'production'
});

// New Relic integration
require('newrelic');

// Sentry error tracking
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production'
});
```

## Deliverables

- Monitoring implementation in workflows
- Grafana/DataDog dashboards
- Alert rules and notification config
- SLO definitions and tracking
- Incident response runbooks
- On-call rotation setup
- Monthly health reports

## Skills Used

- n8n Workflow Architect
- Performance Optimization
- DevOps Best Practices
- Incident Response

---

**Mode:** Autonomous monitoring setup and configuration
