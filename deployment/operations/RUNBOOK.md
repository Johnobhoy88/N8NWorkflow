# Operations Runbook - n8n Workflow Builder v3.0

## Day-to-Day Operations Guide

This runbook provides standard operating procedures for maintaining the n8n Workflow Builder v3.0 in production.

---

## Table of Contents
1. [Daily Operations](#daily-operations)
2. [Common Tasks](#common-tasks)
3. [Monitoring Procedures](#monitoring-procedures)
4. [Maintenance Tasks](#maintenance-tasks)
5. [Troubleshooting Playbooks](#troubleshooting-playbooks)
6. [Emergency Procedures](#emergency-procedures)

---

## Daily Operations

### Morning Checks (9:00 AM)

#### System Health Verification
```bash
#!/bin/bash
# morning_checks.sh

echo "=== Morning System Check - $(date) ==="

# 1. Check service status
for service in n8n postgresql redis nginx; do
    systemctl is-active --quiet $service && echo "✓ $service is running" || echo "✗ $service is DOWN"
done

# 2. Check disk space
df -h | grep -E "/$|/var"

# 3. Check recent errors
echo "Errors in last 12 hours:"
grep ERROR /var/log/n8n/workflow-builder.log | grep "$(date -d '12 hours ago' '+%Y-%m-%d')" | wc -l

# 4. Check database connections
psql -U n8n_workflow_user -d n8n_workflows_prod -c "SELECT count(*) as connections FROM pg_stat_activity;"

# 5. Check API response time
curl -w "Response time: %{time_total}s\n" -o /dev/null -s https://your-domain.com/health

# 6. Check overnight backup
ls -lah /var/n8n/backups/$(date +%Y%m%d)* 2>/dev/null || echo "⚠ No backup found for today"
```

#### Metrics Review
1. Open Grafana dashboard: https://grafana.your-domain.com/d/workflow-builder
2. Check for any overnight anomalies
3. Review error rate trends
4. Verify resource utilization is within normal ranges

#### Queue Status
```bash
# Check Redis queue status
redis-cli -a $REDIS_PASSWORD <<EOF
INFO clients
LLEN workflow_queue
LLEN error_queue
EOF
```

### Midday Checks (2:00 PM)

#### Performance Monitoring
```sql
-- Check slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Check table bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

#### API Health Check
```bash
# Test all endpoints
for endpoint in health metrics workflow-builder form/workflow-builder; do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/$endpoint)
    echo "$endpoint: $response_code"
done
```

### End of Day Checks (6:00 PM)

#### Daily Summary Report
```bash
#!/bin/bash
# daily_summary.sh

echo "=== Daily Summary Report - $(date) ==="

# Today's statistics
psql -U n8n_workflow_user -d n8n_workflows_prod <<EOF
SELECT
    COUNT(DISTINCT request_id) as total_requests,
    COUNT(DISTINCT client_email) as unique_users,
    AVG(processing_time_ms) as avg_processing_ms,
    SUM(CASE WHEN error = true THEN 1 ELSE 0 END) as errors,
    ROUND(100.0 * SUM(CASE WHEN error = true THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate
FROM workflow_audit_log
WHERE DATE(created_at) = CURRENT_DATE;
EOF

# Send summary to Slack
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"Daily Summary: See attached report\"}"
```

---

## Common Tasks

### Restart Services

#### Graceful Restart
```bash
# Stop accepting new requests
touch /var/n8n/maintenance.flag

# Wait for current requests to complete (max 60 seconds)
timeout 60 bash -c 'while [ $(curl -s http://localhost:5678/metrics | grep -c "active_requests [1-9]") -gt 0 ]; do sleep 1; done'

# Restart services
systemctl restart n8n-workflow-builder

# Remove maintenance flag
rm /var/n8n/maintenance.flag

# Verify service is running
systemctl status n8n-workflow-builder
```

#### Emergency Restart
```bash
# Force restart (use only when necessary)
systemctl stop n8n-workflow-builder
killall -9 n8n
systemctl start n8n-workflow-builder
```

### Clear Cache

#### Redis Cache
```bash
# Clear all cache
redis-cli -a $REDIS_PASSWORD FLUSHALL

# Clear specific cache pattern
redis-cli -a $REDIS_PASSWORD --scan --pattern "workflow:*" | xargs redis-cli -a $REDIS_PASSWORD DEL
```

#### Application Cache
```bash
# Clear n8n internal cache
rm -rf /home/node/.n8n/.cache/*

# Clear workflow cache
rm -rf /var/n8n/cache/*
```

### Database Maintenance

#### Vacuum and Analyze
```sql
-- Run during low-traffic period
VACUUM ANALYZE workflow_audit_log;
VACUUM ANALYZE generated_workflows;
VACUUM ANALYZE workflow_metrics;

-- Full vacuum (requires more downtime)
VACUUM FULL workflow_audit_log;
```

#### Index Maintenance
```sql
-- Reindex tables
REINDEX TABLE workflow_audit_log;
REINDEX TABLE generated_workflows;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Log Management

#### Archive Old Logs
```bash
# Compress logs older than 7 days
find /var/log/n8n -name "*.log" -mtime +7 -exec gzip {} \;

# Move to archive
mkdir -p /var/log/n8n/archive/$(date +%Y%m)
mv /var/log/n8n/*.gz /var/log/n8n/archive/$(date +%Y%m)/

# Upload to S3
aws s3 sync /var/log/n8n/archive/ s3://n8n-logs-archive/
```

#### Extract Error Patterns
```bash
# Find common error patterns
grep ERROR /var/log/n8n/workflow-builder.log | \
  sed 's/^.*ERROR/ERROR/' | \
  sort | uniq -c | sort -rn | head -20
```

### User Management

#### Check Active Users
```sql
SELECT
    client_email,
    COUNT(*) as request_count,
    MAX(created_at) as last_active,
    AVG(processing_time_ms) as avg_time_ms
FROM workflow_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY client_email
ORDER BY request_count DESC
LIMIT 20;
```

#### Block Abusive Users
```bash
# Add to rate limit blacklist
redis-cli -a $REDIS_PASSWORD SADD blocked_users "user@example.com"

# Check if user is blocked
redis-cli -a $REDIS_PASSWORD SISMEMBER blocked_users "user@example.com"

# Remove from blacklist
redis-cli -a $REDIS_PASSWORD SREM blocked_users "user@example.com"
```

---

## Monitoring Procedures

### Alert Response

#### High Error Rate Alert
1. Check current error rate:
```sql
SELECT
    DATE_TRUNC('minute', created_at) as minute,
    COUNT(*) as total,
    SUM(CASE WHEN error = true THEN 1 ELSE 0 END) as errors,
    ROUND(100.0 * SUM(CASE WHEN error = true THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate
FROM workflow_audit_log
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY minute
ORDER BY minute DESC;
```

2. Identify error patterns:
```bash
tail -1000 /var/log/n8n/error.log | grep ERROR | tail -20
```

3. Check external service status:
```bash
# Check AI service
curl -I https://api.openai.com/v1/health

# Check database
pg_isready -h localhost -p 5432
```

#### High Memory Usage Alert
1. Identify memory consumers:
```bash
ps aux --sort=-%mem | head -10
```

2. Check for memory leaks:
```bash
# Monitor over time
for i in {1..10}; do
    ps aux | grep n8n | awk '{print $4}' | head -1
    sleep 10
done
```

3. Restart if necessary:
```bash
systemctl restart n8n-workflow-builder
```

### Performance Tuning

#### Identify Bottlenecks
```bash
# CPU bottleneck
mpstat 1 10

# I/O bottleneck
iostat -x 1 10

# Network bottleneck
iftop -n -t -s 10
```

#### Optimize Database
```sql
-- Find missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    AND n_distinct > 100
    AND correlation < 0.1
ORDER BY n_distinct DESC;
```

---

## Maintenance Tasks

### Weekly Maintenance (Sundays 2:00 AM)

```bash
#!/bin/bash
# weekly_maintenance.sh

# 1. Database maintenance
psql -U postgres -d n8n_workflows_prod <<EOF
VACUUM ANALYZE;
REINDEX DATABASE n8n_workflows_prod;
EOF

# 2. Clean old data
psql -U n8n_workflow_user -d n8n_workflows_prod <<EOF
-- Archive old audit logs
INSERT INTO workflow_audit_log_archive
SELECT * FROM workflow_audit_log
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM workflow_audit_log
WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean old metrics
DELETE FROM workflow_metrics
WHERE created_at < NOW() - INTERVAL '30 days';
EOF

# 3. Rotate logs
logrotate -f /etc/logrotate.d/n8n

# 4. Update SSL certificates if needed
certbot renew --quiet

# 5. Test backup restoration
/opt/scripts/test_backup_restore.sh
```

### Monthly Maintenance (First Sunday)

```bash
#!/bin/bash
# monthly_maintenance.sh

# 1. Full backup
pg_dump -U n8n_workflow_user -d n8n_workflows_prod | gzip > /var/backups/monthly/db_$(date +%Y%m).sql.gz

# 2. Security updates
apt-get update
apt-get upgrade -y

# 3. Performance analysis
/opt/scripts/generate_performance_report.sh

# 4. Capacity planning
/opt/scripts/capacity_check.sh

# 5. Update documentation
/opt/scripts/update_runbook.sh
```

---

## Troubleshooting Playbooks

### Playbook: Workflow Generation Timeout

**Symptoms**: Workflows taking > 60 seconds to generate or timing out

**Resolution Steps**:
1. Check AI service status:
```bash
curl -w "@curl-format.txt" -o /dev/null -s https://api.openai.com/v1/models
```

2. Check database locks:
```sql
SELECT * FROM pg_locks WHERE NOT granted;
```

3. Increase timeout temporarily:
```bash
export N8N_WORKFLOW_TIMEOUT=120
systemctl restart n8n-workflow-builder
```

4. Switch to backup AI provider:
```bash
export AI_PROVIDER=backup
systemctl restart n8n-workflow-builder
```

### Playbook: Database Connection Pool Exhausted

**Symptoms**: "Too many connections" errors

**Resolution Steps**:
1. Kill idle connections:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < CURRENT_TIMESTAMP - INTERVAL '10 minutes';
```

2. Increase connection limit:
```sql
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

3. Restart application with larger pool:
```bash
export DB_POOL_MAX=50
systemctl restart n8n-workflow-builder
```

### Playbook: Redis Memory Full

**Symptoms**: Redis OOM errors

**Resolution Steps**:
1. Check memory usage:
```bash
redis-cli -a $REDIS_PASSWORD INFO memory
```

2. Clear expired keys:
```bash
redis-cli -a $REDIS_PASSWORD --scan --pattern "*" | xargs -L 100 redis-cli -a $REDIS_PASSWORD TTL | grep -c -- -1
```

3. Increase memory limit:
```bash
redis-cli -a $REDIS_PASSWORD CONFIG SET maxmemory 4gb
redis-cli -a $REDIS_PASSWORD CONFIG SET maxmemory-policy allkeys-lru
```

---

## Emergency Procedures

### Complete Outage

1. **Assess the situation**:
```bash
/opt/scripts/emergency_assessment.sh
```

2. **Notify stakeholders**:
```bash
/opt/scripts/send_emergency_notification.sh "Complete outage detected"
```

3. **Activate disaster recovery**:
```bash
/opt/scripts/activate_dr_site.sh
```

4. **Monitor recovery**:
```bash
watch -n 5 /opt/scripts/recovery_status.sh
```

### Data Corruption

1. **Stop all writes**:
```bash
touch /var/n8n/readonly.flag
```

2. **Assess damage**:
```sql
-- Check data integrity
SELECT COUNT(*), MIN(created_at), MAX(created_at)
FROM workflow_audit_log;
```

3. **Restore from backup**:
```bash
/opt/scripts/restore_from_backup.sh --point-in-time "2024-01-17 10:00:00"
```

4. **Verify restoration**:
```bash
/opt/scripts/verify_data_integrity.sh
```

---

## Contact Information

### On-Call Rotation

| Role | Primary | Backup | Phone |
|------|---------|--------|-------|
| DevOps Lead | John Smith | Jane Doe | +1-XXX-XXX-XXXX |
| Database Admin | Bob Wilson | Alice Brown | +1-XXX-XXX-XXXX |
| Application Lead | Charlie Davis | Dana White | +1-XXX-XXX-XXXX |

### Escalation Path

1. Level 1: On-call engineer (0-15 minutes)
2. Level 2: Team lead (15-30 minutes)
3. Level 3: Director of Engineering (30-60 minutes)
4. Level 4: CTO (60+ minutes)

### Vendor Support

- **AI Service**: support@openai.com
- **AWS Support**: AWS Console > Support Center
- **Database Support**: support@postgresql.org

---

## Appendix

### Useful Commands Quick Reference

```bash
# Service management
systemctl [start|stop|restart|status] n8n-workflow-builder

# Log viewing
tail -f /var/log/n8n/workflow-builder.log
journalctl -u n8n-workflow-builder -f

# Database access
psql -U n8n_workflow_user -d n8n_workflows_prod

# Redis access
redis-cli -a $REDIS_PASSWORD

# Docker commands
docker ps
docker logs n8n-workflow-builder
docker exec -it n8n-workflow-builder /bin/bash

# Performance monitoring
htop
iotop
iftop
```

---

Last Updated: 2024-01-17
Version: 3.0.0