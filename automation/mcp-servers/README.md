# MCP Server Configurations

Model Context Protocol (MCP) servers enable Claude Code to interact with external tools and services.

**Total Servers: 12**
**Last Updated: 2025-11-08**

---

## Available MCP Servers

### 001. n8n Workflow Manager
**File:** `001-n8n-workflow-manager.json`
**Description:** Manage n8n workflows - create, read, update, execute
**Capabilities:** Workflow CRUD, execution, monitoring
**Setup:** Requires n8n API credentials

### 002. Database Query Tool
**File:** `002-database-query.json`
**Description:** Query PostgreSQL, MySQL, MongoDB databases
**Capabilities:** SELECT queries, schema inspection, data analysis
**Setup:** Database connection strings

### 003. Airtable Manager
**File:** `003-airtable.json`
**Description:** Read and write Airtable bases
**Capabilities:** CRUD operations, formula evaluation, webhooks
**Setup:** Airtable API key and base IDs

### 004. GitHub Integration
**File:** `004-github.json`
**Description:** Interact with GitHub repositories
**Capabilities:** Issues, PRs, commits, actions
**Setup:** GitHub personal access token

### 005. Slack Workspace Tool
**File:** `005-slack.json`
**Description:** Read and send messages in Slack
**Capabilities:** Channels, DMs, file uploads, search
**Setup:** Slack bot token

### 006. File System Browser
**File:** `006-filesystem.json`
**Description:** Browse and search local filesystems
**Capabilities:** Read, search, metadata, analysis
**Setup:** File path permissions

### 007. Web Scraper
**File:** `007-web-scraper.json`
**Description:** Fetch and parse web content
**Capabilities:** HTTP requests, HTML parsing, screenshots
**Setup:** No auth required

### 008. AI Model Router
**File:** `008-ai-router.json`
**Description:** Route requests to OpenAI, Claude, Gemini
**Capabilities:** LLM calls, embeddings, image generation
**Setup:** API keys for each provider

### 009. Stripe Payment Manager
**File:** `009-stripe.json`
**Description:** Manage Stripe customers and payments
**Capabilities:** Customer CRUD, payment intents, subscriptions
**Setup:** Stripe API key

### 010. Email Manager
**File:** `010-email.json`
**Description:** Send and receive emails
**Capabilities:** SMTP send, IMAP receive, templates
**Setup:** Email server credentials

### 011. Cloud Storage Manager
**File:** `011-cloud-storage.json`
**Description:** Manage files in S3, Google Cloud Storage, Azure
**Capabilities:** Upload, download, list, delete files
**Setup:** Cloud provider credentials

### 012. Metrics & Analytics
**File:** `012-analytics.json`
**Description:** Query metrics from various sources
**Capabilities:** Time-series queries, aggregations, dashboards
**Setup:** Analytics service credentials

---

## Installation

### 1. Install MCP SDK

```bash
npm install @anthropic-ai/sdk
```

### 2. Configure MCP Server

Create `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n-workflow-manager": {
      "command": "node",
      "args": ["/path/to/mcp-servers/001-n8n-workflow-manager.js"],
      "env": {
        "N8N_API_KEY": "your-api-key",
        "N8N_BASE_URL": "https://n8n.example.com"
      }
    }
  }
}
```

### 3. Restart Claude Code

The MCP server will be available in your next session.

---

## Usage in Claude Code

```
I'm going to use the n8n Workflow Manager to check running workflows.

[Claude uses MCP server to query n8n API]

Here are the currently running workflows:
1. Salesforce Sync - Running for 2 hours
2. Email Processor - Completed 15 minutes ago
3. Data Migration - Pending
```

---

## Creating Custom MCP Servers

### Server Template

```javascript
// my-custom-server.js
import { McpServer } from '@anthropic-ai/sdk/mcp';

const server = new McpServer({
  name: 'My Custom Server',
  version: '1.0.0'
});

// Define tools
server.tool({
  name: 'search_data',
  description: 'Search for data in the system',
  parameters: {
    query: {
      type: 'string',
      description: 'Search query'
    },
    limit: {
      type: 'number',
      description: 'Max results',
      default: 10
    }
  },
  execute: async ({ query, limit }) => {
    const results = await searchDatabase(query, limit);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }
});

// Start server
server.start();
```

### Register in Claude Code

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "node",
      "args": ["/path/to/my-custom-server.js"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

---

## Security Best Practices

1. **Environment Variables**: Store credentials in env vars, never hardcode
2. **Permissions**: Grant minimum necessary permissions
3. **Rate Limiting**: Implement rate limits in MCP servers
4. **Validation**: Validate all inputs before processing
5. **Logging**: Log all MCP server actions for audit

---

## Troubleshooting

**Issue:** MCP server not appearing in Claude Code
- **Solution:** Check `claude_desktop_config.json` syntax, restart Claude

**Issue:** Authentication errors
- **Solution:** Verify environment variables are set correctly

**Issue:** Timeouts
- **Solution:** Increase timeout in server configuration

---

## Resources

- [MCP Documentation](https://docs.anthropic.com/claude/docs/mcp)
- [MCP SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Example Servers](https://github.com/anthropics/mcp-servers-examples)

---

**Maintained by:** Automation Toolkit Team
**Version:** 1.0.0
