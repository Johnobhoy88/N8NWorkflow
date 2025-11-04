# GitHub Workflow Sync - Setup Guide

## Status: ✅ Production-Ready

This workflow automatically syncs n8n workflows from your GitHub repository when code is pushed.

## Prerequisites

### 1. n8n API Token
- Navigate to n8n Cloud Settings → API Keys
- Create a new API key
- Save the token securely

### 2. Gmail OAuth2 Credentials
- Already configured in n8n Cloud
- Uses your connected Gmail account
- No additional setup needed if Gmail is already connected

### 3. GitHub Webhook Configuration
- Repository: `Johnobhoy88/N8NWorkflow`
- Settings → Webhooks → Add webhook
- Payload URL: `https://highlandai.app.n8n.cloud/webhook/github-workflow-sync`
- Content type: `application/json`
- Events: Select "Just the push event"
- Active: ✓ Checked

## Credential Setup in n8n

### HTTP Header Auth (for n8n API)
1. Go to Credentials → Add credential
2. Select "Header Auth"
3. Name: "n8n API Token"
4. Header Name: `Authorization`
5. Header Value: `Bearer YOUR_API_TOKEN_HERE`
6. Save

### Gmail OAuth2 (Already Configured)
- Should already be set up in your n8n instance
- If not, go to Credentials → Add credential → Gmail OAuth2
- Follow the OAuth flow to connect your Gmail account

## Import Instructions

1. Copy the entire contents of `github-workflow-sync-production.json`
2. In n8n: Workflows → Add workflow → Import from JSON
3. Paste the JSON and click Import
4. Update the credentials:
   - Click on "Call n8n API - Pull Workflows" node
   - Select your "n8n API Token" credential
   - Click on both Gmail nodes
   - Select your Gmail OAuth2 credential
5. Save the workflow
6. Activate the workflow

## Testing

### Phase 1: Manual Test
1. Click "Execute Workflow"
2. Use test payload:
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "full_name": "Johnobhoy88/N8NWorkflow"
  },
  "pusher": {
    "name": "test-user"
  },
  "commits": [
    {
      "message": "Test commit"
    }
  ]
}
```
3. Verify success email arrives

### Phase 2: Live Test
1. Make a commit to your repository
2. Push to GitHub
3. Check execution in n8n
4. Verify sync completed

## Monitoring

- Check Executions tab for workflow runs
- Success emails confirm sync completion
- Error emails alert on failures
- Review n8n logs for detailed debugging

## Troubleshooting

### Webhook Not Triggering
- Verify webhook URL in GitHub matches exactly
- Check webhook is active in GitHub settings
- Review Recent Deliveries in GitHub webhook settings

### API Authentication Fails
- Regenerate n8n API token if expired
- Verify Bearer prefix in credential
- Check API endpoint URL is correct

### Gmail Errors
- Re-authenticate Gmail OAuth2 if token expired
- Check Gmail API is enabled in Google Cloud Console
- Verify sender email permissions

## Production Notes

- Workflow uses `continueOnFail` for graceful error handling
- All Code nodes return proper array format: `[{json: {...}}]`
- Gmail OAuth2 used instead of SMTP (n8n Cloud requirement)
- HTTP Request uses fullResponse for detailed error info
- Branch filtering can be added in Extract Push Data node if needed

## Security Considerations

- Never commit API tokens to Git
- Use n8n's built-in credential management
- Consider webhook signature verification for production
- Limit API token permissions to minimum required

## Support

For issues or questions:
1. Check n8n execution logs
2. Review GitHub webhook delivery history
3. Verify all credentials are valid
4. Test with manual trigger first

---

Last Updated: 2025-11-04
Workflow Version: v1.0.0
Compatible with: n8n Cloud