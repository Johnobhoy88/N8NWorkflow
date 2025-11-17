# Troubleshooting Guide - n8n Workflow Builder v3.0

## Common Issues and Solutions

This guide provides solutions for common issues encountered with the n8n Workflow Builder v3.0 deployment.

---

## Table of Contents
1. [Startup Issues](#startup-issues)
2. [Performance Problems](#performance-problems)
3. [Database Issues](#database-issues)
4. [API & Integration Failures](#api--integration-failures)
5. [Memory & Resource Issues](#memory--resource-issues)
6. [Authentication & Security](#authentication--security)
7. [Workflow Generation Errors](#workflow-generation-errors)
8. [Monitoring & Logging Issues](#monitoring--logging-issues)

---

## Startup Issues

### Service Won't Start

#### Symptoms
- n8n service fails to start
- Container exits immediately
- No logs generated

#### Diagnosis
```bash
# Check service status
systemctl status n8n-workflow-builder

# Check Docker containers
docker ps -a
docker logs n8n-workflow-builder

# Check port availability
netstat -tulpn | grep 5678

# Check configuration
n8n start --tunnel --dry-run
```

#### Solutions

**Port Already in Use**
```bash
# Find process using port
lsof -i :5678

# Kill the process
kill -9 <PID>

# Or change n8n port
export N8N_PORT=5679
```

**Missing Environment Variables**
```bash
# Verify all required variables
env | grep N8N_
env | grep DB_

# Source environment file
source .env

# Or use systemd environment file
systemctl edit n8n-workflow-builder
# Add: EnvironmentFile=/path/to/.env
```

**Database Connection Failed**
```bash
# Test database connection
psql -h $DB_POSTGRESDB_HOST -U $DB_POSTGRESDB_USER -d $DB_POSTGRESDB_DATABASE

# Check PostgreSQL status
systemctl status postgresql

# Verify credentials
echo "SELECT 1;" | psql postgresql://$DB_POSTGRESDB_USER:$DB_POSTGRESDB_PASSWORD@$DB_POSTGRESDB_HOST:$DB_POSTGRESDB_PORT/$DB_POSTGRESDB_DATABASE
```

---

## Performance Problems

### Slow Workflow Generation

#### Symptoms
- Workflow generation takes > 30 seconds
- Timeouts on AI API calls
- High CPU usage during generation

#### Diagnosis
```bash
# Check system resources
top -H -p $(pgrep n8n)
iostat -x 1
vmstat 1

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://your-api-endpoint.com"

# Check database query performance
psql -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### Solutions

**Optimize AI API Calls**
```javascript
// Add retry logic with exponential backoff
async function callAIWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await callAI(data);
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}

// Implement caching
const cache = new Map();
function getCachedOrGenerate(key, generator) {
  if (cache.has(key)) return cache.get(key);
  const result = generator();
  cache.set(key, result);
  return result;
}
```

**Database Query Optimization**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_audit_log_email_timestamp
ON workflow_audit_log(email, timestamp DESC);

-- Analyze tables
ANALYZE workflow_audit_log;
ANALYZE generated_workflows;

-- Check slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

### High Memory Usage

#### Symptoms
- Memory usage > 80%
- OOM killer activated
- Application crashes

#### Diagnosis
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check for memory leaks
node --inspect app.js
# Use Chrome DevTools Memory Profiler

# Monitor over time
watch -n 1 'free -h; echo "---"; ps aux --sort=-%mem | head -5'
```

#### Solutions

**Increase Memory Limits**
```bash
# Docker
docker run -m 4g n8n

# Systemd
systemctl edit n8n-workflow-builder
# Add: MemoryLimit=4G

# Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

**Fix Memory Leaks**
```javascript
// Clear large objects
let largeData = null;

// Use streams for large files
const stream = fs.createReadStream('large-file.json');
stream.on('data', (chunk) => {
  // Process chunk
});

// Implement garbage collection
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 60000);
}
```

---

## Database Issues

### Connection Pool Exhausted

#### Symptoms
- "Too many connections" error
- Slow queries
- Application hangs

#### Diagnosis
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- View connections by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Find long-running queries
SELECT pid, age(clock_timestamp(), query_start), query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

#### Solutions

**Increase Connection Limit**
```sql
-- PostgreSQL configuration
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();

-- Application pool settings
DB_POSTGRESDB_POOL_MAX=50
DB_POSTGRESDB_POOL_MIN=10
```

**Kill Idle Connections**
```sql
-- Terminate idle connections older than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < current_timestamp - INTERVAL '10 minutes';
```

### Database Locks

#### Symptoms
- Queries hang indefinitely
- "Lock wait timeout" errors
- Deadlocks detected

#### Diagnosis
```sql
-- View current locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Find blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.query AS blocked_query,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.query AS blocking_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked_activity ON blocked_locks.pid = blocked_activity.pid
JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking_activity ON blocking_locks.pid = blocking_activity.pid
WHERE NOT blocked_locks.granted;
```

#### Solutions

**Kill Blocking Queries**
```sql
-- Terminate specific blocking process
SELECT pg_terminate_backend(12345); -- Replace with PID

-- Set statement timeout
ALTER SYSTEM SET statement_timeout = '30s';
```

---

## API & Integration Failures

### Gmail OAuth2 Issues

#### Symptoms
- "Invalid credentials" error
- Token refresh failures
- Email sending fails

#### Diagnosis
```bash
# Test OAuth2 token
curl -H "Authorization: Bearer $TOKEN" \
  https://www.googleapis.com/gmail/v1/users/me/profile

# Check token expiry
jwt decode $TOKEN
```

#### Solutions

**Refresh OAuth2 Token**
```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=$GMAIL_CLIENT_ID" \
  -d "client_secret=$GMAIL_CLIENT_SECRET" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

**Re-authenticate**
```javascript
// Force re-authentication
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Force consent screen
});
```

### AI API Rate Limiting

#### Symptoms
- 429 "Too Many Requests" errors
- Throttling messages
- Intermittent failures

#### Diagnosis
```bash
# Check rate limit headers
curl -I https://api.example.com/endpoint

# Monitor request rate
grep "API call" /var/log/n8n/app.log | wc -l
```

#### Solutions

**Implement Rate Limiting**
```javascript
const RateLimiter = require('limiter').RateLimiter;
const limiter = new RateLimiter(10, 'second');

async function makeAPICall(data) {
  await new Promise((resolve) => limiter.removeTokens(1, resolve));
  return await api.call(data);
}
```

**Use Multiple API Keys**
```javascript
const apiKeys = [
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  process.env.API_KEY_3
];

let currentKeyIndex = 0;

function getNextApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return apiKeys[currentKeyIndex];
}
```

---

## Memory & Resource Issues

### Container Keeps Restarting

#### Symptoms
- Container restarts every few minutes
- Exit code 137 (OOM killed)
- Logs show "JavaScript heap out of memory"

#### Diagnosis
```bash
# Check container restart count
docker inspect n8n-workflow-builder | grep -A 5 RestartCount

# View resource usage
docker stats n8n-workflow-builder

# Check system OOM killer
dmesg | grep -i "killed process"
journalctl -u docker | grep OOM
```

#### Solutions

**Increase Container Resources**
```yaml
# docker-compose.yml
services:
  n8n:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          memory: 2G
```

**Optimize Application**
```javascript
// Limit concurrent operations
const pLimit = require('p-limit');
const limit = pLimit(5);

const promises = urls.map(url => limit(() => fetchData(url)));
await Promise.all(promises);
```

---

## Authentication & Security

### CORS Errors

#### Symptoms
- "Access-Control-Allow-Origin" errors
- Webhook requests blocked
- Form submissions fail

#### Diagnosis
```bash
# Check CORS headers
curl -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://your-domain.com/webhook-endpoint -I
```

#### Solutions

**Configure CORS**
```javascript
// Express middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

**Nginx CORS Configuration**
```nginx
location / {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
```

---

## Workflow Generation Errors

### JSON Parse Errors

#### Symptoms
- "Unexpected token" errors
- Invalid workflow JSON
- Generation fails at synthesis stage

#### Diagnosis
```javascript
// Validate JSON
try {
  JSON.parse(workflowJson);
} catch (e) {
  console.error('Invalid JSON at position:', e.message);
  // Log the problematic section
  const position = parseInt(e.message.match(/position (\d+)/)[1]);
  console.log(workflowJson.substring(position - 50, position + 50));
}
```

#### Solutions

**Clean AI Response**
```javascript
function cleanAIResponse(response) {
  // Remove markdown code blocks
  response = response.replace(/```json\n?/g, '').replace(/```/g, '');

  // Fix common JSON issues
  response = response
    .replace(/,\s*}/g, '}') // Remove trailing commas
    .replace(/,\s*]/g, ']')
    .replace(/'/g, '"') // Replace single quotes
    .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys

  return response.trim();
}
```

### Node Connection Errors

#### Symptoms
- "Node not found" errors
- Invalid connections in workflow
- Execution fails

#### Diagnosis
```javascript
// Validate connections
function validateWorkflow(workflow) {
  const nodeIds = new Set(workflow.nodes.map(n => n.id));

  for (const [sourceId, connections] of Object.entries(workflow.connections)) {
    if (!nodeIds.has(sourceId)) {
      console.error(`Source node ${sourceId} not found`);
    }

    for (const connection of connections.main[0]) {
      if (!nodeIds.has(connection.node)) {
        console.error(`Target node ${connection.node} not found`);
      }
    }
  }
}
```

#### Solutions

**Fix Missing Connections**
```javascript
function repairWorkflow(workflow) {
  // Ensure all nodes have connections entry
  workflow.nodes.forEach(node => {
    if (!workflow.connections[node.id]) {
      workflow.connections[node.id] = { main: [[]] };
    }
  });

  // Remove orphaned connections
  for (const nodeId in workflow.connections) {
    if (!workflow.nodes.find(n => n.id === nodeId)) {
      delete workflow.connections[nodeId];
    }
  }

  return workflow;
}
```

---

## Monitoring & Logging Issues

### Missing Metrics

#### Symptoms
- Prometheus shows no data
- Grafana dashboards empty
- Metrics endpoint returns 404

#### Diagnosis
```bash
# Check metrics endpoint
curl http://localhost:5678/metrics

# Verify Prometheus scraping
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="n8n")'

# Check exporter status
systemctl status node_exporter
systemctl status postgres_exporter
```

#### Solutions

**Enable Metrics Collection**
```javascript
// Add to n8n configuration
const prometheus = require('prom-client');
prometheus.collectDefaultMetrics();

app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### Log Rotation Issues

#### Symptoms
- Disk space full
- Old logs not deleted
- Log files growing indefinitely

#### Diagnosis
```bash
# Check log sizes
du -sh /var/log/n8n/*

# Verify logrotate configuration
logrotate -d /etc/logrotate.d/n8n

# Check disk usage
df -h /var/log
```

#### Solutions

**Configure Logrotate**
```bash
# /etc/logrotate.d/n8n
/var/log/n8n/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 n8n n8n
    postrotate
        systemctl reload n8n-workflow-builder
    endscript
}
```

**Implement Log Streaming**
```javascript
// Use Winston with rotation
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: '/var/log/n8n/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  transports: [transport]
});
```

---

## Emergency Procedures

### Complete System Failure

```bash
#!/bin/bash
# emergency_recovery.sh

# 1. Stop all services
docker-compose down
systemctl stop n8n-workflow-builder nginx postgresql redis

# 2. Clear problematic data
redis-cli FLUSHALL
psql -c "DELETE FROM api_rate_limits WHERE blocked_until > NOW();"

# 3. Reset to known good state
git checkout v2.0.0
cp /backup/.env.working .env

# 4. Start services one by one
systemctl start postgresql
sleep 5
systemctl start redis
sleep 5
systemctl start n8n-workflow-builder
sleep 10
systemctl start nginx

# 5. Verify
curl http://localhost:5678/health || echo "STILL FAILING - ESCALATE!"
```

---

## Getting Help

### Collect Diagnostic Information

```bash
#!/bin/bash
# collect_diagnostics.sh

DIAG_DIR="/tmp/n8n_diagnostics_$(date +%Y%m%d_%H%M%S)"
mkdir -p $DIAG_DIR

# System info
uname -a > $DIAG_DIR/system.txt
free -h >> $DIAG_DIR/system.txt
df -h >> $DIAG_DIR/system.txt

# Service status
systemctl status n8n-workflow-builder > $DIAG_DIR/service_status.txt
docker ps -a > $DIAG_DIR/docker_ps.txt

# Recent logs
tail -1000 /var/log/n8n/*.log > $DIAG_DIR/recent_logs.txt

# Configuration (sanitized)
cat .env | sed 's/=.*/=REDACTED/' > $DIAG_DIR/env_vars.txt

# Database status
psql -c "SELECT version();" > $DIAG_DIR/db_info.txt

# Create archive
tar czf n8n_diagnostics.tar.gz $DIAG_DIR
echo "Diagnostics collected: n8n_diagnostics.tar.gz"
```

### Support Channels

- **Emergency Hotline**: +1-XXX-XXX-XXXX (24/7)
- **Slack Channel**: #n8n-emergency-support
- **Email**: critical-support@your-domain.com
- **Documentation**: https://docs.your-domain.com/troubleshooting