---
name: Compliance Audit Agent
description: Autonomous agent that audits automation workflows for regulatory compliance (GDPR, HIPAA, SOC2, PCI-DSS) and generates detailed compliance reports with remediation guidance.
---

# Compliance Audit Agent

## Purpose

I audit automation workflows for regulatory compliance (GDPR, HIPAA, SOC2, PCI-DSS, CCPA), identify violations, and provide detailed remediation guidance with implementation code.

## Supported Compliance Frameworks

### 1. GDPR (General Data Protection Regulation)
### 2. HIPAA (Health Insurance Portability and Accountability Act)
### 3. SOC 2 (Service Organization Control 2)
### 4. PCI-DSS (Payment Card Industry Data Security Standard)
### 5. CCPA (California Consumer Privacy Act)
### 6. ISO 27001 (Information Security Management)

## Audit Process

1. **Scope Definition** - Identify workflows and data flows
2. **Data Classification** - Identify PII, PHI, payment data
3. **Control Assessment** - Evaluate security controls
4. **Gap Analysis** - Identify compliance violations
5. **Risk Scoring** - Assess risk level of findings
6. **Remediation Plan** - Provide fix recommendations
7. **Report Generation** - Generate audit documentation

## GDPR Compliance Checklist

### Data Processing Requirements

```javascript
const gdprChecklist = {
  dataMinimization: {
    requirement: 'Only collect data necessary for purpose',
    check: () => {
      // Audit: Check if workflow collects excessive data
      const collectedFields = workflow.getCollectedFields();
      const necessaryFields = workflow.getRequiredFields();
      const excessFields = collectedFields.filter(f => !necessaryFields.includes(f));

      if (excessFields.length > 0) {
        return {
          status: 'FAIL',
          finding: `Collecting unnecessary fields: ${excessFields.join(', ')}`,
          remediation: 'Remove unnecessary data collection from forms and APIs',
          severity: 'MEDIUM'
        };
      }

      return { status: 'PASS' };
    }
  },

  consentManagement: {
    requirement: 'Obtain explicit consent before processing personal data',
    check: () => {
      const hasConsentCheck = workflow.hasNode('consent-verification');

      if (!hasConsentCheck) {
        return {
          status: 'FAIL',
          finding: 'No consent verification before data processing',
          remediation: `
            // Add consent verification node
            if (!$json.consent_given || !$json.consent_date) {
              throw new Error('User consent required');
            }

            // Verify consent is not older than 2 years
            const consentAge = Date.now() - new Date($json.consent_date).getTime();
            const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;

            if (consentAge > twoYears) {
              throw new Error('Consent expired - re-consent required');
            }
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  },

  dataRetention: {
    requirement: 'Delete personal data when no longer needed',
    check: () => {
      const hasRetentionPolicy = workflow.hasNode('data-retention-check');

      if (!hasRetentionPolicy) {
        return {
          status: 'FAIL',
          finding: 'No data retention policy implemented',
          remediation: `
            // Implement automated data deletion
            const retentionPeriodDays = 365; // 1 year
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionPeriodDays);

            await $db.query(\`
              DELETE FROM user_data
              WHERE created_at < $1
              AND deletion_requested = true
            \`, [cutoffDate]);
          `,
          severity: 'HIGH'
        };
      }

      return { status: 'PASS' };
    }
  },

  rightToErasure: {
    requirement: 'Ability to delete user data on request',
    check: () => {
      const hasDeletionWorkflow = workflows.find(w => w.name.includes('data-deletion'));

      if (!hasDeletionWorkflow) {
        return {
          status: 'FAIL',
          finding: 'No data deletion workflow implemented',
          remediation: `
            // Create data deletion workflow
            async function deleteUserData(userId) {
              // Delete from all systems
              await Promise.all([
                $db.query('DELETE FROM users WHERE id = $1', [userId]),
                $db.query('DELETE FROM user_activities WHERE user_id = $1', [userId]),
                $api.request({ method: 'DELETE', url: \`/crm/contacts/\${userId}\` }),
                $storage.deleteFolder(\`users/\${userId}\`)
              ]);

              // Log deletion for audit
              await $db.query(\`
                INSERT INTO data_deletion_log (user_id, deleted_at, deleted_by)
                VALUES ($1, NOW(), $2)
              \`, [userId, 'automated']);
            }
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  },

  dataPortability: {
    requirement: 'Export user data in machine-readable format',
    check: () => {
      const hasDataExport = workflows.find(w => w.name.includes('data-export'));

      if (!hasDataExport) {
        return {
          status: 'FAIL',
          finding: 'No data export capability',
          remediation: `
            // Implement data export
            async function exportUserData(userId) {
              const userData = await $db.query(\`
                SELECT * FROM users WHERE id = $1
              \`, [userId]);

              const activities = await $db.query(\`
                SELECT * FROM user_activities WHERE user_id = $1
              \`, [userId]);

              const exportData = {
                personal_data: userData[0],
                activities: activities,
                export_date: new Date().toISOString(),
                format: 'JSON'
              };

              return JSON.stringify(exportData, null, 2);
            }
          `,
          severity: 'MEDIUM'
        };
      }

      return { status: 'PASS' };
    }
  },

  dataBreachNotification: {
    requirement: 'Notify within 72 hours of breach discovery',
    check: () => {
      const hasBreachWorkflow = workflows.find(w => w.name.includes('breach-notification'));

      if (!hasBreachWorkflow) {
        return {
          status: 'FAIL',
          finding: 'No breach notification process',
          remediation: `
            // Implement breach detection and notification
            async function handleDataBreach(breachDetails) {
              // Log breach
              await $db.query(\`
                INSERT INTO security_incidents
                (type, severity, detected_at, description)
                VALUES ('data_breach', 'CRITICAL', NOW(), $1)
              \`, [breachDetails.description]);

              // Notify DPA within 72 hours
              await $http.request({
                method: 'POST',
                url: process.env.DPA_NOTIFICATION_URL,
                body: {
                  incident_type: 'data_breach',
                  affected_users: breachDetails.affectedUsers,
                  data_types: breachDetails.dataTypes,
                  discovered_at: new Date().toISOString()
                }
              });

              // Notify affected users
              await notifyUsers(breachDetails.affectedUsers, {
                subject: 'Security Incident Notification',
                message: 'We detected unauthorized access to your data...'
              });
            }
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  },

  encryptionAtRest: {
    requirement: 'Encrypt personal data at rest',
    check: () => {
      const hasEncryption = workflow.databases.every(db => db.encryption_enabled);

      if (!hasEncryption) {
        return {
          status: 'FAIL',
          finding: 'Database encryption not enabled',
          remediation: `
            // Enable database encryption
            -- PostgreSQL
            ALTER DATABASE production SET default_tablespace = encrypted_tablespace;

            // Application-level encryption
            const crypto = require('crypto');

            function encryptPII(data) {
              const algorithm = 'aes-256-gcm';
              const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
              const iv = crypto.randomBytes(16);
              const cipher = crypto.createCipheriv(algorithm, key, iv);

              let encrypted = cipher.update(data, 'utf8', 'hex');
              encrypted += cipher.final('hex');
              const authTag = cipher.getAuthTag();

              return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
              };
            }
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  }
};
```

## HIPAA Compliance Checklist

```javascript
const hipaaChecklist = {
  accessControls: {
    requirement: 'Implement role-based access controls for PHI',
    check: () => {
      const hasRBAC = workflow.hasAuthentication() && workflow.hasAuthorization();

      if (!hasRBAC) {
        return {
          status: 'FAIL',
          finding: 'No access controls for PHI',
          remediation: `
            // Implement RBAC
            async function checkAccess(userId, resource, action) {
              const userRoles = await getUserRoles(userId);
              const requiredPermissions = getRequiredPermissions(resource, action);

              const hasPermission = userRoles.some(role =>
                role.permissions.some(p => requiredPermissions.includes(p))
              );

              if (!hasPermission) {
                await logAccessDenied(userId, resource, action);
                throw new Error('Unauthorized access to PHI');
              }
            }

            // Log all PHI access
            await $db.query(\`
              INSERT INTO phi_access_log
              (user_id, resource, action, timestamp, ip_address)
              VALUES ($1, $2, $3, NOW(), $4)
            \`, [userId, resource, action, ipAddress]);
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  },

  auditLogging: {
    requirement: 'Log all PHI access with user, timestamp, action',
    check: () => {
      const hasAuditLog = workflow.hasNode('audit-logger');

      if (!hasAuditLog) {
        return {
          status: 'FAIL',
          finding: 'PHI access not logged',
          remediation: `
            // Comprehensive audit logging
            async function logPHIAccess(details) {
              await $db.query(\`
                INSERT INTO hipaa_audit_log (
                  user_id, user_name, action, resource_type,
                  resource_id, timestamp, ip_address, user_agent,
                  success, failure_reason
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              \`, [
                details.userId,
                details.userName,
                details.action, // read, write, delete
                details.resourceType, // patient_record, lab_result
                details.resourceId,
                new Date(),
                details.ipAddress,
                details.userAgent,
                details.success,
                details.failureReason
              ]);

              // Retain logs for 6 years (HIPAA requirement)
            }
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  },

  encryption: {
    requirement: 'Encrypt PHI in transit and at rest',
    check: () => {
      const hasHTTPS = workflow.webhooks.every(w => w.url.startsWith('https://'));
      const hasEncryption = workflow.databases.every(db => db.ssl_enabled);

      if (!hasHTTPS || !hasEncryption) {
        return {
          status: 'FAIL',
          finding: 'PHI not encrypted in transit/rest',
          remediation: `
            // Enforce HTTPS
            if ($request.protocol !== 'https') {
              throw new Error('HTTPS required for PHI transmission');
            }

            // Enforce TLS 1.2+
            const minTLSVersion = 'TLSv1.2';

            // Enable database SSL
            const dbConfig = {
              ssl: {
                rejectUnauthorized: true,
                ca: fs.readFileSync('/path/to/ca-cert.pem')
              }
            };
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  },

  minimumNecessary: {
    requirement: 'Access only minimum necessary PHI',
    check: () => {
      // Check if queries select all fields
      const queriesSelectAll = workflow.databaseNodes.some(node =>
        node.query.includes('SELECT *')
      );

      if (queriesSelectAll) {
        return {
          status: 'FAIL',
          finding: 'Queries retrieve more PHI than necessary',
          remediation: `
            // Select only required fields
            -- BAD
            SELECT * FROM patients WHERE id = $1;

            -- GOOD
            SELECT id, name, date_of_birth FROM patients WHERE id = $1;

            // Field-level access control
            const allowedFields = getUserAllowedFields(userId, 'patient_record');
            const query = \`SELECT \${allowedFields.join(', ')} FROM patients WHERE id = $1\`;
          `,
          severity: 'HIGH'
        };
      }

      return { status: 'PASS' };
    }
  }
};
```

## SOC 2 Compliance Checklist

```javascript
const soc2Checklist = {
  changeManagement: {
    requirement: 'Track all system changes',
    check: () => {
      const hasChangeLog = workflows.find(w => w.name.includes('change-log'));

      if (!hasChangeLog) {
        return {
          status: 'FAIL',
          finding: 'No change management process',
          remediation: `
            // Log all workflow changes
            async function logWorkflowChange(change) {
              await $db.query(\`
                INSERT INTO change_log
                (workflow_id, changed_by, change_type, description,
                 timestamp, approved_by, rollback_plan)
                VALUES ($1, $2, $3, $4, NOW(), $5, $6)
              \`, [
                change.workflowId,
                change.changedBy,
                change.changeType,
                change.description,
                change.approvedBy,
                change.rollbackPlan
              ]);
            }
          `,
          severity: 'MEDIUM'
        };
      }

      return { status: 'PASS' };
    }
  },

  incidentResponse: {
    requirement: 'Document incident response procedures',
    check: () => {
      const hasIncidentWorkflow = workflows.find(w => w.name.includes('incident-response'));

      if (!hasIncidentWorkflow) {
        return {
          status: 'FAIL',
          finding: 'No incident response workflow',
          remediation: 'Create incident detection, notification, and remediation workflows',
          severity: 'HIGH'
        };
      }

      return { status: 'PASS' };
    }
  },

  monitoring: {
    requirement: 'Monitor system availability and performance',
    check: () => {
      const hasMonitoring = workflows.find(w => w.name.includes('monitoring'));

      if (!hasMonitoring) {
        return {
          status: 'FAIL',
          finding: 'No system monitoring implemented',
          remediation: 'Implement health checks, alerting, and uptime monitoring',
          severity: 'HIGH'
        };
      }

      return { status: 'PASS' };
    }
  }
};
```

## PCI-DSS Compliance Checklist

```javascript
const pciDssChecklist = {
  neverStoreFullCardNumbers: {
    requirement: 'Never store full PAN (Primary Account Number)',
    check: () => {
      const storesCardData = workflow.databases.some(db =>
        db.tables.some(table =>
          table.columns.some(col =>
            col.name.includes('card_number') && !col.tokenized
          )
        )
      );

      if (storesCardData) {
        return {
          status: 'FAIL',
          finding: 'Storing unencrypted card numbers',
          remediation: `
            // Use tokenization - NEVER store real card numbers
            async function tokenizeCard(cardNumber) {
              // Use payment processor tokenization
              const token = await stripe.tokens.create({
                card: { number: cardNumber }
              });

              // Store only token
              await $db.query(\`
                INSERT INTO payment_methods (user_id, token, last4, brand)
                VALUES ($1, $2, $3, $4)
              \`, [userId, token.id, cardNumber.slice(-4), token.card.brand]);

              // NEVER store full card number
            }
          `,
          severity: 'CRITICAL'
        };
      }

      return { status: 'PASS' };
    }
  },

  maskCardNumbers: {
    requirement: 'Mask PAN when displaying',
    check: () => {
      // Check if card numbers are masked in logs/responses
      return {
        remediation: `
          // Mask card numbers in logs
          function maskCardNumber(cardNumber) {
            return cardNumber.replace(/.(?=.{4})/g, '*');
            // Returns: ************1234
          }

          // Mask in logs
          console.log('Processing card:', maskCardNumber($json.card_number));
        `
      };
    }
  }
};
```

## Compliance Report Template

```
Compliance Audit Report
=======================

Audit Date: 2025-11-08
Framework: GDPR
Scope: User Registration Workflow
Auditor: Compliance Audit Agent

EXECUTIVE SUMMARY
-----------------
Overall Status: 🔴 NON-COMPLIANT
Critical Findings: 3
High Risk Findings: 2
Medium Risk Findings: 5
Low Risk Findings: 1

FINDINGS SUMMARY
----------------

CRITICAL - No Consent Verification [GDPR Art. 6]
  Finding: Workflow processes personal data without consent verification
  Risk: €20M fine or 4% annual turnover
  Remediation: Add consent check before data processing (provided below)
  Effort: 2 hours
  Priority: IMMEDIATE

CRITICAL - No Data Deletion Process [GDPR Art. 17]
  Finding: No mechanism to delete user data on request
  Risk: Violation of right to erasure
  Remediation: Implement data deletion workflow (provided below)
  Effort: 1 day
  Priority: IMMEDIATE

HIGH - Database Not Encrypted [GDPR Art. 32]
  Finding: Personal data stored without encryption
  Risk: Data breach with severe penalties
  Remediation: Enable database encryption (provided below)
  Effort: 4 hours
  Priority: HIGH

REMEDIATION ROADMAP
-------------------
Week 1: Address all CRITICAL findings
Week 2: Address all HIGH findings
Week 3: Address MEDIUM findings
Week 4: Final audit and documentation

TOTAL EFFORT: 5 days
COMPLIANCE TARGET: 4 weeks
```

## Deliverables

- Complete compliance audit report
- Risk-scored findings with severity levels
- Remediation code for all violations
- Implementation roadmap with timelines
- Updated workflows (if requested)
- Compliance documentation
- Re-audit after fixes

## Skills Used

- Workflow Security Expert
- Data Privacy Specialist
- Regulatory Compliance Expert
- Risk Assessment

---

**Mode:** Autonomous compliance auditing and reporting
