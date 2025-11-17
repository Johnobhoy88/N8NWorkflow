# Monitoring Setup Guide - n8n Workflow Builder v3.0

## Comprehensive Monitoring Configuration

This guide covers the complete monitoring setup including metrics collection, dashboards, alerting, and log aggregation.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prometheus Setup](#prometheus-setup)
3. [Grafana Dashboards](#grafana-dashboards)
4. [Datadog Integration](#datadog-integration)
5. [CloudWatch Setup](#cloudwatch-setup)
6. [Log Aggregation](#log-aggregation)
7. [Alert Configuration](#alert-configuration)
8. [Custom Metrics](#custom-metrics)

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    n8n      │────▶│  Prometheus  │────▶│   Grafana   │
│  Workflow   │     │   Scraper    │     │  Dashboard  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                         │
       │            ┌──────────────┐            │
       └───────────▶│   Datadog    │◀───────────┘
                    │    Agent     │
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │  CloudWatch  │
                    │     Logs     │
                    └──────────────┘
```

---

## Prometheus Setup

### 1. Install Prometheus
```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Install as systemd service
sudo useradd --no-create-home --shell /bin/false prometheus
sudo mkdir /etc/prometheus /var/lib/prometheus
sudo chown prometheus:prometheus /etc/prometheus /var/lib/prometheus

sudo cp prometheus promtool /usr/local/bin/
sudo cp -r consoles console_libraries /etc/prometheus/
```

### 2. Configure Prometheus
```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'n8n-workflow-builder'
    environment: 'production'

# Alert manager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093

# Load rules
rule_files:
  - "alerts/*.yml"

# Scrape configurations
scrape_configs:
  # n8n metrics
  - job_name: 'n8n'
    static_configs:
      - targets: ['localhost:5678']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # PostgreSQL exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  # Redis exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  # Node exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  # Nginx exporter
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  # Custom workflow metrics
  - job_name: 'workflow-metrics'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/custom-metrics'
```

### 3. Install Exporters

```bash
# Node Exporter (System Metrics)
wget https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
tar xvfz node_exporter-*.tar.gz
sudo cp node_exporter-*/node_exporter /usr/local/bin/

# PostgreSQL Exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.11.1/postgres_exporter-0.11.1.linux-amd64.tar.gz
tar xvfz postgres_exporter-*.tar.gz
sudo cp postgres_exporter-*/postgres_exporter /usr/local/bin/

# Redis Exporter
wget https://github.com/oliver006/redis_exporter/releases/download/v1.45.0/redis_exporter-v1.45.0.linux-amd64.tar.gz
tar xvfz redis_exporter-*.tar.gz
sudo cp redis_exporter-*/redis_exporter /usr/local/bin/
```

### 4. Create Alert Rules
```yaml
# /etc/prometheus/alerts/n8n_alerts.yml
groups:
  - name: n8n_workflow_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(n8n_workflow_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          service: n8n-workflow-builder
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      # Slow response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(n8n_http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time"
          description: "95th percentile response time is {{ $value }}s"

      # Database connection issues
      - alert: DatabaseConnectionFailure
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "Cannot connect to PostgreSQL database"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # Disk space low
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Less than 10% disk space remaining"
```

---

## Grafana Dashboards

### 1. Install Grafana
```bash
# Add Grafana repository
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl daemon-reload
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

### 2. Dashboard Configuration
```json
{
  "dashboard": {
    "title": "n8n Workflow Builder Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(n8n_http_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(n8n_workflow_errors_total[5m])",
            "legendFormat": "{{error_type}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "title": "Response Time (95th percentile)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(n8n_http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "title": "Active Workflows",
        "targets": [
          {
            "expr": "n8n_active_workflows_total"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname=\"n8n_workflows_prod\"}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "title": "System Load",
        "targets": [
          {
            "expr": "node_load1",
            "legendFormat": "1m load"
          },
          {
            "expr": "node_load5",
            "legendFormat": "5m load"
          },
          {
            "expr": "node_load15",
            "legendFormat": "15m load"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      }
    ]
  }
}
```

### 3. Import Pre-built Dashboards
```bash
# Import via API
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @dashboard.json
```

---

## Datadog Integration

### 1. Install Datadog Agent
```bash
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=$DATADOG_API_KEY DD_SITE="datadoghq.com" \
bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

### 2. Configure Datadog
```yaml
# /etc/datadog-agent/datadog.yaml
api_key: ${DATADOG_API_KEY}
site: datadoghq.com
hostname: n8n-workflow-prod-01
tags:
  - env:production
  - service:n8n-workflow-builder
  - version:3.0.0

logs_enabled: true
process_config:
  enabled: true

apm_config:
  enabled: true
  env: production
  service_name: n8n-workflow-builder
```

### 3. Custom Metrics
```javascript
// datadog_metrics.js
const StatsD = require('node-dogstatsd').StatsD;
const dogstatsd = new StatsD();

// Track workflow generation
function trackWorkflowGeneration(duration, success) {
  dogstatsd.histogram('n8n.workflow.generation.duration', duration);
  dogstatsd.increment('n8n.workflow.generation.count', 1, [`success:${success}`]);
}

// Track API calls
function trackAPICall(endpoint, duration, statusCode) {
  dogstatsd.histogram('n8n.api.duration', duration, [`endpoint:${endpoint}`]);
  dogstatsd.increment('n8n.api.calls', 1, [`endpoint:${endpoint}`, `status:${statusCode}`]);
}

// Track errors
function trackError(errorType, stage) {
  dogstatsd.increment('n8n.errors', 1, [`type:${errorType}`, `stage:${stage}`]);
}
```

---

## CloudWatch Setup

### 1. Install CloudWatch Agent
```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

### 2. Configure CloudWatch
```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "region": "us-east-1"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/n8n/workflow-builder.log",
            "log_group_name": "/aws/n8n/workflow-builder",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/n8n/error.log",
            "log_group_name": "/aws/n8n/errors",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "N8N/WorkflowBuilder",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {"name": "cpu_usage_idle", "rename": "CPU_IDLE", "unit": "Percent"},
          {"name": "cpu_usage_iowait", "rename": "CPU_IOWAIT", "unit": "Percent"},
          "cpu_time_guest"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DISK_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60,
        "resources": ["/"]
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MEM_USED", "unit": "Percent"}
        ]
      },
      "net": {
        "measurement": [
          {"name": "bytes_sent", "rename": "NET_SENT", "unit": "Bytes"},
          {"name": "bytes_recv", "rename": "NET_RECV", "unit": "Bytes"}
        ]
      }
    }
  }
}
```

### 3. CloudWatch Alarms
```bash
# Create CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name n8n-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPU_USED \
  --namespace N8N/WorkflowBuilder \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Create error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name n8n-high-error-rate \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name ErrorRate \
  --namespace N8N/WorkflowBuilder \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

---

## Log Aggregation

### 1. ELK Stack Setup
```yaml
# docker-compose-elk.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - esdata:/usr/share/elasticsearch/data
    ports:
      - 9200:9200

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - 5044:5044
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - 5601:5601
    depends_on:
      - elasticsearch

volumes:
  esdata:
```

### 2. Logstash Pipeline
```ruby
# logstash/pipeline/n8n.conf
input {
  beats {
    port => 5044
  }

  file {
    path => "/var/log/n8n/*.log"
    start_position => "beginning"
    codec => multiline {
      pattern => "^\d{4}-\d{2}-\d{2}"
      negate => true
      what => "previous"
    }
  }
}

filter {
  if [source] =~ "workflow-builder" {
    grok {
      match => {
        "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}"
      }
    }

    date {
      match => [ "timestamp", "ISO8601" ]
    }

    mutate {
      add_field => {
        "service" => "n8n-workflow-builder"
        "environment" => "production"
      }
    }
  }

  if [level] == "ERROR" {
    mutate {
      add_tag => [ "error", "alert" ]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "n8n-logs-%{+YYYY.MM.dd}"
  }

  if "alert" in [tags] {
    email {
      to => "alerts@your-domain.com"
      subject => "n8n Alert: %{level} - %{message}"
    }
  }
}
```

---

## Alert Configuration

### 1. PagerDuty Integration
```javascript
// pagerduty_alerts.js
const pdClient = require('node-pagerduty');
const pd = new pdClient({
  serviceKey: process.env.PAGERDUTY_KEY
});

function triggerAlert(severity, description, details) {
  pd.trigger({
    incident_key: `n8n-${Date.now()}`,
    description: description,
    details: details,
    client: 'n8n Workflow Builder',
    client_url: 'https://your-domain.com',
    severity: severity
  });
}
```

### 2. Slack Alerts
```javascript
// slack_alerts.js
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_TOKEN);

async function sendAlert(channel, message, severity) {
  const color = {
    'critical': '#FF0000',
    'warning': '#FFA500',
    'info': '#0000FF'
  }[severity] || '#808080';

  await slack.chat.postMessage({
    channel: channel,
    attachments: [{
      color: color,
      title: 'n8n Workflow Builder Alert',
      text: message,
      timestamp: Math.floor(Date.now() / 1000)
    }]
  });
}
```

---

## Custom Metrics

### 1. Application Metrics
```javascript
// metrics.js
const promClient = require('prom-client');

// Create custom metrics
const workflowCounter = new promClient.Counter({
  name: 'n8n_workflows_generated_total',
  help: 'Total number of workflows generated',
  labelNames: ['status', 'source']
});

const workflowDuration = new promClient.Histogram({
  name: 'n8n_workflow_generation_duration_seconds',
  help: 'Workflow generation duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const aiApiCalls = new promClient.Counter({
  name: 'n8n_ai_api_calls_total',
  help: 'Total AI API calls',
  labelNames: ['provider', 'model', 'status']
});

// Export metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

### 2. Business Metrics Dashboard
```sql
-- Key business metrics query
CREATE VIEW v_business_metrics AS
SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT request_id) as total_workflows,
    COUNT(DISTINCT client_email) as unique_users,
    COUNT(DISTINCT company) as unique_companies,
    AVG(qa_score) as avg_qa_score,
    SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_seconds
FROM generated_workflows
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Monitoring Best Practices

### 1. Key Performance Indicators (KPIs)
- **Response Time**: < 2 seconds (95th percentile)
- **Error Rate**: < 0.1%
- **Availability**: > 99.9%
- **Workflow Generation Success Rate**: > 95%
- **Database Query Time**: < 100ms (average)

### 2. Alert Fatigue Prevention
- Use alert grouping and deduplication
- Set appropriate thresholds
- Implement alert routing based on severity
- Regular alert review and tuning

### 3. Dashboard Organization
- **Executive Dashboard**: High-level business metrics
- **Operations Dashboard**: Technical metrics and health
- **Debugging Dashboard**: Detailed logs and traces
- **Security Dashboard**: Access patterns and threats

---

## Maintenance

### Weekly Tasks
- Review alert noise and tune thresholds
- Check dashboard accuracy
- Verify log rotation is working
- Update metric documentation

### Monthly Tasks
- Analyze trends and patterns
- Capacity planning review
- Cost optimization review
- Security audit of monitoring access

---

## Troubleshooting Monitoring Issues

### Prometheus Not Scraping
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify endpoint is accessible
curl http://localhost:5678/metrics

# Check Prometheus logs
journalctl -u prometheus -f
```

### Missing Metrics in Grafana
```bash
# Test Prometheus query
curl -G http://localhost:9090/api/v1/query --data-urlencode 'query=up'

# Verify datasource configuration
curl http://admin:admin@localhost:3000/api/datasources
```

### High Cardinality Issues
```sql
-- Find high cardinality metrics
SELECT
    metric_name,
    COUNT(DISTINCT labels) as label_combinations
FROM prometheus.metrics
GROUP BY metric_name
ORDER BY label_combinations DESC
LIMIT 10;
```

---

## Support

For monitoring-related issues:
- **Documentation**: https://docs.your-domain.com/monitoring
- **Slack Channel**: #monitoring-support
- **On-call**: monitoring@your-domain.com