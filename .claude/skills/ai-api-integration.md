---
skill: ai-api-integration
description: Configure Claude, Gemini, and OpenAI API connections with correct 2025 model IDs and authentication patterns
version: 1.0.0
priority: tier-1
tags: [ai, api, claude, gemini, openai, integration, 2025]
---

# AI API Integration

## Purpose
Ensure n8n workflows use the correct 2025 AI model names, API endpoints, authentication methods, and response parsing for Claude, Gemini, and OpenAI.

## Capabilities

### Model Selection (2025 Current)

**Anthropic Claude Models:**
- `claude-opus-4-20250514` - Most powerful, complex reasoning, 200K context
- `claude-sonnet-4-20250514` - Balanced performance/speed, 200K context
- `claude-3-5-haiku-20241022` - Fast lightweight, 200K context, 8K output

**Google Gemini Models:**
- `gemini-2.0-flash-exp` - Experimental multimodal, 1M context, native tool use
- `gemini-1.5-pro` - Production stable, 1M context, multimodal
- `gemini-1.5-flash` - Fast responses, lower cost

**OpenAI Models:**
- `gpt-4` - Current stable, complex reasoning
- `gpt-4-turbo` - Faster GPT-4 variant
- `gpt-3.5-turbo` - Cost-effective, faster responses

### Authentication Methods

| Provider | Method | Header/Param | Format |
|----------|--------|--------------|--------|
| **Anthropic** | Header | `x-api-key` | `sk-ant-...` |
| **Anthropic** | Header | `anthropic-version` | `2023-06-01` |
| **Gemini** | Query Param | `key` | `AIzaSy...` |
| **OpenAI** | Header | `Authorization` | `Bearer sk-...` |

### Response Parsing

**Anthropic Claude:**
```javascript
const response = $json.content[0].text;
```

**Google Gemini:**
```javascript
const response = $json.candidates[0].content.parts[0].text;
```

**OpenAI:**
```javascript
const response = $json.choices[0].message.content;
```

---

## When to Use This Skill

**Use when users need:**
- AI model integration in workflows
- Correct 2025 model IDs (avoid deprecated models)
- Proper authentication setup
- Response parsing from different AI providers
- Cost optimization (model selection)
- Multi-model orchestration

**Examples:**
- "Add Claude Opus 4 for complex document analysis"
- "Use Gemini Flash for fast summaries"
- "Configure GPT-4 for code review"
- "Route simple queries to Haiku, complex to Opus"

---

## Key Resources Referenced

### API Documentation
- `docs/API_SKILLS_REFERENCE.md` (lines 1-50) - Anthropic Claude API
- `docs/API_SKILLS_REFERENCE.md` (lines 87-134) - Google Gemini API
- `docs/API_SKILLS_REFERENCE.md` (lines 176-223) - OpenAI API
- `docs/API_SKILLS_REFERENCE.md` (lines 309-347) - Multi-model integration

### Templates
- `workflow-templates/ai-agent-orchestration.json` (lines 18-47) - OpenAI config
- `workflow-templates/ai-agent-orchestration.json` (lines 68-82) - Claude config
- `workflow-templates/github-pr-review.json` (lines 75-103) - GPT-4 code review

### Best Practices
- `LESSONS_LEARNED.md` (lines 133-161) - Gemini API authentication gotcha
- `BEST_PRACTICES.md` (lines 85-89) - Credential management

---

## Examples

### Example 1: Anthropic Claude Opus 4 Integration

**User Request:**
> "Add Claude Opus 4 to analyze customer feedback and extract sentiment, key issues, and suggested actions."

**Generated HTTP Request Node:**
```json
{
  "id": "claude-opus-analysis",
  "name": "Claude Opus 4 - Feedback Analysis",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 300],
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "x-api-key",
          "value": "={{ $env.ANTHROPIC_API_KEY }}"
        },
        {
          "name": "anthropic-version",
          "value": "2023-06-01"
        },
        {
          "name": "content-type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "contentType": "raw",
    "body": "={{ JSON.stringify({\n  model: 'claude-opus-4-20250514',\n  max_tokens: 4096,\n  messages: [{\n    role: 'user',\n    content: `Analyze this customer feedback and extract:\n1. Overall sentiment (positive/negative/neutral)\n2. Key issues mentioned\n3. Suggested actions\n\nFeedback: ${$json.feedback}`\n  }]\n}) }}",
    "options": {
      "timeout": 30000
    }
  }
}
```

**Response Parsing Code Node:**
```json
{
  "id": "parse-claude-response",
  "name": "Extract Claude Analysis",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [720, 300],
  "parameters": {
    "jsCode": "const claudeResponse = items[0].json;\n\n// Claude response format: content[0].text\nconst analysis = claudeResponse.content[0].text;\n\nreturn [{\n  json: {\n    original_feedback: items[0].json.feedback,\n    analysis: analysis,\n    model_used: 'claude-opus-4',\n    timestamp: new Date().toISOString()\n  }\n}];"
  }
}
```

**Environment Variables:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

---

### Example 2: Google Gemini 2.0 Flash Integration

**User Request:**
> "Use Gemini Flash for quick text summarization - it needs to be fast and cheap."

**Generated Code Node (Build Request):**
```json
{
  "id": "build-gemini-request",
  "name": "Build Gemini Request",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [300, 300],
  "parameters": {
    "jsCode": "const textToSummarize = items[0].json.text || '';\n\nconst systemPrompt = `Summarize the following text in 2-3 sentences, focusing on key points.\\n\\nText:\\n${textToSummarize}`;\n\nconst geminiRequest = {\n  contents: [\n    {\n      parts: [\n        {\n          text: systemPrompt\n        }\n      ]\n    }\n  ]\n};\n\nreturn [{\n  json: {\n    geminiRequest: geminiRequest,\n    originalText: textToSummarize\n  }\n}];"
  }
}
```

**Generated HTTP Request Node:**
```json
{
  "id": "call-gemini-api",
  "name": "Gemini 2.0 Flash - Summarize",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [520, 300],
  "parameters": {
    "method": "POST",
    "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{ $env.GEMINI_API_KEY }}",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "contentType": "raw",
    "body": "={{ JSON.stringify($json.geminiRequest) }}",
    "options": {}
  }
}
```

**Response Parsing Code Node:**
```json
{
  "id": "parse-gemini-response",
  "name": "Extract Summary",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [740, 300],
  "parameters": {
    "jsCode": "const geminiResponse = items[0].json;\nconst contextData = $('Build Gemini Request').first().json;\n\n// Gemini response format: candidates[0].content.parts[0].text\nconst summary = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated';\n\nreturn [{\n  json: {\n    original_text: contextData.originalText,\n    summary: summary,\n    model_used: 'gemini-2.0-flash-exp',\n    timestamp: new Date().toISOString()\n  }\n}];"
  }
}
```

**Environment Variables:**
```bash
GEMINI_API_KEY=AIzaSyDwHRrv4WHwHDDvK0KzdfpTfm1pnMBbNPk
```

---

### Example 3: OpenAI GPT-4 Code Review

**User Request:**
> "Use GPT-4 to review code changes in pull requests."

**Using LangChain Node (Recommended):**
```json
{
  "id": "gpt4-code-review",
  "name": "GPT-4 Code Review",
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "typeVersion": 1,
  "position": [500, 300],
  "parameters": {
    "model": "gpt-4",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "You are an expert code reviewer. Analyze code changes and provide: 1) Code quality assessment, 2) Potential bugs, 3) Security issues, 4) Performance concerns, 5) Best practices recommendations."
        },
        {
          "role": "user",
          "content": "=PR Title: {{ $json.title }}\\n\\nFiles Changed: {{ $json.files.length }}\\n\\nDiff: {{ JSON.stringify($json.diff) }}"
        }
      ]
    },
    "options": {
      "temperature": 0.3,
      "maxTokens": 2000
    }
  },
  "credentials": {
    "openAiApi": {
      "id": "openai-cred-id",
      "name": "OpenAI API"
    }
  }
}
```

**Using HTTP Request Node (Alternative):**
```json
{
  "id": "gpt4-http-request",
  "name": "GPT-4 via HTTP",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 300],
  "parameters": {
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "=Bearer {{ $env.OPENAI_API_KEY }}"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "contentType": "raw",
    "body": "={{ JSON.stringify({\n  model: 'gpt-4',\n  messages: [\n    {role: 'system', content: 'You are a code reviewer.'},\n    {role: 'user', content: $json.code}\n  ],\n  temperature: 0.3,\n  max_tokens: 2000\n}) }}",
    "options": {}
  }
}
```

---

## Model Selection Guide

### By Task Complexity

| Task Type | Recommended Model | Reasoning |
|-----------|-------------------|-----------|
| **Complex Analysis** | Claude Opus 4 | Best reasoning, 200K context, high accuracy |
| **Balanced Tasks** | Claude Sonnet 4, GPT-4 | Good balance of speed/quality |
| **Fast Responses** | Gemini Flash, Haiku 3.5 | Sub-second latency, cost-effective |
| **Multimodal** | GPT-4o, Gemini Pro | Vision, document processing |
| **Long Context** | Claude Opus/Sonnet, Gemini Pro | Up to 1M tokens (Gemini) |
| **Code Tasks** | GPT-4, Claude Sonnet | Strong code understanding |

### By Cost

| Model | Cost Tier | Use Case |
|-------|-----------|----------|
| **Gemini Flash** | $ | High-volume, simple tasks |
| **Haiku 3.5** | $$ | Fast responses, moderate complexity |
| **GPT-3.5 Turbo** | $$ | General purpose, cost-effective |
| **Sonnet 4** | $$$ | Balanced performance |
| **GPT-4** | $$$$ | Complex reasoning |
| **Opus 4** | $$$$$ | Most complex tasks only |

### Multi-Model Strategy

**Routing Pattern:**
```javascript
// Intent classification
const intent = analyzeIntent($json.query);

if (intent.complexity === 'high') {
  useModel('claude-opus-4-20250514');
} else if (intent.requiresSpeed) {
  useModel('gemini-2.0-flash-exp');
} else {
  useModel('claude-sonnet-4-20250514');
}
```

---

## Common Patterns

### Pattern 1: Safe Request Building (Gemini)
```javascript
// ✅ CORRECT - Template literals handle special characters
const prompt = `Analyze this:\n${userInput}`;

const geminiRequest = {
  contents: [{
    parts: [{
      text: prompt
    }]
  }]
};

return [{json: {geminiRequest: geminiRequest}}];
```

### Pattern 2: Error Handling for AI APIs
```json
{
  "parameters": {
    "continueOnFail": true,
    "options": {
      "timeout": 30000,
      "retry": {
        "maxRetries": 3,
        "retryInterval": 2000
      }
    }
  }
}
```

### Pattern 3: Response Validation
```javascript
// Validate response exists
if (!$json.candidates || $json.candidates.length === 0) {
  return [{
    json: {
      error: true,
      message: 'No response from AI model',
      provider: 'gemini'
    }
  }];
}

// Extract text safely
const text = $json.candidates[0]?.content?.parts?.[0]?.text || '';
```

### Pattern 4: Streaming Responses (Advanced)
```json
{
  "parameters": {
    "url": "https://api.anthropic.com/v1/messages",
    "sendBody": true,
    "body": "={{ JSON.stringify({...body, stream: true}) }}",
    "options": {
      "response": {
        "responseFormat": "stream"
      }
    }
  }
}
```

---

## Integration with Other Skills

**Typical Workflow:**
1. **workflow-template-generator** creates initial workflow
2. **This skill** adds AI model configuration
3. **error-handling-implementer** adds retry logic for AI API calls
4. **workflow-validator** checks model IDs are current (2025)

---

## Error Handling

### Common Errors

**Error 1: Deprecated Model ID**
```
Error: Model 'gemini-pro' not found
```
**Fix:** Update to current 2025 model:
- ❌ `gemini-pro` (deprecated)
- ✅ `gemini-2.0-flash-exp` or `gemini-1.5-pro`

**Error 2: Wrong Authentication**
```
Error: Expected OAuth 2 access token, got API key
```
**Fix:** Gemini uses query parameter, not Bearer token:
- ❌ Header: `Authorization: Bearer API_KEY`
- ✅ Query: `?key=API_KEY`

**Error 3: Contents Not Specified**
```
Error: contents is not specified
```
**Fix:** Use template literals in Code node, not string concatenation:
- ❌ `"text": "prompt..." + $json.input`
- ✅ `const prompt = \`prompt...\\n${$json.input}\``

**Error 4: Response Parsing Fails**
```
Error: Cannot read property 'text' of undefined
```
**Fix:** Use safe navigation:
- ❌ `$json.content[0].text`
- ✅ `$json.content?.[0]?.text || 'No response'`

---

## Validation Rules

Before returning AI node configuration:
- [ ] Model ID is 2025-current (not deprecated)
- [ ] Authentication method matches provider
- [ ] API key stored in `$env.VARIABLE_NAME` (not hardcoded)
- [ ] contentType is `'raw'` for HTTP nodes
- [ ] Request building uses Code node with template literals
- [ ] Response parsing handles missing fields gracefully
- [ ] Timeout set appropriately (30s for complex, 10s for simple)
- [ ] continueOnFail enabled for resilience
- [ ] Retry logic configured (3 attempts recommended)

---

## Quick Reference Card

### 2025 Model IDs
```
Claude:  claude-opus-4-20250514  (complex)
         claude-sonnet-4-20250514 (balanced)
         claude-3-5-haiku-20241022 (fast)

Gemini:  gemini-2.0-flash-exp    (experimental)
         gemini-1.5-pro           (stable)
         gemini-1.5-flash         (fast)

OpenAI:  gpt-4                   (stable)
         gpt-4-turbo             (fast)
         gpt-3.5-turbo           (cost-effective)
```

### Authentication Quick Copy

**Claude:**
```json
{"headers": {
  "x-api-key": "={{ $env.ANTHROPIC_API_KEY }}",
  "anthropic-version": "2023-06-01"
}}
```

**Gemini:**
```
URL: https://...?key={{ $env.GEMINI_API_KEY }}
```

**OpenAI:**
```json
{"headers": {
  "Authorization": "=Bearer {{ $env.OPENAI_API_KEY }}"
}}
```

### Response Parsing Quick Copy

```javascript
// Claude
const text = $json.content[0].text;

// Gemini
const text = $json.candidates[0].content.parts[0].text;

// OpenAI
const text = $json.choices[0].message.content;
```

---

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Related Skills:** workflow-template-generator, error-handling-implementer, multi-model-orchestrator
**Critical Reference:** docs/API_SKILLS_REFERENCE.md (complete model specifications)
