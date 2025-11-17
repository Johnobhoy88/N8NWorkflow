# Deployment Checklist - n8n Workflow Builder (Production)

## Pre-Deployment Checklist

Use this checklist to ensure the workflow is production-ready before activation.

---

## Phase 1: Environment Preparation

### 1.1 Infrastructure Setup

- [ ] **n8n Instance**
  - [ ] Version 1.0.0 or later installed
  - [ ] Instance accessible via HTTPS
  - [ ] SSL certificate valid
  - [ ] Domain name configured (e.g., `n8n.company.com`)
  - [ ] Firewall rules configured

- [ ] **Server Resources**
  - [ ] Minimum 2GB RAM available
  - [ ] Minimum 2 CPU cores
  - [ ] 10GB disk space available
  - [ ] Database connection stable
  - [ ] Redis (if using queue mode)

- [ ] **Network**
  - [ ] Outbound HTTPS allowed (port 443)
  - [ ] Webhook endpoints accessible
  - [ ] Form endpoint accessible
  - [ ] Email delivery working (SMTP/Gmail)

**Sign-off**: ______________________ Date: __________

---

### 1.2 API & Service Accounts

- [ ] **Google Gemini API**
  - [ ] API key generated at [Google AI Studio](https://makersuite.google.com)
  - [ ] API key tested (sample request successful)
  - [ ] Quota limits understood:
    - [ ] Requests per minute: ______
    - [ ] Requests per day: ______
  - [ ] Billing enabled (if required)
  - [ ] Cost alerts configured

- [ ] **Gmail Account**
  - [ ] Dedicated service account created
  - [ ] OAuth2 credentials generated
  - [ ] Gmail API enabled in Google Cloud Console
  - [ ] Required scopes granted:
    - [ ] `gmail.readonly` (for trigger)
    - [ ] `gmail.send` (for responses)
    - [ ] `gmail.modify` (for marking read)
  - [ ] Daily sending limit verified (500/day for free)

- [ ] **Backup Accounts** (recommended)
  - [ ] Backup Gmail account configured
  - [ ] Backup Gemini API key available
  - [ ] Documented in runbook

**Sign-off**: ______________________ Date: __________

---

### 1.3 Environment Variables

- [ ] **Required Variables**
  - [ ] `GEMINI_API_KEY` set in n8n environment
  - [ ] Value matches key from Google AI Studio
  - [ ] No trailing spaces or newlines
  - [ ] Encrypted at rest (if supported)

- [ ] **Optional Variables**
  - [ ] `WEBHOOK_URL` (if custom domain)
  - [ ] `TIMEZONE` (default: America/New_York)
  - [ ] `LOG_LEVEL` (default: info)

- [ ] **Security**
  - [ ] Environment variables not committed to git
  - [ ] Access to variables restricted (RBAC)
  - [ ] Rotation policy defined (every 90 days)

**Verification**:
```bash
# Test environment variable access
curl -X POST https://n8n.company.com/webhook-test/env-check
# Should NOT return actual API key value
```

**Sign-off**: ______________________ Date: __________

---

## Phase 2: Workflow Installation

### 2.1 Import Workflow

- [ ] **Download Workflow**
  - [ ] `workflow-builder-gemini-v2-production.json` obtained
  - [ ] File hash verified (integrity check)
  - [ ] Version confirmed: `3.0`

- [ ] **Import Process**
  - [ ] Logged into n8n instance
  - [ ] Navigated to Workflows → Import from File
  - [ ] Selected `workflow-builder-gemini-v2-production.json`
  - [ ] Import successful (no errors)
  - [ ] Workflow ID noted: ______________________

- [ ] **Verification**
  - [ ] All 24 nodes visible
  - [ ] No red error indicators
  - [ ] Connections intact
  - [ ] Workflow settings preserved

**Sign-off**: ______________________ Date: __________

---

### 2.2 Configure Credentials

#### Gmail OAuth2 (Email Trigger)

- [ ] **Create Credential**
  - [ ] Node: "Email Trigger"
  - [ ] Click "Credentials" → "Create New"
  - [ ] Select "Gmail OAuth2 API"
  - [ ] Name: "Gmail OAuth2"

- [ ] **OAuth Flow**
  - [ ] Clicked "Connect my account"
  - [ ] Authorized with service account
  - [ ] Granted all required scopes
  - [ ] Connection successful
  - [ ] Test connection passed

- [ ] **Verify Permissions**
  - [ ] Read emails: ✅
  - [ ] Modify emails (mark read): ✅
  - [ ] Send emails: ✅

#### Gmail OAuth2 (Email Sending)

- [ ] **Assign Credential**
  - [ ] Node: "Send Workflow Email"
  - [ ] Select existing "Gmail OAuth2" credential
  - [ ] Save node

- [ ] **Assign to Error Email**
  - [ ] Node: "Send Error Email"
  - [ ] Select existing "Gmail OAuth2" credential
  - [ ] Save node

**Sign-off**: ______________________ Date: __________

---

### 2.3 Configure Workflow Settings

- [ ] **Execution Settings**
  - [ ] Execution order: `v1` (sequential)
  - [ ] Save error executions: `all`
  - [ ] Save success executions: `all` (or `none` for production)
  - [ ] Save execution progress: `true`
  - [ ] Save manual executions: `true`

- [ ] **Security Settings**
  - [ ] Caller policy: `workflowsFromSameOwner`
  - [ ] Error workflow: (blank or specify dedicated error workflow)

- [ ] **Time Settings**
  - [ ] Timezone: Verified (e.g., `America/New_York`)
  - [ ] Execution timeout: `600` seconds (10 minutes)
  - [ ] Max execution timeout: `3600` seconds (1 hour)

- [ ] **Tags**
  - [ ] `production` tag applied
  - [ ] `ai-workflow` tag applied
  - [ ] `workflow-builder` tag applied

**Sign-off**: ______________________ Date: __________

---

## Phase 3: Testing

### 3.1 Unit Tests

- [ ] **Data Normalizer**
  - [ ] TEST-001: Email input (✅ Pass / ❌ Fail)
  - [ ] TEST-002: Form input (✅ Pass / ❌ Fail)
  - [ ] TEST-003: XSS protection (✅ Pass / ❌ Fail)
  - [ ] TEST-004: Invalid email (✅ Pass / ❌ Fail)
  - [ ] TEST-005: Brief too short (✅ Pass / ❌ Fail)

- [ ] **API Nodes**
  - [ ] TEST-009: Brief parser success (✅ Pass / ❌ Fail)
  - [ ] TEST-010: Timeout handling (✅ Pass / ❌ Fail)
  - [ ] TEST-011: Rate limit retry (✅ Pass / ❌ Fail)

**Sign-off**: ______________________ Date: __________

---

### 3.2 Integration Tests

- [ ] **Manual Trigger Test**
  - [ ] Executed TEST-012 (E2E manual)
  - [ ] Result: ✅ Pass / ❌ Fail
  - [ ] Execution time: ______ seconds
  - [ ] Email received: Yes / No
  - [ ] Workflow JSON valid: Yes / No

- [ ] **Form Trigger Test**
  - [ ] Executed TEST-013 (E2E form)
  - [ ] Form URL: ______________________
  - [ ] Result: ✅ Pass / ❌ Fail
  - [ ] Email received: Yes / No

- [ ] **Email Trigger Test**
  - [ ] Executed TEST-014 (E2E email)
  - [ ] Test email sent at: ______
  - [ ] Email detected within 2 minutes: Yes / No
  - [ ] Result: ✅ Pass / ❌ Fail
  - [ ] Response email received: Yes / No

- [ ] **Error Path Test**
  - [ ] Executed TEST-015 (error handling)
  - [ ] Error correctly routed: Yes / No
  - [ ] Error email received: Yes / No
  - [ ] Result: ✅ Pass / ❌ Fail

**Sign-off**: ______________________ Date: __________

---

### 3.3 Performance Tests

- [ ] **Simple Brief Test**
  - [ ] Executed TEST-017
  - [ ] Execution time: ______ seconds
  - [ ] Target: < 70 seconds
  - [ ] Result: ✅ Pass / ❌ Fail

- [ ] **Complex Brief Test**
  - [ ] Executed TEST-018
  - [ ] Execution time: ______ seconds
  - [ ] Target: < 150 seconds
  - [ ] Result: ✅ Pass / ❌ Fail

- [ ] **Concurrent Execution Test**
  - [ ] Executed TEST-019 (5 concurrent)
  - [ ] All completed: Yes / No
  - [ ] Average time: ______ seconds
  - [ ] Result: ✅ Pass / ❌ Fail

**Sign-off**: ______________________ Date: __________

---

### 3.4 Security Tests

- [ ] **Input Sanitization**
  - [ ] TEST-003: XSS protection (✅ Pass / ❌ Fail)
  - [ ] TEST-021: SQL injection (✅ Pass / ❌ Fail)
  - [ ] TEST-025: Path traversal (✅ Pass / ❌ Fail)

- [ ] **Credential Security**
  - [ ] TEST-024: No credential exposure (✅ Pass / ❌ Fail)
  - [ ] Credentials encrypted in database: Yes / No
  - [ ] API keys not in logs: Yes / No

- [ ] **Access Control**
  - [ ] Form URL not publicly listed: Yes / No
  - [ ] Workflow execution restricted: Yes / No
  - [ ] Admin access audited: Yes / No

**Sign-off**: ______________________ Date: __________

---

### 3.5 Monitoring Tests

- [ ] **Health Check**
  - [ ] Executed TEST-026
  - [ ] Health endpoint responds: Yes / No
  - [ ] Response format correct: Yes / No
  - [ ] Result: ✅ Pass / ❌ Fail

- [ ] **Logging**
  - [ ] Executed TEST-027
  - [ ] Logs created at key stages: Yes / No
  - [ ] Log format is valid JSON: Yes / No
  - [ ] Result: ✅ Pass / ❌ Fail

- [ ] **Error Alerting**
  - [ ] Executed TEST-028
  - [ ] Error logs created: Yes / No
  - [ ] Log level correct (error): Yes / No
  - [ ] Result: ✅ Pass / ❌ Fail

**Sign-off**: ______________________ Date: __________

---

## Phase 4: Documentation

### 4.1 User Documentation

- [ ] **README**
  - [ ] `workflow-builder-gemini-v2-production-README.md` created
  - [ ] Setup instructions verified
  - [ ] Usage examples tested
  - [ ] Troubleshooting section complete

- [ ] **Test Cases**
  - [ ] `test-cases.md` created
  - [ ] All 30 test cases documented
  - [ ] Test results recorded
  - [ ] Pass criteria defined

- [ ] **Deployment Checklist**
  - [ ] `deployment-checklist.md` created (this document)
  - [ ] All sections completed
  - [ ] Sign-offs obtained

**Sign-off**: ______________________ Date: __________

---

### 4.2 Operational Documentation

- [ ] **Runbook Created**
  - [ ] How to activate/deactivate workflow
  - [ ] How to check execution logs
  - [ ] How to handle common errors
  - [ ] Emergency contacts listed

- [ ] **Architecture Diagram**
  - [ ] Workflow diagram created
  - [ ] Node connections documented
  - [ ] Data flow illustrated
  - [ ] External dependencies noted

- [ ] **SLA/SLO Documentation**
  - [ ] Response time SLO: < 150 seconds (95th percentile)
  - [ ] Uptime SLA: 99.5% monthly
  - [ ] Error rate SLO: < 5%
  - [ ] Email delivery SLA: < 5 minutes

**Sign-off**: ______________________ Date: __________

---

## Phase 5: Monitoring Setup

### 5.1 Logging Configuration

- [ ] **Log Aggregation**
  - [ ] Logs forwarded to central system (e.g., Datadog, Splunk)
  - [ ] Log retention policy: 30 days
  - [ ] Log search working
  - [ ] Log correlation by execution ID working

- [ ] **Log Levels**
  - [ ] INFO: Data normalized, QA complete
  - [ ] ERROR: Validation failures, API errors
  - [ ] DEBUG: (disabled in production)

**Sign-off**: ______________________ Date: __________

---

### 5.2 Metrics & Dashboards

- [ ] **Monitoring Dashboard**
  - [ ] `monitoring-dashboard-config.json` imported
  - [ ] Dashboard accessible to ops team
  - [ ] Metrics visible:
    - [ ] Execution count (success/failure)
    - [ ] Average execution time
    - [ ] Error rate by stage
    - [ ] QA confidence distribution
    - [ ] API timeout occurrences

- [ ] **Key Metrics**
  ```
  Metric                          | Target      | Current
  --------------------------------|-------------|--------
  Success rate                    | > 95%       | ____%
  Avg execution time (simple)     | < 70s       | ____s
  Avg execution time (complex)    | < 150s      | ____s
  API timeout rate                | < 1%        | ____%
  Email delivery rate             | > 99%       | ____%
  ```

**Sign-off**: ______________________ Date: __________

---

### 5.3 Alerting Rules

- [ ] **Critical Alerts** (PagerDuty/OpsGenie)
  - [ ] Error rate > 10% in 5 minutes
  - [ ] Workflow inactive > 10 minutes (if should be active)
  - [ ] Health check fails 3 consecutive times
  - [ ] Gmail quota exceeded

- [ ] **Warning Alerts** (Slack/Email)
  - [ ] Error rate > 5% in 15 minutes
  - [ ] Execution time > 200 seconds (95th percentile)
  - [ ] API timeout rate > 5%
  - [ ] Unusual spike in requests (> 10x baseline)

- [ ] **Info Alerts** (Slack)
  - [ ] Daily summary report
  - [ ] Weekly usage stats
  - [ ] Monthly cost report

**Alert Configuration File**: `alerts-config.yml`

**Sign-off**: ______________________ Date: __________

---

## Phase 6: Security Hardening

### 6.1 Access Control

- [ ] **User Permissions**
  - [ ] Workflow edit access: Limited to ______ users
  - [ ] Workflow view access: Limited to ______ users
  - [ ] Execution data access: Audited monthly
  - [ ] Credential access: Admin only

- [ ] **API Keys**
  - [ ] Gemini API key access restricted
  - [ ] API key rotation scheduled (every 90 days)
  - [ ] Backup keys secured

- [ ] **Network Security**
  - [ ] Firewall rules reviewed
  - [ ] Only required ports open
  - [ ] VPN access configured (if applicable)
  - [ ] Rate limiting enabled

**Sign-off**: ______________________ Date: __________

---

### 6.2 Data Privacy

- [ ] **PII Handling**
  - [ ] Client emails encrypted at rest
  - [ ] Execution data retention: 30 days
  - [ ] GDPR compliance reviewed
  - [ ] Data deletion procedure documented

- [ ] **Audit Logging**
  - [ ] Workflow modifications logged
  - [ ] Credential access logged
  - [ ] User actions logged
  - [ ] Logs tamper-proof

**Sign-off**: ______________________ Date: __________

---

### 6.3 Secrets Management

- [ ] **Environment Variables**
  - [ ] Stored in secure vault (HashiCorp Vault, AWS Secrets Manager)
  - [ ] Not visible in n8n UI
  - [ ] Access audited
  - [ ] Rotation automated

- [ ] **OAuth Tokens**
  - [ ] Stored encrypted
  - [ ] Auto-refresh enabled
  - [ ] Expiry monitored
  - [ ] Revocation procedure documented

**Sign-off**: ______________________ Date: __________

---

## Phase 7: Backup & Disaster Recovery

### 7.1 Backup Strategy

- [ ] **Workflow Backup**
  - [ ] Workflow JSON exported to git repository
  - [ ] Backup frequency: Daily
  - [ ] Backup retention: 30 days
  - [ ] Backup tested (restore successful)

- [ ] **Database Backup**
  - [ ] n8n database backed up daily
  - [ ] Backup location: ______________________
  - [ ] Restore procedure tested
  - [ ] RTO: ______ hours
  - [ ] RPO: ______ hours

- [ ] **Credential Backup**
  - [ ] OAuth tokens backed up securely
  - [ ] API keys documented in secure vault
  - [ ] Recovery procedure documented

**Sign-off**: ______________________ Date: __________

---

### 7.2 Disaster Recovery Plan

- [ ] **Failure Scenarios**
  - [ ] n8n instance failure: ______________________
  - [ ] Database failure: ______________________
  - [ ] Gemini API outage: ______________________
  - [ ] Gmail service outage: ______________________
  - [ ] Complete system failure: ______________________

- [ ] **Recovery Procedures**
  - [ ] Documented in runbook
  - [ ] Tested annually
  - [ ] Team trained on procedures
  - [ ] Contact list updated

- [ ] **Failover**
  - [ ] Backup n8n instance available: Yes / No
  - [ ] Automatic failover: Yes / No
  - [ ] Manual failover tested: Yes / No

**Sign-off**: ______________________ Date: __________

---

## Phase 8: Production Activation

### 8.1 Pre-Activation Checklist

- [ ] **All Tests Passed**
  - [ ] Unit tests: 100% pass
  - [ ] Integration tests: 100% pass
  - [ ] Performance tests: > 90% within targets
  - [ ] Security tests: 100% pass
  - [ ] Monitoring tests: 100% pass

- [ ] **Documentation Complete**
  - [ ] README finalized
  - [ ] Test cases documented
  - [ ] Runbook created
  - [ ] Team trained

- [ ] **Monitoring Active**
  - [ ] Dashboard live
  - [ ] Alerts configured
  - [ ] On-call rotation established

- [ ] **Stakeholder Approval**
  - [ ] Product owner: ______________________ Date: ______
  - [ ] Engineering lead: ______________________ Date: ______
  - [ ] Security team: ______________________ Date: ______
  - [ ] Operations team: ______________________ Date: ______

**Sign-off**: ______________________ Date: __________

---

### 8.2 Activation Process

- [ ] **Soft Launch (Week 1)**
  - [ ] Activate workflow
  - [ ] Announce to pilot users (5-10 people)
  - [ ] Monitor closely (daily reviews)
  - [ ] Gather feedback
  - [ ] Fix critical issues

- [ ] **Pilot Results**
  - [ ] Total executions: ______
  - [ ] Success rate: ______%
  - [ ] Avg execution time: ______s
  - [ ] User feedback score: ______/10
  - [ ] Critical issues: ______

- [ ] **Full Launch (Week 2)**
  - [ ] Announce to all users
  - [ ] Update documentation URL in announcements
  - [ ] Monitor for 48 hours
  - [ ] Address any spikes in errors

**Activation Date**: ____________________
**Activated By**: ____________________

**Sign-off**: ______________________ Date: __________

---

### 8.3 Post-Activation Monitoring

- [ ] **Day 1**
  - [ ] Check dashboard every hour
  - [ ] Review all error logs
  - [ ] Respond to user questions
  - [ ] Success rate: ______%

- [ ] **Week 1**
  - [ ] Daily dashboard review
  - [ ] Weekly team sync
  - [ ] User feedback collection
  - [ ] Performance optimization if needed

- [ ] **Month 1**
  - [ ] Weekly reviews
  - [ ] Monthly usage report
  - [ ] Cost analysis
  - [ ] Feature requests logged

**Sign-off**: ______________________ Date: __________

---

## Phase 9: Ongoing Maintenance

### 9.1 Regular Maintenance Tasks

- [ ] **Daily**
  - [ ] Check dashboard for anomalies
  - [ ] Review error logs
  - [ ] Verify health check passing

- [ ] **Weekly**
  - [ ] Review execution metrics
  - [ ] Check API quota usage
  - [ ] Update team on status

- [ ] **Monthly**
  - [ ] Review and update documentation
  - [ ] Test disaster recovery
  - [ ] Review access logs
  - [ ] Update dependencies (n8n version)

- [ ] **Quarterly**
  - [ ] Rotate API keys
  - [ ] Security audit
  - [ ] Performance review
  - [ ] Cost optimization

**Sign-off**: ______________________ Date: __________

---

### 9.2 Update Procedure

When updating the workflow:

- [ ] **Pre-Update**
  - [ ] Export current workflow (backup)
  - [ ] Review changelog
  - [ ] Test update in staging environment
  - [ ] Notify users of maintenance window

- [ ] **Update**
  - [ ] Deactivate workflow
  - [ ] Import new version
  - [ ] Verify settings preserved
  - [ ] Run smoke tests
  - [ ] Reactivate

- [ ] **Post-Update**
  - [ ] Monitor for 24 hours
  - [ ] Rollback if issues (use backup)
  - [ ] Update documentation
  - [ ] Notify users of completion

**Sign-off**: ______________________ Date: __________

---

## Final Sign-Off

### Production Readiness

All phases complete and signed off:

- [ ] Phase 1: Environment Preparation
- [ ] Phase 2: Workflow Installation
- [ ] Phase 3: Testing
- [ ] Phase 4: Documentation
- [ ] Phase 5: Monitoring Setup
- [ ] Phase 6: Security Hardening
- [ ] Phase 7: Backup & Disaster Recovery
- [ ] Phase 8: Production Activation
- [ ] Phase 9: Ongoing Maintenance Plan

### Stakeholder Approvals

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Engineering Lead | | | |
| Security Team | | | |
| Operations Team | | | |
| Quality Assurance | | | |

### Production Go/No-Go Decision

**Decision**: ☐ GO / ☐ NO-GO

**Justification**: ________________________________________________

**Approved By**: ______________________ Date: __________

---

## Post-Deployment

### Launch Announcement

**Subject**: n8n Workflow Builder Now Available

**Sent To**: ______________________
**Sent On**: ______________________

**Body**:
```
Hi Team,

We're excited to announce the n8n Workflow Builder is now live in production!

How to use:
- Email: Send [WORKFLOW] requests to workflows@company.com
- Web Form: https://n8n.company.com/form/workflow-builder
- Documentation: https://docs.company.com/workflow-builder

Features:
- AI-powered workflow generation
- Production-ready output
- Automated QA validation
- Response in 2-3 minutes

Questions? Reply to this email or check the docs.

Happy automating!
- The Automation Team
```

### First Week Review

**Date**: ______________________

**Metrics**:
- Total executions: ______
- Success rate: ______%
- Avg execution time: ______s
- User feedback: ______/10
- Issues reported: ______

**Action Items**:
1. ______________________
2. ______________________
3. ______________________

**Next Review**: ______________________

---

**Deployment Completed**: ☐ Yes / ☐ No
**Date**: ______________________
**By**: ______________________

---

## Appendix

### A. Contact List

| Role | Name | Email | Phone |
|------|------|-------|-------|
| On-Call Engineer | | | |
| Engineering Manager | | | |
| Product Owner | | | |
| Security Lead | | | |
| DevOps Lead | | | |

### B. Links

- **Workflow**: https://n8n.company.com/workflow/[ID]
- **Dashboard**: https://monitoring.company.com/dashboard/workflow-builder
- **Documentation**: https://docs.company.com/workflow-builder
- **Git Repo**: https://github.com/company/n8n-workflows
- **Incident Response**: https://company.pagerduty.com

### C. Emergency Procedures

**If workflow is down**:
1. Check n8n instance status
2. Verify Gemini API status
3. Check Gmail connectivity
4. Review error logs
5. Escalate if unresolved in 15 minutes

**Emergency Contact**: on-call-engineer@company.com

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Owner**: Engineering Team
