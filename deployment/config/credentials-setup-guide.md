# Credentials Setup Guide
## n8n Workflow Builder v3.0

This guide provides step-by-step instructions for setting up all required credentials and API keys for the n8n Workflow Builder v3.0.

---

## Table of Contents
1. [OAuth2 Credentials](#oauth2-credentials)
2. [API Keys](#api-keys)
3. [Database Credentials](#database-credentials)
4. [AWS Credentials](#aws-credentials)
5. [Monitoring Services](#monitoring-services)
6. [Security Credentials](#security-credentials)

---

## OAuth2 Credentials

### Gmail OAuth2 Setup

1. **Create Google Cloud Project**
   ```
   1. Go to https://console.cloud.google.com
   2. Create new project: "n8n-workflow-builder"
   3. Enable Gmail API
   ```

2. **Configure OAuth Consent Screen**
   ```
   - User Type: Internal (for organization) or External
   - App Name: n8n Workflow Builder
   - Support Email: support@your-domain.com
   - Scopes:
     * https://www.googleapis.com/auth/gmail.send
     * https://www.googleapis.com/auth/gmail.readonly
     * https://www.googleapis.com/auth/gmail.modify
   ```

3. **Create OAuth2 Credentials**
   ```
   - Application Type: Web application
   - Name: n8n-gmail-oauth
   - Authorized redirect URIs:
     * https://your-domain.com/rest/oauth2-credential/callback
     * http://localhost:5678/rest/oauth2-credential/callback (for testing)
   ```

4. **Store Credentials**
   ```env
   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
   ```

### Slack OAuth2 Setup

1. **Create Slack App**
   ```
   1. Go to https://api.slack.com/apps
   2. Click "Create New App"
   3. Choose "From scratch"
   4. App Name: n8n Workflow Builder
   ```

2. **Configure OAuth & Permissions**
   ```
   Scopes needed:
   - chat:write
   - chat:write.public
   - files:write
   - incoming-webhook
   - users:read
   - users:read.email
   ```

3. **Install App to Workspace**
   ```
   1. Go to "Install App"
   2. Click "Install to Workspace"
   3. Authorize the permissions
   4. Copy the OAuth Access Token
   ```

4. **Store Credentials**
   ```env
   SLACK_CLIENT_ID=xxxxxxxxxxxxx.xxxxxxxxxxxxx
   SLACK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SLACK_OAUTH_TOKEN=xoxb-xxxxxxxxxxxxx-xxxxxxxxxxxxx
   ```

---

## API Keys

### AI Service API Keys

#### Gemini API
1. **Get API Key**
   ```
   1. Go to https://makersuite.google.com/app/apikey
   2. Click "Create API Key"
   3. Select project
   4. Copy the key
   ```

2. **Configure**
   ```env
   AI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

#### OpenAI API (Backup)
1. **Get API Key**
   ```
   1. Go to https://platform.openai.com/api-keys
   2. Click "Create new secret key"
   3. Name: n8n-workflow-builder
   4. Copy immediately (shown only once)
   ```

2. **Configure**
   ```env
   BACKUP_AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## Database Credentials

### PostgreSQL Setup

1. **Create Database User**
   ```sql
   CREATE USER n8n_workflow_user WITH PASSWORD 'strong-password-here';
   CREATE DATABASE n8n_workflows_prod OWNER n8n_workflow_user;
   GRANT ALL PRIVILEGES ON DATABASE n8n_workflows_prod TO n8n_workflow_user;
   ```

2. **Configure SSL (Production)**
   ```sql
   -- Enable SSL
   ALTER SYSTEM SET ssl = on;
   ALTER SYSTEM SET ssl_cert_file = 'server.crt';
   ALTER SYSTEM SET ssl_key_file = 'server.key';
   ALTER SYSTEM SET ssl_ca_file = 'root.crt';
   ```

3. **Connection String**
   ```env
   DB_POSTGRESDB_HOST=db.your-domain.com
   DB_POSTGRESDB_PORT=5432
   DB_POSTGRESDB_DATABASE=n8n_workflows_prod
   DB_POSTGRESDB_USER=n8n_workflow_user
   DB_POSTGRESDB_PASSWORD=strong-password-here
   DB_POSTGRESDB_SSL_ENABLED=true
   ```

### Redis Setup

1. **Create Redis Instance**
   ```bash
   # For AWS ElastiCache
   aws elasticache create-cache-cluster \
     --cache-cluster-id n8n-workflow-cache \
     --engine redis \
     --cache-node-type cache.t3.micro \
     --num-cache-nodes 1
   ```

2. **Configure Auth**
   ```bash
   # Set AUTH password
   redis-cli CONFIG SET requirepass "your-redis-password"
   ```

3. **Connection String**
   ```env
   REDIS_HOST=redis.your-domain.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   ```

---

## AWS Credentials

### IAM User Setup

1. **Create IAM User**
   ```json
   {
     "UserName": "n8n-workflow-builder",
     "Policies": [
       "AmazonS3FullAccess",
       "CloudWatchLogsFullAccess",
       "AmazonSESFullAccess"
     ]
   }
   ```

2. **Generate Access Keys**
   ```bash
   aws iam create-access-key --user-name n8n-workflow-builder
   ```

3. **S3 Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::ACCOUNT:user/n8n-workflow-builder"
         },
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::n8n-workflows-prod/*",
           "arn:aws:s3:::n8n-workflows-prod"
         ]
       }
     ]
   }
   ```

4. **Store Credentials**
   ```env
   S3_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   S3_BUCKET=n8n-workflows-prod
   S3_REGION=us-east-1
   ```

---

## Monitoring Services

### Datadog Setup

1. **Create API Key**
   ```
   1. Go to https://app.datadoghq.com/account/settings#api
   2. Click "New Key"
   3. Name: n8n-workflow-builder
   ```

2. **Create Application Key**
   ```
   1. Go to Application Keys section
   2. Click "New Key"
   3. Name: n8n-workflow-builder-app
   ```

3. **Configure**
   ```env
   DATADOG_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   DATADOG_APP_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   DATADOG_SITE=datadoghq.com
   ```

### Sentry Setup

1. **Create Project**
   ```
   1. Go to https://sentry.io
   2. Create new project
   3. Platform: Node.js
   4. Name: n8n-workflow-builder
   ```

2. **Get DSN**
   ```env
   SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxx@oxxxxxx.ingest.sentry.io/xxxxxxx
   SENTRY_ENVIRONMENT=production
   ```

---

## Security Credentials

### Encryption Keys

1. **Generate Encryption Key**
   ```bash
   # Generate 32-character key
   openssl rand -hex 32
   ```

2. **Generate JWT Secret**
   ```bash
   # Generate secure JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Store Securely**
   ```env
   N8N_ENCRYPTION_KEY=64-hex-characters-here
   N8N_JWT_SECRET=128-hex-characters-here
   ```

### SSL/TLS Certificates

1. **Generate Certificate (Let's Encrypt)**
   ```bash
   certbot certonly --standalone \
     -d your-domain.com \
     -d www.your-domain.com \
     --email admin@your-domain.com \
     --agree-tos
   ```

2. **Certificate Paths**
   ```env
   SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
   SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
   ```

---

## Credential Security Best Practices

### 1. Use Secret Management Service
```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name n8n-workflow-builder/production \
  --secret-string file://credentials.json
```

### 2. Rotate Credentials Regularly
```bash
# Set up rotation Lambda
aws secretsmanager rotate-secret \
  --secret-id n8n-workflow-builder/production \
  --rotation-lambda-arn arn:aws:lambda:region:account:function:rotation
```

### 3. Audit Access
```bash
# Enable CloudTrail for credential access
aws cloudtrail create-trail \
  --name n8n-credential-audit \
  --s3-bucket-name audit-logs
```

### 4. Environment-Specific Credentials
```
Never use production credentials in:
- Development environments
- CI/CD pipelines (use separate CI credentials)
- Local testing (use mock services)
```

### 5. Credential Encryption at Rest
```bash
# Encrypt .env file
openssl enc -aes-256-cbc -salt -in .env -out .env.enc
```

---

## Verification Checklist

- [ ] Gmail OAuth2 tested and working
- [ ] Slack OAuth2 tested and notifications received
- [ ] AI API keys validated (test generation)
- [ ] Database connection verified
- [ ] S3 bucket accessible and writable
- [ ] Redis connection established
- [ ] SSL certificates installed and valid
- [ ] Monitoring services reporting data
- [ ] All credentials stored securely
- [ ] Backup credentials configured
- [ ] Rotation policies in place
- [ ] Access audit logging enabled

---

## Support

For credential-related issues:
- Email: devops@your-domain.com
- Slack: #n8n-workflow-support
- Documentation: https://docs.your-domain.com/credentials