# n8n Nodes Complete Reference (2025)

## Table of Contents
- [Core Trigger Nodes](#core-trigger-nodes)
- [Data Transformation Nodes](#data-transformation-nodes)
- [Integration Nodes](#integration-nodes)
- [AI & LangChain Nodes](#ai--langchain-nodes)
- [Database Nodes](#database-nodes)
- [Flow Control Nodes](#flow-control-nodes)
- [File Operation Nodes](#file-operation-nodes)
- [Communication Nodes](#communication-nodes)

---

## Core Trigger Nodes

### Webhook Trigger (`n8n-nodes-base.webhook`)
**Purpose:** Receive HTTP requests to trigger workflows

**Parameters:**
- `httpMethod` (string): GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
- `path` (string): URL path for webhook (e.g., "my-webhook")
- `authentication` (string): "none" | "basicAuth" | "headerAuth"
- `responseMode` (string):
  - "onReceived" - Respond immediately
  - "lastNode" - Respond with last node output
  - "responseNode" - Respond using "Respond to Webhook" node
- `responseData` (string): "allEntries" | "firstEntryJson" | "firstEntryBinary"
- `options` (object):
  - `allowedOrigins` (string): CORS origins (comma-separated)
  - `rawBody` (boolean): Return raw request body
  - `responseHeaders` (object): Custom response headers
  - `ignoreBots` (boolean): Ignore requests from bots

**Example Configuration:**
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "data-ingestion",
    "responseMode": "responseNode",
    "authentication": "headerAuth",
    "options": {
      "allowedOrigins": "https://app.example.com",
      "rawBody": false,
      "responseHeaders": {
        "entries": [
          {"name": "X-Custom-Header", "value": "processed"}
        ]
      }
    }
  }
}
```

**Best Practices:**
- Always use `responseNode` mode for async processing
- Implement signature verification for webhook security
- Use HTTPS in production
- Set appropriate CORS origins
- Log webhook payloads for debugging

---

### Schedule Trigger (`n8n-nodes-base.scheduleTrigger`)
**Purpose:** Execute workflows on a schedule

**Parameters:**
- `rule` (object):
  - `interval` (array): Cron-style schedule
    - `field` (string): "seconds" | "minutes" | "hours" | "days" | "weeks" | "months"
    - `secondsInterval` (number): 1-60
    - `minutesInterval` (number): 1-60
    - `hoursInterval` (number): 1-24
  - `cronExpression` (string): Full cron expression
- `timezone` (string): IANA timezone (e.g., "America/New_York")

**Example Configurations:**

Every 15 minutes:
```json
{
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "minutes",
          "minutesInterval": 15
        }
      ]
    },
    "timezone": "UTC"
  }
}
```

Daily at 2 AM:
```json
{
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 2 * * *"
        }
      ]
    },
    "timezone": "America/New_York"
  }
}
```

**Best Practices:**
- Use UTC timezone for consistency unless specific local time needed
- For high-frequency executions (< 1 min), consider event-based triggers
- Monitor execution history for missed schedules
- Add error notifications for failed scheduled runs

---

### Error Trigger (`n8n-nodes-base.errorTrigger`)
**Purpose:** Catch and handle workflow errors

**Parameters:**
- No configuration parameters - automatically triggers on any workflow error

**Usage Pattern:**
```json
{
  "parameters": {},
  "name": "Error Handler",
  "type": "n8n-nodes-base.errorTrigger"
}
```

**Available Error Data:**
- `$json.error.message` - Error message
- `$json.error.stack` - Stack trace
- `$json.execution.id` - Execution ID
- `$json.execution.mode` - "manual" | "trigger" | "webhook"
- `$json.workflow.id` - Workflow ID
- `$json.workflow.name` - Workflow name

**Best Practices:**
- Send notifications to Slack/email on critical errors
- Log errors to external monitoring (Sentry, DataDog)
- Implement retry logic for transient failures
- Create separate error workflows for different error types

---

## Data Transformation Nodes

### Code Node (`n8n-nodes-base.code`)
**Purpose:** Execute JavaScript/Python code for data transformation

**Parameters:**
- `language` (string): "javaScript" | "python"
- `mode` (string): "runOnceForAllItems" | "runOnceForEachItem"
- `jsCode` (string): JavaScript code
- `pythonCode` (string): Python code

**JavaScript Mode - Available Objects:**
- `$input` - Input data object
  - `$input.all()` - Get all input items
  - `$input.first()` - Get first item
  - `$input.item` - Current item (in forEach mode)
- `$` - Utility functions
  - `$.jmespath()` - Query JSON with JMESPath
  - `$.now()` - Current timestamp
- `items` - All input items (legacy, use `$input.all()`)

**Example 1: Transform Data (Run Once for All)**
```javascript
// Transform array of objects
const transformedItems = $input.all().map((item, index) => ({
  json: {
    id: item.json.user_id,
    fullName: `${item.json.first_name} ${item.json.last_name}`,
    email: item.json.email.toLowerCase(),
    createdAt: new Date().toISOString(),
    index: index
  }
}));

return transformedItems;
```

**Example 2: Filter and Aggregate (Run Once for All)**
```javascript
// Filter, aggregate, and group data
const items = $input.all();

// Filter active users
const activeUsers = items.filter(item => item.json.status === 'active');

// Aggregate by department
const byDepartment = activeUsers.reduce((acc, item) => {
  const dept = item.json.department;
  if (!acc[dept]) {
    acc[dept] = {
      count: 0,
      totalSalary: 0,
      employees: []
    };
  }
  acc[dept].count++;
  acc[dept].totalSalary += item.json.salary;
  acc[dept].employees.push(item.json.name);
  return acc;
}, {});

// Return as array of items
return Object.entries(byDepartment).map(([dept, data]) => ({
  json: {
    department: dept,
    employeeCount: data.count,
    averageSalary: data.totalSalary / data.count,
    employees: data.employees
  }
}));
```

**Example 3: API Response Parsing (Run Once for Each)**
```javascript
// Process each item individually
const item = $input.item.json;

// Parse nested API response
const parsed = {
  userId: item.data.user.id,
  transactions: item.data.transactions.map(t => ({
    id: t.transaction_id,
    amount: parseFloat(t.amount),
    currency: t.currency,
    date: new Date(t.timestamp * 1000).toISOString()
  })),
  summary: {
    total: item.data.transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
    count: item.data.transactions.length
  }
};

return { json: parsed };
```

**Example 4: Error Handling**
```javascript
try {
  const items = $input.all();

  const processed = items.map(item => {
    // Validate required fields
    if (!item.json.email) {
      throw new Error(`Missing email for user ${item.json.id}`);
    }

    // Process with error boundary
    try {
      return {
        json: {
          email: item.json.email,
          domain: item.json.email.split('@')[1],
          isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.json.email)
        }
      };
    } catch (err) {
      // Return item with error flag
      return {
        json: {
          ...item.json,
          error: err.message,
          processedSuccessfully: false
        }
      };
    }
  });

  return processed;
} catch (error) {
  // Log and re-throw for workflow error handling
  console.error('Processing failed:', error);
  throw error;
}
```

**Best Practices:**
- Use `runOnceForAllItems` for batch operations (faster)
- Use `runOnceForEachItem` when processing items independently
- Always validate input data before processing
- Wrap risky operations in try-catch blocks
- Return consistent data structure
- Use descriptive variable names
- Add comments for complex logic

---

### Set Node (`n8n-nodes-base.set`)
**Purpose:** Set, modify, or remove fields from items

**Parameters:**
- `mode` (string): "manual" | "expression"
- `duplicateItem` (boolean): Create copy of item before modification
- `values` (object): Fields to set
  - `name` (string): Field name
  - `value` (any): Field value (supports expressions)
- `options` (object):
  - `dotNotation` (boolean): Use dot notation for nested fields
  - `keepOnlySet` (boolean): Remove all fields except those being set

**Example 1: Add Computed Fields**
```json
{
  "parameters": {
    "mode": "manual",
    "duplicateItem": false,
    "values": {
      "string": [
        {"name": "fullName", "value": "={{ $json.firstName }} {{ $json.lastName }}"},
        {"name": "slug", "value": "={{ $json.title.toLowerCase().replace(/\\s+/g, '-') }}"}
      ],
      "number": [
        {"name": "totalPrice", "value": "={{ $json.price * $json.quantity }}"},
        {"name": "discount", "value": "={{ $json.price * 0.1 }}"}
      ],
      "boolean": [
        {"name": "isActive", "value": "={{ $json.status === 'active' }}"}
      ]
    }
  }
}
```

**Example 2: Nested Object Creation with Dot Notation**
```json
{
  "parameters": {
    "mode": "manual",
    "values": {
      "string": [
        {"name": "user.name", "value": "={{ $json.name }}"},
        {"name": "user.email", "value": "={{ $json.email }}"},
        {"name": "metadata.source", "value": "webhook"},
        {"name": "metadata.processedAt", "value": "={{ $now.toISO() }}"}
      ]
    },
    "options": {
      "dotNotation": true
    }
  }
}
```

**Example 3: Keep Only Specific Fields**
```json
{
  "parameters": {
    "mode": "manual",
    "values": {
      "string": [
        {"name": "id", "value": "={{ $json.user_id }}"},
        {"name": "email", "value": "={{ $json.email }}"},
        {"name": "name", "value": "={{ $json.full_name }}"}
      ]
    },
    "options": {
      "keepOnlySet": true
    }
  }
}
```

**Best Practices:**
- Use `keepOnlySet: true` to create clean output objects
- Enable `dotNotation` for nested object manipulation
- Use typed value arrays (string, number, boolean) for type safety
- Keep transformations simple - use Code node for complex logic

---

### Item Lists Node (`n8n-nodes-base.splitInBatches`)
**Purpose:** Split items into batches for processing

**Parameters:**
- `batchSize` (number): Number of items per batch
- `options` (object):
  - `reset` (boolean): Reset batch counter on new execution

**Usage Pattern:**
```json
{
  "parameters": {
    "batchSize": 100,
    "options": {
      "reset": true
    }
  }
}
```

**Example Workflow: Batch API Requests**
```
┌──────────────┐    ┌────────────────┐    ┌──────────┐    ┌──────────┐
│ Get All Users│───▶│ Split Batches  │───▶│HTTP Req  │───▶│  Merge   │
│   (10000)    │    │   (100 items)  │    │(API Call)│    │          │
└──────────────┘    └────────────────┘    └──────────┘    └──────────┘
                            │                                    ▲
                            └────────────────────────────────────┘
                                  (Loop until complete)
```

**Best Practices:**
- Use batch size based on API rate limits
- Add Wait node between batches to respect rate limits
- Enable `reset: true` for scheduled workflows
- Monitor batch processing progress with execution logs

---

### Aggregate Node (`n8n-nodes-base.aggregate`)
**Purpose:** Combine, group, or merge items

**Parameters:**
- `operation` (string):
  - "aggregateIndividualItems" - Group items by field
  - "aggregateAllItemData" - Combine all items into one
  - "combineAll" - Merge all items
- `fieldsToAggregate` (object): Fields to include in aggregation
  - `fieldToAggregate` (string): Source field name
  - `renameField` (boolean): Rename the field
  - `outputFieldName` (string): New field name
  - `aggregationFunctions` (string): "sum" | "average" | "count" | "min" | "max" | "concat"

**Example 1: Group by Department**
```json
{
  "parameters": {
    "operation": "aggregateIndividualItems",
    "fieldsToAggregate": {
      "fieldToAggregate": [
        {
          "fieldToAggregate": "department",
          "renameField": false
        },
        {
          "fieldToAggregate": "salary",
          "renameField": true,
          "outputFieldName": "totalSalary",
          "aggregationFunctions": "sum"
        },
        {
          "fieldToAggregate": "salary",
          "renameField": true,
          "outputFieldName": "avgSalary",
          "aggregationFunctions": "average"
        },
        {
          "fieldToAggregate": "employeeId",
          "renameField": true,
          "outputFieldName": "employeeCount",
          "aggregationFunctions": "count"
        }
      ]
    }
  }
}
```

**Example 2: Combine All Items**
```json
{
  "parameters": {
    "operation": "aggregateAllItemData",
    "fieldsToAggregate": {
      "fieldToAggregate": [
        {
          "fieldToAggregate": "revenue",
          "outputFieldName": "totalRevenue",
          "aggregationFunctions": "sum"
        },
        {
          "fieldToAggregate": "orders",
          "outputFieldName": "totalOrders",
          "aggregationFunctions": "count"
        }
      ]
    }
  }
}
```

**Best Practices:**
- Use aggregation for reporting and analytics
- Combine with Set node to format output
- For complex aggregations, use Code node instead
- Group by multiple fields using nested aggregations

---

## Flow Control Nodes

### IF Node (`n8n-nodes-base.if`)
**Purpose:** Route items based on conditions

**Parameters:**
- `conditions` (object):
  - `combinator` (string): "and" | "or"
  - `conditions` (array):
    - `leftValue` (any): Value to compare
    - `operator` (string): "equal" | "notEqual" | "larger" | "smallerEqual" | "isEmpty" | "isNotEmpty" | "contains" | "notContains" | "regex" | "startsWith" | "endsWith"
    - `rightValue` (any): Comparison value

**Example 1: Multiple Conditions (AND)**
```json
{
  "parameters": {
    "conditions": {
      "combinator": "and",
      "conditions": [
        {
          "leftValue": "={{ $json.status }}",
          "operator": "equal",
          "rightValue": "active"
        },
        {
          "leftValue": "={{ $json.age }}",
          "operator": "larger",
          "rightValue": 18
        },
        {
          "leftValue": "={{ $json.email }}",
          "operator": "isNotEmpty"
        }
      ]
    }
  }
}
```

**Example 2: Regex Pattern Matching**
```json
{
  "parameters": {
    "conditions": {
      "combinator": "or",
      "conditions": [
        {
          "leftValue": "={{ $json.email }}",
          "operator": "regex",
          "rightValue": "^[a-zA-Z0-9._%+-]+@company\\.com$"
        },
        {
          "leftValue": "={{ $json.domain }}",
          "operator": "equal",
          "rightValue": "company.com"
        }
      ]
    }
  }
}
```

**Best Practices:**
- Use Switch node for multiple routing paths
- Keep conditions simple - use Code node for complex logic
- Always handle both true/false branches
- Test edge cases (null, undefined, empty strings)

---

### Switch Node (`n8n-nodes-base.switch`)
**Purpose:** Route to multiple branches based on conditions

**Parameters:**
- `mode` (string): "rules" | "expression"
- `rules` (object): Array of routing rules
  - `conditions` (object): Same as IF node
  - `outputIndex` (number): Output branch index
- `fallbackOutput` (string): "extra" | "none"

**Example: Route by User Type**
```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "rules": [
        {
          "outputIndex": 0,
          "conditions": {
            "conditions": [
              {
                "leftValue": "={{ $json.userType }}",
                "operator": "equal",
                "rightValue": "premium"
              }
            ]
          }
        },
        {
          "outputIndex": 1,
          "conditions": {
            "conditions": [
              {
                "leftValue": "={{ $json.userType }}",
                "operator": "equal",
                "rightValue": "standard"
              }
            ]
          }
        },
        {
          "outputIndex": 2,
          "conditions": {
            "conditions": [
              {
                "leftValue": "={{ $json.userType }}",
                "operator": "equal",
                "rightValue": "trial"
              }
            ]
          }
        }
      ]
    },
    "fallbackOutput": "extra"
  }
}
```

**Best Practices:**
- Use meaningful output labels
- Always configure fallback output
- Maximum 4-5 branches for readability
- Use Code node for dynamic routing with >5 paths

---

### Merge Node (`n8n-nodes-base.merge`)
**Purpose:** Combine data from multiple inputs

**Parameters:**
- `mode` (string):
  - "append" - Append all items
  - "mergeByFields" - Merge items matching specific fields
  - "mergeByPosition" - Merge items by index position
  - "multiplex" - Create combinations of items from both inputs
- `mergeByFields` (object):
  - `joinMode` (string): "enrichInput1" | "enrichInput2" | "keepEverything" | "keepMatches"
  - `matchFields` (array): Fields to match on
- `options` (object):
  - `clashHandling` (object): How to handle field name conflicts
    - `resolveClash` (string): "preferInput1" | "preferInput2" | "addSuffix"

**Example 1: Enrich User Data**
```json
{
  "parameters": {
    "mode": "mergeByFields",
    "mergeByFields": {
      "joinMode": "enrichInput1",
      "matchFields": {
        "fields": [
          {"field1": "userId", "field2": "id"}
        ]
      }
    },
    "options": {
      "clashHandling": {
        "resolveClash": "preferInput2"
      }
    }
  }
}
```

**Example 2: Append Results**
```json
{
  "parameters": {
    "mode": "append"
  }
}
```

**Best Practices:**
- Use `enrichInput1` to add fields from second input to first
- Use `keepMatches` for inner join behavior
- Use `keepEverything` for full outer join
- Handle field name conflicts explicitly

---

### Loop Over Items Node (`n8n-nodes-base.splitInBatches`)
**Purpose:** Process items one at a time in a loop

See [Item Lists Node](#item-lists-node-n8n-nodes-basesplitinbatches) above.

---

## AI & LangChain Nodes

### OpenAI Chat Model (`@n8n/n8n-nodes-langchain.lmChatOpenAi`)
**Purpose:** Use OpenAI models in LangChain workflows

**Parameters:**
- `model` (string): "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo" | "gpt-3.5-turbo"
- `options` (object):
  - `temperature` (number): 0.0-2.0 (creativity)
  - `maxTokens` (number): Maximum response tokens
  - `topP` (number): 0.0-1.0 (nucleus sampling)
  - `frequencyPenalty` (number): -2.0 to 2.0
  - `presencePenalty` (number): -2.0 to 2.0
  - `timeout` (number): Request timeout in ms

**Example Configuration:**
```json
{
  "parameters": {
    "model": "gpt-4o",
    "options": {
      "temperature": 0.7,
      "maxTokens": 2000,
      "topP": 0.9
    }
  },
  "credentials": {
    "openAiApi": {
      "id": "1",
      "name": "OpenAI API"
    }
  }
}
```

**Best Practices:**
- Use gpt-4o for complex reasoning
- Use gpt-4o-mini for simple tasks (faster, cheaper)
- Set temperature 0-0.3 for factual tasks
- Set temperature 0.7-1.0 for creative tasks
- Always set maxTokens to prevent runaway costs

---

### Anthropic Chat Model (`@n8n/n8n-nodes-langchain.lmChatAnthropic`)
**Purpose:** Use Claude models in LangChain workflows

**Parameters:**
- `model` (string): "claude-3-5-sonnet-20241022" | "claude-3-5-haiku-20241022" | "claude-3-opus-20240229"
- `options` (object):
  - `temperature` (number): 0.0-1.0
  - `maxTokens` (number): Maximum response tokens (required)
  - `topP` (number): 0.0-1.0
  - `topK` (number): Top-k sampling

**Example Configuration:**
```json
{
  "parameters": {
    "model": "claude-3-5-sonnet-20241022",
    "options": {
      "temperature": 0.7,
      "maxTokens": 4096,
      "topP": 0.9
    }
  },
  "credentials": {
    "anthropicApi": {
      "id": "2",
      "name": "Anthropic API"
    }
  }
}
```

**Best Practices:**
- Use Sonnet 3.5 for best balance of performance/cost
- Use Haiku 3.5 for speed-critical applications
- maxTokens is required (Claude enforces this)
- Claude excels at analysis and reasoning tasks

---

### Google Gemini Chat Model (`@n8n/n8n-nodes-langchain.lmChatGoogleGemini`)
**Purpose:** Use Google Gemini models

**Parameters:**
- `model` (string): "gemini-2.0-flash-exp" | "gemini-1.5-pro" | "gemini-1.5-flash"
- `options` (object):
  - `temperature` (number): 0.0-2.0
  - `maxOutputTokens` (number): Maximum response tokens
  - `topP` (number): 0.0-1.0
  - `topK` (number): Top-k sampling

**Example Configuration:**
```json
{
  "parameters": {
    "model": "gemini-2.0-flash-exp",
    "options": {
      "temperature": 0.8,
      "maxOutputTokens": 2048,
      "topP": 0.95
    }
  }
}
```

**Best Practices:**
- Gemini 2.0 Flash is extremely fast and cost-effective
- Gemini 1.5 Pro has 2M token context window
- Use for multimodal tasks (text + images)
- Rate limit: 1500 requests/minute (free tier)

---

### AI Agent Node (`@n8n/n8n-nodes-langchain.agent`)
**Purpose:** Create autonomous AI agents with tools

**Parameters:**
- `promptType` (string): "define" | "auto"
- `text` (string): Agent system prompt
- `options` (object):
  - `systemMessage` (string): System instructions
  - `maxIterations` (number): Maximum tool calling iterations (default: 10)

**Example: Research Agent**
```json
{
  "parameters": {
    "promptType": "define",
    "text": "You are a research assistant. Analyze the user's query and use available tools to gather comprehensive information. Synthesize findings into a clear summary.",
    "options": {
      "maxIterations": 15
    }
  }
}
```

**Connected Tools Examples:**
- HTTP Request Tool (for API calls)
- Code Tool (for data processing)
- Calculator Tool (for computations)
- Custom tools via Code node

**Best Practices:**
- Keep system prompt clear and specific
- Set maxIterations based on task complexity
- Monitor token usage in multi-iteration agents
- Provide few-shot examples in system message
- Use structured output for reliable parsing

---

## Database Nodes

### Postgres Node (`n8n-nodes-base.postgres`)
**Purpose:** Execute PostgreSQL database operations

**Parameters:**
- `operation` (string): "executeQuery" | "insert" | "update" | "delete"
- `query` (string): SQL query (supports parameters)
- `options` (object):
  - `queryParameters` (string): Parameterized values (JSON)
  - `returnValues` (boolean): Return affected rows

**Example 1: Parameterized Query**
```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT * FROM users WHERE email = $1 AND status = $2",
    "options": {
      "queryParameters": "={{ JSON.stringify([$json.email, 'active']) }}"
    }
  }
}
```

**Example 2: Bulk Insert**
```json
{
  "parameters": {
    "operation": "insert",
    "schema": "public",
    "table": "transactions",
    "columns": "user_id,amount,currency,status",
    "options": {
      "returnValues": true
    }
  }
}
```

**Example 3: Transaction with Multiple Queries**
```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "BEGIN;\nUPDATE accounts SET balance = balance - $1 WHERE id = $2;\nUPDATE accounts SET balance = balance + $1 WHERE id = $3;\nCOMMIT;",
    "options": {
      "queryParameters": "={{ JSON.stringify([100, $json.fromAccount, $json.toAccount]) }}"
    }
  }
}
```

**Best Practices:**
- Always use parameterized queries to prevent SQL injection
- Use transactions for multi-step operations
- Add indexes for frequently queried columns
- Use LIMIT for large result sets
- Handle NULL values explicitly
- Log slow queries for optimization

---

### MySQL Node (`n8n-nodes-base.mysql`)
Similar to Postgres node with MySQL-specific syntax.

### MongoDB Node (`n8n-nodes-base.mongodb`)
**Purpose:** Interact with MongoDB databases

**Parameters:**
- `operation` (string): "find" | "insert" | "update" | "delete" | "aggregate"
- `collection` (string): Collection name
- `query` (string): MongoDB query (JSON)
- `options` (object):
  - `limit` (number): Result limit
  - `skip` (number): Results to skip
  - `sort` (string): Sort specification

**Example: Find with Filter**
```json
{
  "parameters": {
    "operation": "find",
    "collection": "users",
    "query": "={{ JSON.stringify({ status: 'active', age: { $gt: 18 } }) }}",
    "options": {
      "limit": 100,
      "sort": "{ \"createdAt\": -1 }"
    }
  }
}
```

---

## HTTP & API Nodes

### HTTP Request Node (`n8n-nodes-base.httpRequest`)
**Purpose:** Make HTTP/HTTPS requests

**Parameters:**
- `method` (string): "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"
- `url` (string): Request URL
- `authentication` (string): "none" | "basicAuth" | "oAuth2" | "headerAuth" | "queryAuth"
- `sendBody` (boolean): Include request body
- `bodyParameters` (object): Request body (JSON/form/raw)
- `sendHeaders` (boolean): Include custom headers
- `headerParameters` (object): Custom headers
- `options` (object):
  - `timeout` (number): Request timeout (ms)
  - `retry` (object):
    - `maxRetries` (number): Retry attempts
    - `retryInterval` (number): Wait between retries (ms)
  - `response` (object):
    - `responseFormat` (string): "json" | "text" | "file"

**Example 1: REST API Call with Auth**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/v1/users",
    "authentication": "headerAuth",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {"name": "name", "value": "={{ $json.name }}"},
        {"name": "email", "value": "={{ $json.email }}"}
      ]
    },
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {"name": "Content-Type", "value": "application/json"}
      ]
    },
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

**Example 2: GraphQL Query**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/graphql",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ query: `query { user(id: \"${$json.userId}\") { name email } }` }) }}",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {"name": "Content-Type", "value": "application/json"},
        {"name": "Authorization", "value": "Bearer {{ $env.API_TOKEN }}"}
      ]
    }
  }
}
```

**Best Practices:**
- Use environment variables for API keys
- Implement retry logic for transient failures
- Set appropriate timeouts
- Validate API responses with IF node
- Log failed requests for debugging
- Use pagination for large datasets

---

## Communication Nodes

### Slack Node (`n8n-nodes-base.slack`)
**Purpose:** Send messages and interact with Slack

**Parameters:**
- `resource` (string): "message" | "channel" | "file" | "user"
- `operation` (string): Varies by resource
- `channel` (string): Channel ID or name
- `text` (string): Message text (supports markdown)
- `otherOptions` (object):
  - `blocks` (array): Block Kit blocks for rich formatting
  - `attachments` (array): Message attachments
  - `threadTs` (string): Thread timestamp for replies

**Example 1: Simple Message**
```json
{
  "parameters": {
    "resource": "message",
    "operation": "post",
    "channel": "#alerts",
    "text": "🚨 Error detected in workflow: {{ $workflow.name }}\\nError: {{ $json.error.message }}"
  }
}
```

**Example 2: Rich Message with Blocks**
```json
{
  "parameters": {
    "resource": "message",
    "operation": "post",
    "channel": "#deployments",
    "text": "Deployment notification",
    "otherOptions": {
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Deployment Successful* ✅\\n*Environment:* Production\\n*Version:* {{ $json.version }}"
          }
        },
        {
          "type": "section",
          "fields": [
            {"type": "mrkdwn", "text": "*Deployed By:*\\n{{ $json.deployer }}"},
            {"type": "mrkdwn", "text": "*Time:*\\n{{ $now.toFormat('yyyy-MM-dd HH:mm') }}"}
          ]
        }
      ]
    }
  }
}
```

**Best Practices:**
- Use Block Kit for rich formatting
- Thread related messages together
- Avoid message spam - batch notifications
- Use appropriate channels
- Test with personal DM first

---

### Email Nodes (`n8n-nodes-base.emailSend`, `n8n-nodes-base.gmail`)
**Purpose:** Send and receive emails

**Gmail Send Example:**
```json
{
  "parameters": {
    "resource": "message",
    "operation": "send",
    "to": "={{ $json.email }}",
    "subject": "Welcome to {{ $env.APP_NAME }}",
    "message": "={{ $json.emailBody }}",
    "options": {
      "attachments": "={{ $json.attachmentBinary }}"
    }
  }
}
```

---

## File Operation Nodes

### Read/Write Files Node (`n8n-nodes-base.readWriteFile`)
**Purpose:** Read and write local files

**Parameters:**
- `operation` (string): "read" | "write"
- `filePath` (string): Absolute file path
- `dataPropertyName` (string): Binary data property name

**Example: Write CSV File**
```json
{
  "parameters": {
    "operation": "write",
    "filePath": "/tmp/export-{{ $now.toFormat('yyyy-MM-dd') }}.csv",
    "dataPropertyName": "csvData"
  }
}
```

---

### Spreadsheet File Node (`n8n-nodes-base.spreadsheetFile`)
**Purpose:** Read/write Excel and CSV files

**Parameters:**
- `operation` (string): "fromFile" | "toFile"
- `fileFormat` (string): "csv" | "xlsx" | "ods"
- `options` (object):
  - `headerRow` (boolean): First row contains headers
  - `delimiter` (string): CSV delimiter

**Example: Read CSV**
```json
{
  "parameters": {
    "operation": "fromFile",
    "fileFormat": "csv",
    "binaryPropertyName": "data",
    "options": {
      "headerRow": true,
      "delimiter": ","
    }
  }
}
```

---

## Integration Nodes (Common Examples)

### Google Sheets (`n8n-nodes-base.googleSheets`)
- Operations: append, update, lookup, delete, clear
- Supports range selection
- Batch operations available

### Airtable (`n8n-nodes-base.airtable`)
- CRUD operations on bases
- Formula field support
- Linked records handling

### GitHub (`n8n-nodes-base.github`)
- Repository management
- Issues and PR operations
- Webhook triggers

### Stripe (`n8n-nodes-base.stripe`)
- Customer management
- Payment processing
- Subscription handling
- Webhook events

---

## Best Practices Summary

### Performance
- Use batch operations when possible
- Implement pagination for large datasets
- Add delays to respect rate limits
- Use queue mode for high-volume workflows

### Security
- Never hardcode credentials - use environment variables
- Validate all external inputs
- Implement signature verification for webhooks
- Use HTTPS for all API communications
- Sanitize user inputs before database queries

### Reliability
- Implement error handling on all nodes
- Add retry logic for transient failures
- Log errors to external monitoring
- Use Error Trigger for workflow-level error handling
- Test edge cases (null, empty, malformed data)

### Maintainability
- Use descriptive node names
- Add Sticky Notes for complex logic
- Version control your workflows
- Document API dependencies
- Keep workflows focused (single responsibility)

---

## Additional Resources

- **n8n Documentation:** https://docs.n8n.io
- **Community Forum:** https://community.n8n.io
- **Node Reference:** https://docs.n8n.io/integrations/builtin/
- **Expression Reference:** https://docs.n8n.io/code/expressions/
- **Workflow Templates:** https://n8n.io/workflows

---

**Last Updated:** January 2025
**n8n Version:** 1.0+
