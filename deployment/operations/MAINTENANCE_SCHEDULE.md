# Maintenance Schedule - n8n Workflow Builder v3.0

## Scheduled Maintenance Calendar

This document defines the regular maintenance schedule and procedures for the n8n Workflow Builder v3.0.

---

## Table of Contents
1. [Maintenance Windows](#maintenance-windows)
2. [Daily Tasks](#daily-tasks)
3. [Weekly Tasks](#weekly-tasks)
4. [Monthly Tasks](#monthly-tasks)
5. [Quarterly Tasks](#quarterly-tasks)
6. [Annual Tasks](#annual-tasks)
7. [Maintenance Automation](#maintenance-automation)

---

## Maintenance Windows

### Standard Maintenance Windows

| Type | Schedule | Duration | Notification |
|------|----------|----------|--------------|
| Daily | 3:00-3:30 AM UTC | 30 minutes | Not required |
| Weekly | Sunday 2:00-4:00 AM UTC | 2 hours | 24 hours advance |
| Monthly | First Sunday 2:00-6:00 AM UTC | 4 hours | 1 week advance |
| Quarterly | As scheduled | 8 hours | 2 weeks advance |
| Emergency | As needed | Variable | ASAP |

### Maintenance Types

- **Type A**: No downtime expected (live maintenance)
- **Type B**: Brief interruption (<5 minutes)
- **Type C**: Service degradation (reduced capacity)
- **Type D**: Full downtime required

---

## Daily Tasks

### Automated Daily Tasks (3:00 AM UTC)

```bash
#!/bin/bash
# daily_maintenance.sh

LOG_FILE="/var/log/n8n/daily_maintenance_$(date +%Y%m%d).log"

echo "=== Daily Maintenance Started: $(date) ===" >> $LOG_FILE

# 1. Log rotation
logrotate /etc/logrotate.d/n8n >> $LOG_FILE 2>&1

# 2. Clean temporary files
find /tmp -name "n8n_*" -mtime +1 -delete >> $LOG_FILE 2>&1
find /var/n8n/temp -mtime +1 -delete >> $LOG_FILE 2>&1

# 3. Database cleanup
psql -U n8n_workflow_user -d n8n_workflows_prod <<EOF >> $LOG_FILE 2>&1
-- Clean expired sessions
DELETE FROM user_sessions WHERE expires_at < NOW();

-- Clean old rate limit records
DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL '7 days';

-- Update statistics
ANALYZE workflow_audit_log;
ANALYZE generated_workflows;
EOF

# 4. Cache cleanup
redis-cli -a $REDIS_PASSWORD <<EOF >> $LOG_FILE 2>&1
-- Remove expired keys
EVAL "return redis.call('del', unpack(redis.call('keys', 'expired:*')))" 0
EOF

# 5. Backup verification
if [ -f "/var/n8n/backups/daily_$(date +%Y%m%d).tar.gz" ]; then
    echo "Daily backup verified" >> $LOG_FILE
else
    echo "WARNING: Daily backup missing!" >> $LOG_FILE
    /opt/scripts/send_alert.sh "Daily backup failed"
fi

# 6. Certificate check
days_until_expiry=$(echo | openssl s_client -connect your-domain.com:443 2>/dev/null | \
    openssl x509 -noout -enddate | \
    sed 's/notAfter=//' | \
    xargs -I {} date -d {} +%s | \
    xargs -I {} echo "(({} - $(date +%s)) / 86400)" | bc)

if [ $days_until_expiry -lt 30 ]; then
    echo "WARNING: SSL certificate expires in $days_until_expiry days" >> $LOG_FILE
    /opt/scripts/renew_certificate.sh
fi

echo "=== Daily Maintenance Completed: $(date) ===" >> $LOG_FILE
```

### Manual Daily Checks (9:00 AM UTC)

- [ ] Review overnight alerts
- [ ] Check backup completion
- [ ] Verify system health
- [ ] Review error logs
- [ ] Check disk usage
- [ ] Monitor queue sizes

---

## Weekly Tasks

### Sunday 2:00-4:00 AM UTC (Type B Maintenance)

```bash
#!/bin/bash
# weekly_maintenance.sh

echo "=== Weekly Maintenance Started: $(date) ==="

# 1. Put system in maintenance mode
touch /var/n8n/maintenance.flag
sleep 60  # Allow current requests to complete

# 2. Database maintenance
psql -U postgres -d n8n_workflows_prod <<EOF
-- Vacuum and analyze all tables
VACUUM ANALYZE;

-- Reindex frequently updated tables
REINDEX TABLE workflow_audit_log;
REINDEX TABLE workflow_metrics;
REINDEX TABLE api_rate_limits;

-- Update table statistics
ANALYZE;

-- Check for table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_stat_get_live_tuples(c.oid) AS live_tuples,
    pg_stat_get_dead_tuples(c.oid) AS dead_tuples
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF

# 3. Archive old data
psql -U n8n_workflow_user -d n8n_workflows_prod <<EOF
-- Archive workflow audit logs older than 90 days
INSERT INTO workflow_audit_log_archive
SELECT * FROM workflow_audit_log
WHERE created_at < NOW() - INTERVAL '90 days'
ON CONFLICT DO NOTHING;

DELETE FROM workflow_audit_log
WHERE created_at < NOW() - INTERVAL '90 days'
AND request_id IN (SELECT request_id FROM workflow_audit_log_archive);

-- Archive metrics older than 30 days
DELETE FROM workflow_metrics
WHERE created_at < NOW() - INTERVAL '30 days';
EOF

# 4. System updates (security patches only)
apt-get update
apt-get install -y --only-upgrade $(apt list --upgradable 2>/dev/null | grep security | cut -d/ -f1)

# 5. Docker cleanup
docker system prune -af --volumes
docker image prune -af

# 6. Rotate encryption keys (if needed)
if [ $(date +%d) -eq 01 ]; then
    /opt/scripts/rotate_encryption_keys.sh
fi

# 7. Performance baseline
/opt/scripts/capture_performance_baseline.sh

# 8. Remove maintenance mode
rm /var/n8n/maintenance.flag

echo "=== Weekly Maintenance Completed: $(date) ==="
```

### Weekly Checklist

- [ ] Review weekly metrics report
- [ ] Check for security updates
- [ ] Verify backup integrity
- [ ] Review capacity trends
- [ ] Update documentation
- [ ] Team sync meeting

---

## Monthly Tasks

### First Sunday 2:00-6:00 AM UTC (Type C Maintenance)

```bash
#!/bin/bash
# monthly_maintenance.sh

echo "=== Monthly Maintenance Started: $(date) ==="

# Notification sent 1 week prior
/opt/scripts/send_maintenance_notification.sh "Monthly maintenance scheduled"

# 1. Full backup
echo "Creating full backup..."
pg_dump -U postgres n8n_workflows_prod | gzip > /var/backups/monthly/db_$(date +%Y%m).sql.gz
tar czf /var/backups/monthly/app_$(date +%Y%m).tar.gz /opt/n8n /var/n8n

# 2. Major database maintenance
psql -U postgres -d n8n_workflows_prod <<EOF
-- Full vacuum (requires downtime)
VACUUM FULL ANALYZE;

-- Rebuild all indexes
REINDEX DATABASE n8n_workflows_prod;

-- Update all statistics
ANALYZE;

-- Reset query statistics
SELECT pg_stat_statements_reset();
EOF

# 3. Security audit
echo "Running security audit..."
/opt/scripts/security_audit.sh

# 4. SSL certificate renewal (if needed)
certbot renew --quiet

# 5. Update dependencies
cd /opt/n8n
npm update
npm audit fix

# 6. Performance testing
/opt/scripts/run_performance_tests.sh

# 7. Disaster recovery test
/opt/scripts/test_dr_procedures.sh

# 8. Clean up old backups
find /var/backups -name "*.gz" -mtime +90 -delete

echo "=== Monthly Maintenance Completed: $(date) ==="
```

### Monthly Review Items

- [ ] Review monthly incidents
- [ ] Update capacity planning
- [ ] Security vulnerability scan
- [ ] Cost optimization review
- [ ] Team training needs
- [ ] Documentation updates
- [ ] SLA compliance review

---

## Quarterly Tasks

### Quarterly Schedule (Type D Maintenance)

**Q1**: First Sunday of January
**Q2**: First Sunday of April
**Q3**: First Sunday of July
**Q4**: First Sunday of October

### Quarterly Maintenance Procedures

```bash
#!/bin/bash
# quarterly_maintenance.sh

echo "=== Quarterly Maintenance Started: $(date) ==="

# 1. Major version updates
echo "Checking for major updates..."
n8n --version
npm show n8n version

read -p "Proceed with update? (y/n) " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    /opt/scripts/upgrade_n8n.sh
fi

# 2. Infrastructure updates
echo "Updating infrastructure..."
apt-get update && apt-get dist-upgrade -y

# 3. Database major version check
pg_config --version

# 4. Comprehensive testing
echo "Running comprehensive test suite..."
/opt/scripts/run_full_test_suite.sh

# 5. Capacity planning
echo "Generating capacity report..."
/opt/scripts/generate_capacity_report.sh

# 6. Compliance audit
echo "Running compliance checks..."
/opt/scripts/compliance_audit.sh

# 7. Disaster recovery drill
echo "Executing DR drill..."
/opt/scripts/execute_dr_drill.sh

# 8. Archive quarterly data
/opt/scripts/archive_quarterly_data.sh

echo "=== Quarterly Maintenance Completed: $(date) ==="
```

### Quarterly Deliverables

- [ ] Performance report
- [ ] Capacity planning document
- [ ] Security assessment
- [ ] Compliance report
- [ ] DR test results
- [ ] Technology roadmap review

---

## Annual Tasks

### Annual Maintenance (Scheduled individually)

#### Infrastructure Review
```bash
#!/bin/bash
# annual_infrastructure_review.sh

# 1. Hardware assessment
echo "=== Hardware Assessment ==="
lscpu
free -h
df -h
lsblk

# 2. Network architecture review
echo "=== Network Review ==="
netstat -tuln
iptables -L
nmap -sV localhost

# 3. Cost analysis
echo "=== Cost Analysis ==="
/opt/scripts/analyze_cloud_costs.sh

# 4. Technology stack evaluation
echo "=== Stack Evaluation ==="
/opt/scripts/evaluate_tech_stack.sh
```

#### Security Review
- [ ] Penetration testing
- [ ] Security audit
- [ ] Access review
- [ ] Key rotation
- [ ] Policy updates

#### Compliance Review
- [ ] GDPR compliance audit
- [ ] Data retention review
- [ ] Privacy policy updates
- [ ] Terms of service review
- [ ] Third-party audits

---

## Maintenance Automation

### Automation Framework

```yaml
# maintenance_automation.yml
automation:
  daily:
    - name: "Log Rotation"
      schedule: "0 3 * * *"
      script: "/opt/scripts/rotate_logs.sh"
      type: "A"

    - name: "Backup"
      schedule: "0 2 * * *"
      script: "/opt/scripts/daily_backup.sh"
      type: "A"

  weekly:
    - name: "Database Vacuum"
      schedule: "0 2 * * 0"
      script: "/opt/scripts/vacuum_db.sh"
      type: "B"

    - name: "Security Updates"
      schedule: "0 3 * * 0"
      script: "/opt/scripts/apply_security_updates.sh"
      type: "B"

  monthly:
    - name: "Full Backup"
      schedule: "0 2 1 * *"
      script: "/opt/scripts/full_backup.sh"
      type: "C"

    - name: "Certificate Check"
      schedule: "0 0 1 * *"
      script: "/opt/scripts/check_certificates.sh"
      type: "A"
```

### Maintenance Notification System

```javascript
// maintenance_notifier.js
const moment = require('moment');
const nodemailer = require('nodemailer');
const slack = require('@slack/web-api');

class MaintenanceNotifier {
  constructor() {
    this.slack = new slack.WebClient(process.env.SLACK_TOKEN);
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async scheduleNotification(maintenance) {
    const { type, start, duration, description } = maintenance;

    // Calculate notification times
    const notifications = [
      { time: moment(start).subtract(1, 'week'), message: '1 week notice' },
      { time: moment(start).subtract(1, 'day'), message: '24 hour notice' },
      { time: moment(start).subtract(1, 'hour'), message: '1 hour notice' }
    ];

    for (const notification of notifications) {
      if (notification.time.isAfter(moment())) {
        await this.sendNotification(maintenance, notification);
      }
    }
  }

  async sendNotification(maintenance, notification) {
    const message = `
      Scheduled Maintenance Notice
      Type: ${maintenance.type}
      Start: ${maintenance.start}
      Duration: ${maintenance.duration}
      Description: ${maintenance.description}
      ${notification.message}
    `;

    // Send to Slack
    await this.slack.chat.postMessage({
      channel: '#maintenance',
      text: message
    });

    // Send email
    await this.mailer.sendMail({
      from: 'noreply@your-domain.com',
      to: 'team@your-domain.com',
      subject: `Maintenance Notice - ${notification.message}`,
      text: message
    });

    // Update status page
    await this.updateStatusPage(maintenance, notification);
  }

  async updateStatusPage(maintenance, notification) {
    // Status page API integration
    const statusPageApi = require('./statuspage-api');
    await statusPageApi.scheduleMaintenance({
      name: maintenance.description,
      scheduled_for: maintenance.start,
      scheduled_until: moment(maintenance.start).add(maintenance.duration, 'hours'),
      message: `Scheduled maintenance: ${maintenance.description}`
    });
  }
}
```

---

## Maintenance Best Practices

### Pre-Maintenance Checklist
- [ ] Notifications sent
- [ ] Backup completed
- [ ] Rollback plan ready
- [ ] Team available
- [ ] Monitoring enhanced
- [ ] Communication channels open

### During Maintenance
- [ ] Follow change management process
- [ ] Document all changes
- [ ] Test after each step
- [ ] Monitor impact
- [ ] Keep stakeholders updated

### Post-Maintenance Checklist
- [ ] Verify services operational
- [ ] Run smoke tests
- [ ] Check monitoring
- [ ] Update documentation
- [ ] Send completion notice
- [ ] Schedule review

---

## Maintenance Records

### Record Template
```markdown
# Maintenance Record

**Date**: YYYY-MM-DD
**Type**: [Daily|Weekly|Monthly|Quarterly|Annual|Emergency]
**Duration**: XX minutes
**Performed By**: Name

## Tasks Completed
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Issues Encountered
None / Description

## Changes Made
- Change 1
- Change 2

## Verification
- [ ] Services operational
- [ ] Tests passed
- [ ] No customer impact

**Sign-off**: _____________
```

---

Last Updated: 2024-01-17
Version: 3.0.0