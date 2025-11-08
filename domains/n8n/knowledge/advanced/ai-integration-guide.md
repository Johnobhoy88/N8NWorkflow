# n8n AI Integration Guide - Complete Reference (2025)

## Table of Contents
- [AI Integration Overview](#ai-integration-overview)
- [OpenAI Integration](#openai-integration)
- [Claude (Anthropic) Integration](#claude-anthropic-integration)
- [Google Gemini Integration](#google-gemini-integration)
- [Multi-Model Orchestration](#multi-model-orchestration)
- [LangChain Workflows](#langchain-workflows)
- [Vector Databases](#vector-databases)
- [Prompt Engineering](#prompt-engineering)
- [Cost Optimization](#cost-optimization)
- [Production Patterns](#production-patterns)

---

## AI Integration Overview

### Supported AI Platforms (2025)

```
┌─────────────────────────────────────────────┐
│  OpenAI GPT                                 │
│  - GPT-4o (multimodal, fast)               │
│  - GPT-4o-mini (cost-effective)            │
│  - GPT-4-turbo (powerful reasoning)        │
├─────────────────────────────────────────────┤
│  Anthropic Claude                           │
│  - Claude 3.5 Sonnet (best balance)        │
│  - Claude 3.5 Haiku (fast, cheap)          │
│  - Claude 3 Opus (maximum capability)      │
├─────────────────────────────────────────────┤
│  Google Gemini                              │
│  - Gemini 2.0 Flash (extremely fast)       │
│  - Gemini 1.5 Pro (2M context window)      │
│  - Gemini 1.5 Flash (cost-effective)       │
├─────────────────────────────────────────────┤
│  Other Models                               │
│  - Ollama (local models)                   │
│  - Hugging Face (custom models)            │
│  - Azure OpenAI                             │
└─────────────────────────────────────────────┘
```

### Common Use Cases

1. **Content Generation** - Blog posts, emails, product descriptions
2. **Data Extraction** - Parse unstructured text to structured JSON
3. **Classification** - Categorize support tickets, emails, reviews
4. **Sentiment Analysis** - Analyze customer feedback
5. **Translation** - Multi-language content translation
6. **Summarization** - Condense long documents
7. **Question Answering** - RAG (Retrieval-Augmented Generation)
8. **Code Generation** - Generate code snippets, SQL queries
9. **Image Analysis** - Describe images, extract text (OCR)
10. **Workflow Automation** - AI-driven decision making

---

## OpenAI Integration

### Basic Chat Completion

**Using HTTP Request Node:**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "Authorization",
          "value": "Bearer {{ $env.OPENAI_API_KEY }}"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  model: 'gpt-4o',\n  messages: [\n    {\n      role: 'system',\n      content: 'You are a helpful assistant that extracts structured data from text.'\n    },\n    {\n      role: 'user',\n      content: $json.userMessage\n    }\n  ],\n  temperature: 0.7,\n  max_tokens: 1000\n}) }}"
  }
}
```

**Process Response (Code Node):**
```javascript
const response = $input.first().json;

// Extract AI response
const aiMessage = response.choices[0].message.content;
const usage = response.usage;

return [{
  json: {
    aiResponse: aiMessage,
    tokensUsed: usage.total_tokens,
    cost: (usage.prompt_tokens * 0.000005) + (usage.completion_tokens * 0.000015), // GPT-4o pricing
    model: response.model
  }
}];
```

---

### Structured Output with JSON Mode

**Force JSON Response:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "Extract user information and return as JSON with fields: name, email, phone, address"
    },
    {
      "role": "user",
      "content": "John Doe, john@example.com, 555-1234, 123 Main St"
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.3
}
```

**Parse JSON Response:**
```javascript
const response = $input.first().json;
const aiMessage = response.choices[0].message.content;

// Parse JSON output
const structuredData = JSON.parse(aiMessage);

return [{ json: structuredData }];
```

---

### Function Calling (Tool Use)

**Define Functions:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "What's the weather in San Francisco?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"]
            }
          },
          "required": ["location"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

**Handle Function Call (Code Node):**
```javascript
const response = $input.first().json;
const message = response.choices[0].message;

// Check if AI wants to call a function
if (message.tool_calls && message.tool_calls.length > 0) {
  const toolCall = message.tool_calls[0];
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);

  return [{
    json: {
      requiresToolCall: true,
      toolCallId: toolCall.id,
      functionName: functionName,
      arguments: functionArgs
    }
  }];
}

// Regular response
return [{
  json: {
    requiresToolCall: false,
    response: message.content
  }
}];
```

---

### Vision (Image Analysis)

**Analyze Image with GPT-4o:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What's in this image? Provide a detailed description."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "{{ $json.imageUrl }}"
          }
        }
      ]
    }
  ],
  "max_tokens": 500
}
```

**With Base64 Image:**
```javascript
// In Code node - convert image to base64
const imageData = $input.first().binary.image;
const base64Image = imageData.data.toString('base64');
const mimeType = imageData.mimeType;

return [{
  json: {
    imageContent: [
      { type: 'text', text: 'Describe this image in detail' },
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`
        }
      }
    ]
  }
}];
```

---

### Streaming Responses

**Enable Streaming:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Write a long article about AI"}
  ],
  "stream": true
}
```

**Handle Stream (Advanced - requires custom handling):**
```javascript
// Note: n8n HTTP Request doesn't natively support SSE streaming
// Use webhook + external service or implement custom node

// For long responses without streaming, just increase max_tokens
```

---

## Claude (Anthropic) Integration

### Basic Message API

**HTTP Request to Claude:**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
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
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  model: 'claude-3-5-sonnet-20241022',\n  max_tokens: 4096,\n  messages: [\n    {\n      role: 'user',\n      content: $json.userMessage\n    }\n  ]\n}) }}"
  }
}
```

**With System Prompt:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "system": "You are a data analyst expert. Extract insights from data and provide clear recommendations.",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this sales data: {{ $json.salesData }}"
    }
  ]
}
```

---

### Tool Use with Claude

**Define Tools:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "tools": [
    {
      "name": "get_customer_info",
      "description": "Retrieves customer information from database",
      "input_schema": {
        "type": "object",
        "properties": {
          "customer_id": {
            "type": "string",
            "description": "The customer's unique identifier"
          }
        },
        "required": ["customer_id"]
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Look up customer ID 12345"
    }
  ]
}
```

**Handle Tool Use Response:**
```javascript
const response = $input.first().json;

// Check if Claude wants to use a tool
const content = response.content;

const toolUseBlock = content.find(block => block.type === 'tool_use');

if (toolUseBlock) {
  return [{
    json: {
      requiresToolUse: true,
      toolName: toolUseBlock.name,
      toolInput: toolUseBlock.input,
      toolUseId: toolUseBlock.id
    }
  }];
}

// Regular text response
const textBlock = content.find(block => block.type === 'text');
return [{
  json: {
    requiresToolUse: false,
    response: textBlock.text
  }
}];
```

**Send Tool Result Back:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "messages": [
    {
      "role": "user",
      "content": "Look up customer ID 12345"
    },
    {
      "role": "assistant",
      "content": [
        {
          "type": "tool_use",
          "id": "{{ $json.toolUseId }}",
          "name": "get_customer_info",
          "input": {"customer_id": "12345"}
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "tool_result",
          "tool_use_id": "{{ $json.toolUseId }}",
          "content": "{{ JSON.stringify($json.customerData) }}"
        }
      ]
    }
  ]
}
```

---

### Vision with Claude

**Image Analysis:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 2048,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "{{ $json.base64Image }}"
          }
        },
        {
          "type": "text",
          "text": "Describe what you see in this image"
        }
      ]
    }
  ]
}
```

---

## Google Gemini Integration

### Basic Generation

**Using Environment Variable for API Key:**
```javascript
// In Code node or HTTP Request URL
const apiKey = $env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

// Make request (use HTTP Request node with this URL)
```

**Request Body:**
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "{{ $json.userPrompt }}"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 2048
  }
}
```

**Process Response:**
```javascript
const response = $input.first().json;

// Extract generated text
const generatedText = response.candidates[0].content.parts[0].text;

return [{
  json: {
    response: generatedText,
    finishReason: response.candidates[0].finishReason,
    safetyRatings: response.candidates[0].safetyRatings
  }
}];
```

---

### Multi-turn Conversation

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "Hello, what can you help me with?"}]
    },
    {
      "role": "model",
      "parts": [{"text": "I can help with data analysis, content generation, and more!"}]
    },
    {
      "role": "user",
      "parts": [{"text": "Analyze this dataset: {{ $json.dataset }}"}]
    }
  ]
}
```

---

### Multimodal Input (Text + Images)

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "What's in this image?"
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "{{ $json.base64Image }}"
          }
        }
      ]
    }
  ]
}
```

---

## Multi-Model Orchestration

### Model Selection Strategy

```javascript
function selectModel(task) {
  const strategies = {
    // Fast, cheap tasks
    simple: {
      model: 'gpt-4o-mini',
      provider: 'openai',
      costPer1kTokens: 0.0003
    },

    // Complex reasoning
    complex: {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      costPer1kTokens: 0.003
    },

    // Multimodal
    vision: {
      model: 'gpt-4o',
      provider: 'openai',
      costPer1kTokens: 0.01
    },

    // Maximum speed
    speed: {
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
      costPer1kTokens: 0.0001
    },

    // Large context
    longContext: {
      model: 'gemini-1.5-pro',
      provider: 'google',
      contextWindow: 2000000
    }
  };

  // Task classification
  if (task.hasImages) return strategies.vision;
  if (task.requiresReasoning) return strategies.complex;
  if (task.isUrgent) return strategies.speed;
  if (task.contextLength > 100000) return strategies.longContext;

  return strategies.simple;
}

// Usage
const task = {
  prompt: $json.prompt,
  hasImages: !!$json.images,
  requiresReasoning: $json.taskType === 'analysis',
  isUrgent: $json.priority === 'high',
  contextLength: $json.context?.length || 0
};

const selectedModel = selectModel(task);

return [{ json: selectedModel }];
```

---

### Fallback Pattern (Resilience)

```javascript
async function callAIWithFallback(prompt, maxRetries = 3) {
  const models = [
    { provider: 'openai', model: 'gpt-4o', apiKey: $env.OPENAI_API_KEY },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', apiKey: $env.ANTHROPIC_API_KEY },
    { provider: 'google', model: 'gemini-2.0-flash-exp', apiKey: $env.GEMINI_API_KEY }
  ];

  for (const modelConfig of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Call appropriate API based on provider
        let response;

        if (modelConfig.provider === 'openai') {
          response = await $http.request({
            method: 'POST',
            url: 'https://api.openai.com/v1/chat/completions',
            headers: {
              'Authorization': `Bearer ${modelConfig.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: {
              model: modelConfig.model,
              messages: [{ role: 'user', content: prompt }]
            }
          });

          return {
            provider: modelConfig.provider,
            model: modelConfig.model,
            response: response.choices[0].message.content
          };
        }

        // Add other providers...

      } catch (error) {
        console.log(`${modelConfig.provider} attempt ${attempt + 1} failed: ${error.message}`);

        if (attempt === maxRetries - 1) {
          // Try next model
          continue;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error('All AI providers failed');
}

const result = await callAIWithFallback($json.prompt);
return [{ json: result }];
```

---

## LangChain Workflows

### Basic Chain (LangChain Nodes)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Chat Trigger │────▶│  OpenAI LLM  │────▶│   Response   │
└──────────────┘     └──────────────┘     └──────────────┘
```

**OpenAI Chat Model Node (LangChain):**
```json
{
  "parameters": {
    "model": "gpt-4o",
    "options": {
      "temperature": 0.7,
      "maxTokens": 2000
    }
  },
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi"
}
```

---

### RAG (Retrieval-Augmented Generation)

```
┌──────────┐   ┌────────────┐   ┌─────────────┐   ┌─────────┐
│  Query   │──▶│ Embed Query│──▶│Vector Search│──▶│  LLM    │
└──────────┘   └────────────┘   └─────────────┘   └─────────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │Vector Store │
                                │ (Pinecone/  │
                                │  Qdrant)    │
                                └─────────────┘
```

**Vector Store Query (Code Node):**
```javascript
// Query vector database for relevant context

const queryEmbedding = $json.queryEmbedding; // From embedding model
const topK = 5;

// Query Pinecone/Qdrant (pseudo-code)
const results = await vectorStore.query({
  vector: queryEmbedding,
  topK: topK,
  includeMetadata: true
});

// Extract relevant text chunks
const context = results.matches
  .map(match => match.metadata.text)
  .join('\n\n');

return [{
  json: {
    context: context,
    sources: results.matches.map(m => m.metadata.source)
  }
}];
```

**LLM with Context:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "Answer the question based on the provided context. If the answer is not in the context, say so.\n\nContext:\n{{ $json.context }}"
    },
    {
      "role": "user",
      "content": "{{ $json.userQuestion }}"
    }
  ]
}
```

---

### AI Agent with Tools

```
┌────────────┐
│   Input    │
└─────┬──────┘
      │
      ▼
┌────────────┐
│ AI Agent   │◀──────┐
│  (LLM)     │       │
└─────┬──────┘       │
      │              │
      ▼              │
┌────────────┐       │
│   Router   │       │
│ (Tool Call)│       │
└─┬────┬────┬┘      │
  │    │    │        │
  │    │    └────────┘
  │    │      (No tool)
  │    │
  │    ▼
  │  ┌────────────┐
  │  │  Tool 2    │
  │  │ (Database) │
  │  └─────┬──────┘
  │        │
  ▼        │
┌────────────┐  │
│  Tool 1    │  │
│ (Search)   │  │
└─────┬──────┘  │
      │         │
      └────┬────┘
           │
           ▼
      ┌────────────┐
      │   Output   │
      └────────────┘
```

---

## Vector Databases

### Pinecone Integration

**Upsert Embeddings:**
```javascript
// After generating embeddings with OpenAI embeddings API

const vectors = $json.documents.map((doc, index) => ({
  id: `doc_${index}`,
  values: doc.embedding, // 1536-dim array from OpenAI
  metadata: {
    text: doc.text,
    source: doc.source,
    timestamp: new Date().toISOString()
  }
}));

// Upsert to Pinecone (HTTP Request)
const response = await $http.request({
  method: 'POST',
  url: `https://YOUR_INDEX-YOUR_PROJECT.svc.YOUR_ENV.pinecone.io/vectors/upsert`,
  headers: {
    'Api-Key': $env.PINECONE_API_KEY,
    'Content-Type': 'application/json'
  },
  body: {
    vectors: vectors,
    namespace: 'documents'
  }
});

return [{ json: { upserted: vectors.length } }];
```

---

## Prompt Engineering

### Best Practices

**1. Clear Instructions:**
```
❌ Bad: "Analyze this"

✅ Good: "Analyze the following customer review and extract:
1. Sentiment (positive/negative/neutral)
2. Key topics mentioned
3. Specific pain points or praise
4. Recommended action (respond, escalate, ignore)

Format response as JSON."
```

**2. Few-Shot Examples:**
```
System: Extract contact information from emails.

Examples:
Input: "Hi, I'm John at john@example.com, call me at 555-1234"
Output: {"name": "John", "email": "john@example.com", "phone": "555-1234"}

Input: "Contact Jane Smith, jane.smith@company.com"
Output: {"name": "Jane Smith", "email": "jane.smith@company.com", "phone": null}

Now extract from:
{{ $json.emailBody }}
```

**3. Role Assignment:**
```
"You are an expert data analyst with 10 years of experience in e-commerce.
Your task is to analyze the sales data and provide actionable insights for
improving conversion rates. Focus on trends, anomalies, and opportunities."
```

**4. Output Format Specification:**
```
"Return your analysis as a JSON object with the following structure:
{
  \"summary\": \"one-sentence overview\",
  \"keyFindings\": [\"finding 1\", \"finding 2\"],
  \"recommendations\": [{\"action\": \"...\", \"priority\": \"high/medium/low\"}],
  \"metrics\": {\"conversionRate\": 0.05, \"averageOrderValue\": 125.50}
}"
```

---

### Prompt Templates

**Data Extraction Template:**
```javascript
const extractionPrompt = `
Extract structured data from the following text and return as JSON.

Required fields:
- name (string)
- email (string, must be valid email format)
- company (string)
- role (string)
- interests (array of strings)

If a field is not found, use null.

Text to analyze:
${$json.inputText}

Return only valid JSON, no additional text.
`;

return [{ json: { prompt: extractionPrompt } }];
```

**Classification Template:**
```javascript
const classificationPrompt = `
Classify the following support ticket into ONE of these categories:
- billing
- technical
- feature_request
- bug_report
- general_inquiry

Also rate urgency as: low, medium, high, critical

Ticket:
Subject: ${$json.subject}
Body: ${$json.body}

Respond in JSON format:
{"category": "...", "urgency": "...", "reasoning": "..."}
`;
```

---

## Cost Optimization

### Token Counting & Cost Estimation

```javascript
// Approximate token count (rough estimate)
function estimateTokens(text) {
  // ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

function calculateCost(promptTokens, completionTokens, model) {
  const pricing = {
    'gpt-4o': { input: 0.0025, output: 0.010 }, // per 1K tokens
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
    'gemini-2.0-flash-exp': { input: 0.0001, output: 0.0003 }
  };

  const modelPricing = pricing[model] || { input: 0, output: 0 };

  const cost = (
    (promptTokens / 1000) * modelPricing.input +
    (completionTokens / 1000) * modelPricing.output
  );

  return cost;
}

// Usage
const promptText = $json.systemPrompt + $json.userMessage;
const estimatedPromptTokens = estimateTokens(promptText);

const modelToUse = estimatedPromptTokens > 10000 ? 'gemini-1.5-pro' : 'gpt-4o-mini';

return [{
  json: {
    model: modelToUse,
    estimatedCost: calculateCost(estimatedPromptTokens, 500, modelToUse)
  }
}];
```

---

### Cost Optimization Strategies

**1. Use Cheaper Models for Simple Tasks:**
```javascript
const task = $json.task;

// Route to appropriate model
if (task.type === 'summarize' && task.length < 1000) {
  return [{ json: { model: 'gpt-4o-mini' } }]; // $0.15 per 1M tokens
}

if (task.type === 'complex_reasoning') {
  return [{ json: { model: 'claude-3-5-sonnet-20241022' } }];
}
```

**2. Reduce Output Tokens:**
```json
{
  "model": "gpt-4o",
  "messages": [...],
  "max_tokens": 500,  // Limit output length
  "temperature": 0.3   // Lower temperature = more focused, shorter responses
}
```

**3. Batch Processing:**
```javascript
// Process multiple items in one API call
const items = $json.items.slice(0, 10); // Process in batches of 10

const prompt = `
Categorize each of the following items (return as JSON array):

${items.map((item, i) => `${i + 1}. ${item.text}`).join('\n')}

Return: [{"id": 1, "category": "..."}, ...]
`;

// One API call instead of 10
```

**4. Caching Responses:**
```javascript
const cache = {}; // In production, use Redis

function getCachedOrFetch(prompt, model) {
  const cacheKey = `${model}:${prompt}`;

  if (cache[cacheKey]) {
    console.log('Cache hit - no API call needed');
    return cache[cacheKey];
  }

  // Make API call
  const response = callAI(prompt, model);
  cache[cacheKey] = response;

  return response;
}
```

---

## Production Patterns

### Complete AI Workflow Pattern

```
┌────────────────┐
│  Input Data    │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Validate Input │
│ (length, type) │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Select Model   │
│ (cost/speed)   │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│   Call AI API  │
│ (with retry)   │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Validate Output│
│  (parse JSON)  │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Log Metrics   │
│(tokens, cost)  │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Return Result │
└────────────────┘
```

---

### Monitoring & Logging

```javascript
// Log AI API usage for monitoring

const logEntry = {
  timestamp: new Date().toISOString(),
  workflow: $workflow.name,
  execution: $execution.id,
  model: $json.model,
  promptTokens: $json.usage.prompt_tokens,
  completionTokens: $json.usage.completion_tokens,
  totalTokens: $json.usage.total_tokens,
  estimatedCost: ($json.usage.prompt_tokens * 0.000005) + ($json.usage.completion_tokens * 0.000015),
  latencyMs: $json.latency,
  success: true
};

// Log to database or monitoring service
// await logToDatabase(logEntry);

return [{ json: logEntry }];
```

---

## Best Practices Summary

### ✅ DO

1. **Use environment variables** for API keys
2. **Implement retry logic** for transient failures
3. **Validate AI outputs** before using in production
4. **Monitor costs and usage** with logging
5. **Use appropriate models** for each task
6. **Set max_tokens** to prevent runaway costs
7. **Implement rate limiting** to stay within quotas
8. **Cache responses** when possible
9. **Test prompts thoroughly** before production
10. **Handle errors gracefully** with fallbacks

### ❌ DON'T

1. **Don't hardcode API keys** in workflows
2. **Don't trust AI outputs** without validation
3. **Don't use expensive models** for simple tasks
4. **Don't forget to handle** rate limits (429 errors)
5. **Don't expose sensitive data** in prompts
6. **Don't ignore token limits** (context windows)
7. **Don't skip testing** edge cases
8. **Don't use AI for** time-critical operations without fallbacks
9. **Don't forget to sanitize** AI-generated content
10. **Don't exceed budget** - implement spend limits

---

**Last Updated:** January 2025
**Supported Platforms:** OpenAI, Anthropic, Google AI, Ollama, HuggingFace
