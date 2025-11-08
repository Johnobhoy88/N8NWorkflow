# OpenAI Integration Guide

## Overview

Complete guide for integrating OpenAI (ChatGPT, GPT-4, Whisper, DALL-E) with n8n workflows.

**Difficulty:** Intermediate
**Prerequisites:**
- OpenAI API account
- API key with credits
- n8n instance

---

## Authentication Setup

### 1. Get API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to **API Keys**
3. Click **Create new secret key**
4. Copy key (starts with `sk-`)
5. **Important:** Key shown only once - save it securely

### 2. Configure in n8n

```javascript
// HTTP Request Node
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}",
    "Content-Type": "application/json"
  }
}
```

### 3. Set Budget Limits

1. Go to **Settings → Billing → Usage limits**
2. Set monthly budget cap
3. Configure email alerts

---

## Models & Pricing (2025)

| Model | Input | Output | Best For |
|-------|-------|--------|----------|
| GPT-4o | $2.50/1M tokens | $10/1M tokens | Complex reasoning, coding |
| GPT-4o mini | $0.15/1M tokens | $0.60/1M tokens | Simple tasks, fast |
| GPT-3.5 Turbo | $0.50/1M tokens | $1.50/1M tokens | Legacy support |
| Whisper | $0.006/minute | - | Audio transcription |
| DALL-E 3 | $0.040/image (1024×1024) | - | Image generation |
| TTS | $15/1M characters | - | Text-to-speech |

---

## Chat Completions (GPT-4/GPT-3.5)

### Basic Chat Completion

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant that summarizes documents."
      },
      {
        "role": "user",
        "content": "Summarize this text: {{ $json.text }}"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }
}
```

### With Function Calling (Tool Use)

```javascript
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

// Then handle function call response
if (response.choices[0].message.tool_calls) {
  const toolCall = response.choices[0].message.tool_calls[0];
  const functionArgs = JSON.parse(toolCall.function.arguments);

  // Call your function
  const weatherData = await getWeather(functionArgs.location);

  // Send function result back to GPT
  const finalResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      ...previousMessages,
      response.choices[0].message,
      {
        "role": "tool",
        "tool_call_id": toolCall.id,
        "content": JSON.stringify(weatherData)
      }
    ]
  });
}
```

### JSON Mode

```javascript
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "Extract data in JSON format with fields: name, email, phone"
    },
    {
      "role": "user",
      "content": "John Doe, john@example.com, (555) 123-4567"
    }
  ],
  "response_format": { "type": "json_object" }
}

// Response will be valid JSON
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567"
}
```

### Vision (GPT-4 with Images)

```javascript
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What's in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg"
            // Or base64: "data:image/jpeg;base64,..."
          }
        }
      ]
    }
  ],
  "max_tokens": 300
}
```

---

## Embeddings

### Create Embeddings

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/embeddings",
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "text-embedding-3-small", // $0.02/1M tokens
    "input": "{{ $json.text }}",
    "encoding_format": "float"
  }
}

// Response
{
  "data": [
    {
      "embedding": [0.0023, -0.009, ...], // 1536 dimensions
      "index": 0
    }
  ]
}
```

### Semantic Search Example

```javascript
// 1. Create embeddings for documents
const docs = await Promise.all(
  documents.map(async doc => {
    const embedding = await createEmbedding(doc.text);
    return { ...doc, embedding };
  })
);

// 2. Store in vector database (PostgreSQL with pgvector)
await db.query(`
  INSERT INTO documents (text, embedding)
  VALUES ($1, $2)
`, [doc.text, JSON.stringify(doc.embedding)]);

// 3. Search with query embedding
const queryEmbedding = await createEmbedding(userQuery);

const results = await db.query(`
  SELECT text,
    1 - (embedding <=> $1::vector) AS similarity
  FROM documents
  ORDER BY embedding <=> $1::vector
  LIMIT 5
`, [JSON.stringify(queryEmbedding)]);
```

---

## Whisper (Audio Transcription)

### Transcribe Audio

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/audio/transcriptions",
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}"
  },
  "contentType": "multipart/form-data",
  "body": {
    "file": "{{ $binary.audio }}", // Audio file
    "model": "whisper-1",
    "language": "en", // Optional
    "response_format": "json", // json, text, srt, vtt
    "timestamp_granularities": ["word"] // Optional
  }
}

// Response
{
  "text": "Transcribed audio content here...",
  "words": [
    { "word": "Hello", "start": 0.0, "end": 0.5 },
    { "word": "world", "start": 0.6, "end": 1.0 }
  ]
}
```

### Translate Audio to English

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/audio/translations",
  "body": {
    "file": "{{ $binary.audio }}",
    "model": "whisper-1"
  }
}
```

---

## DALL-E (Image Generation)

### Generate Images

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/images/generations",
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "dall-e-3",
    "prompt": "{{ $json.imagePrompt }}",
    "n": 1,
    "size": "1024x1024", // 1024x1024, 1024x1792, 1792x1024
    "quality": "standard", // standard or hd
    "response_format": "url" // url or b64_json
  }
}

// Response
{
  "data": [
    {
      "url": "https://oaidalleapiprodscus.blob.core.windows.net/...",
      "revised_prompt": "Enhanced version of your prompt..."
    }
  ]
}
```

---

## Text-to-Speech (TTS)

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/audio/speech",
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "tts-1", // tts-1 or tts-1-hd
    "input": "{{ $json.text }}",
    "voice": "alloy", // alloy, echo, fable, onyx, nova, shimmer
    "response_format": "mp3", // mp3, opus, aac, flac
    "speed": 1.0 // 0.25 to 4.0
  },
  "encoding": "arraybuffer"
}
```

---

## Best Practices

### 1. Cost Optimization

```javascript
// Use cheaper models for simple tasks
const model = taskComplexity === 'simple' ? 'gpt-4o-mini' : 'gpt-4o';

// Limit max_tokens to reduce costs
{
  "max_tokens": 500, // Don't use unlimited
  "temperature": 0.7
}

// Cache system prompts (if using prompt caching)
{
  "messages": [
    {
      "role": "system",
      "content": "Long system prompt...",
      "cache_control": { "type": "ephemeral" }
    }
  ]
}
```

### 2. Rate Limiting

```javascript
// Implement exponential backoff
async function callOpenAIWithRetry(config, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await $http.request(config);
    } catch (error) {
      if (error.statusCode === 429) {
        const retryAfter = error.headers['retry-after'] || Math.pow(2, attempt);
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Prompt Engineering

```javascript
// Use system message for instructions
{
  "messages": [
    {
      "role": "system",
      "content": "You are a JSON-only API. Always respond with valid JSON. Never include explanations."
    },
    {
      "role": "user",
      "content": "Extract name and email from: John Doe <john@example.com>"
    }
  ]
}

// Few-shot examples for better results
{
  "messages": [
    {"role": "system", "content": "Classify sentiment as positive, negative, or neutral."},
    {"role": "user", "content": "I love this product!"},
    {"role": "assistant", "content": "positive"},
    {"role": "user", "content": "It's okay, nothing special."},
    {"role": "assistant", "content": "neutral"},
    {"role": "user", "content": "{{ $json.userReview }}"}
  ]
}
```

### 4. Error Handling

```javascript
try {
  const response = await callOpenAI(config);
  return response;
} catch (error) {
  if (error.statusCode === 400) {
    console.error('Invalid request:', error.response.body);
  } else if (error.statusCode === 401) {
    console.error('Invalid API key');
  } else if (error.statusCode === 429) {
    console.error('Rate limit exceeded');
  } else if (error.statusCode === 500) {
    console.error('OpenAI server error');
  }
  throw error;
}
```

### 5. Streaming Responses

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "body": {
    "model": "gpt-4o",
    "messages": [...],
    "stream": true
  }
}

// Handle SSE stream
response.on('data', chunk => {
  const lines = chunk.toString().split('\n');
  lines.forEach(line => {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      const content = data.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
  });
});
```

---

## Common Use Cases

### 1. Content Moderation

```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/moderations",
  "body": {
    "input": "{{ $json.userContent }}"
  }
}

// Response
{
  "results": [{
    "flagged": false,
    "categories": {
      "hate": false,
      "sexual": false,
      "violence": false,
      ...
    }
  }]
}
```

### 2. Customer Support Bot

```javascript
// Maintain conversation history
const conversationHistory = [
  { role: "system", content: "You are a helpful customer support agent." },
  ...previousMessages,
  { role: "user", content: userMessage }
];

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: conversationHistory,
  temperature: 0.7
});

conversationHistory.push(response.choices[0].message);
```

### 3. Data Extraction

```javascript
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "Extract structured data as JSON: {invoice_number, date, total, vendor, items: [{description, quantity, price}]}"
    },
    {
      "role": "user",
      "content": "{{ $json.invoiceText }}"
    }
  ],
  "response_format": { "type": "json_object" }
}
```

---

## Troubleshooting

**Issue:** "Incorrect API key provided"
- **Solution:** Verify API key, check for extra spaces

**Issue:** "Rate limit exceeded"
- **Solution:** Implement exponential backoff, upgrade tier

**Issue:** "Context length exceeded"
- **Solution:** Reduce input size, split into chunks, use higher capacity model

**Issue:** "Model not found"
- **Solution:** Check model name spelling, verify access permissions

---

## Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Playground](https://platform.openai.com/playground)
- [Pricing](https://openai.com/pricing)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

**Version:** 1.0.0
**Last Updated:** 2025-11-08
