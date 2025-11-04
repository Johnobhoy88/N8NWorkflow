# GitHub Workflow Sync - Setup Guide

## Overview
This workflow automatically syncs n8n workflows from your GitHub repository whenever code is pushed to the specified branch. It uses GitHub webhooks to trigger the sync and sends Gmail notifications for both success and failure scenarios.

## Architecture

```
GitHub Push Event
       ↓
GitHub Webhook → Extract Push Data → Call n8n API → Check for Errors
                                                            ↓
                                                    ┌───────┴───────┐
                                                    ↓               ↓
                                            Success Path      Error Path
                                                    ↓               ↓
                                            Format Success   Format Error
                                                    ↓               ↓
                                            Send Success     Send Error
                                            Gmail           Gmail
```

## Node Details

### 1. GitHub Webhook Node
- **Type**: Webhook Trigger
- **Path**: `github-workflow-sync`
- **Method**: POST
- **Raw Body**: Enabled (required for GitHub signature verification)
- **Response Mode**: On Received (immediate 200 response)

### 2. Extract Push Data Node
- **Type**: Code (JavaScript)
- **Purpose**: Parses GitHub webhook payload to extract:
  - Branch name
  - Repository full name
  - Pusher name
  - Commit count
  - Commit messages (first 3)
  - Timestamp

### 3. Call n8n API - Pull Workflows Node
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://highlandai.app.n8n.cloud/api/v1/source-control/pull`
- **Authentication**: HTTP Header Auth (Bearer token)
- **Body**: `{ "force": false }`
- **Options**:
  - Continue On Fail: **Enabled** (critical for error routing)
  - Return Full Response: **Enabled** (needed for status code checking)

### 4. Check for Errors Node
- **Type**: IF condition
- **Logic**: Routes to success path if:
  - No error field present AND
  - Status code < 300
- **Outputs**:
  - True → Success path
  - False → Error path

### 5. Format Success/Error Message Nodes
- **Type**: Code (JavaScript)
- **Purpose**: Creates formatted HTML email content with:
  - Push details (repo, branch, pusher, commits)
  - API response status
  - Timestamp
  - Visual indicators (✓ for success, ✗ for error)

### 6. Send Success/Error Email Nodes
- **Type**: Email Send (Gmail)
- **Authentication**: OAuth2 (already configured)
- **To**: jpmcmillan67@gmail.com
- **Format**: HTML
- **Dynamic Content**: Subject and body from Code node

## Setup Instructions

### Step 1: Create n8n API Credentials

1. Go to your n8n Cloud instance: https://highlandai.app.n8n.cloud
2. Navigate to **Settings → API**
3. Click **Create API Key**
4. Copy the JWT token
5. In n8n workflow editor:
   - Go to **Credentials**
   - Create new **HTTP Header Auth** credential
   - Name: "n8n API JWT"
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_JWT_TOKEN_HERE`

### Step 2: Import Workflow to n8n

1. Go to n8n workflows page
2. Click **Add Workflow**
3. Click the **...** menu → **Import from File**
4. Select `/home/user/N8NWorkflow/n8n-workflows/github-workflow-sync.json`
5. Verify all nodes imported correctly
6. Assign the "n8n API JWT" credential to the HTTP Request node
7. Verify Gmail OAuth2 credentials are assigned to both Email Send nodes

### Step 3: Activate Workflow and Get Webhook URL

1. Click **Activate** toggle in top-right corner
2. Click on the **GitHub Webhook** node
3. Click **Test URL** or **Production URL** (copy production URL)
4. Your webhook URL will be: `https://highlandai.app.n8n.cloud/webhook/github-workflow-sync`

### Step 4: Configure GitHub Webhook

1. Go to GitHub repository: https://github.com/Johnobhoy88/N8NWorkflow
2. Navigate to **Settings → Webhooks → Add webhook**
3. Configure webhook:
   - **Payload URL**: `https://highlandai.app.n8n.cloud/webhook/github-workflow-sync`
   - **Content type**: `application/json`
   - **Secret**: (optional - for signature verification)
   - **SSL verification**: Enable
   - **Events**: Select "Just the push event"
   - **Active**: Check this box
4. Click **Add webhook**

### Step 5: Test the Workflow

#### Manual Test (Recommended First)
1. In n8n, click the **GitHub Webhook** node
2. Click **Listen for Test Event**
3. Use this curl command to send a test payload:

```bash
curl -X POST https://highlandai.app.n8n.cloud/webhook/github-workflow-sync \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "refs/heads/claude/check-claude-n8-skills-011CUoK55UiGbPhvRphAwD9V",
    "repository": {
      "full_name": "Johnobhoy88/N8NWorkflow"
    },
    "pusher": {
      "name": "test-user"
    },
    "commits": [
      {
        "message": "Test commit for workflow sync"
      }
    ]
  }'
```

4. Check n8n execution log
5. Verify Gmail notification received

#### Live Test
1. Make a small change to your repository
2. Commit and push to the branch: `claude/check-claude-n8-skills-011CUoK55UiGbPhvRphAwD9V`
3. Check n8n executions page for new execution
4. Verify Gmail notification received

## Configuration Options

### Branch Filtering
To only sync on specific branches, add this code after the "Extract Push Data" node:

```javascript
const allowedBranches = [
  'main',
  'claude/check-claude-n8-skills-011CUoK55UiGbPhvRphAwD9V'
];

if (!allowedBranches.includes($json.branch)) {
  // Skip execution
  return [];
}

return items;
```

### Webhook Signature Verification
For production security, add signature verification in the "Extract Push Data" node:

```javascript
const crypto = require('crypto');

const payload = JSON.stringify(items[0].json.body);
const signature = items[0].headers['x-hub-signature-256'];
const secret = 'YOUR_GITHUB_SECRET';

const hmac = crypto.createHmac('sha256', secret);
const digest = 'sha256=' + hmac.update(payload).digest('hex');

if (signature !== digest) {
  throw new Error('Invalid webhook signature');
}

// Continue with normal processing...
```

### Multiple Email Recipients
To send notifications to multiple recipients, update the Email Send nodes:

```
toEmail: "jpmcmillan67@gmail.com, team@example.com, alerts@example.com"
```

## Troubleshooting

### Issue: Workflow not triggering
- **Check**: GitHub webhook delivery in Settings → Webhooks → Recent Deliveries
- **Check**: n8n workflow is activated (toggle in top-right)
- **Check**: Webhook URL matches exactly

### Issue: n8n API call failing
- **Check**: JWT token is valid (regenerate if expired)
- **Check**: n8n instance URL is correct
- **Check**: Source control is enabled in n8n instance settings
- **Check**: Git credentials are configured in n8n

### Issue: Email not sending
- **Check**: Gmail OAuth2 credentials are valid
- **Check**: Email address is correct
- **Check**: Check spam folder

### Issue: Workflow executes but sync fails
- **Check**: n8n logs in Settings → Logs
- **Check**: Git remote URL is correct
- **Check**: Branch exists in remote repository
- **Check**: No merge conflicts in Git

## API Reference

### n8n Source Control API
```http
POST https://highlandai.app.n8n.cloud/api/v1/source-control/pull
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "force": false
}
```

**Response (Success)**:
```json
{
  "statusCode": 200,
  "message": "Workflows pulled successfully"
}
```

**Response (Error)**:
```json
{
  "statusCode": 400,
  "message": "Merge conflict detected"
}
```

## Security Considerations

1. **JWT Token**: Store securely in n8n credentials, never commit to Git
2. **Webhook Secret**: Use GitHub webhook secrets for signature verification
3. **HTTPS Only**: Never use HTTP webhooks (GitHub enforces this)
4. **Rate Limiting**: GitHub webhooks have no automatic retry
5. **Credential Rotation**: Rotate JWT tokens periodically

## Maintenance

### Monthly Tasks
- Verify webhook is still active in GitHub
- Check execution history for failures
- Test error path with invalid credentials

### When to Update Workflow
- n8n API endpoint changes
- Gmail OAuth2 credentials expire
- Branch name changes
- Email recipient changes

## Related Documentation
- [n8n Source Control Docs](https://docs.n8n.io/source-control/)
- [GitHub Webhooks Guide](https://docs.github.com/en/webhooks)
- [n8n API Reference](https://docs.n8n.io/api/)

## Support
For issues with this workflow, contact John via jpmcmillan67@gmail.com or check the n8n-workflows repository.
