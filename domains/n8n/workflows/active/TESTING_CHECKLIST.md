# Data Integrity Testing Checklist

## Workflow: n8n Workflow Builder (Gemini) - Data Flow Fixed

**Version:** 4.0
**Last Updated:** 2025-11-17

---

## Pre-Testing Setup

### Environment Requirements
- [ ] n8n instance running (version >= 1.0)
- [ ] Gmail OAuth2 credentials configured
- [ ] Gemini API key set in environment (`GEMINI_API_KEY`)
- [ ] Test email account accessible
- [ ] Form webhook URL accessible

### Test Data Preparation
- [ ] Prepare 3 test emails with `[WORKFLOW]` subject
- [ ] Prepare 3 form submissions
- [ ] Include edge cases (very short, very long, special characters)

---

## Test Suite 1: Input Normalization

### Test 1.1: Email Input Validation
**Objective:** Verify email inputs are properly normalized

**Steps:**
1. Send email with subject: `[WORKFLOW] Test Request`
2. Email body: `Create a workflow that sends welcome emails to new users`
3. Wait for workflow execution
4. Check execution data

**Expected Results:**
- [ ] `source` = `'email'`
- [ ] `clientBrief` contains email body text
- [ ] `clientEmail` extracted from sender
- [ ] `timestamp` is ISO 8601 format
- [ ] `workflowId` starts with `'wf-'`
- [ ] `processingStages` contains `'data-normalizer'`
- [ ] `originalInput` preserved
- [ ] Email signatures removed from `clientBrief`

**Data Schema Validation:**
```javascript
{
  clientBrief: string (length >= 10),
  clientEmail: string (valid email format),
  source: 'email',
  error: false,
  errorMessages: [],
  timestamp: string (ISO 8601),
  workflowId: string,
  originalInput: object,
  processingStages: ['data-normalizer']
}
```

### Test 1.2: Form Input Validation
**Objective:** Verify form inputs are properly normalized

**Steps:**
1. Submit form with:
   - Client Brief: `Create a Slack notification workflow`
   - Your Email: `test@example.com`
2. Wait for workflow execution
3. Check execution data

**Expected Results:**
- [ ] `source` = `'form'`
- [ ] `clientBrief` = form input
- [ ] `clientEmail` = form email
- [ ] `timestamp` created
- [ ] `workflowId` created
- [ ] No errors

### Test 1.3: Error Accumulation
**Objective:** Verify errors are accumulated, not overwritten

**Steps:**
1. Submit form with:
   - Client Brief: `Hi` (too short)
   - Your Email: `invalid-email` (invalid format)
2. Wait for workflow execution
3. Check Data Normalizer output

**Expected Results:**
- [ ] `error` = `true`
- [ ] `errorMessages` is an array with TWO errors:
  - [ ] Contains "at least 10 characters"
  - [ ] Contains "Invalid email format"
- [ ] Both errors preserved (not overwritten)

---

## Test Suite 2: Data Preservation Through API Calls

### Test 2.1: Brief Parser Context Preservation
**Objective:** Verify data is not lost at Brief Parser API boundary

**Steps:**
1. Trigger workflow with valid input
2. Check Prep Brief Parser Context node output
3. Check Brief Parser API node output
4. Check Merge Brief Parser Response node output

**Expected Results:**

**Prep Node Output:**
- [ ] `_context` object exists
- [ ] `_context.clientBrief` = original brief
- [ ] `_context.clientEmail` = original email
- [ ] `_context.timestamp` = original timestamp
- [ ] `_context.workflowId` = original ID

**API Node Output:**
- [ ] Contains Gemini API response
- [ ] Does NOT contain `clientBrief`, `clientEmail` (data lost - expected)

**Merge Node Output:**
- [ ] `clientBrief` restored from context
- [ ] `clientEmail` restored from context
- [ ] `timestamp` restored from context (SAME as original)
- [ ] `workflowId` restored from context (SAME as original)
- [ ] `parsedRequirements` added from API response
- [ ] `processingStages` includes `'brief-parser-complete'`

### Test 2.2: Architect Agent Context Preservation
**Objective:** Verify clientBrief is available for Architect Agent

**Steps:**
1. Trigger workflow with valid input
2. Check Prep Architect Context node output
3. Check Architect Agent API node input
4. Check Merge Architect Response output

**Expected Results:**

**Prep Node Output:**
- [ ] `clientBrief` present and correct
- [ ] `parsedRequirements` present
- [ ] Both fields in root object (for API access)
- [ ] `_context` object contains all preserved data

**Architect API Input (body):**
- [ ] Body contains `$json.clientBrief` (NOT undefined)
- [ ] Body contains `$json.parsedRequirements`
- [ ] API call succeeds

**Merge Node Output:**
- [ ] All context data restored
- [ ] `architectSpec` added
- [ ] `lessonsLearned` added
- [ ] `timestamp` SAME as original

### Test 2.3: Synthesis Agent Context Preservation
**Objective:** Verify all data preserved through Synthesis

**Steps:**
1. Trigger workflow
2. Check Merge Synthesis Response output

**Expected Results:**
- [ ] `clientBrief` = original
- [ ] `clientEmail` = original
- [ ] `timestamp` = original (NOT new timestamp)
- [ ] `workflowId` = original
- [ ] `source` = original
- [ ] `workflowJson` present
- [ ] `workflowSummary` present
- [ ] `processingStages` accumulated correctly

### Test 2.4: QA Validator Context Preservation
**Objective:** Verify all data preserved through QA

**Steps:**
1. Trigger workflow
2. Check Merge QA Response output

**Expected Results:**
- [ ] All context fields present
- [ ] `timestamp` = original (critical check)
- [ ] `qaResults` added
- [ ] `qaHtml` generated
- [ ] `qaValidationFailed` set correctly
- [ ] `finalWorkflowJson` present

---

## Test Suite 3: Timestamp Integrity

### Test 3.1: Timestamp Creation
**Objective:** Verify timestamp created only once

**Steps:**
1. Trigger workflow
2. Note timestamp in Data Normalizer output
3. Check timestamp in ALL subsequent nodes

**Expected Results:**
- [ ] Timestamp in Data Normalizer: `2025-11-17T10:30:00.123Z` (example)
- [ ] Timestamp in Merge Brief Parser: SAME
- [ ] Timestamp in Merge Architect: SAME
- [ ] Timestamp in Merge Synthesis: SAME
- [ ] Timestamp in Load KB: SAME
- [ ] Timestamp in Merge QA: SAME
- [ ] Timestamp in final email: SAME
- [ ] NO new timestamps created

### Test 3.2: Timestamp Format Validation
**Objective:** Verify timestamp is valid ISO 8601

**Steps:**
1. Get timestamp from any node
2. Parse with `new Date(timestamp)`

**Expected Results:**
- [ ] Parsing succeeds
- [ ] Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- [ ] Timezone: UTC (Z suffix)

---

## Test Suite 4: Error Handling & Propagation

### Test 4.1: Brief Parser API Failure
**Objective:** Verify error handling when Brief Parser fails

**Steps:**
1. Temporarily break Gemini API key
2. Trigger workflow
3. Check Merge Brief Parser Response output

**Expected Results:**
- [ ] `error` = `true`
- [ ] `errorMessages` contains API error
- [ ] `stage` = `'brief-parser'`
- [ ] `clientEmail` preserved (for error email)
- [ ] `timestamp` preserved
- [ ] `workflowId` preserved
- [ ] Workflow routes to Error Handler
- [ ] Error email sent to `clientEmail`

### Test 4.2: Architect Parse Failure
**Objective:** Verify error handling when Architect response is invalid

**Steps:**
1. Trigger workflow (may need to manipulate response)
2. Simulate JSON parse failure in Merge Architect node

**Expected Results:**
- [ ] `error` = `true`
- [ ] `errorMessages` contains "Failed to parse Architect response"
- [ ] `stage` = `'architect-parse'`
- [ ] All context data preserved for error email

### Test 4.3: QA Validation Failure (Non-Fatal)
**Objective:** Verify QA failures are treated as warnings

**Steps:**
1. Trigger workflow
2. Generate workflow with known issues
3. Check Merge QA Response

**Expected Results:**
- [ ] `error` = `false` (NOT a fatal error)
- [ ] `qaValidationFailed` = `true`
- [ ] `warningMessages` may contain warnings
- [ ] Workflow proceeds to Send Workflow Email (not error path)
- [ ] Email subject includes "(with warnings)"

### Test 4.4: QA API Failure (Non-Fatal)
**Objective:** Verify QA API failures don't stop workflow delivery

**Steps:**
1. Temporarily break QA API call
2. Trigger workflow

**Expected Results:**
- [ ] `error` = `false`
- [ ] `qaValidationFailed` = `true`
- [ ] `qaHtml` = error message about QA failure
- [ ] `warningMessages` contains QA API error
- [ ] Workflow still delivered to user
- [ ] Email includes QA error notice

---

## Test Suite 5: No More `$('Node').first().json`

### Test 5.1: Verify Pattern Elimination
**Objective:** Confirm fragile pattern is completely removed

**Steps:**
1. Search workflow JSON for `$('` pattern
2. Search workflow JSON for `.first()`

**Expected Results:**
- [ ] Zero occurrences of `$('Data Normalizer').first().json`
- [ ] Zero occurrences of `$('Prepare Synthesis Context').first().json`
- [ ] Zero occurrences of `$('Load Knowledge Base').first().json`
- [ ] Zero occurrences of ANY `$('NodeName').first().json` pattern
- [ ] All data passing via direct input (items[0], items[1])

### Test 5.2: Multi-Input Pattern Verification
**Objective:** Verify all Merge nodes use multi-input pattern

**Steps:**
1. Check connections for all Prep nodes
2. Verify connections go to both API node AND Merge node

**Expected Results:**

**Prep Brief Parser Context:**
- [ ] Output 0 → Brief Parser API input 0
- [ ] Output 0 → Merge Brief Parser Response input 1

**Prep Architect Context:**
- [ ] Output 0 → Architect Agent API input 0
- [ ] Output 0 → Merge Architect Response input 1

**Prep Synthesis Context:**
- [ ] Output 0 → Synthesis Agent API input 0
- [ ] Output 0 → Merge Synthesis Response input 1

**Prep QA Context:**
- [ ] Output 0 → QA Validator Agent API input 0
- [ ] Output 0 → Merge QA Response input 1

### Test 5.3: Error Handler Data Access
**Objective:** Verify Error Handler doesn't use fragile pattern

**Steps:**
1. Trigger error condition
2. Check Error Handler node execution
3. Verify it has all required data

**Expected Results:**
- [ ] Error Handler receives data directly via items[0]
- [ ] `clientEmail` available from error data
- [ ] `errorMessages` array available
- [ ] `stage` available
- [ ] `timestamp` available
- [ ] NO dependency on `$('Data Normalizer').first().json`

---

## Test Suite 6: QA Failure Detection

### Test 6.1: QA Valid Workflow
**Objective:** Verify QA success path

**Steps:**
1. Trigger workflow with good brief
2. Check Merge QA Response output
3. Check routing

**Expected Results:**
- [ ] `qaResults.valid` = `true`
- [ ] `qaValidationFailed` = `false`
- [ ] Routes to Send Workflow Email
- [ ] Subject: "Your n8n Workflow is Ready"

### Test 6.2: QA Invalid Workflow
**Objective:** Verify QA failure detection

**Steps:**
1. Trigger workflow with brief that generates invalid workflow
2. Check Merge QA Response
3. Check routing

**Expected Results:**
- [ ] `qaResults.valid` = `false`
- [ ] `qaValidationFailed` = `true` (properly detected)
- [ ] Routes to Send Workflow Email (not error)
- [ ] Subject: "Your n8n Workflow (with warnings)"
- [ ] Email includes QA issues list

### Test 6.3: Check for Errors Logic
**Objective:** Verify Check for Errors node routing

**Steps:**
1. Test with `error: false` → should route to success
2. Test with `error: true` → should route to error

**Expected Results:**
- [ ] Condition: `$json.error !== true`
- [ ] TRUE path (success): `error: false` or undefined
- [ ] FALSE path (error): `error: true`
- [ ] QA failures (`qaValidationFailed: true`) route to SUCCESS (not error)

---

## Test Suite 7: End-to-End Data Integrity

### Test 7.1: Email Input → Success Email
**Objective:** Full workflow test with email input

**Steps:**
1. Send test email
2. Wait for completion
3. Check received email
4. Verify all data in email

**Expected Results:**
- [ ] Email received at sender address
- [ ] Subject appropriate
- [ ] Brief displayed correctly
- [ ] Workflow JSON present and valid
- [ ] QA report present
- [ ] Workflow ID shown
- [ ] Timestamp shown (same as workflow start)
- [ ] Source = 'email'

### Test 7.2: Form Input → Success Email
**Objective:** Full workflow test with form input

**Steps:**
1. Submit form
2. Wait for completion
3. Check received email

**Expected Results:**
- [ ] Email received at form email address
- [ ] All data correct
- [ ] Source = 'form'
- [ ] Timestamp preserved throughout

### Test 7.3: Data Completeness Audit
**Objective:** Verify no data loss throughout workflow

**Steps:**
1. Execute workflow
2. Check EVERY node output
3. Create data lineage map

**Expected Results:**

**Data Present At Each Stage:**

| Field | Normalizer | Brief Parser | Architect | Synthesis | KB Load | QA | Email |
|-------|-----------|-------------|-----------|-----------|---------|----|----|
| clientBrief | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| clientEmail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| source | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| timestamp | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| workflowId | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| parsedRequirements | - | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| architectSpec | - | - | ✓ | ✓ | ✓ | ✓ | - |
| workflowJson | - | - | - | ✓ | ✓ | ✓ | ✓ |
| qaResults | - | - | - | - | - | ✓ | ✓ |

- [ ] ALL checkmarks present (no data loss)

---

## Test Suite 8: Performance & Reliability

### Test 8.1: Concurrent Executions
**Objective:** Verify data isolation between executions

**Steps:**
1. Trigger 3 workflows simultaneously
2. Use different email addresses for each
3. Wait for all to complete
4. Check outputs

**Expected Results:**
- [ ] All 3 complete successfully
- [ ] Each has unique `workflowId`
- [ ] Each has unique `timestamp`
- [ ] No data cross-contamination
- [ ] Correct email sent to each user

### Test 8.2: Large Brief Handling
**Objective:** Verify handling of long briefs

**Steps:**
1. Submit brief with 4500 characters
2. Check Data Normalizer output

**Expected Results:**
- [ ] Brief truncated to 5000 chars max
- [ ] No errors
- [ ] Workflow completes

### Test 8.3: Special Characters Handling
**Objective:** Verify handling of special characters

**Steps:**
1. Submit brief with: `<script>alert('test')</script>`, quotes, apostrophes
2. Check email output

**Expected Results:**
- [ ] Characters properly escaped in email HTML
- [ ] No XSS vulnerabilities
- [ ] Email displays correctly

---

## Test Suite 9: Workflow JSON Validation

### Test 9.1: Generated Workflow Structure
**Objective:** Verify generated workflow is valid n8n JSON

**Steps:**
1. Trigger workflow
2. Extract `finalWorkflowJson` from email
3. Validate structure

**Expected Results:**
- [ ] Has `name` field
- [ ] Has `nodes` array (length > 0)
- [ ] Has `connections` object
- [ ] Each node has `id`, `name`, `type`, `position`
- [ ] Connections reference valid node IDs
- [ ] Can be imported into n8n

### Test 9.2: QA Validation Results
**Objective:** Verify QA catches common issues

**Steps:**
1. Review QA results for multiple workflows
2. Check issues detected

**Expected Results:**
- [ ] Detects duplicate node IDs
- [ ] Detects missing positions
- [ ] Detects invalid connections
- [ ] Detects hardcoded credentials
- [ ] Provides actionable feedback

---

## Test Suite 10: Regression Tests

### Test 10.1: Bug Fix Verification - Architect ClientBrief
**Objective:** Verify Bug #1 is fixed

**Steps:**
1. Add debug logging to Architect Agent API body
2. Trigger workflow
3. Check API request body

**Expected Results:**
- [ ] Body contains actual client brief text (NOT undefined)
- [ ] Body contains parsed requirements
- [ ] Architect generates appropriate spec

### Test 10.2: Bug Fix Verification - Error Accumulation
**Objective:** Verify Bug #4 is fixed

**Steps:**
1. Submit form with multiple validation errors
2. Check `errorMessages` field

**Expected Results:**
- [ ] `errorMessages` is an array
- [ ] Contains ALL errors (not just last one)
- [ ] Each error is a separate array element

### Test 10.3: Bug Fix Verification - Timestamp Preservation
**Objective:** Verify Bug #5 is fixed

**Steps:**
1. Add timestamp logging at each stage
2. Trigger workflow
3. Compare timestamps

**Expected Results:**
- [ ] All timestamps are identical
- [ ] No new timestamps created mid-workflow
- [ ] Original timestamp from Data Normalizer used throughout

---

## Automated Testing Scripts

### Script 1: Data Integrity Checker

```javascript
// Run this in n8n Code node after execution
const execution = $execution;
const stages = ['data-normalizer', 'brief-parser-complete',
                'architect-complete', 'synthesis-complete', 'qa-complete'];

const results = {};
const originalTimestamp = execution.data.resultData.runData['Data Normalizer'][0].data.main[0][0].json.timestamp;

for (const stage of stages) {
  const nodeData = execution.getNodeData(stage);
  results[stage] = {
    hasClientBrief: !!nodeData.clientBrief,
    hasClientEmail: !!nodeData.clientEmail,
    hasTimestamp: !!nodeData.timestamp,
    timestampMatches: nodeData.timestamp === originalTimestamp,
    hasWorkflowId: !!nodeData.workflowId
  };
}

return { json: { integrityCheck: results } };
```

### Script 2: Error Accumulation Tester

```javascript
// Submit this as form input
{
  "Client Brief": "Hi",  // Too short
  "Your Email": "not-an-email"  // Invalid
}

// Expected in Data Normalizer output
{
  error: true,
  errorMessages: [
    "Client Brief is required",  // Or length error
    "Invalid email format"
  ]
}
// Verify errorMessages.length === 2
```

---

## Success Criteria

### All Tests Must Pass:
- [ ] 100% of Test Suite 1 (Input Normalization)
- [ ] 100% of Test Suite 2 (Context Preservation)
- [ ] 100% of Test Suite 3 (Timestamp Integrity)
- [ ] 100% of Test Suite 4 (Error Handling)
- [ ] 100% of Test Suite 5 (Pattern Elimination)
- [ ] 100% of Test Suite 6 (QA Detection)
- [ ] 100% of Test Suite 7 (End-to-End)
- [ ] 100% of Test Suite 9 (Workflow Validation)
- [ ] 100% of Test Suite 10 (Regression Tests)

### Performance Benchmarks:
- [ ] Workflow completes in < 60 seconds (typical)
- [ ] Handles 10 concurrent executions without errors
- [ ] Handles briefs up to 5000 characters
- [ ] Zero data loss across all test cases

---

## Test Execution Log

**Date:** _____________
**Tester:** _____________
**Environment:** _____________

| Test Suite | Tests Passed | Tests Failed | Notes |
|-----------|-------------|--------------|--------|
| Suite 1 | __/8 | __ | |
| Suite 2 | __/4 | __ | |
| Suite 3 | __/2 | __ | |
| Suite 4 | __/4 | __ | |
| Suite 5 | __/3 | __ | |
| Suite 6 | __/3 | __ | |
| Suite 7 | __/3 | __ | |
| Suite 8 | __/3 | __ | |
| Suite 9 | __/2 | __ | |
| Suite 10 | __/3 | __ | |
| **TOTAL** | __/35 | __ | |

**Overall Result:** PASS / FAIL

**Critical Issues Found:** _____________________________________________

**Sign-off:** _____________

---

## Maintenance

This checklist should be updated when:
- New nodes are added to the workflow
- Data schema changes
- New bugs are discovered and fixed
- n8n version upgrades
- API changes (Gemini, Gmail, etc.)

**Last Review:** 2025-11-17
**Next Review:** _____________
