---
name: AI Integration Specialist
description: Expert in OpenAI, Claude, and Gemini integration with function calling, vision, RAG, and cost optimization. Use for AI workflow design, prompt engineering, and multi-model orchestration.
---

# AI Integration Specialist Skill

You are an expert in integrating AI models (OpenAI, Claude, Gemini) into automation workflows with production-ready patterns.

## Supported AI Platforms (2025)

```
OpenAI:
- GPT-4o (multimodal, fast) - $2.50/$10 per 1M tokens
- GPT-4o-mini (cost-effective) - $0.15/$0.60 per 1M tokens

Anthropic Claude:
- Claude 3.5 Sonnet (best balance) - $3/$15 per 1M tokens
- Claude 3.5 Haiku (fast, cheap) - $0.80/$4 per 1M tokens

Google Gemini:
- Gemini 2.0 Flash (extremely fast) - $0.10/$0.30 per 1M tokens
- Gemini 1.5 Pro (2M context) - $1.25/$5 per 1M tokens
```

## OpenAI Integration

### Basic Chat Completion

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a data analyst. Extract structured data from text.'
      },
      {
        role: 'user',
        content: $json.userMessage
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  }
});

const aiMessage = response.choices[0].message.content;
const usage = response.usage;

return [{
  json: {
    response: aiMessage,
    tokensUsed: usage.total_tokens,
    cost: (usage.prompt_tokens * 0.0000025) + (usage.completion_tokens * 0.00001)
  }
}];
```

### Structured Output (JSON Mode)

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Extract user information and return as JSON with fields: name, email, phone, address'
      },
      {
        role: 'user',
        content: $json.text
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  }
});

const structuredData = JSON.parse(response.choices[0].message.content);
return [{ json: structuredData }];
```

### Function Calling (Tool Use)

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: 'What\'s the weather in San Francisco?' }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name'
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit']
              }
            },
            required: ['location']
          }
        }
      }
    ],
    tool_choice: 'auto'
  }
});

const message = response.choices[0].message;

if (message.tool_calls && message.tool_calls.length > 0) {
  const toolCall = message.tool_calls[0];
  const functionArgs = JSON.parse(toolCall.function.arguments);

  return [{
    json: {
      requiresToolCall: true,
      functionName: toolCall.function.name,
      arguments: functionArgs
    }
  }];
}
```

### Vision (Image Analysis)

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What\'s in this image? Provide detailed description.'
          },
          {
            type: 'image_url',
            image_url: {
              url: $json.imageUrl
            }
          }
        ]
      }
    ],
    max_tokens: 500
  }
});
```

## Claude (Anthropic) Integration

### Basic Message API

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.anthropic.com/v1/messages',
  headers: {
    'x-api-key': $env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: 'You are a data analyst expert. Extract insights and provide recommendations.',
    messages: [
      {
        role: 'user',
        content: $json.userMessage
      }
    ]
  }
});

const aiMessage = response.content[0].text;
return [{ json: { response: aiMessage } }];
```

### Tool Use with Claude

```javascript
const response = await $http.request({
  method: 'POST',
  url: 'https://api.anthropic.com/v1/messages',
  headers: {
    'x-api-key': $env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools: [
      {
        name: 'get_customer_info',
        description: 'Retrieves customer information from database',
        input_schema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer unique identifier'
            }
          },
          required: ['customer_id']
        }
      }
    ],
    messages: [
      {
        role: 'user',
        content: 'Look up customer ID 12345'
      }
    ]
  }
});

const toolUseBlock = response.content.find(block => block.type === 'tool_use');

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
```

## Google Gemini Integration

```javascript
const response = await $http.request({
  method: 'POST',
  url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${$env.GEMINI_API_KEY}`,
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    contents: [
      {
        parts: [
          {
            text: $json.userPrompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  }
});

const generatedText = response.candidates[0].content.parts[0].text;
return [{ json: { response: generatedText } }];
```

## Multi-Model Orchestration

### Model Selection Strategy

```javascript
function selectModel(task) {
  // Fast, cheap tasks
  if (task.length < 1000 && !task.requiresReasoning) {
    return { model: 'gpt-4o-mini', provider: 'openai' };
  }

  // Complex reasoning
  if (task.requiresReasoning) {
    return { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' };
  }

  // Multimodal
  if (task.hasImages) {
    return { model: 'gpt-4o', provider: 'openai' };
  }

  // Maximum speed
  if (task.isUrgent) {
    return { model: 'gemini-2.0-flash-exp', provider: 'google' };
  }

  // Large context
  if (task.contextLength > 100000) {
    return { model: 'gemini-1.5-pro', provider: 'google' };
  }

  // Default: cost-effective
  return { model: 'gpt-4o-mini', provider: 'openai' };
}
```

### Fallback Pattern (Resilience)

```javascript
async function callAIWithFallback(prompt, maxRetries = 3) {
  const models = [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    { provider: 'google', model: 'gemini-2.0-flash-exp' }
  ];

  for (const modelConfig of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await callModel(modelConfig, prompt);
      } catch (error) {
        console.log(`${modelConfig.provider} attempt ${attempt + 1} failed`);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
  }

  throw new Error('All AI providers failed');
}
```

## Cost Optimization

### Token Estimation & Budgeting

```javascript
function estimateTokens(text) {
  return Math.ceil(text.length / 4); // ~4 characters per token
}

function calculateCost(promptTokens, completionTokens, model) {
  const pricing = {
    'gpt-4o': { input: 0.0025, output: 0.010 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'gemini-2.0-flash-exp': { input: 0.0001, output: 0.0003 }
  };

  const modelPricing = pricing[model] || { input: 0, output: 0 };

  return (
    (promptTokens / 1000) * modelPricing.input +
    (completionTokens / 1000) * modelPricing.output
  );
}
```

### Caching Responses

```javascript
const cache = {}; // In production, use Redis

function getCachedOrFetch(prompt, model) {
  const cacheKey = `${model}:${prompt}`;

  if (cache[cacheKey]) {
    console.log('Cache hit - no API call needed');
    return cache[cacheKey];
  }

  const response = callAI(prompt, model);
  cache[cacheKey] = response;

  return response;
}
```

## Prompt Engineering Best Practices

### Clear Instructions

```
❌ Bad: "Analyze this"

✅ Good: "Analyze the following customer review and extract:
1. Sentiment (positive/negative/neutral)
2. Key topics mentioned
3. Specific pain points or praise
4. Recommended action (respond, escalate, ignore)

Format response as JSON."
```

### Few-Shot Examples

```
System: Extract contact information from emails.

Examples:
Input: "Hi, I'm John at john@example.com, call me at 555-1234"
Output: {"name": "John", "email": "john@example.com", "phone": "555-1234"}

Now extract from:
{{ $json.emailBody }}
```

### Output Format Specification

```
"Return your analysis as JSON:
{
  \"summary\": \"one-sentence overview\",
  \"keyFindings\": [\"finding 1\", \"finding 2\"],
  \"recommendations\": [{\"action\": \"...\", \"priority\": \"high/medium/low\"}],
  \"metrics\": {\"conversionRate\": 0.05, \"averageOrderValue\": 125.50}
}"
```

## Best Practices

### ✅ DO

1. **Use environment variables for API keys**
2. **Implement retry logic**
3. **Validate outputs before using**
4. **Monitor costs and usage**
5. **Use appropriate models for tasks**
6. **Set max_tokens to prevent runaway costs**
7. **Implement rate limiting**
8. **Cache responses when possible**
9. **Test prompts thoroughly**
10. **Handle errors gracefully with fallbacks**

### ❌ DON'T

1. **Don't hardcode API keys**
2. **Don't trust AI outputs without validation**
3. **Don't use expensive models for simple tasks**
4. **Don't forget rate limits (429 errors)**
5. **Don't expose sensitive data in prompts**
6. **Don't ignore token limits**
7. **Don't skip testing edge cases**
8. **Don't use AI for time-critical operations without fallbacks**
9. **Don't forget to sanitize AI-generated content**
10. **Don't exceed budget - implement spend limits**

## When to Use This Skill

Invoke when:
- Integrating OpenAI, Claude, or Gemini
- Implementing function calling / tool use
- Processing images with vision models
- Building RAG (Retrieval-Augmented Generation) systems
- Creating AI agents
- Optimizing AI costs
- Implementing multi-model fallbacks
- Designing prompt templates
- Troubleshooting AI integration issues

## Knowledge Base Reference

`domains/n8n/knowledge/advanced/ai-integration-guide.md`

---

*Leverages 2025 AI integration best practices with production-ready patterns.*
