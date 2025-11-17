# n8n Workflow Builder v3.0 - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Load Balancer Configuration](#load-balancer-configuration)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Monitoring Setup](#monitoring-setup)
8. [Production Checklist](#production-checklist)

---

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or later / RHEL 8+
- **CPU**: Minimum 4 cores, recommended 8 cores
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: 100GB SSD minimum
- **Network**: 1Gbps connection

### Software Dependencies
```bash
# Node.js (v18 LTS or later)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker & Docker Compose
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# PostgreSQL Client
sudo apt-get install -y postgresql-client

# Redis Client
sudo apt-get install -y redis-tools

# Nginx
sudo apt-get install -y nginx

# Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx
```

---

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/n8n-workflow-builder.git
cd n8n-workflow-builder/deployment
```

### 2. Setup Environment Variables
```bash
# Copy environment template
cp config/.env.example .env
cp config/.env.production.template .env.production

# Generate secure keys
openssl rand -hex 32 > encryption.key
openssl rand -hex 64 > jwt.secret

# Update .env with generated keys
sed -i "s/your-32-char-encryption-key-here/$(cat encryption.key)/" .env
sed -i "s/your-jwt-secret-here/$(cat jwt.secret)/" .env

# Set appropriate permissions
chmod 600 .env .env.production
```

### 3. Create Required Directories
```bash
sudo mkdir -p /var/n8n/{storage,logs,backups}
sudo chown -R $USER:$USER /var/n8n
```

---

## Database Setup

### 1. PostgreSQL Installation
```bash
# Install PostgreSQL 14
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql-14

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Database Creation
```bash
# Connect as postgres user
sudo -u postgres psql

# Run the following SQL commands:
CREATE USER n8n_workflow_user WITH PASSWORD 'secure-password-here';
CREATE DATABASE n8n_workflows_prod OWNER n8n_workflow_user;
GRANT ALL PRIVILEGES ON DATABASE n8n_workflows_prod TO n8n_workflow_user;
\q

# Run schema migration
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod < database/schema.sql
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod < database/migrations/001_initial_schema.sql
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod < database/migrations/002_add_performance_indexes.sql
```

### 3. Database SSL Setup
```bash
# Generate SSL certificates for PostgreSQL
sudo mkdir -p /etc/postgresql/14/main/certs
cd /etc/postgresql/14/main/certs

# Generate private key
sudo openssl genrsa -out server.key 2048
sudo chmod 400 server.key
sudo chown postgres:postgres server.key

# Generate certificate
sudo openssl req -new -key server.key -out server.csr
sudo openssl x509 -req -in server.csr -signkey server.key -out server.crt

# Configure PostgreSQL for SSL
sudo nano /etc/postgresql/14/main/postgresql.conf
# Add: ssl = on
# Add: ssl_cert_file = '/etc/postgresql/14/main/certs/server.crt'
# Add: ssl_key_file = '/etc/postgresql/14/main/certs/server.key'

sudo systemctl restart postgresql
```

---

## Application Deployment

### 1. Using Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n-workflow-builder
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${DB_POSTGRESDB_HOST}
      - DB_POSTGRESDB_PORT=${DB_POSTGRESDB_PORT}
      - DB_POSTGRESDB_DATABASE=${DB_POSTGRESDB_DATABASE}
      - DB_POSTGRESDB_USER=${DB_POSTGRESDB_USER}
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
    volumes:
      - ./workflows:/home/node/.n8n/workflows
      - ./credentials:/home/node/.n8n/credentials
      - /var/n8n/storage:/files
    networks:
      - n8n-network
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    container_name: n8n-postgres
    restart: always
    environment:
      - POSTGRES_USER=${DB_POSTGRESDB_USER}
      - POSTGRES_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      - POSTGRES_DB=${DB_POSTGRESDB_DATABASE}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - n8n-network

  redis:
    image: redis:alpine
    container_name: n8n-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - n8n-network

  nginx:
    image: nginx:alpine
    container_name: n8n-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    networks:
      - n8n-network
    depends_on:
      - n8n

networks:
  n8n-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
```

### 2. Deploy with Docker Compose
```bash
# Load environment variables
export $(cat .env.production | xargs)

# Deploy
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f n8n
```

### 3. Manual Deployment (Without Docker)

```bash
# Install n8n globally
npm install -g n8n

# Install PM2 for process management
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'n8n-workflow-builder',
    script: 'n8n',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      N8N_HOST: process.env.N8N_HOST,
      N8N_PORT: 5678,
      // Add all environment variables
    },
    error_file: '/var/n8n/logs/error.log',
    out_file: '/var/n8n/logs/output.log',
    log_file: '/var/n8n/logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

---

## Load Balancer Configuration

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/n8n-workflow-builder

upstream n8n_backend {
    least_conn;
    server 127.0.0.1:5678 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5679 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5680 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5681 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=n8n:10m rate=10r/s;
    limit_req zone=n8n burst=20 nodelay;

    location / {
        proxy_pass http://n8n_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
        proxy_cache off;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Enable and Test
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/n8n-workflow-builder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### Let's Encrypt Certificate
```bash
# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo certbot renew --dry-run

# Add to crontab
0 0,12 * * * /usr/bin/certbot renew --quiet
```

---

## Monitoring Setup

### 1. Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'n8n'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

### 2. Grafana Dashboard Setup
```bash
# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access at http://localhost:3000 (admin/admin)
```

### 3. CloudWatch Integration
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

---

## Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring dashboards created
- [ ] Load testing completed
- [ ] Security scan passed

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Verify all integrations
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Verify backup systems
- [ ] Test failover procedures

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify log aggregation
- [ ] Test alert notifications
- [ ] Document any issues
- [ ] Update runbook
- [ ] Schedule post-mortem if needed

### Security Verification
- [ ] All secrets encrypted
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] WAF rules enabled
- [ ] Database SSL enabled
- [ ] Audit logging functional
- [ ] GDPR compliance verified
- [ ] Security headers present

### Performance Verification
- [ ] Response time < 2s
- [ ] Error rate < 0.1%
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] Database query time < 100ms
- [ ] Cache hit rate > 80%

---

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

2. **High Memory Usage**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart services
pm2 restart all
```

3. **SSL Certificate Issues**
```bash
# Test SSL
openssl s_client -connect your-domain.com:443

# Renew certificate
sudo certbot renew --force-renewal
```

---

## Support

- **Documentation**: https://docs.your-domain.com
- **Support Email**: support@your-domain.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **Slack Channel**: #n8n-workflow-support