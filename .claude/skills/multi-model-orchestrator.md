# Multi-Model AI Orchestrator

**Purpose:** Intelligently route tasks across multiple AI models (Claude Opus/Sonnet, GPT-4, Gemini) based on complexity, cost, latency requirements, and task type.

**When to use this skill:** When building AI-powered workflows that need to balance performance, cost, and capabilities across different AI providers.

---

## Core Capabilities

1. **Intent-based routing** - Route to appropriate model based on task classification
2. **Complexity-based routing** - Use cheaper models for simple tasks, expensive for complex
3. **Fallback chains** - Automatic failover if primary model is unavailable
4. **Parallel execution** - Run multiple models and compare/merge results
5. **Cost optimization** - Track and minimize API costs
6. **Performance monitoring** - Track latency and quality metrics

---

## Model Selection Guide

From `ai-api-integration.md` and `API_SKILLS_REFERENCE.md`:

### By Task Complexity

| Task Type | Model | Cost/1M tokens | Speed | Quality |
|-----------|-------|----------------|-------|---------|
| **Simple** (keywords, classification, short summaries) | GPT-3.5-turbo | $0.50 | Very Fast | Good |
| **Simple** (quick responses, chat) | Gemini 2.0 Flash | $0.075 | Very Fast | Good |
| **Medium** (analysis, longer content, coding) | Claude Sonnet 4 | $3.00 | Fast | Excellent |
| **Medium** (creative writing, Q&A) | GPT-4 | $15.00 | Medium | Excellent |
| **Complex** (deep reasoning, research, complex code) | Claude Opus 4 | $45.00 | Slower | Best |
| **Complex** (multimodal, long context) | Gemini 1.5 Pro | $1.25 | Medium | Excellent |

### By Use Case

**Code Generation:**
1. Claude Opus 4 (best for complex algorithms)
2. Claude Sonnet 4 (best for standard code)
3. GPT-4 (good for popular frameworks)

**Content Writing:**
1. Claude Opus 4 (most creative)
2. GPT-4 (versatile style)
3. Claude Sonnet 4 (efficient quality)

**Data Analysis:**
1. Claude Sonnet 4 (fast and accurate)
2. GPT-4 (good for visualization suggestions)
3. Gemini 1.5 Pro (good for large datasets)

**Customer Support:**
1. Gemini 2.0 Flash (fastest, cheapest)
2. Claude Sonnet 4 (best quality/cost)
3. GPT-3.5-turbo (fallback)

**Research & Analysis:**
1. Claude Opus 4 (deepest reasoning)
2. Gemini 1.5 Pro (longest context - 2M tokens)
3. Claude Sonnet 4 (balanced approach)

---

## Pattern 1: Intent-Based Routing

**Architecture:**
```
Webhook → Classify Intent → Router → [Model 1, Model 2, Model 3] → Response
```

**Implementation:**

### Step 1: Intent Classification

Use fast, cheap model for routing decision:

```json
{
  "name": "Classify Intent",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{ $env.GEMINI_API_KEY }}",
    "authentication": "none",
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "contentType": "raw",
    "body": "={{ JSON.stringify({\n  contents: [{\n    parts: [{\n      text: `Classify this request into ONE category:\\n\\nRequest: \"${$json.query}\"\\n\\nCategories:\\n- SIMPLE_CHAT: Basic Q&A, greetings, simple info\\n- CODE_GENERATION: Write, debug, or explain code\\n- CREATIVE_WRITING: Essays, stories, marketing copy\\n- DATA_ANALYSIS: Analyze data, find patterns\\n- RESEARCH: Deep analysis, complex reasoning\\n\\nRespond with ONLY the category name.`\n    }]\n  }]\n}) }}"
  }
}
```

### Step 2: Parse Classification

```javascript
// Code node: "Parse Intent"
const response = $json.candidates[0].content.parts[0].text.trim();

const intentMap = {
  'SIMPLE_CHAT': 'gemini-flash',
  'CODE_GENERATION': 'claude-sonnet',
  'CREATIVE_WRITING': 'claude-opus',
  'DATA_ANALYSIS': 'claude-sonnet',
  'RESEARCH': 'claude-opus'
};

return [{
  json: {
    intent: response,
    targetModel: intentMap[response] || 'claude-sonnet',
    originalQuery: $input.first().json.query
  }
}];
```

### Step 3: Route to Model

```json
{
  "name": "Route by Intent",
  "type": "n8n-nodes-base.switch",
  "parameters": {
    "mode": "expression",
    "output": "single",
    "rules": {
      "rules": [
        {
          "expression": "={{ $json.targetModel === 'gemini-flash' }}",
          "output": 0
        },
        {
          "expression": "={{ $json.targetModel === 'claude-sonnet' }}",
          "output": 1
        },
        {
          "expression": "={{ $json.targetModel === 'claude-opus' }}",
          "output": 2
        }
      ]
    }
  }
}
```

Connect outputs to:
- Output 0 → Gemini Flash node
- Output 1 → Claude Sonnet node
- Output 2 → Claude Opus node

---

## Pattern 2: Complexity-Based Dynamic Routing

**Architecture:**
```
Input → Estimate Complexity → [Simple/Medium/Complex Path] → Response
```

**Implementation:**

```javascript
// Code node: "Estimate Complexity"
const query = $json.query;

// Complexity indicators
const wordCount = query.split(/\s+/).length;
const hasCodeBlock = /```/.test(query);
const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
const requiresReasoning = /why|how|explain|analyze|compare/i.test(query);
const requiresCreativity = /write|create|design|imagine/i.test(query);

// Calculate complexity score (0-100)
let complexity = 0;

if (wordCount > 100) complexity += 20;
if (wordCount > 300) complexity += 20;
if (hasCodeBlock) complexity += 25;
if (hasMultipleQuestions) complexity += 15;
if (requiresReasoning) complexity += 30;
if (requiresCreativity) complexity += 20;

// Determine model based on complexity
let model, estimatedCost, maxTokens;

if (complexity < 30) {
  // Simple task
  model = 'gemini-flash';
  estimatedCost = 0.00001; // $0.01 per 1K requests
  maxTokens = 500;
} else if (complexity < 60) {
  // Medium task
  model = 'claude-sonnet';
  estimatedCost = 0.00015; // $0.15 per 1K requests
  maxTokens = 2000;
} else {
  // Complex task
  model = 'claude-opus';
  estimatedCost = 0.0045; // $4.50 per 1K requests
  maxTokens = 4000;
}

return [{
  json: {
    query: query,
    complexity: complexity,
    model: model,
    estimatedCost: estimatedCost,
    maxTokens: maxTokens,
    metrics: {
      wordCount,
      hasCodeBlock,
      hasMultipleQuestions,
      requiresReasoning,
      requiresCreativity
    }
  }
}];
```

---

## Pattern 3: Fallback Chain

**Architecture:**
```
Try Primary Model → If fails → Try Secondary → If fails → Try Tertiary → If all fail → Error
```

**Complete Implementation:**

```javascript
// Code node: "Primary Model - Claude Opus 4"
const query = $json.query;
const attempt = $json.attempt || 1;

try {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': $env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      messages: [{role: 'user', content: query}]
    }),
    timeout: 30000
  });

  if (!response.ok) {
    throw new Error(`Claude Opus failed: ${response.status}`);
  }

  const data = await response.json();

  return [{
    json: {
      success: true,
      model: 'claude-opus-4',
      response: data.content[0].text,
      cost: 0.0045,
      attempt: attempt
    }
  }];

} catch (error) {
  console.log(`Claude Opus failed (attempt ${attempt}):`, error.message);

  return [{
    json: {
      success: false,
      model: 'claude-opus-4',
      error: error.message,
      attempt: attempt,
      tryFallback: true,
      originalQuery: query
    }
  }];
}
```

**Then add IF node:**
```json
{
  "name": "Check Primary Success",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.success }}",
          "operation": "equal",
          "value2": true
        }
      ]
    }
  }
}
```

**Connections:**
- `main[0]` → Return response (success)
- `main[1]` → Try Secondary Model (GPT-4)

**Secondary Model:**
```javascript
// Code node: "Secondary Model - GPT-4"
const query = $json.originalQuery;
const attempt = $json.attempt || 1;

try {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{role: 'user', content: query}],
      max_tokens: 2000
    }),
    timeout: 30000
  });

  if (!response.ok) {
    throw new Error(`GPT-4 failed: ${response.status}`);
  }

  const data = await response.json();

  return [{
    json: {
      success: true,
      model: 'gpt-4',
      response: data.choices[0].message.content,
      cost: 0.015,
      attempt: attempt,
      fallbackUsed: true
    }
  }];

} catch (error) {
  console.log(`GPT-4 failed (attempt ${attempt}):`, error.message);

  return [{
    json: {
      success: false,
      model: 'gpt-4',
      error: error.message,
      attempt: attempt,
      tryFallback: true,
      originalQuery: query
    }
  }];
}
```

Continue chain with Tertiary Model (Gemini) as final fallback.

---

## Pattern 4: Parallel Execution with Comparison

**Use case:** Get multiple perspectives, compare quality, or vote on best answer.

**Architecture:**
```
Input → [Model 1, Model 2, Model 3] in parallel → Compare/Vote → Best Response
```

**Implementation:**

```javascript
// Code node: "Split for Parallel Execution"
const query = $json.query;

// Create 3 identical items for parallel processing
return [
  {json: {query: query, model: 'claude-opus-4', priority: 1}},
  {json: {query: query, model: 'gpt-4', priority: 2}},
  {json: {query: query, model: 'gemini-2.0-flash', priority: 3}}
];
```

**Execute all models in parallel** (3 separate HTTP Request nodes connected to Split node)

**Then compare results:**

```javascript
// Code node: "Compare and Select Best"
const results = $input.all().map(item => item.json);

// Filter successful responses
const successful = results.filter(r => r.success);

if (successful.length === 0) {
  throw new Error('All models failed');
}

// Scoring criteria
const scoreResponse = (result) => {
  let score = 0;

  // Length (prefer substantial answers)
  const length = result.response.length;
  if (length > 500) score += 30;
  else if (length > 200) score += 20;
  else score += 10;

  // Has code blocks (if query was about code)
  if (/```/.test(result.response) && /code|function|class/i.test(result.query)) {
    score += 20;
  }

  // Has examples
  if (/example|for instance|such as/i.test(result.response)) {
    score += 15;
  }

  // Model quality bonus
  const modelBonus = {
    'claude-opus-4': 25,
    'claude-sonnet-4': 20,
    'gpt-4': 20,
    'gemini-2.0-flash': 10
  };
  score += modelBonus[result.model] || 0;

  // Cost penalty (prefer cheaper if similar quality)
  score -= result.cost * 10;

  return score;
};

// Score all responses
const scored = successful.map(r => ({
  ...r,
  score: scoreResponse(r)
}));

// Sort by score
scored.sort((a, b) => b.score - a.score);

const bestResponse = scored[0];

return [{
  json: {
    selectedModel: bestResponse.model,
    response: bestResponse.response,
    score: bestResponse.score,
    cost: bestResponse.cost,
    allScores: scored.map(s => ({
      model: s.model,
      score: s.score,
      cost: s.cost
    })),
    totalCost: scored.reduce((sum, r) => sum + r.cost, 0)
  }
}];
```

---

## Pattern 5: Cost-Optimized Pipeline

**Architecture:**
```
Input → Try Cheapest → Quality Check → If insufficient → Try Better Model → Repeat
```

**Implementation:**

```javascript
// Code node: "Try Cheapest Model First"
const query = $json.query;
const minQualityScore = 70; // Minimum acceptable quality (0-100)

// Start with cheapest model
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${$env.GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      contents: [{parts: [{text: query}]}]
    })
  }
);

const data = await response.json();
const result = data.candidates[0].content.parts[0].text;

// Quality assessment
const qualityScore = assessQuality(result, query);

function assessQuality(response, query) {
  let score = 50; // Base score

  // Length check
  if (response.length > 100) score += 10;
  if (response.length > 500) score += 10;

  // Answers the question
  const queryKeywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const responseKeywords = response.toLowerCase().split(/\s+/);
  const keywordMatch = queryKeywords.filter(k => responseKeywords.includes(k)).length;
  score += Math.min(keywordMatch * 5, 20);

  // Structure (has paragraphs, bullets, etc.)
  if (/\n\n/.test(response)) score += 5;
  if (/[-*•]/.test(response)) score += 5;

  return Math.min(score, 100);
}

if (qualityScore >= minQualityScore) {
  return [{
    json: {
      sufficient: true,
      model: 'gemini-flash',
      response: result,
      qualityScore: qualityScore,
      cost: 0.000075
    }
  }];
} else {
  return [{
    json: {
      sufficient: false,
      model: 'gemini-flash',
      response: result,
      qualityScore: qualityScore,
      cost: 0.000075,
      tryBetterModel: true,
      originalQuery: query
    }
  }];
}
```

**Then add IF node → If insufficient, try Claude Sonnet → If still insufficient, try Claude Opus**

---

## Complete Multi-Model Orchestration Example

**Comprehensive workflow combining all patterns:**

```json
{
  "name": "Multi-Model AI Orchestrator",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "ai-orchestrator",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Estimate Complexity",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Use complexity estimation code from Pattern 2"
      }
    },
    {
      "name": "Route by Complexity",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "rules": {
          "rules": [
            {
              "expression": "={{ $json.complexity < 30 }}",
              "output": 0
            },
            {
              "expression": "={{ $json.complexity >= 30 && $json.complexity < 60 }}",
              "output": 1
            },
            {
              "expression": "={{ $json.complexity >= 60 }}",
              "output": 2
            }
          ]
        }
      }
    },
    {
      "name": "Gemini Flash (Simple)",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{ $env.GEMINI_API_KEY }}"
      }
    },
    {
      "name": "Claude Sonnet (Medium)",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages"
      },
      "continueOnFail": true
    },
    {
      "name": "Check Sonnet Success",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.statusCode }}",
              "operation": "equal",
              "value2": 200
            }
          ]
        }
      }
    },
    {
      "name": "Fallback to GPT-4",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://api.openai.com/v1/chat/completions"
      }
    },
    {
      "name": "Claude Opus (Complex)",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages"
      },
      "continueOnFail": true
    },
    {
      "name": "Log Cost and Performance",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "ai_orchestration_metrics",
        "columns": "query,model_used,complexity,cost,latency,quality_score,timestamp"
      }
    },
    {
      "name": "Return Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "options": {
          "responseBody": "={{ JSON.stringify({model: $json.model, response: $json.response, cost: $json.cost, complexity: $json.complexity}) }}"
        }
      }
    }
  ]
}
```

---

## Cost Tracking and Optimization

**Create cost tracking table:**

```sql
CREATE TABLE ai_orchestration_metrics (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  model_used VARCHAR(50) NOT NULL,
  complexity INTEGER,
  cost DECIMAL(10, 6),
  latency_ms INTEGER,
  quality_score INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  workflow_id VARCHAR(255)
);

CREATE INDEX idx_metrics_timestamp ON ai_orchestration_metrics(timestamp DESC);
CREATE INDEX idx_metrics_model ON ai_orchestration_metrics(model_used);
CREATE INDEX idx_metrics_cost ON ai_orchestration_metrics(cost DESC);
```

**Daily cost report workflow:**

```javascript
// Code node: "Calculate Daily Costs"
const response = await $input.all();

const today = new Date().toISOString().split('T')[0];

const query = `
  SELECT
    model_used,
    COUNT(*) as requests,
    SUM(cost) as total_cost,
    AVG(latency_ms) as avg_latency,
    AVG(quality_score) as avg_quality
  FROM ai_orchestration_metrics
  WHERE DATE(timestamp) = '${today}'
  GROUP BY model_used
  ORDER BY total_cost DESC
`;

// Execute query (connect to PostgreSQL node)
// Then format report for Slack
```

---

## Best Practices

### 1. Model Selection Strategy

**Decision Tree:**
```
Is query < 50 words AND simple classification?
  → Use Gemini Flash ($0.075/1M tokens)

Does query need code generation OR deep analysis?
  → Use Claude Sonnet ($3/1M tokens)

Does query need complex reasoning OR creative writing?
  → Use Claude Opus ($45/1M tokens)

Is budget critical AND quality can be "good enough"?
  → Use cost-optimized pipeline (start cheap, upgrade if needed)

Is latency critical (< 2s response time)?
  → Use Gemini Flash or parallel execution with timeout

Is quality critical (customer-facing, high stakes)?
  → Use Claude Opus or parallel comparison
```

### 2. Fallback Strategy

**Always define fallback chain:**
1. Primary: Best quality model for task
2. Secondary: Alternative model with similar capabilities
3. Tertiary: Fastest/cheapest model as final fallback
4. Error: Return cached response or generic message

### 3. Parallel Execution Guidelines

**Use parallel execution when:**
- Quality is more important than cost
- Need diverse perspectives
- Validating critical decisions
- A/B testing model performance

**Don't use parallel when:**
- Budget is limited
- Latency is critical
- Query is very simple
- One model clearly dominates for task type

### 4. Cost Optimization

**Strategies to minimize costs:**
- Cache common queries (use Set/Get nodes)
- Use complexity estimation before expensive models
- Implement progressive quality checks
- Set max token limits appropriately
- Use streaming for long responses (stop when sufficient)

---

## Monitoring and Alerts

**Set up alerts for:**

```javascript
// Code node: "Check Cost Thresholds"
const dailyCost = $json.totalCost;
const dailyBudget = 10.00; // $10/day

if (dailyCost > dailyBudget * 0.9) {
  return [{
    json: {
      alert: true,
      severity: 'HIGH',
      message: `Daily AI cost at ${(dailyCost/dailyBudget*100).toFixed(0)}% of budget`,
      currentCost: dailyCost,
      budget: dailyBudget,
      recommendation: 'Switch to cheaper models or implement rate limiting'
    }
  }];
}
```

**Performance monitoring:**
```javascript
// Code node: "Check Model Performance"
const avgLatency = $json.avgLatencyMs;
const avgQuality = $json.avgQualityScore;

const issues = [];

if (avgLatency > 10000) {
  issues.push('High latency detected - consider faster models');
}

if (avgQuality < 70) {
  issues.push('Low quality scores - consider better models');
}

return [{json: {issues: issues, alert: issues.length > 0}}];
```

---

## Integration with Other Skills

- **For model-specific API calls:** Use `ai-api-integration.md`
- **For error handling:** Use `error-handling-implementer.md` with fallback chains
- **For cost tracking:** Use `best-practices-applier.md` monitoring patterns
- **For validation:** Use `workflow-validator.md` to check all API configs

---

## Quick Start

**Simple orchestration (3 steps):**

1. **Add complexity estimator Code node**
2. **Add Switch node to route by complexity**
3. **Connect to model-specific HTTP Request nodes**

**Advanced orchestration (include):**
- Fallback chains for reliability
- Cost tracking for budget management
- Quality assessment for optimization
- Parallel execution for critical tasks

---

## Summary

Multi-model orchestration enables:

**Benefits:**
- 50-80% cost reduction with smart routing
- Higher reliability with fallback chains
- Better quality with parallel comparison
- Faster responses with appropriate model selection

**Trade-offs:**
- Added complexity in workflow design
- More API calls for classification/routing
- Need cost monitoring and alerts
- Requires understanding of model strengths

**ROI:** For high-volume AI workflows (1000+ requests/day), orchestration typically pays for itself within 1 week through cost savings.

**Reference Templates:**
- `ai-agent-orchestration.json` - Multi-agent routing pattern
- `api-sync-workflow.json` - Batch processing pattern
- `error-handling-retry.json` - Fallback patterns
