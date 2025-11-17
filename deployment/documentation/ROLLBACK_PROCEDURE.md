# Rollback Procedure - n8n Workflow Builder v3.0

## Emergency Rollback Plan

This document provides step-by-step instructions for rolling back the n8n Workflow Builder v3.0 deployment in case of critical issues.

---

## Table of Contents
1. [Rollback Decision Matrix](#rollback-decision-matrix)
2. [Pre-Rollback Checklist](#pre-rollback-checklist)
3. [Rollback Procedures](#rollback-procedures)
4. [Database Rollback](#database-rollback)
5. [Post-Rollback Verification](#post-rollback-verification)
6. [Communication Plan](#communication-plan)

---

## Rollback Decision Matrix

### Critical Issues (Immediate Rollback)
| Issue | Severity | Action | Time Limit |
|-------|----------|--------|------------|
| Complete service outage | CRITICAL | Immediate rollback | 5 minutes |
| Data corruption detected | CRITICAL | Immediate rollback | 5 minutes |
| Security breach identified | CRITICAL | Immediate rollback | Immediate |
| > 50% error rate | CRITICAL | Immediate rollback | 10 minutes |
| Database connection failures | HIGH | Rollback after troubleshooting | 15 minutes |

### Non-Critical Issues (Monitored)
| Issue | Severity | Action | Time Limit |
|-------|----------|--------|------------|
| Performance degradation < 20% | MEDIUM | Monitor and patch | 1 hour |
| UI issues | LOW | Hot fix | 2 hours |
| Non-critical feature broken | LOW | Schedule fix | Next release |

---

## Pre-Rollback Checklist

### 1. Gather Information
```bash
# Capture current state
date > /tmp/rollback_$(date +%Y%m%d_%H%M%S).log

# Get container status (if using Docker)
docker ps -a >> /tmp/rollback_$(date +%Y%m%d_%H%M%S).log

# Get application logs
docker logs n8n-workflow-builder --tail 1000 >> /tmp/rollback_$(date +%Y%m%d_%H%M%S).log

# Database status
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod -c "SELECT COUNT(*) FROM workflow_audit_log WHERE created_at > NOW() - INTERVAL '1 hour';" >> /tmp/rollback_$(date +%Y%m%d_%H%M%S).log

# Save current configuration
cp .env .env.backup_$(date +%Y%m%d_%H%M%S)
```

### 2. Notify Stakeholders
- [ ] Send alert to on-call team
- [ ] Notify management
- [ ] Update status page
- [ ] Alert customer support

---

## Rollback Procedures

### Method 1: Docker-Based Rollback (Recommended)

#### Step 1: Stop Current Version
```bash
# Stop v3.0 containers
docker-compose down

# Or if using individual containers
docker stop n8n-workflow-builder
docker stop n8n-postgres
docker stop n8n-redis
```

#### Step 2: Deploy Previous Version
```bash
# Switch to v2.0 branch/tag
git checkout v2.0.0

# Or update docker-compose.yml to use v2.0 image
sed -i 's/n8nio\/n8n:latest/n8nio\/n8n:0.234.0/g' docker-compose.yml

# Deploy v2.0
docker-compose up -d

# Verify deployment
docker ps
curl -I https://your-domain.com/health
```

### Method 2: Manual Rollback

#### Step 1: Stop Current Services
```bash
# If using PM2
pm2 stop n8n-workflow-builder

# If using systemd
sudo systemctl stop n8n-workflow-builder

# Stop Nginx temporarily
sudo systemctl stop nginx
```

#### Step 2: Restore Previous Version
```bash
# Backup current version
sudo mv /opt/n8n/current /opt/n8n/v3.0.0_failed

# Restore previous version
sudo cp -r /opt/n8n/v2.0.0_backup /opt/n8n/current

# Restore previous configuration
cp /opt/n8n/configs/.env.v2.backup /opt/n8n/current/.env

# Restore workflows
cp /var/n8n/backups/workflows_v2.json /home/node/.n8n/workflows/
```

#### Step 3: Restart Services
```bash
# Start n8n
pm2 start n8n-workflow-builder
# Or
sudo systemctl start n8n-workflow-builder

# Start Nginx
sudo systemctl start nginx

# Verify
pm2 status
curl -I https://your-domain.com/health
```

### Method 3: Blue-Green Rollback

```bash
# If using blue-green deployment
# Switch load balancer to previous environment

# Update Nginx upstream
cat > /etc/nginx/sites-available/n8n-lb << EOF
upstream n8n_backend {
    server blue-environment.internal:5678;  # v2.0
    # server green-environment.internal:5678;  # v3.0 (disabled)
}
EOF

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Verify traffic routing
tail -f /var/log/nginx/access.log
```

---

## Database Rollback

### Option 1: Restore from Backup
```bash
# Stop application to prevent new writes
docker-compose stop n8n

# Create backup of current (failed) state
pg_dump -h localhost -U n8n_workflow_user n8n_workflows_prod > /var/backups/db_v3_failed_$(date +%Y%m%d_%H%M%S).sql

# Drop and recreate database
psql -h localhost -U postgres << EOF
DROP DATABASE IF EXISTS n8n_workflows_prod;
CREATE DATABASE n8n_workflows_prod OWNER n8n_workflow_user;
EOF

# Restore v2.0 backup
psql -h localhost -U n8n_workflow_user n8n_workflows_prod < /var/backups/db_v2_latest.sql

# Verify restoration
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod -c "SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;"
```

### Option 2: Rollback Migrations Only
```sql
-- Connect to database
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod

-- Rollback specific migrations
BEGIN;

-- Remove v3.0 specific tables/columns
DROP TABLE IF EXISTS new_v3_table CASCADE;
ALTER TABLE workflow_audit_log DROP COLUMN IF EXISTS v3_specific_column;

-- Update migration tracking
DELETE FROM schema_migrations WHERE version >= '003';

COMMIT;
```

### Option 3: Point-in-Time Recovery
```bash
# If using WAL archiving (PostgreSQL)
# Restore to specific timestamp before deployment

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore from base backup
cp -r /var/backups/postgres/base_backup/* /var/lib/postgresql/14/main/

# Apply WAL logs up to specific time
cat > /var/lib/postgresql/14/main/recovery.conf << EOF
restore_command = 'cp /var/backups/postgres/wal/%f %p'
recovery_target_time = '2025-01-17 10:00:00'
EOF

# Start PostgreSQL
sudo systemctl start postgresql
```

---

## Post-Rollback Verification

### 1. Service Health Checks
```bash
#!/bin/bash
# health_check.sh

echo "=== Post-Rollback Health Check ==="

# Check services
services=("n8n" "postgresql" "redis" "nginx")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✓ $service is running"
    else
        echo "✗ $service is NOT running"
    fi
done

# Check endpoints
endpoints=(
    "https://your-domain.com/health"
    "https://your-domain.com/workflow-builder"
    "https://your-domain.com/rest/health"
)

for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $endpoint)
    if [ $response -eq 200 ]; then
        echo "✓ $endpoint is responding (200)"
    else
        echo "✗ $endpoint returned $response"
    fi
done

# Check database
if psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
fi

# Check version
echo "Current version:"
docker exec n8n-workflow-builder n8n --version || echo "Version check failed"
```

### 2. Functionality Tests
```bash
# Test critical workflows
curl -X POST https://your-domain.com/webhook-test \
  -H "Content-Type: application/json" \
  -d '{"test": "rollback-verification"}'

# Check recent workflow executions
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod << EOF
SELECT
    COUNT(*) as execution_count,
    AVG(processing_time_ms) as avg_time,
    MAX(created_at) as latest_execution
FROM workflow_audit_log
WHERE created_at > NOW() - INTERVAL '10 minutes';
EOF
```

### 3. Performance Metrics
```bash
# Check system resources
echo "=== System Resources ==="
free -h
df -h
top -bn1 | head -20

# Check application metrics
curl -s http://localhost:9090/metrics | grep -E "^n8n_"
```

---

## Communication Plan

### Internal Communication

#### Immediate (0-5 minutes)
```markdown
**INCIDENT ALERT - ROLLBACK IN PROGRESS**
- Service: n8n Workflow Builder
- Action: Rolling back from v3.0 to v2.0
- Reason: [Brief description]
- Impact: Service may be temporarily unavailable
- ETA: 15 minutes
- Incident Commander: [Name]
- Slack Channel: #incident-response
```

#### Status Update (Every 15 minutes)
```markdown
**ROLLBACK STATUS UPDATE**
- Progress: [X]% complete
- Current Step: [Description]
- Issues: [Any complications]
- Revised ETA: [Time]
```

#### Completion
```markdown
**ROLLBACK COMPLETE**
- Service: Restored to v2.0
- Status: Operational
- Downtime: [Duration]
- Next Steps: [RCA planning]
```

### External Communication

#### Status Page Update
```markdown
**Investigating** - We are investigating issues with the Workflow Builder service.
**Identified** - The issue has been identified and we are implementing a fix.
**Monitoring** - A fix has been implemented and we are monitoring the results.
**Resolved** - The issue has been resolved. Service is fully operational.
```

#### Customer Email Template
```markdown
Subject: Service Update - n8n Workflow Builder

Dear Customer,

We experienced a service disruption with the n8n Workflow Builder between [start time] and [end time]. The service has been restored to full functionality.

Impact:
- [Description of impact]

Resolution:
- We have rolled back to the previous stable version
- All functionality has been restored
- No data loss occurred

We apologize for any inconvenience this may have caused.

Best regards,
[Your Team]
```

---

## Post-Rollback Actions

### Immediate (Within 1 hour)
1. [ ] Confirm all services are stable
2. [ ] Document timeline of events
3. [ ] Capture all logs and metrics
4. [ ] Notify all stakeholders of resolution

### Short-term (Within 24 hours)
1. [ ] Conduct initial root cause analysis
2. [ ] Create incident report
3. [ ] Identify immediate fixes needed
4. [ ] Update monitoring alerts

### Long-term (Within 1 week)
1. [ ] Complete detailed RCA
2. [ ] Implement preventive measures
3. [ ] Update deployment procedures
4. [ ] Conduct team retrospective
5. [ ] Update this rollback procedure

---

## Rollback Scripts

### Automated Rollback Script
```bash
#!/bin/bash
# automatic_rollback.sh

set -e

ROLLBACK_VERSION=${1:-"v2.0.0"}
ENVIRONMENT=${2:-"production"}

echo "Starting automatic rollback to $ROLLBACK_VERSION"

# Function to send notifications
notify() {
    echo "$1"
    # Send to Slack
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$1\"}" \
        $SLACK_WEBHOOK_URL
}

# Pre-rollback backup
notify "Creating backup of current state..."
./scripts/backup_current.sh

# Stop services
notify "Stopping services..."
docker-compose down

# Switch version
notify "Switching to $ROLLBACK_VERSION..."
git checkout $ROLLBACK_VERSION

# Deploy previous version
notify "Deploying $ROLLBACK_VERSION..."
docker-compose up -d

# Wait for services to start
sleep 30

# Run health checks
notify "Running health checks..."
if ./scripts/health_check.sh; then
    notify "✅ Rollback successful! Services are healthy."
else
    notify "⚠️ Rollback completed but health checks failed. Manual intervention required."
    exit 1
fi

echo "Rollback completed successfully"
```

---

## Emergency Contacts

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| Incident Commander | John Doe | +1-XXX-XXX-XXXX | john@company.com | @john |
| DevOps Lead | Jane Smith | +1-XXX-XXX-XXXX | jane@company.com | @jane |
| Database Admin | Bob Wilson | +1-XXX-XXX-XXXX | bob@company.com | @bob |
| Security Team | Security | +1-XXX-XXX-XXXX | security@company.com | @security |
| Customer Support | Support | +1-XXX-XXX-XXXX | support@company.com | @support |

---

## Lessons Learned Log

Document any lessons learned from rollbacks here:

| Date | Version | Issue | Resolution | Lesson Learned |
|------|---------|-------|------------|----------------|
| | | | | |
| | | | | |

---

Remember: **Stay calm, follow the procedure, and communicate frequently.**