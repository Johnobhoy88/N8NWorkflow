# API Hardening Quick Reference Guide

**For:** n8n Workflow Developers
**Date:** 2025-11-17

---

## 🚀 Quick Start

### 1. Import Hardened Workflow
```bash
File: /home/user/N8NWorkflow/domains/n8n/workflows/active/workflow-builder-gemini-v2-production-hardened.json
```

### 2. Set Environment Variable
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 3. Configure Gmail OAuth2
Update credentials in:
- Email Trigger
- Send Workflow Email
- Send Error Email

### 4. Activate & Test
Send test email with subject: `[WORKFLOW] Test`

---

## 📊 Key Improvements

| Feature | Status | Benefit |
|---------|--------|---------|
| API keys in headers | ✅ | Security |
| Retry logic | ✅ | Reliability |
| Timeout (30s) | ✅ | Stability |
| Rate limit handling | ✅ | Availability |
| Request validation | ✅ | Cost savings |
| Response validation | ✅ | Data quality |
| Cost tracking | ✅ | Visibility |
| Monitoring dashboard | ✅ | Observability |

---

## 🔧 HTTP Request Node Template

### Hardened HTTP Request Configuration
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {"name": "Content-Type", "value": "application/json"},
        {"name": "x-goog-api-key", "value": "={{$env.GEMINI_API_KEY}}"}
      ]
    },
    "sendBody": true,
    "contentType": "raw",
    "body": "={{JSON.stringify({contents:[{parts:[{text:'Your prompt here'}]}]})}}",
    "options": {
      "timeout": 30000,
      "retry": {
        "maxTries": 3,
        "waitBetweenTries": 1000
      }
    }
  },
  "continueOnFail": true,
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000
}
```

**✅ Do:**
- Use `v1` endpoint (not `v1beta`)
- Put API key in `x-goog-api-key` header
- Set timeout to 30000ms (30 seconds)
- Enable retry with 3 attempts
- Use `continueOnFail: true`

**❌ Don't:**
- Put API key in URL query parameter
- Use beta endpoints in production
- Skip timeout configuration
- Forget retry logic

---

## 🛡️ Request Validator Template

### Before Each HTTP Request Node
```javascript
// API Request Size Validator
const input = items[0].json;
const requestType = 'your-api-name'; // Change this

const result = {
  ...input,
  apiValidation: {
    passed: true,
    requestType,
    timestamp: new Date().toISOString(),
    metrics: {}
  }
};

try {
  // Build your request payload
  const requestPayload = {
    contents: [{
      parts: [{
        text: `Your prompt using ${input.yourData}`
      }]
    }]
  };

  // Calculate size
  const requestBody = JSON.stringify(requestPayload);
  const requestSizeBytes = new Blob([requestBody]).size;
  const requestSizeKB = (requestSizeBytes / 1024).toFixed(2);
  const MAX_REQUEST_SIZE_KB = 120;

  result.apiValidation.metrics = {
    requestSizeBytes,
    requestSizeKB,
    maxSizeKB: MAX_REQUEST_SIZE_KB,
    estimatedTokens: Math.ceil(requestSizeBytes / 4),
    withinLimit: requestSizeBytes < MAX_REQUEST_SIZE_KB * 1024
  };

  // Validate size
  if (requestSizeBytes > MAX_REQUEST_SIZE_KB * 1024) {
    result.apiValidation.passed = false;
    result.error = true;
    result.errorMessage = `Request too large: ${requestSizeKB}KB`;
    result.stage = 'api-size-validation';
  }

  // Estimate cost
  const estimatedInputTokens = result.apiValidation.metrics.estimatedTokens;
  const estimatedOutputTokens = 1000; // Adjust based on your needs
  const inputCost = (estimatedInputTokens / 1000000) * 0.075;
  const outputCost = (estimatedOutputTokens / 1000000) * 0.30;

  result.apiValidation.metrics.cost = {
    estimatedInputTokens,
    estimatedOutputTokens,
    totalCostUSD: (inputCost + outputCost).toFixed(6)
  };

  console.log(`[API Validation] ${requestType}: ${requestSizeKB}KB, Est. Cost: $${result.apiValidation.metrics.cost.totalCostUSD}`);
} catch (e) {
  result.apiValidation.passed = false;
  result.error = true;
  result.errorMessage = 'API validation error: ' + e.message;
}

return [{json: result}];
```

---

## ✅ Response Validator Template

### After Each HTTP Request Node
```javascript
// API Response Validator
const response = items[0].json;
const previousData = $('Your Previous Node').first().json;

const result = {
  ...previousData,
  apiResponse: {
    validated: false,
    timestamp: new Date().toISOString(),
    responseType: 'your-api-name', // Change this
    metrics: {}
  }
};

try {
  // Check HTTP errors
  if (response.error || response.statusCode >= 400) {
    const statusCode = response.statusCode || 0;

    // Rate limiting
    if (statusCode === 429) {
      const retryAfter = response.headers?.['retry-after'] || 60;
      result.apiResponse.rateLimited = true;
      result.apiResponse.retryAfter = parseInt(retryAfter);
      throw new Error(`Rate limited: retry after ${retryAfter}s`);
    }

    // Server errors (will trigger retry)
    if (statusCode >= 500) {
      result.apiResponse.serverError = true;
      throw new Error(`Server error: ${statusCode}`);
    }

    // Client errors (won't retry)
    if (statusCode >= 400) {
      result.apiResponse.clientError = true;
      result.error = true;
      result.errorMessage = `API client error: ${statusCode}`;
      return [{json: result}];
    }
  }

  // Validate response structure
  const body = response.body || response;

  if (!body.candidates || !Array.isArray(body.candidates) || body.candidates.length === 0) {
    throw new Error('Invalid response structure');
  }

  const candidate = body.candidates[0];

  // Check content filtering
  if (candidate.finishReason === 'SAFETY') {
    throw new Error('Content filtered for safety');
  }

  // Validate content
  if (!candidate.content?.parts?.[0]?.text?.trim()) {
    throw new Error('Empty response content');
  }

  // Extract usage metrics
  if (body.usageMetadata) {
    const inputCost = (body.usageMetadata.promptTokenCount / 1000000) * 0.075;
    const outputCost = (body.usageMetadata.candidatesTokenCount / 1000000) * 0.30;
    result.apiResponse.metrics = {
      promptTokens: body.usageMetadata.promptTokenCount || 0,
      candidatesTokens: body.usageMetadata.candidatesTokenCount || 0,
      totalTokens: body.usageMetadata.totalTokenCount || 0,
      actualCostUSD: (inputCost + outputCost).toFixed(6)
    };
  }

  // Success
  result.apiResponse.validated = true;
  result.candidates = body.candidates;

  console.log(`[API Success] ${result.apiResponse.responseType}: ${result.apiResponse.metrics.totalTokens} tokens, $${result.apiResponse.metrics.actualCostUSD}`);
} catch (e) {
  result.apiResponse.validated = false;
  result.error = true;
  result.errorMessage = 'API validation failed: ' + e.message;
  console.error(`[Validation Failed] ${result.apiResponse.responseType}: ${e.message}`);
}

return [{json: result}];
```

---

## 🎯 Validation Checkpoint Template

### After Each Response Validator
```json
{
  "parameters": {
    "conditions": {
      "options": {"caseSensitive": true},
      "conditions": [
        {
          "id": "api-validated",
          "leftValue": "={{$json.apiResponse.validated}}",
          "rightValue": true,
          "operator": {"type": "boolean", "operation": "equal"}
        }
      ],
      "combineOperation": "all"
    }
  },
  "type": "n8n-nodes-base.if"
}
```

**Connection:**
- **True path:** Continue to next stage
- **False path:** Route to Error Handler

---

## 📈 Monitoring Console Output

### What to Look For
```
[API Validation] brief-parser: 2.34KB, Est. Cost: $0.000123
[API Success] Brief Parser: 1234 tokens, $0.000145
[API Validation] architect-agent: 4.56KB, Est. Cost: $0.000234
[API Success] Architect: 2345 tokens, $0.000267

=== API MONITORING DASHBOARD ===
Execution: 2025-11-17T12:00:00.000Z
Source: form
Successful Calls: 4/4
Reliability: 100.00%
Total Tokens: 8234
Total Cost: $0.001234
Rate Limits: 0
Server Errors: 0
Client Errors: 0
================================
```

### Error Messages
```
[Rate Limit] Brief Parser: Retry after 60s
[Server Error] Brief Parser: 503
[Validation Failed] Brief Parser: Invalid response structure
[Client Error] Brief Parser: 400
```

---

## 💰 Cost Tracking

### Gemini 2.0 Flash Pricing
- **Input:** $0.075 per 1M tokens
- **Output:** $0.30 per 1M tokens

### Average Cost Per Execution
```
Brief Parser:     1,000 tokens  →  $0.000075
Architect Agent:  2,000 tokens  →  $0.000150
Synthesis Agent:  3,000 tokens  →  $0.000225
QA Validator:     1,500 tokens  →  $0.000113
─────────────────────────────────────────────
Total:            7,500 tokens  →  $0.000563
```

### Monthly Cost Estimate
- 100 executions/month: $0.056
- 1,000 executions/month: $0.563
- 10,000 executions/month: $5.63

---

## 🚨 Common Issues & Solutions

### Issue 1: API Key Not Found
**Error:** `Missing required header: x-goog-api-key`
**Solution:** Set environment variable:
```bash
export GEMINI_API_KEY="your-key-here"
```

### Issue 2: Rate Limit Hit
**Error:** `Rate limited: retry after 60s`
**Solution:** Automatic retry after wait period. Check quota limits in Google Cloud Console.

### Issue 3: Request Too Large
**Error:** `Request too large: 145KB (max: 120KB)`
**Solution:** Reduce input size or split into multiple requests.

### Issue 4: Timeout
**Error:** `Request timeout after 30000ms`
**Solution:** Check API status or increase timeout (not recommended).

### Issue 5: Invalid Response
**Error:** `Invalid response structure`
**Solution:** Check console logs for detailed error. Verify API endpoint is correct.

---

## 🔍 Debugging Checklist

- [ ] Environment variable `GEMINI_API_KEY` is set
- [ ] Gmail OAuth2 credentials are configured
- [ ] Workflow is activated
- [ ] Check n8n execution logs for errors
- [ ] Check console logs for API monitoring output
- [ ] Verify API endpoint is `v1` (not `v1beta`)
- [ ] Verify API key is in header (not URL)
- [ ] Check retry logic is enabled
- [ ] Verify timeout is 30000ms
- [ ] Check validation nodes are connected correctly

---

## 📦 File Locations

### Workflow Files
```
/home/user/N8NWorkflow/domains/n8n/workflows/active/
├── workflow-builder-gemini-v2-with-qa-enhanced.json          # Original
├── workflow-builder-gemini-v2-with-qa-enhanced.backup.json   # Backup
└── workflow-builder-gemini-v2-production-hardened.json       # Hardened ← USE THIS
```

### Documentation
```
/home/user/N8NWorkflow/docs/
├── API_HARDENING_IMPLEMENTATION.md   # Full implementation guide
├── API_HARDENING_COMPARISON.md       # Before vs After comparison
└── API_HARDENING_QUICK_REFERENCE.md  # This file
```

---

## 🎓 Best Practices

### Security
1. ✅ Always use headers for API keys
2. ✅ Never log API keys
3. ✅ Use environment variables for secrets
4. ✅ Validate all inputs
5. ✅ Sanitize error messages

### Reliability
1. ✅ Always add retry logic
2. ✅ Set reasonable timeouts
3. ✅ Handle rate limits gracefully
4. ✅ Validate responses before processing
5. ✅ Log all API calls for monitoring

### Performance
1. ✅ Validate request size before sending
2. ✅ Track token usage for cost optimization
3. ✅ Use appropriate timeout values
4. ✅ Monitor API performance metrics
5. ✅ Optimize prompts for token efficiency

### Maintainability
1. ✅ Use clear node names
2. ✅ Add comments to code nodes
3. ✅ Document API configurations
4. ✅ Keep validation logic consistent
5. ✅ Use modular design patterns

---

## 📞 Support

### Troubleshooting Steps
1. Check console logs for error messages
2. Review n8n execution logs
3. Verify environment variables
4. Test with simple request first
5. Check API quotas and limits

### Resources
- **n8n Documentation:** https://docs.n8n.io
- **Gemini API Docs:** https://ai.google.dev/docs
- **Implementation Guide:** `/home/user/N8NWorkflow/docs/API_HARDENING_IMPLEMENTATION.md`
- **Comparison Guide:** `/home/user/N8NWorkflow/docs/API_HARDENING_COMPARISON.md`

---

## 📋 Pre-Flight Checklist

Before deploying to production:

- [ ] Imported hardened workflow
- [ ] Configured environment variables
- [ ] Updated Gmail OAuth2 credentials
- [ ] Tested with simple request
- [ ] Verified all validation nodes connected
- [ ] Checked monitoring dashboard output
- [ ] Reviewed error handling paths
- [ ] Tested rate limit handling
- [ ] Verified cost tracking
- [ ] Documented any customizations

---

## 🎯 Success Metrics

### Target Metrics
- **Reliability:** >99%
- **Average Cost:** <$0.002 per execution
- **Rate Limit Hits:** 0 per day
- **Server Errors:** 0 per day
- **Execution Time:** <120 seconds

### Monitor These
- Successful calls / Total calls
- Total tokens per execution
- Total cost per execution
- Rate limit hits
- Server/client errors
- Average execution time

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-11-17
**Maintained By:** Automation Team
