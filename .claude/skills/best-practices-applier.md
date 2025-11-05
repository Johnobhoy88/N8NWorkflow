# Best Practices Applier

**Purpose:** Apply production hardening patterns, security measures, performance optimizations, and operational best practices to n8n workflows and deployments.

**When to use this skill:** When preparing workflows for production, scaling existing deployments, hardening security, or establishing operational excellence.

---

## Core Capabilities

1. **Production deployment setup** - Docker Compose configurations with PostgreSQL
2. **Performance optimization** - Batch processing, caching, database optimization
3. **Security hardening** - Credential management, access control, encryption
4. **Monitoring & logging** - Health checks, error tracking, metrics
5. **Backup & recovery** - Automated backups, disaster recovery
6. **Documentation standards** - Workflow documentation templates

---

## 1. Production Deployment Setup

### Docker Compose Configuration

From BEST_PRACTICES.md (lines 28-75):

**Complete production-ready docker-compose.yml:**

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      # Basic Configuration
      - N8N_HOST=${N8N_HOST:-localhost}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production

      # Authentication
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}

      # Database Configuration
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}

      # Execution Settings
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - EXECUTIONS_PROCESS=main
      - EXECUTIONS_TIMEOUT=300
      - EXECUTIONS_TIMEOUT_MAX=3600

      # Security
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
      - N8N_JWT_AUTH_ACTIVE=true
      - N8N_JWT_AUTH_SECRET=${JWT_SECRET}

      # Webhook Configuration
      - WEBHOOK_URL=https://${N8N_HOST}/

      # Timezone
      - GENERIC_TIMEZONE=America/New_York

      # Email (for notifications)
      - N8N_EMAIL_MODE=smtp
      - N8N_SMTP_HOST=${SMTP_HOST}
      - N8N_SMTP_PORT=${SMTP_PORT}
      - N8N_SMTP_USER=${SMTP_USER}
      - N8N_SMTP_PASS=${SMTP_PASS}
      - N8N_SMTP_SENDER=${SMTP_SENDER}

    volumes:
      - n8n_data:/home/node/.n8n
      - ./custom-nodes:/home/node/.n8n/custom
      - ./backups:/backups

    depends_on:
      - postgres
      - redis

    networks:
      - n8n-network

    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  postgres:
    image: postgres:15-alpine
    container_name: n8n-postgres
    restart: always
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
      - PGDATA=/var/lib/postgresql/data/pgdata

    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres-init:/docker-entrypoint-initdb.d

    networks:
      - n8n-network

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: n8n-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

    networks:
      - n8n-network

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Optional: NGINX reverse proxy with SSL
  nginx:
    image: nginx:alpine
    container_name: n8n-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx

    depends_on:
      - n8n

    networks:
      - n8n-network

volumes:
  n8n_data:
    driver: local
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  n8n-network:
    driver: bridge
```

**Environment file (.env):**

```bash
# n8n Configuration
N8N_HOST=your-domain.com
N8N_USER=admin
N8N_PASSWORD=<generate-strong-password>
JWT_SECRET=<generate-random-secret>

# PostgreSQL Configuration
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=<generate-strong-password>

# Redis Configuration
REDIS_PASSWORD=<generate-strong-password>

# SMTP Configuration (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=<app-specific-password>
SMTP_SENDER=n8n@your-domain.com
```

**Generate secrets:**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate strong passwords
openssl rand -base64 24
```

**Deployment commands:**
```bash
# Create .env file
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f n8n

# Check health
docker-compose ps

# Backup command
docker-compose exec postgres pg_dump -U n8n n8n > backup-$(date +%Y%m%d).sql

# Restore command
docker-compose exec -T postgres psql -U n8n n8n < backup-20250101.sql
```

---

## 2. Performance Optimization

### Batch Processing Pattern

From BEST_PRACTICES.md (lines 76-82):

**For API calls (50-100 items per batch):**

```json
{
  "name": "Split into Batches",
  "type": "n8n-nodes-base.splitInBatches",
  "parameters": {
    "batchSize": 50,
    "options": {
      "reset": false
    }
  }
}
```

**Complete batch processing workflow:**

```
Trigger → Fetch All Data → Split in Batches → Process Batch → API Call → Aggregate Results
                                      ↑                                         ↓
                                      └────────────← Loop if more batches ─────┘
```

**Implementation:**

```javascript
// Code node: "Prepare Batch"
const batchNumber = $node["Split into Batches"].context.currentBatch;
const totalBatches = $node["Split into Batches"].context.totalBatches;
const items = $input.all();

console.log(`Processing batch ${batchNumber}/${totalBatches} (${items.length} items)`);

// Add rate limiting delay between batches
if (batchNumber > 1) {
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
}

// Process items
const results = items.map(item => ({
  json: {
    ...item.json,
    batchNumber: batchNumber,
    processedAt: new Date().toISOString()
  }
}));

return results;
```

### Caching Strategy

**Implement response caching for expensive operations:**

```javascript
// Code node: "Check Cache"
const cacheKey = `api_response_${$json.requestId}`;
const cacheDuration = 3600000; // 1 hour in milliseconds

// Check if cached response exists and is valid
const cachedData = $node["Get Cache"].item?.json;
const cacheAge = cachedData ? Date.now() - new Date(cachedData.timestamp).getTime() : Infinity;

if (cachedData && cacheAge < cacheDuration) {
  console.log('Cache HIT:', cacheKey);
  return [{
    json: {
      fromCache: true,
      data: cachedData.data,
      cacheAge: Math.round(cacheAge / 1000) + 's'
    }
  }];
} else {
  console.log('Cache MISS:', cacheKey);
  return [{
    json: {
      fromCache: false,
      cacheKey: cacheKey,
      shouldFetchFresh: true
    }
  }];
}
```

### Database Optimization

**Create indexes for frequently queried fields:**

```sql
-- Performance indexes for n8n workflows table
CREATE INDEX idx_workflows_active ON workflows(active) WHERE active = true;
CREATE INDEX idx_executions_workflow ON executions(workflowId, startedAt DESC);
CREATE INDEX idx_executions_status ON executions(finished, stoppedAt DESC);

-- Custom workflow error logs table (if using DB logging)
CREATE INDEX idx_error_logs_created ON n8n_error_logs(created_at DESC);
CREATE INDEX idx_error_logs_workflow ON n8n_error_logs(workflow_id, created_at DESC);
CREATE INDEX idx_error_logs_severity ON n8n_error_logs(severity) WHERE resolved = false;

-- Analyze tables for query optimization
ANALYZE workflows;
ANALYZE executions;
```

**Batch inserts instead of single operations:**

```javascript
// Code node: "Prepare Bulk Insert"
const items = $input.all();

// Build VALUES clause for bulk insert
const values = items.map(item => {
  const data = item.json;
  return `('${data.id}', '${data.name}', '${data.email}', NOW())`;
}).join(',\n');

const query = `
  INSERT INTO users (id, name, email, created_at)
  VALUES ${values}
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = NOW()
`;

return [{json: {query: query, rowCount: items.length}}];
```

### Query Timeout Configuration

```json
{
  "name": "Database Query with Timeout",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT * FROM large_table WHERE condition = 'value'",
    "options": {
      "queryTimeout": 30000,
      "connectionTimeout": 10000
    }
  },
  "continueOnFail": true,
  "retryOnFail": true,
  "maxTries": 2
}
```

---

## 3. Security Hardening

### Credential Management

From BEST_PRACTICES.md (lines 92-120):

**1. Environment variables setup:**

Create `.env` file (add to `.gitignore`):
```bash
# API Keys
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Database Credentials
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:5432/db

# Webhook Secrets
GITHUB_WEBHOOK_SECRET=whsec_...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# n8n Configuration
N8N_ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>

# External Services
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...
```

**2. Access credentials in workflows:**

```javascript
// In Code nodes - use $env
const apiKey = $env.OPENAI_API_KEY;
const dbUrl = $env.POSTGRES_CONNECTION_STRING;
```

**3. n8n credential configuration:**

For HTTP Request nodes, use credential system:
1. Settings → Credentials → Add credential
2. Select credential type (Header Auth, OAuth2, API Key, etc.)
3. Name it descriptively: "Production OpenAI API Key"
4. Reference by name in nodes (not by hardcoded ID)

**4. Credential rotation schedule:**

```markdown
## Credential Rotation Schedule

| Credential | Rotation Frequency | Last Rotated | Next Rotation |
|------------|-------------------|--------------|---------------|
| OpenAI API Key | Quarterly | 2025-01-01 | 2025-04-01 |
| Database Password | Annually | 2025-01-01 | 2026-01-01 |
| Webhook Secrets | Semi-annually | 2025-01-01 | 2025-07-01 |
| JWT Secret | Never (unless compromised) | 2025-01-01 | - |
```

### Webhook Security

**Implement signature verification:**

```javascript
// Code node: "Verify Webhook Signature"
const crypto = require('crypto');

const receivedSignature = $request.headers['x-hub-signature-256'];
const webhookSecret = $env.GITHUB_WEBHOOK_SECRET;
const payload = JSON.stringify($input.first().json);

// Calculate expected signature
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

// Constant-time comparison to prevent timing attacks
const isValid = crypto.timingSafeEqual(
  Buffer.from(receivedSignature || ''),
  Buffer.from(expectedSignature)
);

if (!isValid) {
  throw new Error('Invalid webhook signature - possible security breach');
}

return [{
  json: {
    verified: true,
    payload: JSON.parse(payload)
  }
}];
```

### NGINX Reverse Proxy with SSL

**nginx.conf:**

```nginx
http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=n8n_limit:10m rate=10r/s;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    upstream n8n {
        server n8n:5678;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Certificates (use Let's Encrypt)
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Rate limiting
        limit_req zone=n8n_limit burst=20 nodelay;

        # Proxy to n8n
        location / {
            proxy_pass http://n8n;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint (no auth required)
        location /healthz {
            proxy_pass http://n8n/healthz;
            access_log off;
        }
    }
}
```

---

## 4. Monitoring & Logging

### Health Check Workflow

From `monitoring-health-check.json` template:

```json
{
  "name": "System Health Monitor",
  "nodes": [
    {
      "name": "Schedule Every 5 Minutes",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      }
    },
    {
      "name": "Check n8n Health",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "http://n8n:5678/healthz",
        "options": {
          "timeout": 5000,
          "response": {
            "response": {
              "fullResponse": true
            }
          }
        }
      },
      "continueOnFail": true
    },
    {
      "name": "Check Database",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT 1 as health_check",
        "options": {
          "queryTimeout": 5000
        }
      },
      "continueOnFail": true
    },
    {
      "name": "Check Redis",
      "type": "n8n-nodes-base.redis",
      "parameters": {
        "operation": "info"
      },
      "continueOnFail": true
    },
    {
      "name": "Evaluate Health",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const checks = $input.all();\n\nconst health = {\n  n8n: checks[0].json.statusCode === 200,\n  database: !!checks[1].json?.health_check,\n  redis: !!checks[2].json\n};\n\nconst allHealthy = Object.values(health).every(v => v);\nconst status = allHealthy ? 'HEALTHY' : 'DEGRADED';\n\nreturn [{\n  json: {\n    status: status,\n    checks: health,\n    timestamp: new Date().toISOString(),\n    alert: !allHealthy\n  }\n}];"
      }
    },
    {
      "name": "Check if Unhealthy",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.alert }}",
              "operation": "equal",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "name": "Send Alert",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts",
        "text": "=🚨 *System Health Alert*\\n\\nStatus: {{ $json.status }}\\nn8n: {{ $json.checks.n8n ? '✅' : '❌' }}\\nDatabase: {{ $json.checks.database ? '✅' : '❌' }}\\nRedis: {{ $json.checks.redis ? '✅' : '❌' }}\\n\\nTime: {{ $json.timestamp }}"
      }
    },
    {
      "name": "Log Metrics",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "health_metrics",
        "columns": "status,n8n_healthy,db_healthy,redis_healthy,timestamp",
        "additionalFields": {
          "values": "={{ $json.status }},={{ $json.checks.n8n }},={{ $json.checks.database }},={{ $json.checks.redis }},={{ $json.timestamp }}"
        }
      }
    }
  ]
}
```

**Health metrics table:**

```sql
CREATE TABLE health_metrics (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  n8n_healthy BOOLEAN NOT NULL,
  db_healthy BOOLEAN NOT NULL,
  redis_healthy BOOLEAN NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_metrics_timestamp ON health_metrics(timestamp DESC);
CREATE INDEX idx_health_metrics_status ON health_metrics(status) WHERE status != 'HEALTHY';
```

### Execution Monitoring

**Monitor workflow execution times:**

```javascript
// Code node: "Monitor Performance"
const executionData = await fetch('http://n8n:5678/api/v1/executions', {
  headers: {'X-N8N-API-KEY': $env.N8N_API_KEY}
}).then(r => r.json());

const recentExecutions = executionData.data.slice(0, 100);

// Calculate metrics
const avgDuration = recentExecutions.reduce((sum, e) =>
  sum + (new Date(e.stoppedAt) - new Date(e.startedAt)), 0
) / recentExecutions.length;

const failureRate = (recentExecutions.filter(e => !e.finished).length / recentExecutions.length) * 100;

const slowExecutions = recentExecutions.filter(e =>
  (new Date(e.stoppedAt) - new Date(e.startedAt)) > 60000 // > 1 minute
);

return [{
  json: {
    avgDuration: Math.round(avgDuration / 1000) + 's',
    failureRate: failureRate.toFixed(2) + '%',
    slowExecutions: slowExecutions.length,
    alert: failureRate > 5 || slowExecutions.length > 10
  }
}];
```

---

## 5. Backup & Recovery

### Automated Backup Workflow

From BEST_PRACTICES.md (lines 137-146):

```json
{
  "name": "Daily Workflow Backup",
  "nodes": [
    {
      "name": "Schedule Daily 2 AM",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 2 * * *"
            }
          ]
        }
      }
    },
    {
      "name": "Export All Workflows",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "http://n8n:5678/api/v1/workflows",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-N8N-API-KEY",
              "value": "={{ $env.N8N_API_KEY }}"
            }
          ]
        }
      }
    },
    {
      "name": "Backup Database",
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "=docker exec n8n-postgres pg_dump -U {{ $env.POSTGRES_USER }} {{ $env.POSTGRES_DB }} | gzip > /backups/db-backup-{{ $now.format('YYYY-MM-DD') }}.sql.gz"
      }
    },
    {
      "name": "Create GitHub Backup",
      "type": "n8n-nodes-base.github",
      "parameters": {
        "operation": "create",
        "resource": "file",
        "owner": "your-username",
        "repository": "n8n-backups",
        "filePath": "=backups/workflows-{{ $now.format('YYYY-MM-DD') }}.json",
        "fileContent": "={{ JSON.stringify($json.data, null, 2) }}",
        "commitMessage": "=Automated backup: {{ $now.format('YYYY-MM-DD HH:mm:ss') }}"
      }
    },
    {
      "name": "Cleanup Old Backups",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\n\nconst backupDir = '/backups';\nconst retentionDays = 30;\nconst now = Date.now();\n\nconst files = fs.readdirSync(backupDir);\nlet deleted = 0;\n\nfiles.forEach(file => {\n  const filePath = path.join(backupDir, file);\n  const stats = fs.statSync(filePath);\n  const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);\n  \n  if (ageInDays > retentionDays) {\n    fs.unlinkSync(filePath);\n    deleted++;\n  }\n});\n\nreturn [{\n  json: {\n    backupDir: backupDir,\n    totalFiles: files.length,\n    deletedFiles: deleted,\n    retentionDays: retentionDays\n  }\n}];"
      }
    },
    {
      "name": "Success Notification",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#ops",
        "text": "=✅ *Backup Completed*\\n\\nWorkflows exported\\nDatabase backed up\\nOld backups cleaned ({{ $json.deletedFiles }} files removed)"
      }
    }
  ]
}
```

### Disaster Recovery Plan

**Recovery procedure documentation:**

```markdown
# n8n Disaster Recovery Plan

## 1. Database Recovery

### From Docker backup:
```bash
# Stop n8n
docker-compose stop n8n

# Restore database
gunzip < backups/db-backup-2025-01-01.sql.gz | \
  docker exec -i n8n-postgres psql -U n8n -d n8n

# Restart n8n
docker-compose start n8n
```

### From external backup:
```bash
# Copy backup to container
docker cp backup.sql n8n-postgres:/tmp/

# Restore
docker exec n8n-postgres psql -U n8n -d n8n -f /tmp/backup.sql
```

## 2. Workflow Recovery

### From GitHub:
```bash
# Clone backup repository
git clone https://github.com/your-username/n8n-backups.git

# Import workflows via API
for file in backups/*.json; do
  curl -X POST http://localhost:5678/api/v1/workflows/import \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$file"
done
```

### From UI:
1. Navigate to Workflows → Import from File
2. Select backup JSON file
3. Click Import
4. Activate workflow

## 3. Full System Recovery

```bash
# 1. Deploy new n8n instance with docker-compose
docker-compose up -d

# 2. Wait for services to be healthy
docker-compose ps

# 3. Restore database (see above)

# 4. Restore workflows (see above)

# 5. Verify all credentials are configured

# 6. Test critical workflows manually

# 7. Re-enable scheduled workflows
```

## Recovery Time Objectives (RTO)

- Database recovery: 15 minutes
- Workflow recovery: 30 minutes
- Full system recovery: 1 hour
- Data loss tolerance (RPO): 24 hours (daily backups)

## Recovery Testing

Test recovery procedure quarterly:
- [ ] Q1 2025: Test database restore
- [ ] Q2 2025: Test workflow import
- [ ] Q3 2025: Test full system recovery
- [ ] Q4 2025: Test disaster scenario
```

---

## 6. Documentation Standards

From BEST_PRACTICES.md (lines 227-261):

**Workflow Documentation Template:**

Create this file for each production workflow:

```markdown
# [Workflow Name]

## Purpose
Brief description of what this workflow does and why it exists.

## Status
- **Environment**: Production
- **Active**: Yes/No
- **Last Updated**: YYYY-MM-DD
- **Owner**: Team/Person Name
- **Criticality**: High/Medium/Low

## Trigger
- **Type**: Webhook / Schedule / Manual / Event
- **Details**:
  - Schedule: Daily at 2 AM UTC (cron: `0 2 * * *`)
  - Webhook URL: `https://your-domain.com/webhook/workflow-name`
  - Authentication: Signature verification enabled

## Dependencies

### External Services
- **OpenAI API**: GPT-4 for text generation
- **Slack**: Notifications to #alerts channel
- **PostgreSQL**: Customer database (read-only)

### Credentials Required
- `Production OpenAI API Key` (Header Auth)
- `Slack Workspace OAuth2` (OAuth2)
- `Customer DB Read-Only` (PostgreSQL)

### Environment Variables
- `OPENAI_API_KEY`: API key for OpenAI
- `CUSTOMER_DB_URL`: PostgreSQL connection string
- `SLACK_CHANNEL_ID`: Alerts channel ID

## Data Flow

1. **Webhook Trigger** - Receives customer inquiry via HTTP POST
2. **Validate Input** - Check required fields (customer_id, question)
3. **Fetch Customer Context** - Query database for customer history
4. **Generate AI Response** - Call GPT-4 with customer context
5. **Send to Customer** - Post response to Slack channel
6. **Log Interaction** - Save to database for analytics

## Node Configuration

### 1. Webhook (Trigger)
- Path: `/webhook/customer-support`
- Method: POST
- Authentication: Signature verification
- Response: `lastNode`

### 2. Validate Input
- Type: IF Node
- Condition: `customer_id` and `question` fields exist
- On fail: Return 400 error via Respond to Webhook

### 3. Fetch Customer Context
- Type: PostgreSQL
- Query: `SELECT * FROM customers WHERE id = $json.customer_id`
- Timeout: 5s
- Error handling: Continue on fail with empty context

### 4. Generate AI Response
- Type: HTTP Request
- Model: GPT-4
- Max tokens: 500
- Temperature: 0.7
- Retry: 3 attempts with exponential backoff

### 5. Send to Customer
- Type: Slack
- Channel: Dynamic based on customer tier
- Format: Markdown with customer name

## Error Handling

- **Strategy**: Exponential backoff with 5 retries
- **Fallback**: Send generic response if AI fails
- **Alerts**: Slack notification on critical errors
- **Logging**: All errors logged to `workflow_errors` table

## Performance

- **Average Execution Time**: 3.2 seconds
- **Max Execution Time**: 30 seconds (timeout)
- **Rate Limit**: 100 requests/minute
- **Batch Size**: N/A (single request processing)

## Monitoring

- **Health Check**: Monitored by `System Health Monitor` workflow
- **Metrics Tracked**:
  - Execution count (daily)
  - Average response time
  - Failure rate
  - API costs
- **Alerts**:
  - Failure rate > 5%: Slack alert
  - Response time > 10s: Email alert
  - API error: Immediate Slack alert

## Testing

### Manual Test Payload
```json
{
  "customer_id": "test-123",
  "question": "How do I reset my password?"
}
```

### Expected Response
```json
{
  "success": true,
  "response": "To reset your password...",
  "execution_time": "2.3s"
}
```

### Test Checklist
- [ ] Valid input → Success response
- [ ] Missing fields → 400 error
- [ ] Invalid customer_id → Generic response
- [ ] AI API failure → Fallback response
- [ ] Database timeout → Continues with empty context

## Maintenance

- **Review Cycle**: Monthly
- **Last Review**: 2025-01-01
- **Next Review**: 2025-02-01
- **Change Log**:
  - 2025-01-01: Initial deployment
  - 2025-01-15: Added exponential backoff
  - 2025-01-20: Increased GPT-4 token limit to 500

## Runbook

### Common Issues

**Issue**: Slack notifications not sending
**Cause**: OAuth token expired
**Fix**: Re-authenticate Slack credential in n8n UI

**Issue**: Database query timeout
**Cause**: Complex query on large table
**Fix**: Added index on `customers.id` field

**Issue**: AI responses too slow
**Cause**: GPT-4 can be slow during peak hours
**Fix**: Fallback to GPT-3.5-turbo if > 10s

### Emergency Procedures

**Disable workflow immediately**:
```bash
curl -X PATCH http://localhost:5678/api/v1/workflows/WORKFLOW_ID \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -d '{"active": false}'
```

**Check recent executions**:
```bash
curl http://localhost:5678/api/v1/executions?workflowId=WORKFLOW_ID&limit=10 \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

## Related Documentation

- [Customer Support System Overview](../docs/customer-support.md)
- [OpenAI API Integration Guide](../docs/openai-integration.md)
- [Database Schema](../docs/database-schema.md)
- [Error Handling Standards](../BEST_PRACTICES.md)
```

---

## 7. Complete Production Hardening Checklist

**Before deploying to production:**

### Infrastructure
- [ ] Docker Compose with PostgreSQL configured
- [ ] Redis for queue mode enabled
- [ ] NGINX reverse proxy with SSL certificate
- [ ] Health checks configured for all services
- [ ] Automatic container restart enabled
- [ ] Persistent volumes for data configured

### Security
- [ ] Strong passwords generated and stored securely
- [ ] JWT secret generated
- [ ] Basic auth or OAuth enabled
- [ ] Environment variables in .env file (not in code)
- [ ] .env file added to .gitignore
- [ ] Webhook signature verification implemented
- [ ] Rate limiting configured in NGINX
- [ ] SSL/TLS certificates installed
- [ ] Security headers configured

### Performance
- [ ] Batch processing for large datasets
- [ ] Database indexes created
- [ ] Query timeouts configured
- [ ] Caching strategy implemented
- [ ] Rate limiting for external APIs
- [ ] Connection pooling enabled

### Monitoring & Logging
- [ ] Health check workflow active
- [ ] Error Trigger workflow configured
- [ ] Slack/Email alerts set up
- [ ] Error logging to database
- [ ] Execution retention configured (7-30 days)
- [ ] Metrics dashboard created

### Backup & Recovery
- [ ] Daily automated backups scheduled
- [ ] Database backup tested
- [ ] Workflow export to GitHub configured
- [ ] Backup retention policy (30 days)
- [ ] Disaster recovery plan documented
- [ ] Recovery procedure tested

### Documentation
- [ ] Workflow documentation created
- [ ] Runbook for common issues
- [ ] Emergency procedures documented
- [ ] Credential rotation schedule
- [ ] Architecture diagram created
- [ ] API documentation

### Testing
- [ ] Manual execution successful
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Load test completed
- [ ] Security scan performed
- [ ] Recovery procedure tested

---

## Quick Start Commands

**Deploy production environment:**
```bash
# 1. Clone repository
git clone https://github.com/your-org/n8n-production.git
cd n8n-production

# 2. Create .env file
cp .env.example .env
# Edit .env with secure values

# 3. Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "N8N_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" >> .env

# 4. Deploy
docker-compose up -d

# 5. Check health
docker-compose ps
docker-compose logs -f n8n

# 6. Access n8n
open https://your-domain.com
```

**Apply best practices to existing workflow:**
```bash
# 1. Export workflow
# 2. Add error handling (continueOnFail, retryOnFail)
# 3. Add monitoring (log critical points)
# 4. Add documentation
# 5. Test thoroughly
# 6. Import back to n8n
# 7. Monitor first executions
```

---

## Integration with Other Skills

- **For templates:** Use `workflow-template-generator.md` with hardened patterns
- **For error handling:** Use `error-handling-implementer.md` patterns
- **For validation:** Use `workflow-validator.md` before applying best practices
- **For troubleshooting:** Use `n8n-troubleshooter.md` if issues arise

---

## Summary

Applying best practices transforms workflows from development to production-ready:

**Without Best Practices:**
- Single point of failure
- No monitoring or alerts
- Credentials in code
- No backups
- Poor performance at scale
- Difficult to maintain

**With Best Practices:**
- High availability (99.9%+)
- Proactive monitoring and alerts
- Secure credential management
- Automated backups and recovery
- Optimized for scale
- Easy to maintain and troubleshoot

**Time Investment:** 2-4 hours for full production setup
**Value:** Prevents downtime, security breaches, and data loss

**Reference Documents:**
- BEST_PRACTICES.md (lines 1-276)
- workflow-templates/*.json
- LESSONS_LEARNED.md
