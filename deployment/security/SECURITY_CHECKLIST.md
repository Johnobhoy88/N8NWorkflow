# Security Checklist - n8n Workflow Builder v3.0

## Pre-Deployment Security Verification

This checklist must be completed and signed off before production deployment.

---

## Table of Contents
1. [Infrastructure Security](#infrastructure-security)
2. [Application Security](#application-security)
3. [Data Security](#data-security)
4. [Access Control](#access-control)
5. [Network Security](#network-security)
6. [Compliance Requirements](#compliance-requirements)
7. [Security Testing](#security-testing)
8. [Sign-off](#sign-off)

---

## Infrastructure Security

### Operating System
- [ ] **OS Hardening Applied**
  - CIS Benchmark Level 2 configured
  - Unnecessary services disabled
  - Kernel parameters optimized
  ```bash
  # Verify hardening
  lynis audit system
  ```

- [ ] **Security Updates**
  - All security patches applied
  - Automatic updates configured for security patches
  - Reboot if kernel updated
  ```bash
  apt list --upgradable | grep security
  unattended-upgrades --dry-run
  ```

- [ ] **File System Security**
  - Separate partitions for /tmp, /var, /home
  - noexec,nosuid on /tmp
  - Appropriate file permissions
  ```bash
  mount | grep -E "tmp|var|home"
  find / -perm -4000 2>/dev/null  # SUID files
  ```

### Container Security
- [ ] **Docker Hardening**
  - Docker daemon configured securely
  - Container resource limits set
  - Read-only root filesystem where possible
  ```yaml
  # docker-compose.yml security settings
  security_opt:
    - no-new-privileges:true
    - apparmor:docker-default
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE
  read_only: true
  ```

- [ ] **Image Security**
  - Base images scanned for vulnerabilities
  - No secrets in images
  - Minimal base images used
  ```bash
  docker scan n8n-workflow-builder:latest
  trivy image n8n-workflow-builder:latest
  ```

### Cloud Security
- [ ] **AWS Security**
  - IAM roles follow least privilege
  - MFA enabled for all users
  - CloudTrail logging enabled
  - Security Groups properly configured
  ```bash
  aws iam get-account-summary
  aws iam get-account-password-policy
  ```

- [ ] **S3 Bucket Security**
  - Bucket policies reviewed
  - Encryption enabled
  - Versioning enabled
  - Public access blocked
  ```bash
  aws s3api get-bucket-encryption --bucket n8n-workflows-prod
  aws s3api get-public-access-block --bucket n8n-workflows-prod
  ```

---

## Application Security

### Authentication
- [ ] **Strong Authentication**
  - Password complexity requirements enforced
  - Account lockout after failed attempts
  - Session timeout configured
  - MFA available/required
  ```javascript
  // Password requirements
  const passwordPolicy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5
  };
  ```

- [ ] **OAuth2/JWT Security**
  - Secure token storage
  - Token expiration configured
  - Refresh token rotation
  - Signature verification
  ```javascript
  // JWT configuration
  const jwtConfig = {
    algorithm: 'RS256',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
    issuer: 'n8n-workflow-builder',
    audience: 'api.your-domain.com'
  };
  ```

### Authorization
- [ ] **Role-Based Access Control**
  - Roles properly defined
  - Permissions mapped correctly
  - Admin access restricted
  - Audit logging for privilege changes
  ```sql
  -- Verify roles
  SELECT rolname, rolsuper, rolcreatedb FROM pg_roles;
  ```

### Input Validation
- [ ] **Data Validation**
  - All inputs validated
  - SQL injection prevention
  - XSS protection
  - Command injection prevention
  ```javascript
  // Input sanitization
  function sanitizeInput(input) {
    return validator.escape(
      validator.trim(
        validator.blacklist(input, '<>\"\'&')
      )
    );
  }
  ```

### API Security
- [ ] **API Protection**
  - Rate limiting configured
  - API keys required
  - CORS properly configured
  - Request size limits
  ```nginx
  # Nginx rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req zone=api burst=20 nodelay;
  ```

---

## Data Security

### Encryption at Rest
- [ ] **Database Encryption**
  - Transparent Data Encryption (TDE) enabled
  - Encryption keys properly managed
  - Backups encrypted
  ```sql
  -- Check PostgreSQL encryption
  SHOW ssl;
  SELECT name, setting FROM pg_settings WHERE name LIKE '%ssl%';
  ```

- [ ] **File System Encryption**
  - Sensitive directories encrypted
  - Encryption keys in key management system
  - LUKS or similar configured
  ```bash
  cryptsetup status /dev/mapper/encrypted_volume
  ```

### Encryption in Transit
- [ ] **TLS/SSL Configuration**
  - TLS 1.2 minimum
  - Strong cipher suites only
  - Certificates valid and not expiring
  - HSTS enabled
  ```bash
  # Test SSL configuration
  nmap --script ssl-enum-ciphers -p 443 your-domain.com
  testssl.sh your-domain.com
  ```

- [ ] **Internal Communication**
  - Database connections use SSL
  - Redis connections encrypted
  - Inter-service communication secured
  ```bash
  # Verify encrypted connections
  psql "sslmode=require host=localhost dbname=n8n_workflows_prod user=n8n_workflow_user"
  ```

### Data Classification
- [ ] **Sensitive Data Identified**
  - PII properly marked
  - Secrets management implemented
  - Data retention policies enforced
  - Data masking in logs
  ```javascript
  // Data classification
  const dataClassification = {
    public: ['workflow_id', 'created_at'],
    internal: ['company', 'priority'],
    confidential: ['email', 'ip_address'],
    restricted: ['api_keys', 'passwords']
  };
  ```

---

## Access Control

### User Access
- [ ] **Principle of Least Privilege**
  - Users have minimum required permissions
  - Service accounts restricted
  - Regular access reviews
  - Orphaned accounts removed
  ```bash
  # List users with access
  getent passwd | awk -F: '$3 >= 1000'
  lastlog -b 0 -t 30  # Recent logins
  ```

### SSH Access
- [ ] **SSH Hardening**
  - Key-based authentication only
  - Root login disabled
  - Idle timeout configured
  - Failed attempt limits
  ```bash
  # /etc/ssh/sshd_config
  PermitRootLogin no
  PasswordAuthentication no
  MaxAuthTries 3
  ClientAliveInterval 300
  ClientAliveCountMax 2
  ```

### Database Access
- [ ] **Database Security**
  - Separate users for app/admin
  - Connection limits configured
  - SSL required for connections
  - Audit logging enabled
  ```sql
  -- Check user privileges
  SELECT * FROM information_schema.role_table_grants
  WHERE grantee = 'n8n_workflow_user';
  ```

---

## Network Security

### Firewall Configuration
- [ ] **Firewall Rules**
  - Default deny all
  - Only required ports open
  - Source IP restrictions where possible
  - Outbound rules configured
  ```bash
  # Check firewall rules
  iptables -L -n -v
  ufw status verbose
  ```

### Network Segmentation
- [ ] **Network Isolation**
  - DMZ for public-facing services
  - Database in private subnet
  - Management network separate
  - VPN required for admin access
  ```bash
  # Verify network configuration
  ip route show
  netstat -rn
  ```

### DDoS Protection
- [ ] **DDoS Mitigation**
  - Rate limiting configured
  - CloudFlare or similar CDN
  - SYN flood protection
  - Connection limits set
  ```nginx
  # DDoS protection settings
  limit_conn_zone $binary_remote_addr zone=addr:10m;
  limit_conn addr 10;
  ```

---

## Compliance Requirements

### GDPR Compliance
- [ ] **Data Protection**
  - Privacy policy updated
  - Consent mechanisms in place
  - Data portability available
  - Right to deletion implemented
  - DPA agreements with vendors
  ```sql
  -- Verify GDPR tables exist
  SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('gdpr_consent', 'data_retention_policies');
  ```

### Audit Logging
- [ ] **Comprehensive Logging**
  - All access logged
  - Changes tracked
  - Log integrity protected
  - Log retention policy
  ```bash
  # Verify audit logging
  auditctl -l  # List audit rules
  aureport --summary  # Audit summary
  ```

### Security Standards
- [ ] **Compliance Verification**
  - OWASP Top 10 addressed
  - CIS benchmarks followed
  - PCI DSS if applicable
  - SOC 2 requirements met

---

## Security Testing

### Vulnerability Scanning
- [ ] **Automated Scanning**
  - Infrastructure scan completed
  - Application scan completed
  - Dependency scan completed
  - No critical vulnerabilities
  ```bash
  # Run security scans
  nikto -h https://your-domain.com
  npm audit
  safety check
  ```

### Penetration Testing
- [ ] **Security Testing**
  - External penetration test passed
  - Internal security review completed
  - Social engineering test (if applicable)
  - Remediation completed
  ```bash
  # Basic security tests
  sqlmap -u "https://your-domain.com/api" --batch
  dirb https://your-domain.com
  ```

### Security Monitoring
- [ ] **Monitoring Setup**
  - IDS/IPS configured
  - SIEM integration complete
  - Alert rules configured
  - Incident response tested
  ```bash
  # Verify monitoring
  fail2ban-client status
  ossec-control status
  ```

---

## Security Configuration Files

### secrets.yaml (Encrypted)
```yaml
# Encrypted with ansible-vault or similar
secrets:
  database:
    password: !vault |
      $ANSIBLE_VAULT;1.1;AES256
      66386439386...
  api_keys:
    openai: !vault |
      $ANSIBLE_VAULT;1.1;AES256
      35663836353...
```

### security-headers.conf
```nginx
# Security headers configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## Sign-off

### Security Review Completed By:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Engineer | _____________ | _____________ | _____ |
| DevOps Lead | _____________ | _____________ | _____ |
| Application Lead | _____________ | _____________ | _____ |
| Compliance Officer | _____________ | _____________ | _____ |

### Exceptions Noted:
```
1. ________________________________
2. ________________________________
3. ________________________________
```

### Risk Acceptance:
- [ ] All identified risks have been mitigated or accepted
- [ ] Compensating controls in place for accepted risks
- [ ] Risk register updated

### Final Approval:

**CISO/Security Manager:** _______________________

**Date:** _______________________

**Approved for Production Deployment:** [ ] Yes [ ] No

---

## Post-Deployment Security Tasks

- [ ] Security scan after deployment
- [ ] Monitor for 24 hours
- [ ] Review security logs
- [ ] Update security documentation
- [ ] Schedule next security review

---

Last Review: 2024-01-17
Next Review: 2024-04-17
Version: 3.0.0