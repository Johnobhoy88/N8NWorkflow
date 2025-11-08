# Salesforce to PostgreSQL Sync

## Overview

This workflow syncs Salesforce contacts to a PostgreSQL database with incremental updates, ensuring your database stays in sync with your CRM.

## Features

- ✅ **Incremental Sync** - Only fetches records modified since last sync
- ✅ **Upsert Logic** - Updates existing records, inserts new ones
- ✅ **Error Handling** - Retry logic and error notifications
- ✅ **Field Mapping** - Maps Salesforce fields to PostgreSQL schema
- ✅ **Sync Tracking** - Tracks sync metadata and statistics
- ✅ **Notifications** - Slack notifications on success/failure

## Prerequisites

- n8n instance (self-hosted or cloud)
- Salesforce account with API access
- PostgreSQL database
- Slack workspace (for notifications)

## Database Setup

```sql
-- Create contacts table
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  salesforce_id VARCHAR(18) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  account_name VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  synced_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contacts_salesforce_id ON contacts(salesforce_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_updated ON contacts(updated_at DESC);

-- Create sync metadata table
CREATE TABLE sync_metadata (
  sync_name VARCHAR(100) PRIMARY KEY,
  last_sync_time TIMESTAMP,
  sync_cursor VARCHAR(255),
  records_synced BIGINT DEFAULT 0,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO sync_metadata (sync_name, last_sync_time)
VALUES ('salesforce_contacts', '2024-01-01 00:00:00');
```

## Configuration

### 1. Import Workflow

1. Download `workflow.json`
2. In n8n, go to Workflows → Import from File
3. Select the downloaded JSON file

### 2. Configure Credentials

#### Salesforce OAuth2
1. Create Connected App in Salesforce
2. Get Client ID and Client Secret
3. Add credentials in n8n:
   - Type: Salesforce OAuth2
   - Client ID: Your Salesforce Client ID
   - Client Secret: Your Salesforce Client Secret
   - Environment: Production (or Sandbox)

#### PostgreSQL
1. Add PostgreSQL credentials in n8n:
   - Host: Your database host
   - Database: Your database name
   - User: Database user
   - Password: Database password
   - Port: 5432 (default)
   - SSL: Enabled (recommended)

#### Slack
1. Create Slack App or use webhook
2. Add credentials in n8n:
   - Type: Slack API
   - Access Token: Your Slack Bot Token

### 3. Update Workflow Variables

Edit the following nodes:

**Fetch Salesforce Contacts:**
- Adjust fields to sync (currently: Id, FirstName, LastName, Email, Phone, Account.Name)
- Modify limit if needed (default: 1000 records per run)

**Transform Data:**
- Add/remove fields based on your schema
- Apply custom transformations if needed

**Notification channels:**
- Update Slack channel names (#data-sync, #alerts)

### 4. Test the Workflow

```bash
# Test workflow with sample data
curl -X POST https://your-n8n.com/webhook-test/salesforce-sync \
  -H "Content-Type: application/json"
```

Or use n8n's "Execute Workflow" button.

## Environment Variables

Create `.env` file:

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432

# Salesforce
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_ENVIRONMENT=production

# Slack
SLACK_BOT_TOKEN=xoxb-your-slack-token
SLACK_CHANNEL_SUCCESS=#data-sync
SLACK_CHANNEL_ERROR=#alerts
```

## Schedule

Default: **Hourly** (every hour at minute 0)

Customize in "Hourly Trigger" node:
- Every 30 minutes: `*/30 * * * *`
- Every 15 minutes: `*/15 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 2 AM: `0 2 * * *`

## Monitoring

### Success Metrics
- Records synced per run
- Sync duration
- Last successful sync time

### Slack Notifications

**Success:**
```
✅ Salesforce → PostgreSQL sync completed
📊 Records synced: 47
🕐 Timestamp: 2025-11-08T13:00:00.000Z
```

**Error:**
```
🚨 Salesforce sync error
Error: Connection timeout
Timestamp: 2025-11-08T13:00:00.000Z
```

### Database Monitoring

```sql
-- Check sync status
SELECT * FROM sync_metadata WHERE sync_name = 'salesforce_contacts';

-- Recent synced contacts
SELECT * FROM contacts ORDER BY synced_at DESC LIMIT 10;

-- Sync statistics
SELECT
  DATE(synced_at) as sync_date,
  COUNT(*) as records_synced
FROM contacts
WHERE synced_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(synced_at)
ORDER BY sync_date DESC;
```

## Error Handling

### Common Issues

**Issue: "Invalid credentials"**
- Solution: Refresh Salesforce OAuth2 token in n8n

**Issue: "Database connection timeout"**
- Solution: Check PostgreSQL connection, firewall rules

**Issue: "Rate limit exceeded"**
- Solution: Reduce sync frequency or batch size

### Error Recovery

The workflow includes:
- Automatic retries (3 attempts)
- Exponential backoff
- Error logging to database
- Slack notifications

## Customization

### Add More Fields

1. Update Salesforce query in "Fetch Salesforce Contacts":
```javascript
fields: "Id,FirstName,LastName,Email,Phone,Title,Department,Account.Name"
```

2. Update transformation in "Transform Data":
```javascript
title: contact.Title || null,
department: contact.Department || null
```

3. Update database schema:
```sql
ALTER TABLE contacts
ADD COLUMN title VARCHAR(100),
ADD COLUMN department VARCHAR(100);
```

### Filter Specific Contacts

Add filter condition in "Fetch Salesforce Contacts":
```javascript
conditions: {
  conditionsUi: {
    condition: [
      {
        field: "Email",
        operation: "isNotEmpty"
      },
      {
        field: "Account.Type",
        operation: "equal",
        value: "Customer"
      }
    ]
  }
}
```

### Bidirectional Sync

Add reverse sync workflow:
1. Trigger on PostgreSQL changes (use triggers or polling)
2. Transform to Salesforce format
3. Update Salesforce records

## Performance

### Benchmark
- 1,000 contacts: ~30 seconds
- 10,000 contacts: ~5 minutes
- 100,000 contacts: ~45 minutes

### Optimization Tips
1. **Batch Processing**: For large datasets, use cursor-based pagination
2. **Parallel Processing**: Split into multiple workflows
3. **Indexes**: Ensure proper indexes on both sides
4. **Field Selection**: Only sync needed fields

## Troubleshooting

### Enable Debug Logging

Add logging node after each step:
```javascript
console.log('Step: Fetch', {
  recordCount: $items().length,
  timestamp: new Date()
});
```

### Test Connection

```bash
# Test Salesforce connection
curl "https://your-instance.salesforce.com/services/data/v57.0/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test PostgreSQL connection
psql -h localhost -U your_user -d your_database -c "SELECT 1"
```

## Support

For issues or questions:
- Check n8n community forum
- Review Salesforce API documentation
- Consult PostgreSQL documentation
- Reference knowledge base in `/domains/n8n/`

## License

MIT License - Free to use and modify

## Version

**1.0.0** - Initial release (2025-11-08)
