# API Skills Reference for n8n Workflows

Comprehensive reference for connecting Claude, Gemini, OpenAI, and Anthropic APIs to n8n workflows with current 2025 model names, formats, and connection methods.

**Last Updated:** November 2025

---

## Table of Contents

1. [Anthropic Claude API](#anthropic-claude-api)
2. [Google Gemini API](#google-gemini-api)
3. [OpenAI API](#openai-api)
4. [n8n Integration Skills](#n8n-integration-skills)
5. [Connection Examples](#connection-examples)

---

## Anthropic Claude API

### Current Models (November 2025)

**Source:** [Anthropic API Documentation](https://docs.claude.com/en/api/models-list)

#### Claude Sonnet 4
- **Model ID:** `claude-sonnet-4-20250514`
- **Type:** Fast, balanced model for everyday tasks
- **Context Window:** 200K tokens
- **Max Output:** 16K tokens
- **Use Cases:** General purpose, balanced performance and speed

#### Claude Opus 4
- **Model ID:** `claude-opus-4-20250514`
- **Type:** Most powerful model for complex tasks
- **Context Window:** 200K tokens
- **Max Output:** 16K tokens
- **Use Cases:** Advanced reasoning, complex analysis, research

#### Claude Haiku 3.5
- **Model ID:** `claude-3-5-haiku-20241022`
- **Type:** Fast, lightweight model
- **Context Window:** 200K tokens
- **Max Output:** 8K tokens
- **Use Cases:** Quick responses, high-volume processing

### Connection Format

```json
{
  "url": "https://api.anthropic.com/v1/messages",
  "method": "POST",
  "headers": {
    "x-api-key": "YOUR_ANTHROPIC_API_KEY",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  "body": {
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 4096,
    "messages": [
      {
        "role": "user",
        "content": "Your prompt here"
      }
    ]
  }
}
```

### n8n Node Configuration

**Source:** [n8n Anthropic Integration](https://n8n.io/integrations/anthropic/)

**Available Operations:**
- Analyze Document
- Upload File
- Get File Metadata
- List Files
- Delete File
- Analyze Image
- Generate Prompt
- Improve Prompt
- Templatize Prompt
- Message a Model

---

## Google Gemini API

### Current Models (November 2025)

**Source:** [Google AI Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models)

#### Gemini 2.0 Flash
- **Model ID:** `gemini-2.0-flash-exp`
- **Type:** Experimental multimodal model
- **Context Window:** 1M tokens
- **Features:** Native tool use, multimodal output, enhanced speed
- **Use Cases:** Real-time interactions, multimodal tasks

#### Gemini 1.5 Pro
- **Model ID:** `gemini-1.5-pro-latest`
- **Type:** Production-ready multimodal model
- **Context Window:** 2M tokens
- **Max Output:** 8K tokens
- **Use Cases:** Complex reasoning, large document analysis

#### Gemini 1.5 Flash
- **Model ID:** `gemini-1.5-flash-latest`
- **Type:** Fast, efficient model
- **Context Window:** 1M tokens
- **Max Output:** 8K tokens
- **Use Cases:** High-volume, cost-effective tasks

### Connection Format

```json
{
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "queryParameters": {
    "key": "YOUR_GEMINI_API_KEY"
  },
  "body": {
    "contents": [
      {
        "parts": [
          {
            "text": "Your prompt here"
          }
        ]
      }
    ]
  }
}
```

### n8n Node Configuration

**Source:** [n8n Google Gemini Integration](https://n8n.io/integrations/google-gemini-chat-model/)

**Authentication:** API Key via Google AI Studio
**Node Type:** Google Gemini Chat Model

---

## OpenAI API

### Current Models (November 2025)

**Source:** [OpenAI Platform Documentation](https://platform.openai.com/docs/models)

#### GPT-4 Turbo
- **Model ID:** `gpt-4-turbo-2024-04-09`
- **Type:** Most capable GPT-4 model
- **Context Window:** 128K tokens
- **Training Data:** Up to Dec 2023
- **Use Cases:** Complex tasks, advanced reasoning

#### GPT-4o
- **Model ID:** `gpt-4o`
- **Type:** Multimodal flagship model
- **Context Window:** 128K tokens
- **Features:** Vision, fast response times
- **Use Cases:** Multimodal tasks, balanced performance

#### GPT-4o Mini
- **Model ID:** `gpt-4o-mini`
- **Type:** Affordable, fast model
- **Context Window:** 128K tokens
- **Use Cases:** Cost-effective automation, high-volume

#### GPT-3.5 Turbo
- **Model ID:** `gpt-3.5-turbo-0125`
- **Type:** Legacy fast model
- **Context Window:** 16K tokens
- **Use Cases:** Simple tasks, budget constraints

### Connection Format

```json
{
  "url": "https://api.openai.com/v1/chat/completions",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer YOUR_OPENAI_API_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Your prompt here"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 4096
  }
}
```

### n8n Node Configuration

**Source:** [n8n OpenAI Integration Guide](https://n8n-automation.com/2023/12/28/openai-integration/)

**Resources:**
- **Chat:** For text-based interactions (recommended)
- **Image:** For DALL-E image generation
- **Text:** Legacy completions (deprecated)

**Chat Roles:**
- **System:** Define AI behavior and instructions
- **User:** User input and task description
- **Assistant:** Previous AI responses (for chat context)

---

## n8n Integration Skills

### Claude Code Skills for n8n

**Source:** [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)

This repository contains 7 production-ready skills for building n8n workflows:

#### 1. n8n-code-javascript
- JavaScript code execution within n8n workflows
- Best practices for data transformation
- Error handling patterns

#### 2. n8n-code-python
- Python code execution in n8n
- Library management
- Data processing techniques

#### 3. n8n-expression-syntax
- n8n expression language syntax
- Variable interpolation
- Data manipulation functions

#### 4. n8n-mcp-tools-expert
- Model Context Protocol (MCP) integration
- Tool calling patterns
- Advanced AI integrations

#### 5. n8n-node-configuration
- Node setup and configuration
- Parameter optimization
- Connection management

#### 6. n8n-validation-expert
- Input validation strategies
- Error handling workflows
- Data quality checks

#### 7. n8n-workflow-patterns
- Common workflow patterns
- Best practices and anti-patterns
- Performance optimization

### Anthropic Skills Specification

**Source:** [anthropics/skills](https://github.com/anthropics/skills)

Official skills format for Claude Code and AI assistants:
- Each skill in self-contained directory
- `SKILL.md` file with instructions and metadata
- Structured format for AI consumption

---

## Connection Examples

### Example 1: Anthropic Claude in n8n Workflow

1. Add **HTTP Request** node or **Anthropic** node
2. Configure credentials with API key
3. Set operation to "Message a Model"
4. Choose model: `claude-sonnet-4-20250514`
5. Add prompts with system and user roles
6. Set max_tokens and temperature

### Example 2: Google Gemini in n8n Workflow

1. Add **HTTP Request** node
2. Set URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=YOUR_KEY`
3. Method: POST
4. Add JSON body with contents array
5. Process response from `.choices[0].message.content`

### Example 3: OpenAI GPT-4o in n8n Workflow

1. Add **OpenAI** node
2. Configure API credentials
3. Resource: **Chat**
4. Operation: **Completion**
5. Model: `gpt-4o`
6. Add system and user messages
7. Configure temperature and max_tokens

### Example 4: Multi-Model Workflow

**Use Case:** Document analysis with multiple AI providers

1. **Trigger:** Webhook or Schedule
2. **Node 1:** Get document content
3. **Node 2:** Claude Opus for deep analysis
4. **Node 3:** GPT-4o for summarization
5. **Node 4:** Gemini for fact-checking
6. **Node 5:** Combine results and format output

---

## Best Practices

### API Key Management
- Store API keys in n8n credentials manager
- Use environment variables for sensitive data
- Rotate keys regularly
- Monitor usage and set billing alerts

### Error Handling
- Implement retry logic for API failures
- Handle rate limits with exponential backoff
- Log errors for debugging
- Set up fallback models

### Cost Optimization
- Use appropriate model sizes for tasks
- Implement caching for repeated queries
- Batch requests when possible
- Monitor token usage

### Performance
- Use streaming for long responses
- Implement parallel processing for multiple requests
- Cache frequently used prompts
- Optimize prompt length

---

## Additional Resources

### Official Documentation
- [Anthropic API Docs](https://docs.claude.com/)
- [Google Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [OpenAI Platform Docs](https://platform.openai.com/docs)
- [n8n Documentation](https://docs.n8n.io/)

### Community Resources
- [anthropics/skills GitHub](https://github.com/anthropics/skills)
- [czlonkowski/n8n-skills GitHub](https://github.com/czlonkowski/n8n-skills)
- [n8n Community Forum](https://community.n8n.io/)

### Integration Guides
- [n8n Anthropic Integration](https://n8n.io/integrations/anthropic/)
- [n8n OpenAI Integration Tutorial](https://n8n-automation.com/2023/12/28/openai-integration/)
- [n8n Google Gemini Integration](https://n8n.io/integrations/google-gemini-chat-model/)

---

## Version History

- **v1.0 (November 2025):** Initial documentation with Claude Sonnet 4, Opus 4, Gemini 2.0 Flash, GPT-4o models

---

## Contributing

To update this document with new models or API changes:
1. Verify information from official API documentation
2. Test connection formats in n8n
3. Add source citations
4. Update version history

---

**Compiled by:** Comet Assistant  
**Sources:** Official API documentation from Anthropic, Google, and OpenAI; n8n community resources; GitHub skills repositories
