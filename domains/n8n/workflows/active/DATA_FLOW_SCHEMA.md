# Data Flow Schema Documentation

## Workflow: n8n Workflow Builder (Gemini) - Data Flow Fixed

**Version:** 4.0
**Status:** Data Flow Fixed
**Last Updated:** 2025-11-17

---

## Overview

This document describes the data schema at each stage of the workflow, ensuring complete data integrity and traceability throughout the entire process.

## Core Data Envelope Pattern

All nodes maintain a "data envelope" that preserves critical fields throughout the workflow:

### Standard Data Envelope Fields

```javascript
{
  // Core workflow data
  clientBrief: string,           // The workflow description from user
  clientEmail: string,           // User's email address
  source: string,                // 'email' | 'form' | 'unknown'

  // Metadata (preserved throughout)
  timestamp: string,             // ISO 8601 timestamp of workflow start
  workflowId: string,            // Unique workflow execution ID

  // Error tracking
  error: boolean,                // Fatal error flag
  errorMessages: string[],       // Array of error messages (accumulated)
  warningMessages: string[],     // Array of warning messages (non-fatal)

  // Audit trail
  processingStages: string[],    // Array of completed stages
  originalInput: object          // Original trigger data (only in Data Normalizer)
}
```

---

## Node-by-Node Data Schemas

### 1. Email Trigger / Form Trigger

**Output Schema:**

```javascript
// Email Trigger
{
  id: string,
  threadId: string,
  labelIds: string[],
  subject: string,
  from: {
    value: [{
      address: string,
      name: string
    }]
  },
  text: string,              // Email body text
  snippet: string            // Email snippet
}

// Form Trigger
{
  "Client Brief": string,
  "Your Email": string
}
```

---

### 2. Data Normalizer

**Input:** Email Trigger OR Form Trigger output
**Output Schema:**

```javascript
{
  // Core workflow data
  clientBrief: string,                    // Extracted and sanitized brief
  clientEmail: string,                    // Validated email address
  source: 'email' | 'form' | 'unknown',   // Input source type

  // Error tracking (FIXED: array instead of single string)
  error: boolean,
  errorMessages: string[],                // Accumulated errors

  // Metadata
  timestamp: string,                      // ISO 8601 format
  workflowId: string,                     // e.g., 'wf-1700000000000-abc123'

  // Audit
  originalInput: object,                  // Original trigger data
  processingStages: ['data-normalizer']
}
```

**Data Transformations:**
- Email extraction: Parses `[BRIEF]...[END]` or `Brief:...` patterns
- Signature removal: Strips email signatures and footers
- Whitespace normalization: Replaces multiple spaces with single space
- Length limiting: Truncates brief to 5000 characters
- Email validation: Regex pattern validation

---

### 3. Validate Input

**Input:** Data Normalizer output
**Output Schema:** Same as input (IF node passes data through)

**Logic:**
- TRUE path (no error): `error === false`
- FALSE path (has error): `error === true`

---

### 4. Prep Brief Parser Context

**Input:** Data Normalizer output
**Output Schema:**

```javascript
{
  // Context preservation (stored in _context)
  _context: {
    clientBrief: string,
    clientEmail: string,
    source: string,
    timestamp: string,
    workflowId: string,
    processingStages: ['data-normalizer', 'brief-parser-prep']
  },

  // Data for API call
  clientBrief: string
}
```

**Purpose:** Preserves context data before API call that would lose it

---

### 5. Brief Parser API

**Input:** Prep Brief Parser Context output
**Output Schema (Gemini API Response):**

```javascript
{
  candidates: [{
    content: {
      parts: [{
        text: string  // Parsed requirements as text
      }]
    },
    finishReason: string,
    index: number,
    safetyRatings: array
  }],
  usageMetadata: object
}

// OR (on error)
{
  error: {
    message: string,
    code: number
  }
}
```

---

### 6. Merge Brief Parser Response

**Inputs:**
- Index 0: Brief Parser API output
- Index 1: Prep Brief Parser Context output (from parent connection)

**Output Schema:**

```javascript
{
  // Preserved context (restored from _context)
  clientBrief: string,
  clientEmail: string,
  source: string,
  timestamp: string,
  workflowId: string,
  processingStages: ['data-normalizer', 'brief-parser-prep', 'brief-parser-complete'],

  // New data from API
  parsedRequirements: string,  // Extracted from Gemini response

  // Status
  error: false
}

// OR (on error)
{
  error: true,
  errorMessages: string[],
  stage: 'brief-parser' | 'brief-parser-parse',
  clientEmail: string,
  source: string,
  timestamp: string,
  workflowId: string
}
```

**Data Integrity:** All context data is preserved from `_context` object

---

### 7. Prep Architect Context

**Input:** Merge Brief Parser Response output
**Output Schema:**

```javascript
{
  _context: {
    clientBrief: string,
    clientEmail: string,
    source: string,
    timestamp: string,
    workflowId: string,
    processingStages: ['...', 'architect-prep'],
    parsedRequirements: string
  },

  // Data for API call (FIXED: both fields available)
  clientBrief: string,
  parsedRequirements: string
}
```

**Fix Applied:** `clientBrief` is now available in the API call body (previously undefined)

---

### 8. Architect Agent API

**Input:** Prep Architect Context output
**Output Schema:** Gemini API response (same structure as Brief Parser API)

---

### 9. Merge Architect Response

**Inputs:**
- Index 0: Architect Agent API output
- Index 1: Prep Architect Context output

**Output Schema:**

```javascript
{
  // Preserved context
  clientBrief: string,
  clientEmail: string,
  source: string,
  timestamp: string,
  workflowId: string,
  processingStages: ['...', 'architect-complete'],

  // Previous stage data
  parsedRequirements: string,

  // New data
  architectSpec: {
    project_summary: string,
    nodes_required: array,
    connection_paths: array,
    data_schema: object
  },
  lessonsLearned: string,

  // Status
  error: false
}
```

---

### 10. Prep Synthesis Context

**Input:** Merge Architect Response output
**Output Schema:**

```javascript
{
  _context: {
    clientBrief: string,
    clientEmail: string,
    source: string,
    timestamp: string,
    workflowId: string,
    processingStages: ['...', 'synthesis-prep'],
    parsedRequirements: string,
    lessonsLearned: string
  },

  // Data for API call
  architectSpec: object,
  lessonsLearned: string
}
```

---

### 11. Synthesis Agent API

**Input:** Prep Synthesis Context output
**Output Schema:** Gemini API response

---

### 12. Merge Synthesis Response

**Inputs:**
- Index 0: Synthesis Agent API output
- Index 1: Prep Synthesis Context output

**Output Schema:**

```javascript
{
  // Preserved context
  clientBrief: string,
  clientEmail: string,
  source: string,
  timestamp: string,  // FIXED: Preserved from original
  workflowId: string,
  processingStages: ['...', 'synthesis-complete'],

  // New data
  workflowJson: {
    name: string,
    nodes: array,
    connections: object,
    settings: object
  },
  workflowSummary: string,  // HTML summary

  // Status
  success: true,
  error: false,
  qaValidationPending: true
}
```

---

### 13. Load Knowledge Base

**Input:** Merge Synthesis Response output
**Output Schema:**

```javascript
{
  // All previous data preserved using spread operator
  ...previousData,

  // Additional KB data
  knowledgeBaseReady: true,
  qaValidationStarting: true,
  kbStats: {
    patterns: 50,
    nodes: 25,
    validationRules: 30,
    bestPractices: 50
  },
  processingStages: ['...', 'kb-loaded']
}
```

**Data Integrity:** Uses spread operator to preserve ALL previous data

---

### 14. Prep QA Context

**Input:** Load Knowledge Base output
**Output Schema:**

```javascript
{
  _context: {
    clientBrief: string,
    clientEmail: string,
    source: string,
    timestamp: string,
    workflowId: string,
    processingStages: ['...', 'qa-prep'],
    workflowSummary: string,
    kbStats: object
  },

  // Data for API call
  workflowJson: object
}
```

---

### 15. QA Validator Agent API

**Input:** Prep QA Context output
**Output Schema:** Gemini API response

---

### 16. Merge QA Response

**Inputs:**
- Index 0: QA Validator Agent API output
- Index 1: Prep QA Context output

**Output Schema:**

```javascript
{
  // Preserved context
  clientBrief: string,
  clientEmail: string,
  source: string,
  timestamp: string,  // FIXED: Preserved throughout
  workflowId: string,
  processingStages: ['...', 'qa-complete'],
  workflowSummary: string,

  // Workflow data
  workflowJson: object,
  finalWorkflowJson: object,  // QA-corrected version if available

  // QA data
  qaResults: {
    valid: boolean,
    issues: string[],
    confidence: number,
    summary: string
  },
  qaHtml: string,  // HTML report
  qaValidationComplete: true,
  qaValidationFailed: boolean,  // FIXED: Properly detects QA failure

  // Status
  error: false,
  warningMessages: string[]  // Non-fatal warnings
}
```

**Fixes Applied:**
- `qaValidationFailed` now correctly set to `!qaResults.valid`
- Timestamp preserved from original workflow start
- All context data maintained

---

### 17. Check for Errors

**Input:** Merge QA Response output
**Output Schema:** Same as input

**Logic (FIXED):**
- TRUE path: `error !== true` (success, includes QA warnings)
- FALSE path: `error === true` (fatal errors only)

**Note:** QA validation failures are treated as warnings, not fatal errors

---

### 18. Send Workflow Email

**Input:** Merge QA Response output (success path)
**Fields Used:**
- `clientEmail` - Recipient
- `qaValidationFailed` - Determines subject line
- `clientBrief` - Included in email body
- `workflowSummary` - HTML summary
- `qaHtml` - QA report HTML
- `finalWorkflowJson` or `workflowJson` - The workflow JSON
- `workflowId` - Workflow ID
- `timestamp` - Generation timestamp
- `source` - Input source

---

### 19. Error Handler

**Input:** Data with `error: true` from any stage
**Output Schema:**

```javascript
{
  error: true,
  clientEmail: string,
  subject: 'Workflow Generation Failed',
  emailHtml: string,  // Formatted error HTML
  source: string,
  timestamp: string,
  workflowId: string,
  errorMessages: string[],  // All accumulated errors
  stage: string  // Stage where error occurred
}
```

**Fix Applied:** Removed dependency on `$('Data Normalizer').first().json` - uses direct data passing

---

### 20. Send Error Email

**Input:** Error Handler output
**Fields Used:**
- `clientEmail` - Recipient
- `subject` - Email subject
- `emailHtml` - Error message HTML

---

## Data Flow Patterns

### 1. Context Preservation Pattern

**Before Each API Call:**
```javascript
// Prep node stores context in _context field
{
  _context: { ...allContextData },
  ...dataForAPI
}
```

**After Each API Call:**
```javascript
// Merge node restores context and adds API response
{
  ...contextData,  // Restored from _context
  newData: apiResponse
}
```

### 2. Multi-Input Merge Pattern

```javascript
// Merge node receives TWO inputs:
// - Input 0: API response
// - Input 1: Context data from parent node

const apiResponse = items[0].json;
const previousData = items[1].json;
const context = previousData._context || {};
```

### 3. Error Accumulation Pattern

```javascript
// Errors are accumulated, not overwritten
const errors = [];
errors.push('Error 1');
errors.push('Error 2');

result.errorMessages = errors;  // All errors preserved
```

### 4. Timestamp Preservation Pattern

```javascript
// Created once in Data Normalizer
timestamp: new Date().toISOString()

// Preserved in every _context object
_context: {
  timestamp: context.timestamp  // Original timestamp
}
```

---

## Data Validation Rules

### At Data Normalizer:
1. `clientBrief` must be at least 10 characters
2. `clientEmail` must match regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
3. `clientBrief` is truncated to 5000 characters
4. Whitespace is normalized

### At Merge Nodes:
1. API response must have `candidates[0].content.parts[0].text`
2. JSON parsing must succeed for structured responses
3. Context data must be present in `_context` field

### At QA Validation:
1. `workflowJson` must have `nodes` array
2. `workflowJson` must have `connections` object
3. QA results must have `valid` boolean field

---

## Data Integrity Guarantees

### Fields Preserved Throughout Entire Workflow:

✅ `clientBrief` - Never lost after Data Normalizer
✅ `clientEmail` - Never lost after Data Normalizer
✅ `source` - Never lost after Data Normalizer
✅ `timestamp` - Created once, preserved throughout
✅ `workflowId` - Created once, preserved throughout
✅ `processingStages` - Accumulated at each stage

### Fields Added at Each Stage:

- **Brief Parser:** `parsedRequirements`
- **Architect:** `architectSpec`, `lessonsLearned`
- **Synthesis:** `workflowJson`, `workflowSummary`
- **KB Load:** `kbStats`, `knowledgeBaseReady`
- **QA:** `qaResults`, `qaHtml`, `finalWorkflowJson`

---

## Bug Fixes Summary

### 1. ✅ Architect Agent Bug
**Before:** `$json.clientBrief` was undefined (only had Gemini response)
**After:** Context preserved via Prep/Merge pattern, `clientBrief` available

### 2. ✅ Data Loss at API Boundaries
**Before:** HTTP nodes only returned API response
**After:** Prep/Merge pattern preserves all context data

### 3. ✅ Fragile `$('Node').first().json` Pattern
**Before:** Used in 4 nodes, fails if execution order changes
**After:** Completely eliminated, uses direct data passing via multi-input pattern

### 4. ✅ Error Message Overwriting
**Before:** `errorMessage` field overwritten multiple times
**After:** `errorMessages` array accumulates all errors

### 5. ✅ Timestamp Not Preserved
**Before:** New timestamp created in some nodes
**After:** Original timestamp preserved in all `_context` objects

### 6. ✅ QA Failure Detection
**Before:** Only checked `error` field, missed QA failures
**After:** `qaValidationFailed` properly set to `!qaResults.valid`

---

## Testing Data Integrity

See `TESTING_CHECKLIST.md` for comprehensive data integrity tests.
