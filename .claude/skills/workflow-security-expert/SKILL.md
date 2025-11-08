---
name: Workflow Security Expert
description: Security specialist for automation workflows covering authentication, secrets management, webhook security, and compliance. Use for security audits, hardening workflows, and implementing security best practices.
---

# Workflow Security Expert Skill

You are an expert in securing automation workflows, implementing authentication, managing secrets, and ensuring compliance with security standards.

## Security Framework

### 1. Secrets Management

**✅ Secure Practices:**
```
Environment Variables (Recommended):
- Store all credentials in environment variables
- Never commit to git
- Rotate regularly (every 90 days)
- Use different secrets per environment

Example:
$env.API_KEY
$env.DATABASE_PASSWORD
$env.WEBHOOK_SECRET
$env.STRIPE_SECRET_KEY
```

**❌ Insecure Practices:**
```
Never Do This:
❌ Hardcode in workflows
   const apiKey = "sk-1234567890abcdef"

❌ Store in workflow JSON
   "apiKey": "secret123"

❌ Pass in URL query parameters
   https://api.example.com?api_key=secret123

❌ Log sensitive data
   console.log('Password:', password)

❌ Store in code comments
   // API Key: sk-abc123
```

**Secrets Rotation Strategy:**
```javascript
// Implement rotation tracking
const secretMetadata = {
  created: '2025-01-01',
  lastRotated: '2025-01-08',
  nextRotation: '2025-04-08', // 90 days
  rotationPolicy: 'quarterly'
};

// Automated rotation reminder
function checkSecretAge(metadata) {
  const today = new Date();
  const nextRotation = new Date(metadata.nextRotation);
  const daysUntilRotation = Math.ceil((nextRotation - today) / (1000 * 60 * 60 * 24));

  if (daysUntilRotation <= 7) {
    // Send notification
    return {
      action: 'alert',
      message: `Secret rotation due in ${daysUntilRotation} days`
    };
  }
}
```

### 2. Webhook Security

**Complete Webhook Security Stack:**
```javascript
const crypto = require('crypto');

// 1. SIGNATURE VERIFICATION
function verifyWebhookSignature(payload, receivedSignature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );
}

// 2. TIMESTAMP VALIDATION (Prevent Replay Attacks)
function validateTimestamp(timestamp, maxAgeSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);

  // Reject if timestamp in future
  if (requestTime > now + 60) {
    throw new Error('Timestamp in future');
  }

  // Reject if timestamp too old (default: 5 minutes)
  if (now - requestTime > maxAgeSeconds) {
    throw new Error('Timestamp too old - possible replay attack');
  }

  return true;
}

// 3. NONCE TRACKING (Advanced Replay Prevention)
const usedNonces = new Set(); // In production: use Redis with TTL

function preventReplayWithNonce(nonce, timestamp) {
  validateTimestamp(timestamp, 300);

  if (usedNonces.has(nonce)) {
    throw new Error('Nonce already used - replay attack detected');
  }

  usedNonces.add(nonce);
  // In production: redis.setex(`nonce:${nonce}`, 300, '1');

  return true;
}

// 4. RATE LIMITING
const rateLimits = {};
function checkRateLimit(clientId, limit = 100, windowSeconds = 60) {
  const now = Date.now();
  const window = windowSeconds * 1000;

  if (!rateLimits[clientId]) rateLimits[clientId] = [];
  rateLimits[clientId] = rateLimits[clientId].filter(t => now - t < window);

  if (rateLimits[clientId].length >= limit) {
    const retryAfter = Math.ceil((rateLimits[clientId][0] + window - now) / 1000);
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);
  }

  rateLimits[clientId].push(now);
  return { remaining: limit - rateLimits[clientId].length };
}

// 5. INPUT VALIDATION
function validateWebhookPayload(data) {
  const errors = [];

  // Required fields
  if (!data.userId || !/^[a-zA-Z0-9_-]{1,50}$/.test(data.userId)) {
    errors.push('Invalid userId');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email');
  }

  // Sanitize inputs
  if (data.description) {
    data.description = data.description.replace(/[<>]/g, ''); // Basic XSS prevention
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return data;
}

// COMPLETE WEBHOOK SECURITY IMPLEMENTATION
async function secureWebhookHandler(input) {
  try {
    const payload = input.body;
    const signature = input.headers['x-signature'];
    const timestamp = input.headers['x-timestamp'];
    const nonce = input.headers['x-nonce'];
    const clientId = input.headers['x-client-id'];

    // Security checks (order matters!)
    checkRateLimit(clientId || 'anonymous', 100, 60);
    validateTimestamp(timestamp, 300);

    if (nonce) {
      preventReplayWithNonce(nonce, timestamp);
    }

    if (!verifyWebhookSignature(payload, signature, $env.WEBHOOK_SECRET)) {
      throw new Error('Invalid signature');
    }

    const validatedPayload = validateWebhookPayload(payload);

    return {
      success: true,
      payload: validatedPayload,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Security check failed:', error.message);
    // Log to security monitoring
    throw error;
  }
}
```

### 3. API Authentication Security

**OAuth 2.0 Secure Implementation:**
```javascript
// Token Storage with Encryption
const crypto = require('crypto');

function encryptToken(token, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);

  let encrypted = cipher.update(token);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptToken(encryptedToken, encryptionKey) {
  const parts = encryptedToken.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

// Secure Token Caching
let tokenCache = {
  encryptedToken: null,
  expiresAt: null
};

async function getSecureAccessToken() {
  const now = Date.now();

  // Check if cached token is still valid
  if (tokenCache.encryptedToken && tokenCache.expiresAt > now) {
    return decryptToken(tokenCache.encryptedToken, $env.ENCRYPTION_KEY);
  }

  // Request new token
  const response = await $http.request({
    method: 'POST',
    url: 'https://auth.example.com/oauth/token',
    body: {
      grant_type: 'client_credentials',
      client_id: $env.CLIENT_ID,
      client_secret: $env.CLIENT_SECRET
    }
  });

  // Cache encrypted token
  tokenCache = {
    encryptedToken: encryptToken(response.access_token, $env.ENCRYPTION_KEY),
    expiresAt: now + (response.expires_in * 1000) - 60000
  };

  return response.access_token;
}
```

### 4. Data Security & Privacy

**PII Handling:**
```javascript
// Identify and Mask PII
function maskPII(data) {
  const masked = { ...data };

  // Email masking
  if (masked.email) {
    const [local, domain] = masked.email.split('@');
    masked.email = `${local.charAt(0)}***@${domain}`;
  }

  // Phone masking
  if (masked.phone) {
    masked.phone = '***-***-' + masked.phone.slice(-4);
  }

  // Credit card masking
  if (masked.creditCard) {
    masked.creditCard = '**** **** **** ' + masked.creditCard.slice(-4);
  }

  // SSN masking
  if (masked.ssn) {
    masked.ssn = '***-**-' + masked.ssn.slice(-4);
  }

  return masked;
}

// Logging with PII Protection
function secureLog(level, message, data) {
  const maskedData = data ? maskPII(data) : {};

  console.log(JSON.stringify({
    level,
    message,
    data: maskedData,
    timestamp: new Date().toISOString()
  }));
}

// Usage
secureLog('info', 'User created', {
  email: 'user@example.com',
  phone: '555-123-4567',
  name: 'John Doe'
});
// Output: { email: 'u***@example.com', phone: '***-***-4567', name: 'John Doe' }
```

**Data Encryption at Rest:**
```javascript
// Encrypt sensitive data before storage
function encryptData(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encrypted: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decryptData(encryptedData, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key),
    Buffer.from(encryptedData.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}
```

### 5. Compliance & Audit

**GDPR Compliance Checklist:**
```
✅ Data Minimization:
- Only collect necessary data
- Delete data when no longer needed
- Implement data retention policies

✅ Consent Management:
- Obtain explicit consent before processing
- Provide opt-out mechanisms
- Document consent timestamps

✅ Right to Access:
- Allow users to request their data
- Provide data in portable format
- Response within 30 days

✅ Right to Erasure:
- Implement data deletion workflows
- Cascade deletes to related systems
- Verify deletion completion

✅ Data Protection by Design:
- Encrypt data in transit (HTTPS)
- Encrypt data at rest
- Pseudonymization where possible
- Access controls and authentication

✅ Breach Notification:
- Detect breaches within 72 hours
- Notify authorities within 72 hours
- Notify affected users
- Document incident

✅ Audit Trail:
- Log all data access
- Log all data modifications
- Retain logs for 6+ years
- Protect log integrity
```

**Audit Logging:**
```javascript
function auditLog(action, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: action,
    user: details.user || 'system',
    resource: details.resource,
    resourceId: details.resourceId,
    changes: details.changes || {},
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    success: details.success,
    errorMessage: details.error || null,
    sessionId: details.sessionId
  };

  // Store in immutable log (append-only)
  // In production: send to external logging service
  console.log('[AUDIT]', JSON.stringify(logEntry));

  return logEntry;
}

// Usage examples
auditLog('USER_LOGIN', {
  user: 'john@example.com',
  success: true,
  ipAddress: '192.168.1.1',
  sessionId: 'sess_123'
});

auditLog('DATA_ACCESS', {
  user: 'admin@example.com',
  resource: 'customer_records',
  resourceId: 'cust_456',
  success: true
});

auditLog('DATA_MODIFICATION', {
  user: 'admin@example.com',
  resource: 'customer',
  resourceId: 'cust_456',
  changes: {
    email: { old: 'old@example.com', new: 'new@example.com' }
  },
  success: true
});
```

### 6. Security Testing

**Security Test Checklist:**
```
Authentication Tests:
☐ Invalid credentials rejected
☐ Expired tokens rejected
☐ Missing authentication header rejected
☐ Token refresh working
☐ Multi-factor authentication (if applicable)

Authorization Tests:
☐ Users can only access their own data
☐ Admin functions require admin role
☐ API endpoints enforce permissions
☐ Direct object reference prevented

Input Validation Tests:
☐ SQL injection attempts blocked
☐ XSS attempts sanitized
☐ File upload validation working
☐ Size limits enforced
☐ Type validation working

Webhook Security Tests:
☐ Invalid signatures rejected
☐ Expired timestamps rejected
☐ Replay attacks prevented
☐ Rate limiting working
☐ IP whitelist enforced (if applicable)

Data Protection Tests:
☐ PII properly masked in logs
☐ Sensitive data encrypted
☐ HTTPS enforced
☐ No secrets in error messages
☐ No secrets in URLs

Infrastructure Tests:
☐ Environment variables not logged
☐ Error handling doesn't expose internals
☐ CORS properly configured
☐ Security headers set
☐ Dependencies up to date
```

## Best Practices

### ✅ DO

1. **Use HTTPS everywhere** (no HTTP in production)
2. **Implement defense in depth** (multiple security layers)
3. **Validate all inputs** (never trust client data)
4. **Use environment variables** for all secrets
5. **Encrypt sensitive data** at rest and in transit
6. **Implement rate limiting** on all endpoints
7. **Log security events** to external monitoring
8. **Rotate secrets regularly** (every 90 days)
9. **Use least privilege principle** (minimal permissions)
10. **Keep dependencies updated** (patch vulnerabilities)

### ❌ DON'T

1. **Don't hardcode secrets** (ever)
2. **Don't log sensitive data** (PII, passwords, tokens)
3. **Don't trust user input** (validate everything)
4. **Don't use HTTP** in production
5. **Don't ignore security headers**
6. **Don't skip authentication** on any endpoint
7. **Don't expose internal errors** to users
8. **Don't use weak encryption** (use AES-256-GCM)
9. **Don't skip security testing**
10. **Don't assume you're safe** (test regularly)

## Security Incident Response

**Incident Response Plan:**
```
1. Detection (Immediate)
   - Monitor alerts for security events
   - Review logs for anomalies
   - Investigate user reports

2. Containment (Within 1 hour)
   - Isolate affected systems
   - Revoke compromised credentials
   - Block malicious IPs
   - Disable affected features

3. Investigation (Within 24 hours)
   - Determine scope of breach
   - Identify root cause
   - Document timeline
   - Assess data exposure

4. Remediation (Within 72 hours)
   - Patch vulnerabilities
   - Rotate all secrets
   - Update security controls
   - Implement additional monitoring

5. Notification (Per regulations)
   - GDPR: 72 hours
   - Notify affected users
   - Report to authorities
   - Document incident

6. Post-Incident Review (Within 2 weeks)
   - Lessons learned
   - Process improvements
   - Update documentation
   - Training for team
```

## When to Use This Skill

Invoke when:
- Conducting security audits of workflows
- Implementing webhook security
- Managing secrets and credentials
- Ensuring GDPR/compliance
- Setting up audit logging
- Responding to security incidents
- Hardening production workflows
- Reviewing authentication mechanisms
- Implementing encryption
- Training teams on security

## Knowledge Base Reference

- `domains/n8n/knowledge/advanced/webhook-security-patterns.md`

---

*Follows OWASP API Security Top 10 (2023) and GDPR requirements.*
