# Error Handling Testing Checklist
## n8n Workflow Builder - Production Grade Error Handling

**Version:** 1.0.0
**Last Updated:** 2025-11-17
**Target Workflow:** workflow-builder-gemini-v2-with-qa-enhanced-production.json

---

## 📋 Pre-Testing Setup

### Environment Configuration
- [ ] **Environment Variables Set**
  - [ ] `GEMINI_API_KEY` configured
  - [ ] `ADMIN_EMAIL` configured
  - [ ] `SENDGRID_WEBHOOK_URL` configured (optional)
  - [ ] `SENDGRID_FROM_EMAIL` configured (optional)
  - [ ] `ERROR_LOGGING_WEBHOOK_URL` configured (optional)
  - [ ] `NODE_ENV` set to "production"

### Credentials
- [ ] **Gmail OAuth2** credentials configured and tested
- [ ] **SendGrid API Key** configured (for fallback email)
- [ ] All credentials have proper permissions

### Monitoring Setup
- [ ] Error logging endpoint is accessible
- [ ] Admin email notifications are working
- [ ] Logging dashboard is ready (if using external service)

---

## 🧪 Test Scenarios

## Category 1: Input Validation Errors (Low Severity)

### Test 1.1: Missing Client Brief
**Objective:** Verify validation catches missing workflow description

- [ ] **Setup:** Submit form with empty "Client Brief" field
- [ ] **Expected Result:**
  - [ ] Validation fails at "Validate Input" node
  - [ ] Error handler triggered with `MISSING_BRIEF` error code
  - [ ] User receives validation error email
  - [ ] Email contains user-friendly message about missing brief
  - [ ] No admin notification sent (low severity)
  - [ ] Error logged with severity: "low"

**Test Data:**
```json
{
  "Client Brief": "",
  "Your Email": "test@example.com"
}
```

**Pass Criteria:** ✅ User receives helpful error email within 1 minute

---

### Test 1.2: Invalid Email Format
**Objective:** Verify email validation works correctly

- [ ] **Setup:** Submit form with invalid email
- [ ] **Expected Result:**
  - [ ] Validation fails at "Data Normalizer" node
  - [ ] Error code: `INVALID_EMAIL` or `INVALID_EMAIL_FORMAT`
  - [ ] User receives error notification (if email is partially valid)
  - [ ] Error message explains what's wrong
  - [ ] Severity: "low"

**Test Data:**
```json
{
  "Client Brief": "Create a workflow to send Slack notifications",
  "Your Email": "not-an-email"
}
```

**Pass Criteria:** ✅ Clear error message about email format

---

### Test 1.3: Brief Too Short
**Objective:** Verify minimum length validation

- [ ] **Setup:** Submit brief with < 10 characters
- [ ] **Expected Result:**
  - [ ] Validation fails with `INVALID_BRIEF_LENGTH`
  - [ ] User receives helpful guidance on minimum length
  - [ ] Severity: "low"

**Test Data:**
```json
{
  "Client Brief": "test",
  "Your Email": "test@example.com"
}
```

**Pass Criteria:** ✅ User understands minimum requirements

---

## Category 2: API Errors (High Severity)

### Test 2.1: Gemini API Rate Limit
**Objective:** Verify retry logic and rate limit handling

- [ ] **Setup:** Trigger rate limit by rapid successive executions OR mock 429 response
- [ ] **Expected Result:**
  - [ ] Node attempts retry (up to 3 times)
  - [ ] Wait time between retries: 1 second
  - [ ] If all retries fail, error handler triggered
  - [ ] Error code: `ARCHITECT_API_ERROR` (or similar for the failing node)
  - [ ] User receives "service temporarily unavailable" email
  - [ ] Admin notification sent (high severity)
  - [ ] Error logged with API details (status code 429)

**Test Method:**
- Option 1: Remove API key temporarily
- Option 2: Use invalid API key
- Option 3: Make rapid requests to trigger real rate limit

**Pass Criteria:** ✅ Retry attempts logged, user notified, admin alerted

---

### Test 2.2: Gemini API Timeout
**Objective:** Verify timeout handling (30 second timeout)

- [ ] **Setup:** Mock slow API response or network issue
- [ ] **Expected Result:**
  - [ ] Request times out after 30 seconds
  - [ ] Retry logic triggers
  - [ ] After max retries, error handler triggered
  - [ ] User receives helpful error message
  - [ ] Admin notified of API issues

**Test Method:**
- Temporarily set `timeout: 1000` (1 second) to force timeout

**Pass Criteria:** ✅ Timeout handled gracefully with retries

---

### Test 2.3: Gemini API Invalid Response
**Objective:** Verify parsing error handling

- [ ] **Setup:** Mock malformed JSON response from API
- [ ] **Expected Result:**
  - [ ] JSON parsing fails in Code node
  - [ ] Try-catch protection catches error
  - [ ] Error code: `ARCHITECT_PARSE_ERROR` (or similar)
  - [ ] User receives error notification
  - [ ] Stack trace logged
  - [ ] Severity: "medium"

**Test Method:**
- Temporarily modify API response handling code to simulate parse error

**Pass Criteria:** ✅ Parse errors caught and logged with stack trace

---

### Test 2.4: Brief Parser API Success Check
**Objective:** Verify error path check after Brief Parser

- [ ] **Setup:** Force Brief Parser to fail
- [ ] **Expected Result:**
  - [ ] "Check Brief Parser Success" node detects error
  - [ ] Flow routes to error handler (not to Architect Agent)
  - [ ] Error code: `BRIEF_PARSER_ERROR`
  - [ ] User notified

**Pass Criteria:** ✅ Error path correctly followed

---

### Test 2.5: Architect Agent API Success Check
**Objective:** Verify error path check after Architect Agent

- [ ] **Setup:** Force Architect Agent to fail
- [ ] **Expected Result:**
  - [ ] "Check Architect Success" node detects error
  - [ ] Flow routes to error handler
  - [ ] Error code: `ARCHITECT_API_ERROR`
  - [ ] Admin notified (high severity)

**Pass Criteria:** ✅ Error detected before proceeding to next stage

---

### Test 2.6: Synthesis Agent API Success Check
**Objective:** Verify error path check after Synthesis Agent

- [ ] **Setup:** Force Synthesis Agent to fail
- [ ] **Expected Result:**
  - [ ] "Check Synthesis Success" node detects error
  - [ ] Flow routes to error handler
  - [ ] Error code: `SYNTHESIS_API_ERROR`

**Pass Criteria:** ✅ All AI agent nodes have error path checks

---

## Category 3: Code Node Protection (Medium-Critical Severity)

### Test 3.1: Data Normalizer Exception
**Objective:** Verify try-catch in Data Normalizer

- [ ] **Setup:** Send malformed input that causes JavaScript error
- [ ] **Expected Result:**
  - [ ] Try-catch catches exception
  - [ ] Error code: `NORMALIZATION_ERROR`
  - [ ] Stack trace captured
  - [ ] Execution continues to error handler

**Test Method:**
- Send deeply nested or circular JSON
- Send extremely large input (>5000 chars)

**Pass Criteria:** ✅ Exceptions caught, not causing workflow crash

---

### Test 3.2: Error Handler Protection
**Objective:** Verify ultimate fallback try-catch in error handler

- [ ] **Setup:** Force error handler itself to fail (e.g., reference undefined variable)
- [ ] **Expected Result:**
  - [ ] Ultimate try-catch catches the error
  - [ ] Error code: `ERROR_HANDLER_FAILURE`
  - [ ] Admin receives critical alert
  - [ ] Severity: "critical"
  - [ ] Basic error email still sent to user

**Test Method:**
- Temporarily introduce syntax error in error handler code

**Pass Criteria:** ✅ Even error handler failures are caught

---

### Test 3.3: Prepare Context Protection
**Objective:** Verify try-catch in context preparation

- [ ] **Setup:** Pass invalid data structure to context preparation
- [ ] **Expected Result:**
  - [ ] Error caught and handled
  - [ ] Error code: `CONTEXT_PREP_ERROR`
  - [ ] Stack trace logged

**Pass Criteria:** ✅ Context preparation errors don't crash workflow

---

## Category 4: Email Delivery Failures (Medium Severity)

### Test 4.1: Primary Email Send Failure
**Objective:** Verify fallback email service activation

- [ ] **Setup:** Temporarily disable Gmail credentials or revoke permissions
- [ ] **Expected Result:**
  - [ ] Primary email node fails (continueOnFail: true)
  - [ ] "Check Email Send Success" node detects failure
  - [ ] Fallback email service (SendGrid) triggered
  - [ ] User receives email via fallback service
  - [ ] Admin notified of email service issue

**Pass Criteria:** ✅ Fallback email service successfully sends

---

### Test 4.2: Both Email Services Fail
**Objective:** Verify graceful degradation when all email fails

- [ ] **Setup:** Disable both Gmail and SendGrid
- [ ] **Expected Result:**
  - [ ] Both email attempts fail
  - [ ] Error logged
  - [ ] Admin receives notification about email system failure
  - [ ] Execution completes (doesn't crash)
  - [ ] User's workflow data is preserved in execution history

**Pass Criteria:** ✅ Workflow completes despite email failures

---

### Test 4.3: Error Email Send Failure
**Objective:** Verify error notification fallback

- [ ] **Setup:** Cause an error + disable email
- [ ] **Expected Result:**
  - [ ] Error occurs
  - [ ] Error email send fails
  - [ ] Fallback error email attempted
  - [ ] Error logged regardless

**Pass Criteria:** ✅ Error logged even if email fails

---

## Category 5: Admin Notifications (Critical Severity)

### Test 5.1: Critical Error Admin Notification
**Objective:** Verify admin gets notified for critical errors

- [ ] **Setup:** Trigger critical error (e.g., error handler failure)
- [ ] **Expected Result:**
  - [ ] "Check if Admin Notification Required" evaluates to true
  - [ ] Admin receives detailed email with:
    - [ ] Error code and stage
    - [ ] Execution ID
    - [ ] Stack trace
    - [ ] User email
    - [ ] Action items
  - [ ] Email has critical styling (red theme)

**Pass Criteria:** ✅ Admin receives actionable critical alert

---

### Test 5.2: High Severity Admin Notification
**Objective:** Verify admin notification for high severity errors

- [ ] **Setup:** Trigger high severity error (API failures)
- [ ] **Expected Result:**
  - [ ] `requiresAdminNotification: true`
  - [ ] Admin receives notification
  - [ ] Notification includes technical details

**Pass Criteria:** ✅ Admin alerted for high severity issues

---

### Test 5.3: No Admin Notification for Low Severity
**Objective:** Verify admin NOT notified for minor issues

- [ ] **Setup:** Trigger low severity error (validation)
- [ ] **Expected Result:**
  - [ ] `requiresAdminNotification: false`
  - [ ] Admin does NOT receive notification
  - [ ] User receives error email
  - [ ] Error still logged

**Pass Criteria:** ✅ Admin not spammed with minor issues

---

## Category 6: Structured Error Logging

### Test 6.1: Error Log Format Validation
**Objective:** Verify error logs match schema

- [ ] **Setup:** Trigger various error types
- [ ] **Expected Result:**
  - [ ] All required fields present (timestamp, executionId, errorCode, etc.)
  - [ ] Field types match schema
  - [ ] Error codes are from allowed enum
  - [ ] Severity levels are valid
  - [ ] JSON is well-formed

**Test Method:**
- Collect error logs from multiple test scenarios
- Validate against `error-logging-schema.json`

**Pass Criteria:** ✅ 100% schema compliance

---

### Test 6.2: External Logging Service Integration
**Objective:** Verify logs sent to external service (if enabled)

- [ ] **Setup:** Configure `ERROR_LOGGING_WEBHOOK_URL`
- [ ] **Expected Result:**
  - [ ] Errors sent to external endpoint
  - [ ] Payload format is correct
  - [ ] Logs appear in external system (Datadog, Splunk, etc.)
  - [ ] If send fails, workflow still completes (continueOnFail: true)

**Pass Criteria:** ✅ Logs successfully delivered to external system

---

### Test 6.3: Error Log Content Completeness
**Objective:** Verify all relevant context captured

- [ ] **Setup:** Trigger error with full context
- [ ] **Expected Result:**
  - [ ] Client email captured
  - [ ] Client brief captured (truncated if needed)
  - [ ] Execution ID captured
  - [ ] Workflow ID and name captured
  - [ ] Stack trace captured (when available)
  - [ ] Timestamp in ISO 8601 format

**Pass Criteria:** ✅ Logs contain full troubleshooting context

---

## Category 7: End-to-End Success Path

### Test 7.1: Happy Path - Form Submission
**Objective:** Verify successful workflow completion via form

- [ ] **Setup:** Submit valid form with realistic workflow request
- [ ] **Expected Result:**
  - [ ] All nodes execute successfully
  - [ ] No errors occur
  - [ ] User receives success email with:
    - [ ] Workflow JSON
    - [ ] QA validation results
    - [ ] Instructions
  - [ ] Email is well-formatted HTML
  - [ ] No admin notifications
  - [ ] No error logs

**Test Data:**
```json
{
  "Client Brief": "Create a workflow that monitors a Google Sheet for new rows and sends a Slack notification for each new entry with the row data",
  "Your Email": "test@example.com"
}
```

**Pass Criteria:** ✅ Complete success with professional email

---

### Test 7.2: Happy Path - Email Submission
**Objective:** Verify successful workflow completion via email

- [ ] **Setup:** Send email with `[WORKFLOW]` in subject
- [ ] **Expected Result:**
  - [ ] Email trigger activates
  - [ ] Data normalizer extracts email content
  - [ ] Workflow completes successfully
  - [ ] User receives workflow JSON

**Test Email Format:**
```
Subject: [WORKFLOW] Request for new workflow
Body:
[BRIEF]
I need a workflow that triggers every day at 9am, fetches data from a REST API,
transforms the data, and saves it to a PostgreSQL database.
[END]
```

**Pass Criteria:** ✅ Email parsing works correctly

---

## Category 8: Performance & Reliability

### Test 8.1: Retry Timing
**Objective:** Verify retry delays are correct

- [ ] **Setup:** Force API failure to trigger retries
- [ ] **Expected Result:**
  - [ ] First retry: ~1 second after initial failure
  - [ ] Second retry: ~1 second after first retry
  - [ ] Third retry: ~1 second after second retry
  - [ ] Total retry time: ~3-4 seconds

**Pass Criteria:** ✅ Retries happen at correct intervals

---

### Test 8.2: Timeout Configuration
**Objective:** Verify timeout settings are effective

- [ ] **Setup:** Check all HTTP Request nodes
- [ ] **Expected Result:**
  - [ ] All API nodes have `timeout: 30000` (30 seconds)
  - [ ] Timeouts actually trigger at 30 seconds

**Pass Criteria:** ✅ Timeouts prevent indefinite hangs

---

### Test 8.3: Concurrent Execution Handling
**Objective:** Verify workflow handles multiple simultaneous executions

- [ ] **Setup:** Trigger 5 workflow executions within 10 seconds
- [ ] **Expected Result:**
  - [ ] All executions complete independently
  - [ ] No execution interferes with others
  - [ ] Error handling works for each
  - [ ] Logs are correctly attributed to execution IDs

**Pass Criteria:** ✅ No cross-execution interference

---

## Category 9: User Experience

### Test 9.1: Error Message Clarity
**Objective:** Verify error messages are user-friendly

- [ ] **Setup:** Trigger various errors and read user emails
- [ ] **Expected Result:**
  - [ ] No technical jargon in user-facing messages
  - [ ] Clear explanation of what went wrong
  - [ ] Actionable steps to fix
  - [ ] Support contact information
  - [ ] Error code for support reference

**Pass Criteria:** ✅ Non-technical users can understand errors

---

### Test 9.2: Success Email Quality
**Objective:** Verify success email is professional

- [ ] **Setup:** Complete successful workflow
- [ ] **Expected Result:**
  - [ ] Email is well-formatted (HTML)
  - [ ] Clear instructions for importing
  - [ ] Workflow JSON is readable
  - [ ] QA results are clear
  - [ ] Next steps are obvious

**Pass Criteria:** ✅ User can easily import and use workflow

---

### Test 9.3: Email Rendering Across Clients
**Objective:** Verify emails display correctly

- [ ] **Setup:** Send test emails to multiple clients
- [ ] **Test Clients:**
  - [ ] Gmail web
  - [ ] Outlook web
  - [ ] Apple Mail
  - [ ] Mobile (iOS/Android)
- [ ] **Expected Result:**
  - [ ] HTML renders correctly in all clients
  - [ ] Formatting is preserved
  - [ ] Colors and styling work
  - [ ] Code blocks are readable

**Pass Criteria:** ✅ Emails look good everywhere

---

## 📊 Test Execution Summary

### Test Results

| Category | Total Tests | Passed | Failed | Skipped | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| Input Validation | 3 | | | | % |
| API Errors | 6 | | | | % |
| Code Protection | 3 | | | | % |
| Email Delivery | 3 | | | | % |
| Admin Notifications | 3 | | | | % |
| Error Logging | 3 | | | | % |
| Success Path | 2 | | | | % |
| Performance | 3 | | | | % |
| User Experience | 3 | | | | % |
| **TOTAL** | **29** | | | | **%** |

### Critical Issues Found
1.
2.
3.

### Recommendations
1.
2.
3.

---

## 🎯 Production Readiness Checklist

Before deploying to production:

- [ ] All critical and high priority tests pass
- [ ] Error logging endpoint is configured and tested
- [ ] Admin email is monitored
- [ ] Email fallback service is configured
- [ ] All environment variables are set in production
- [ ] Monitoring dashboard is set up
- [ ] Alert rules are configured
- [ ] Documentation is updated
- [ ] Team is trained on error response procedures
- [ ] Rollback plan is documented

---

## 📝 Notes

### Testing Environment
- **n8n Version:** _______
- **Node.js Version:** _______
- **Test Date:** _______
- **Tester:** _______

### Issues & Observations

---

## 🔄 Regression Testing

After any changes to error handling:
1. Re-run all failed scenarios from initial testing
2. Re-run all critical severity tests
3. Verify admin notifications still work
4. Check error log format compliance
5. Test email delivery

---

## ✅ Sign-off

- [ ] **QA Engineer:** _________________ Date: _______
- [ ] **Lead Developer:** _________________ Date: _______
- [ ] **Product Owner:** _________________ Date: _______

**Production Deployment Approved:** ☐ Yes ☐ No

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-17
**Next Review Date:** _______
