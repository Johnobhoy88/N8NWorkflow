# N8N Workflow Development - Lessons Learned

**Session Date:** 2025-11-04
**Outcome:** ✅ Production-Ready Workflow Deployed
**Key Achievement:** Built working gemini-email-form foundation after resolving 5 critical technical challenges

---

## The Journey

### Initial Challenge
Build a workflow that accepts user text via form → processes with Gemini API → sends email confirmation.
**Seemed simple. Took 3 hours due to technical gotchas.**

---

## 6 Critical Mistakes & Solutions

### Mistake #1: Using JSON Body Type with Expressions

**The Problem:**
```
HTTP Request Node config:
- contentType: "json"
- jsonBody: "={{ JSON.stringify({...}) }}"

Error: "JSON parameter needs to be valid JSON"
Reason: n8n sends the expression as LITERAL TEXT, not evaluated
```

**The Fix:**
```
Change to:
- contentType: "raw"
- body: "={{ JSON.stringify({...}) }}"

Result: Expression evaluates BEFORE sending
```

**Key Insight:** RAW body type evaluates expressions. JSON type does not. This is counterintuitive.

---

### Mistake #2: Using Code Nodes with $credentials

**The Problem:**
```javascript
const apiKey = $credentials.googlePalmApi.apiKey;
// Error: $credentials is not defined [ReferenceError]
```

**Why It Happened:**
- Credentials object isn't available in Code node context
- Thought Code nodes could access everything like Code Editor

**The Fix:**
Use Gmail node directly with pre-configured credentials instead of trying to access $credentials in Code.

**Key Insight:** Each node type has different variable access. Code nodes don't have access to $credentials.

---

### Mistake #3: Nested Expressions in Email Template

**The Problem:**
```
message: "{{ $('Form Trigger').item.json.formData['Your Text'] }}"
Error: "Nested expressions are not supported"
```

**Why It Happened:**
- Tried to access previous node data within email template
- n8n expression syntax doesn't support this nesting

**The Fix:**
Either:
1. Use simpler single expressions: `{{ $json.field }}`
2. Remove complex transformations from email templates
3. Use a Code node to prepare simple variables

**Key Insight:** Email templates have limited expression support. Keep them simple.

---

### Mistake #4: Using SMTP Email Node on n8n Cloud

**The Problem:**
```
Error: "access to env vars denied [Error resolving credentials]"
Context: N8N_BLOCK_ENV_ACCESS_IN_NODE restriction
```

**Why It Happened:**
- Assumed emailSend (SMTP) would work like other nodes
- n8n Cloud restricts environment variable access for security
- SMTP requires env var access to credentials

**The Fix:**
```
Use Gmail node instead:
- type: "n8n-nodes-base.gmail"
- Requires OAuth2 configured in n8n UI (not hardcoded)
- No env var access needed
```

**Key Insight:** n8n Cloud has security restrictions. Gmail OAuth2 is the solution, not SMTP.

---

### Mistake #5: Incorrect Code Node Return Format

**The Problem:**
```javascript
// ❌ WRONG
return { json: {...} };

Error: "Return value must be an array of objects"
```

**Why It Happened:**
- Thought single object would work
- Forgot n8n processes item arrays internally

**The Fix:**
```javascript
// ✅ CORRECT
return [{ json: {...} }];
```

**Key Insight:** Code nodes ALWAYS return array format: `[{json: {...}}]`

---

### Mistake #6: Wrong Authentication Method for Gemini API

**The Problem:**
```
Model: gemini-1.5-flash (experimental/draft)
Error 1: "contents is not specified" (400)
Error 2: "Request had invalid authentication credentials. Expected OAuth 2 access token" (401)
```

**Why It Happened:**
- Assumed Bearer token authentication would work with API keys
- Used experimental model instead of stable free-tier model
- Form field data path was wrong (formData vs root level)
- Bearer tokens are for OAuth credentials, not API keys

**The Fix:**
```
Model: gemini-pro (stable, free tier)
Auth: Query parameter: ?key=<API_KEY> (NOT Bearer token)
Field access: $json['Your Text'] (not $json.formData['Your Text'])
```

**Key Insight:**
- Google Gemini API uses query parameters for API key authentication, not Bearer tokens
- Bearer tokens are for OAuth 2.0 credentials (different use case)
- Always use stable models for production (`gemini-pro`)
- Form Trigger outputs fields at root level JSON, not nested under formData

---

## What Actually Worked (The Solution)

### 1. Form Trigger Setup
```
- Direct field access from form output
- responseMode: "onReceived" gives immediate user feedback
- Form data arrives at root level: $json['fieldLabel'] (NOT nested under formData)
```

### 2. HTTP Request with Raw Body & Query Param Auth
```
- contentType: "raw"
- body: "{{ JSON.stringify({...}) }}"
- Expressions evaluate correctly
- API receives proper JSON
- Authentication: Query parameter ?key=<API_KEY> (not Bearer token)
- Endpoint: gemini-pro (stable, free-tier model)
- Headers: Content-Type: application/json only (no Authorization header)
```

### 3. Gmail for Email
```
- OAuth2 credentials configured in n8n UI
- No hardcoded secrets
- Works reliably on n8n Cloud
- Simple to configure
```

### 4. Error Routing
```
onError: "continueRegularOutput"
Connections:
  main[0] → Success email
  main[1] → Error email
Graceful failure handling
```

### 5. Documentation-First Approach
```
When stuck: Read n8n MCP documentation
When confused: Check HTTP Request node docs
When lost: Use n8narchitect agent
Result: Faster resolution than trial-and-error
```

---

## The Architecture That Works

```
FORM → HTTP REQUEST (raw body) → EMAIL
  ↓          ↓
input    Gemini API
         ↓
    Success/Error
```

**Why it works:**
- Minimal nodes (3 operations)
- Native n8n nodes only
- Clear error paths
- No unnecessary transformations
- Observable at each step

---

## Tools That Saved Us

1. **n8narchitect Agent** - Generated complete workflow specs
2. **n8n MCP Tools** - Validated configurations before deployment
3. **HTTP Request Documentation** - Explained body type behavior
4. **GitHub Commit History** - Tracked what we changed and why
5. **Execution Logs** - Showed exactly where failures occurred

---

## What NOT To Do

❌ Use Code nodes to store/access credentials
❌ Use JSON body type with expressions
❌ Nest expressions in templates
❌ Use SMTP on n8n Cloud
❌ Forget array wrapper in Code node returns
❌ Try to use database nodes without local access
❌ Overcomplicate with unnecessary transformations
❌ Skip validation before deployment

---

## What TO Do

✅ Use HTTP Request for API calls
✅ Use Raw body type for JSON with expressions
✅ Use Gmail node for email (OAuth2)
✅ Keep transformations simple
✅ Return proper array format from Code nodes
✅ Use n8narchitect for complex designs
✅ Validate before deploying
✅ Document as you build
✅ Test error paths
✅ Read documentation first

---

## The Breakthrough Moment

When I switched from:
```
Code Node → trying to build JSON
```

To:
```
HTTP Request (raw) → JSON.stringify() expression
```

Everything clicked. The API worked. The workflow ran. Success emails sent.

**Key Lesson:** The simplest solution is usually the right one. Native nodes > custom Code.

---

## Time Breakdown

| Activity | Time | Outcome |
|----------|------|---------|
| Trial & Error (JSON body) | 45 min | ❌ Failed |
| Code Node Issues ($credentials) | 30 min | ❌ Failed |
| Documentation Review | 15 min | ✅ Found solution |
| Using n8narchitect | 10 min | ✅ Got spec |
| Implementation | 10 min | ✅ Worked |
| **Total** | **110 min** | ✅ **Success** |

**Lesson:** Documentation-first (25%) > Trial-and-error (75%)

---

## For Future Workflows

### Checklist
- [ ] Read n8n docs for any node I'm unsure about
- [ ] Use n8narchitect for architecture design
- [ ] Prefer native nodes over Code nodes
- [ ] Validate before deploying
- [ ] Test error paths
- [ ] Document as I build
- [ ] Keep it simple
- [ ] Use Raw body type for HTTP JSON requests
- [ ] Use Gmail (not SMTP) on n8n Cloud
- [ ] Return `[{json: {...}}]` from Code nodes

---

## The Foundation is Solid

This workflow works because it:
1. Uses n8n's native capabilities
2. Handles errors gracefully
3. Gives users feedback
4. Has clear data flow
5. Is easy to debug
6. Follows n8n best practices

**Everything we build next should follow this pattern.**

---

## Final Thought

The most valuable lesson: **Documentation and architecture matter more than coding**.

When I used n8narchitect to design the workflow BEFORE building it, implementation took 10 minutes.
When I tried to build first and debug later, it took 90 minutes and still failed.

This is the new approach.
