# Test Cases - n8n Workflow Builder (Production)

## Test Strategy

### Testing Levels

1. **Unit Tests**: Individual node validation
2. **Integration Tests**: End-to-end workflow execution
3. **Performance Tests**: Timeout and load testing
4. **Security Tests**: Input validation and sanitization
5. **Error Tests**: Error handling and recovery

### Test Environment

- **n8n Version**: 1.0.0+
- **Gemini API**: Production endpoint
- **Gmail**: Test account with OAuth2
- **Test Data**: Realistic workflow briefs

---

## Unit Tests

### TEST-001: Data Normalizer - Email Input

**Objective**: Verify email input is correctly normalized

**Input**:
```json
{
  "id": "msg_123",
  "threadId": "thread_456",
  "labelIds": ["INBOX"],
  "from": {
    "value": [
      {
        "address": "test@example.com"
      }
    ]
  },
  "subject": "[WORKFLOW] Test Request",
  "text": "Create a workflow that sends daily reports."
}
```

**Expected Output**:
```json
{
  "clientBrief": "Create a workflow that sends daily reports.",
  "clientEmail": "test@example.com",
  "source": "email",
  "error": false,
  "errorMessage": null
}
```

**Assertions**:
- [ ] `source` = "email"
- [ ] `clientEmail` = "test@example.com"
- [ ] `clientBrief` length > 10
- [ ] `error` = false
- [ ] `timestamp` is valid ISO string

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-002: Data Normalizer - Form Input

**Objective**: Verify form input is correctly normalized

**Input**:
```json
{
  "Client Brief": "Build a Slack notification workflow for new GitHub issues",
  "Your Email": "user@company.com"
}
```

**Expected Output**:
```json
{
  "clientBrief": "Build a Slack notification workflow for new GitHub issues",
  "clientEmail": "user@company.com",
  "source": "form",
  "error": false
}
```

**Assertions**:
- [ ] `source` = "form"
- [ ] `clientEmail` = "user@company.com"
- [ ] `clientBrief` matches input
- [ ] `error` = false

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-003: Data Normalizer - XSS Protection

**Objective**: Verify XSS attacks are sanitized

**Input**:
```json
{
  "Client Brief": "Create workflow <script>alert('XSS')</script> for testing",
  "Your Email": "test@example.com"
}
```

**Expected Output**:
```json
{
  "clientBrief": "Create workflow  for testing",
  "clientEmail": "test@example.com",
  "error": false
}
```

**Assertions**:
- [ ] `<script>` tags removed
- [ ] `alert('XSS')` removed
- [ ] Workflow still functional
- [ ] No JavaScript execution

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-004: Data Normalizer - Invalid Email

**Objective**: Verify invalid emails are rejected

**Input**:
```json
{
  "Client Brief": "Test workflow",
  "Your Email": "not-an-email"
}
```

**Expected Output**:
```json
{
  "error": true,
  "errorMessage": "Invalid email format"
}
```

**Assertions**:
- [ ] `error` = true
- [ ] `errorMessage` contains "email"
- [ ] Execution stops at validation

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-005: Data Normalizer - Brief Too Short

**Objective**: Verify brief length validation

**Input**:
```json
{
  "Client Brief": "Test",
  "Your Email": "test@example.com"
}
```

**Expected Output**:
```json
{
  "error": true,
  "errorMessage": "Client Brief must be at least 10 characters"
}
```

**Assertions**:
- [ ] `error` = true
- [ ] Brief length checked (< 10 chars)
- [ ] Error message is clear

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-006: Data Normalizer - Brief Too Long

**Objective**: Verify brief length limit (5000 chars)

**Input**:
```json
{
  "Client Brief": "[6000 character string]",
  "Your Email": "test@example.com"
}
```

**Expected Output**:
```json
{
  "clientBrief": "[5000 character string - truncated]",
  "error": false
}
```

**Assertions**:
- [ ] Brief truncated to 5000 chars
- [ ] No error (graceful handling)
- [ ] Workflow continues

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-007: Validate Input Node - Valid Data

**Objective**: Verify valid data passes validation

**Input**:
```json
{
  "error": false,
  "clientBrief": "Valid brief",
  "clientEmail": "test@example.com"
}
```

**Expected Behavior**:
- Routes to "Brief Parser" (True branch)
- Does not route to "Error Handler" (False branch)

**Assertions**:
- [ ] True output connected
- [ ] False output not triggered
- [ ] Data passed unchanged

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-008: Validate Input Node - Invalid Data

**Objective**: Verify invalid data routes to error handler

**Input**:
```json
{
  "error": true,
  "errorMessage": "Test error",
  "clientEmail": "test@example.com"
}
```

**Expected Behavior**:
- Routes to "Error Handler" (False branch)
- Does not route to "Brief Parser" (True branch)

**Assertions**:
- [ ] False output triggered
- [ ] True output not triggered
- [ ] Error handler receives data

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-009: Brief Parser - Successful Parsing

**Objective**: Verify Gemini API successfully parses brief

**Input**:
```json
{
  "clientBrief": "Create a workflow that triggers on new HubSpot contacts and sends them to Mailchimp"
}
```

**Expected Output**:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "1) Primary goal: Sync contacts\n2) Data sources: HubSpot\n3) Processing steps: Extract, transform\n4) Output destinations: Mailchimp\n5) Error handling needs: Retry on failure\n6) Constraints: Real-time sync"
          }
        ]
      }
    }
  ]
}
```

**Assertions**:
- [ ] HTTP status = 200
- [ ] Response contains `candidates`
- [ ] Text includes requirements
- [ ] Timeout not exceeded (< 60s)

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-010: Brief Parser - API Timeout

**Objective**: Verify timeout handling (60s limit)

**Setup**: Simulate slow API response

**Expected Behavior**:
- Request times out after 60s
- Retry attempt #1 (wait 2s)
- Retry attempt #2 (wait 2s)
- Retry attempt #3 (wait 2s)
- If all fail, return error with `continueOnFail: true`

**Assertions**:
- [ ] Timeout occurs at 60s
- [ ] 3 retry attempts made
- [ ] Error object returned
- [ ] Workflow continues (not stops)

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-011: Brief Parser - API Rate Limit (429)

**Objective**: Verify rate limit retry logic

**Setup**: Trigger rate limit (send 100+ requests)

**Expected Behavior**:
- First request: 429 Too Many Requests
- Retry #1 after 2s: 429
- Retry #2 after 2s: 429
- Retry #3 after 2s: 429 or 200

**Assertions**:
- [ ] Retries on 429 status
- [ ] Waits 2s between retries
- [ ] Max 3 retries
- [ ] Eventually succeeds or fails gracefully

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

## Integration Tests

### TEST-012: End-to-End - Manual Trigger (Happy Path)

**Objective**: Complete workflow execution from manual trigger to email

**Steps**:
1. Click "Manual Trigger (Testing)" node
2. Click "Test workflow"
3. Observe execution flow
4. Check email inbox

**Expected Results**:
- ✅ Data Normalizer: Processes mock data
- ✅ Validate Input: Passes (true branch)
- ✅ Brief Parser: Extracts requirements
- ✅ Architect Agent: Designs workflow
- ✅ Synthesis Agent: Generates JSON
- ✅ QA Validator: Validates workflow
- ✅ Check for Errors: Passes (no errors)
- ✅ Send Workflow Email: Delivers email

**Assertions**:
- [ ] All nodes execute successfully
- [ ] Total execution time < 120s
- [ ] Email received within 5 minutes
- [ ] Email contains valid JSON
- [ ] JSON is importable

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-013: End-to-End - Form Trigger (Happy Path)

**Objective**: Complete workflow via web form submission

**Steps**:
1. Navigate to `/form/workflow-builder`
2. Fill form:
   - Brief: "Create a workflow that monitors RSS feeds and posts to Twitter"
   - Email: your-test-email@example.com
3. Submit form
4. Wait for email

**Expected Results**:
- ✅ Form submitted successfully
- ✅ Workflow triggered
- ✅ All processing stages complete
- ✅ Email delivered

**Assertions**:
- [ ] Form submission successful
- [ ] Workflow execution starts within 1s
- [ ] Email received within 3 minutes
- [ ] Email formatting is professional
- [ ] Workflow JSON is valid

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-014: End-to-End - Email Trigger (Happy Path)

**Objective**: Complete workflow via Gmail trigger

**Steps**:
1. Send email to Gmail account:
   - Subject: `[WORKFLOW] Test Automation`
   - Body: `Create a workflow that backs up Notion pages to Google Drive daily`
2. Wait 1-2 minutes (polling)
3. Check for response email

**Expected Results**:
- ✅ Email detected and marked as read
- ✅ Workflow triggered
- ✅ Brief extracted from email body
- ✅ Response email sent

**Assertions**:
- [ ] Email polling detects message
- [ ] Email marked as read
- [ ] Subject pattern matched
- [ ] Response email received
- [ ] Processing time < 150s

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-015: End-to-End - Error Path (Invalid Input)

**Objective**: Verify error handling for invalid input

**Steps**:
1. Use manual trigger
2. Modify mock data:
   ```json
   {
     "Client Brief": "xyz",
     "Your Email": "invalid"
   }
   ```
3. Execute workflow

**Expected Results**:
- ❌ Data Normalizer: Detects errors
- ✅ Validate Input: Routes to error handler (false)
- ✅ Error Handler: Formats error message
- ✅ Send Error Email: Delivers error notification

**Assertions**:
- [ ] Validation fails
- [ ] Error handler triggered
- [ ] Error email sent
- [ ] Error email contains useful info

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-016: End-to-End - API Failure Recovery

**Objective**: Verify recovery from Gemini API failure

**Setup**: Temporarily remove `GEMINI_API_KEY`

**Steps**:
1. Execute workflow with valid input
2. Observe Brief Parser failure
3. Check error handling

**Expected Results**:
- ❌ Brief Parser: API call fails (401/403)
- ✅ Retries: 3 attempts made
- ✅ Error Handler: Catches failure
- ✅ Error Email: Sent to client

**Assertions**:
- [ ] API error detected
- [ ] Retries attempted
- [ ] Error gracefully handled
- [ ] Client notified of failure

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

## Performance Tests

### TEST-017: Performance - Simple Brief (Baseline)

**Objective**: Measure performance for simple workflow request

**Input**:
```
Brief: "Create a workflow that sends me an email when someone mentions my company on Twitter"
```

**Expected Performance**:
- Brief Parser: < 10s
- Architect Agent: < 15s
- Synthesis Agent: < 20s
- QA Validator: < 15s
- **Total**: < 70s

**Assertions**:
- [ ] Total time < 70s
- [ ] No timeouts
- [ ] All API calls successful

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-018: Performance - Complex Brief

**Objective**: Measure performance for complex workflow request

**Input**:
```
Brief: "Create a comprehensive workflow that: 1) Monitors multiple data sources (HubSpot, Salesforce, Typeform), 2) Enriches contact data with Clearbit and Hunter.io, 3) Scores leads using custom logic, 4) Routes high-value leads to Slack, medium leads to Asana, low leads to Mailchimp drip campaign, 5) Logs all activity to Airtable and Google Sheets, 6) Sends daily summary reports via email"
```

**Expected Performance**:
- Brief Parser: < 15s
- Architect Agent: < 30s
- Synthesis Agent: < 60s
- QA Validator: < 30s
- **Total**: < 150s

**Assertions**:
- [ ] Total time < 150s
- [ ] No timeouts
- [ ] Workflow has 15-20 nodes
- [ ] All connections valid

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-019: Performance - Concurrent Executions

**Objective**: Verify workflow handles concurrent requests

**Setup**: Submit 5 workflow requests simultaneously

**Expected Behavior**:
- All 5 executions start
- No race conditions
- All complete successfully
- No data mixing between executions

**Assertions**:
- [ ] 5 executions visible in logs
- [ ] Each has unique execution ID
- [ ] All complete without errors
- [ ] Average time < 100s per execution

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-020: Performance - Load Test

**Objective**: Test workflow under sustained load

**Setup**: Submit 50 requests over 1 hour

**Expected Behavior**:
- All requests processed
- No memory leaks
- No degradation over time
- Error rate < 5%

**Assertions**:
- [ ] 50 requests completed
- [ ] Average response time consistent
- [ ] Memory usage stable
- [ ] No failures due to resource exhaustion

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

## Security Tests

### TEST-021: Security - SQL Injection in Brief

**Objective**: Verify SQL injection attempts are neutralized

**Input**:
```json
{
  "Client Brief": "'; DROP TABLE users; --",
  "Your Email": "test@example.com"
}
```

**Expected Behavior**:
- Brief treated as plain text
- No SQL execution
- Workflow processes normally

**Assertions**:
- [ ] No database errors
- [ ] Brief sanitized
- [ ] Workflow generates valid output

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-022: Security - XSS in Email Output

**Objective**: Verify XSS in brief doesn't execute in email

**Input**:
```json
{
  "Client Brief": "<img src=x onerror=alert('XSS')>",
  "Your Email": "test@example.com"
}
```

**Expected Behavior**:
- Tags stripped in Data Normalizer
- Email contains sanitized text only
- No JavaScript execution in email client

**Assertions**:
- [ ] `<img>` tag removed
- [ ] `onerror` removed
- [ ] Email displays plain text

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-023: Security - Email Spoofing

**Objective**: Verify email source is validated

**Setup**: Send email from unauthorized address with `[WORKFLOW]` subject

**Expected Behavior**:
- Workflow triggers (public form)
- OR: Workflow validates sender (if configured)

**Assertions**:
- [ ] Source email captured
- [ ] Reply sent to correct address
- [ ] No impersonation possible

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-024: Security - Credential Exposure

**Objective**: Verify no credentials in generated workflow

**Input**: Any valid brief

**Expected Behavior**:
- Generated workflow contains placeholders
- No `GEMINI_API_KEY` in output
- No Gmail credentials in output

**Assertions**:
- [ ] Search output for "GEMINI_API_KEY" = 0 results
- [ ] Search for Gmail credentials = 0 results
- [ ] Credentials referenced via `$env` or credential IDs

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-025: Security - Path Traversal

**Objective**: Verify path traversal attempts fail

**Input**:
```json
{
  "Client Brief": "../../../etc/passwd",
  "Your Email": "test@example.com"
}
```

**Expected Behavior**:
- Treated as plain text
- No file system access
- Workflow processes normally

**Assertions**:
- [ ] No file read attempts
- [ ] Brief treated as string
- [ ] No error thrown

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

## Monitoring & Health Tests

### TEST-026: Monitoring - Health Check Endpoint

**Objective**: Verify health check returns correct status

**Steps**:
1. Send POST to Data Normalizer with:
   ```json
   {
     "healthCheck": true
   }
   ```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:00:00.000Z",
  "workflow": "workflow-builder-gemini-v2-production",
  "version": "3.0",
  "uptime": true,
  "dependencies": {
    "geminiApi": "available",
    "gmail": "configured"
  }
}
```

**Assertions**:
- [ ] Response status 200
- [ ] `status` = "healthy"
- [ ] `timestamp` is recent
- [ ] All dependencies listed

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-027: Monitoring - Structured Logging

**Objective**: Verify logs are created at key stages

**Steps**:
1. Execute workflow end-to-end
2. Check execution logs in n8n

**Expected Log Entries**:
1. "Log: Data Normalized" - Contains execution ID, source, email
2. "Log: QA Complete" - Contains metrics, QA results
3. "Log: Error Occurred" (if error path) - Contains error details

**Assertions**:
- [ ] 2-3 log entries created
- [ ] Logs are valid JSON
- [ ] Logs contain execution ID
- [ ] Timestamps are accurate

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-028: Monitoring - Error Alerting

**Objective**: Verify error logs can trigger alerts

**Steps**:
1. Trigger error condition (invalid input)
2. Check "Log: Error Occurred" node output
3. Verify log level = "error"

**Expected Log**:
```json
{
  "timestamp": "...",
  "executionId": "...",
  "stage": "data_normalization",
  "severity": "HIGH",
  "errorMessage": "...",
  "clientEmail": "..."
}
```

**Assertions**:
- [ ] Error log created
- [ ] Log level = "error"
- [ ] Contains severity
- [ ] Contains error message

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

## Regression Tests

### TEST-029: Regression - Version 2.0 Compatibility

**Objective**: Ensure v3.0 doesn't break v2.0 functionality

**Test Cases**:
- [ ] Email trigger still works
- [ ] Form trigger still works
- [ ] QA validation still works
- [ ] Error handling still works

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

### TEST-030: Regression - Backward Compatibility

**Objective**: Verify workflows generated by v3.0 work in n8n

**Steps**:
1. Generate workflow using v3.0
2. Import into n8n
3. Configure credentials
4. Test execution

**Assertions**:
- [ ] Import succeeds
- [ ] No validation errors
- [ ] Workflow executes
- [ ] Produces expected output

**Status**: ⚪ Not Run | ✅ Pass | ❌ Fail

---

## Test Execution Summary

### Manual Checklist

Before deploying to production, verify:

**Unit Tests** (10 tests):
- [ ] TEST-001: Email input normalization
- [ ] TEST-002: Form input normalization
- [ ] TEST-003: XSS protection
- [ ] TEST-004: Invalid email rejection
- [ ] TEST-005: Brief too short
- [ ] TEST-006: Brief too long
- [ ] TEST-007: Valid input routing
- [ ] TEST-008: Invalid input routing
- [ ] TEST-009: Brief parser success
- [ ] TEST-010: API timeout handling
- [ ] TEST-011: Rate limit retry

**Integration Tests** (5 tests):
- [ ] TEST-012: Manual trigger end-to-end
- [ ] TEST-013: Form trigger end-to-end
- [ ] TEST-014: Email trigger end-to-end
- [ ] TEST-015: Error path
- [ ] TEST-016: API failure recovery

**Performance Tests** (4 tests):
- [ ] TEST-017: Simple brief baseline
- [ ] TEST-018: Complex brief
- [ ] TEST-019: Concurrent executions
- [ ] TEST-020: Load test

**Security Tests** (5 tests):
- [ ] TEST-021: SQL injection
- [ ] TEST-022: XSS in output
- [ ] TEST-023: Email spoofing
- [ ] TEST-024: Credential exposure
- [ ] TEST-025: Path traversal

**Monitoring Tests** (3 tests):
- [ ] TEST-026: Health check
- [ ] TEST-027: Structured logging
- [ ] TEST-028: Error alerting

**Regression Tests** (2 tests):
- [ ] TEST-029: v2.0 compatibility
- [ ] TEST-030: Backward compatibility

---

## Test Results Template

### Execution Record

| Test ID | Name | Date | Tester | Status | Duration | Notes |
|---------|------|------|--------|--------|----------|-------|
| TEST-001 | Email normalization | 2025-11-17 | John | ✅ Pass | 2s | - |
| TEST-002 | Form normalization | 2025-11-17 | John | ✅ Pass | 1s | - |
| TEST-012 | E2E Manual | 2025-11-17 | Sarah | ✅ Pass | 45s | All stages successful |
| TEST-018 | Complex brief perf | 2025-11-17 | Sarah | ⚠️ Warning | 165s | Exceeded 150s target by 15s |

### Pass Criteria

- **Unit Tests**: 100% pass required
- **Integration Tests**: 100% pass required
- **Performance Tests**: 90% within targets
- **Security Tests**: 100% pass required
- **Monitoring Tests**: 100% pass required

### Overall Status

- **Total Tests**: 30
- **Passed**: ___
- **Failed**: ___
- **Warnings**: ___
- **Not Run**: ___

**Production Ready**: ☐ Yes / ☐ No

---

## Automated Testing

### Future Automation (n8n Test Workflows)

Consider creating dedicated test workflows:

1. **test-workflow-builder-unit.json**
   - Runs all unit tests
   - Uses mock Gemini responses
   - Completes in < 5 minutes

2. **test-workflow-builder-integration.json**
   - Runs integration tests
   - Uses real Gemini API (staging)
   - Completes in < 10 minutes

3. **test-workflow-builder-performance.json**
   - Runs performance benchmarks
   - Measures response times
   - Generates performance report

4. **test-workflow-builder-security.json**
   - Runs security tests
   - Attempts common attacks
   - Verifies sanitization

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: n8n Workflow Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start n8n
        run: docker-compose up -d
      - name: Run unit tests
        run: ./scripts/run-tests.sh unit
      - name: Run integration tests
        run: ./scripts/run-tests.sh integration
      - name: Generate report
        run: ./scripts/generate-test-report.sh
```

---

## Support

For test failures:
1. Document exact steps to reproduce
2. Capture execution logs
3. Include input data
4. Note expected vs actual behavior
5. Report via GitHub issues

---

**Last Updated**: 2025-11-17
**Version**: 3.0 (Production Ready)
**Maintained By**: QA Team
