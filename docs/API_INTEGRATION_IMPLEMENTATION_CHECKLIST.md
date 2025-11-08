# API Integration Implementation Checklist for n8n

Complete step-by-step checklist for implementing robust API integrations in n8n workflows.

---

## Pre-Implementation Planning

### Requirements Gathering
- [ ] Document all APIs needed for the workflow
- [ ] Identify authentication method for each API
- [ ] List required endpoints and operations
- [ ] Define success/failure scenarios
- [ ] Determine rate limits and quotas
- [ ] Map input/output data structures
- [ ] Identify error handling requirements
- [ ] Define security/compliance requirements

### Architecture Planning
- [ ] Design workflow structure (sequential vs parallel)
- [ ] Identify batch vs single request strategies
- [ ] Plan caching strategy
- [ ] Design error handling flow
- [ ] Plan monitoring and alerting
- [ ] Create data transformation mappings
- [ ] Document API dependencies

### Testing Strategy
- [ ] Plan unit tests for data transformations
- [ ] Plan integration tests with real APIs
- [ ] Plan load/stress tests
- [ ] Identify test data requirements
- [ ] Plan webhook testing approach
- [ ] Create error scenario tests

---

## Phase 1: Credentials & Authentication

### Setup in n8n

- [ ] Store all API keys in n8n credentials manager
  - [ ] Stripe API key
  - [ ] Twilio credentials
  - [ ] SendGrid API key
  - [ ] Slack bot token
  - [ ] Google credentials
  - [ ] OAuth tokens (if applicable)

- [ ] Create environment variables for sensitive data
  ```bash
  STRIPE_SECRET_KEY=sk_live_xxxxx
  TWILIO_ACCOUNT_SID=ACxxxxx
  TWILIO_AUTH_TOKEN=xxxxx
  SENDGRID_API_KEY=SG.xxxxx
  SLACK_BOT_TOKEN=xoxb-xxxxx
  ```

- [ ] Document credential naming conventions
- [ ] Set up credential rotation reminders (90 days)
- [ ] Restrict credential access to authorized users
- [ ] Audit credential usage logs

### Authentication Implementation

- [ ] OAuth2: Set up authorization code flow (if needed)
  - [ ] Generate client credentials
  - [ ] Implement authorization URL
  - [ ] Create callback handler
  - [ ] Exchange code for tokens
  - [ ] Store refresh token securely

- [ ] JWT: Set up token creation/validation (if needed)
  - [ ] Generate signing keys
  - [ ] Create token generation code
  - [ ] Implement token verification
  - [ ] Set up token refresh logic

- [ ] API Key: Configure in HTTP headers
  - [ ] Test authentication
  - [ ] Verify key validity

- [ ] Basic Auth: Configure credentials
  - [ ] Set username/password
  - [ ] Test connectivity

---

## Phase 2: Core API Integration

### HTTP Request Node Setup

For each API endpoint:

- [ ] Create HTTP Request node
- [ ] Configure:
  - [ ] URL (base + endpoint)
  - [ ] HTTP method (GET, POST, etc.)
  - [ ] Headers (content-type, auth)
  - [ ] Body/parameters (if POST/PUT)
  - [ ] Timeout (30s default)
  - [ ] continueOnFail: true

- [ ] Test with sample data
- [ ] Verify response structure
- [ ] Document response format

### Data Validation

- [ ] Add Code node to validate API response
  - [ ] Check required fields exist
  - [ ] Validate data types
  - [ ] Check for null/undefined values
  - [ ] Verify status codes

- [ ] Handle validation failures
  - [ ] Log errors
  - [ ] Route to error handler
  - [ ] Alert if critical

### Response Parsing

- [ ] Create Code node for response transformation
  - [ ] Flatten nested objects (if needed)
  - [ ] Rename fields to internal format
  - [ ] Convert data types
  - [ ] Format dates/currencies
  - [ ] Remove sensitive fields

- [ ] Test transformation logic
- [ ] Verify output format

---

## Phase 3: Error Handling

### Error Detection

- [ ] Add IF node after HTTP request
  - [ ] Check `$json.statusCode >= 400`
  - [ ] Check for API error messages
  - [ ] Check for network errors

- [ ] Classify errors:
  - [ ] Client errors (4xx) - don't retry
  - [ ] Server errors (5xx) - retry
  - [ ] Rate limits (429) - retry with delay
  - [ ] Timeouts (408, ETIMEDOUT) - retry

### Retry Logic

- [ ] Implement exponential backoff
  - [ ] Create exponential calculation: `2^attempt * 1000`
  - [ ] Add jitter (±10%)
  - [ ] Cap maximum wait time
  
- [ ] Set maximum retry attempts (usually 3-5)

- [ ] Add Sleep node
  - [ ] Use calculated backoff time
  - [ ] Log retry attempt

- [ ] Create retry loop
  - [ ] Loop back to HTTP request
  - [ ] Increment attempt counter
  - [ ] Exit after max attempts

### Fallback Handling

- [ ] Implement fallback endpoint (if available)
  - [ ] Route to fallback on primary failure
  - [ ] Same error handling for fallback
  - [ ] Log fallback usage

- [ ] Implement circuit breaker (for high-traffic)
  - [ ] Track failure count
  - [ ] Open circuit after threshold
  - [ ] Implement half-open state
  - [ ] Recover when service available

### Error Notification

- [ ] Create error handler workflow section
  - [ ] Log error details
  - [ ] Send Slack alert (if critical)
  - [ ] Send email alert (if critical)
  - [ ] Create database log entry
  - [ ] Move to dead letter queue (if batch)

---

## Phase 4: Rate Limiting

### Rate Limit Monitoring

- [ ] Parse rate limit response headers
  ```javascript
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1699467600
  ```

- [ ] Extract in Code node:
  ```javascript
  const limit = parseInt($json.headers['x-ratelimit-limit']);
  const remaining = parseInt($json.headers['x-ratelimit-remaining']);
  const reset = parseInt($json.headers['x-ratelimit-reset']);
  ```

- [ ] Calculate percentage used
- [ ] Alert when > 80% used
- [ ] Log rate limit state

### Rate Limit Avoidance

- [ ] Batch requests (if API supports)
  - [ ] Implement batch processing
  - [ ] Set batch size based on API
  - [ ] Add delay between batches

- [ ] Add delays between requests
  ```javascript
  // Sleep between requests
  const delayMs = 500; // 0.5s between requests
  ```

- [ ] Implement request queuing
  - [ ] Queue requests if approaching limit
  - [ ] Process queue when limit resets
  - [ ] Monitor queue length

- [ ] Handle 429 responses
  - [ ] Check `Retry-After` header
  - [ ] Wait specified time before retry
  - [ ] Use exponential backoff after that

---

## Phase 5: Webhooks (If Applicable)

### Webhook Receiver Setup

- [ ] Add Webhook trigger node
- [ ] Configure:
  - [ ] HTTP method: POST
  - [ ] Path: `/webhooks/service-name`
  - [ ] Authentication: none (verify in code instead)

- [ ] Add verification code node:
  - [ ] Verify webhook signature (HMAC-SHA256)
  - [ ] Check timestamp (prevent replay attacks)
  - [ ] Check webhook ID (prevent duplicates)

### Idempotency Implementation

- [ ] Create database table for processed webhooks
  ```sql
  CREATE TABLE webhooks (
    id TEXT PRIMARY KEY,
    service TEXT,
    event_type TEXT,
    processed_at TIMESTAMP,
    data JSON
  );
  ```

- [ ] Add Code node to check if already processed
  ```javascript
  const existing = await $db.get(`webhook_${webhookId}`);
  if (existing) {
    return 200; // Accept but don't reprocess
  }
  ```

- [ ] Mark webhook as processed
  ```javascript
  await $db.set(`webhook_${webhookId}`, {
    service: 'stripe',
    processedAt: new Date().toISOString()
  });
  ```

### Webhook Processing

- [ ] Validate webhook data
  - [ ] Check required fields
  - [ ] Validate data types
  - [ ] Verify event type

- [ ] Route by event type
  - [ ] Use Switch node
  - [ ] Handle each event type
  - [ ] Log unknown events

- [ ] Process asynchronously
  - [ ] Return 200 immediately
  - [ ] Process in background (use new execution)
  - [ ] Don't keep webhook waiting

### Webhook Retry Strategy

- [ ] Implement dead letter queue
  - [ ] Create DLQ table/storage
  - [ ] Move failed webhooks there
  - [ ] Create manual review process

- [ ] Add retry logic
  - [ ] Retry failed webhooks on schedule
  - [ ] Use exponential backoff
  - [ ] Alert after max retries

---

## Phase 6: Data Transformation

### Request Transformation

- [ ] Create Code node to prepare request body
  - [ ] Map internal format to API format
  - [ ] Validate required fields
  - [ ] Convert data types
  - [ ] Handle null/undefined values

- [ ] Test with sample data
- [ ] Document transformation logic

### Response Transformation

- [ ] Flatten nested responses (if needed)
- [ ] Rename fields to internal schema
- [ ] Convert timestamps to ISO format
- [ ] Format currency/numbers
- [ ] Remove sensitive fields
- [ ] Add computed fields (if needed)

### Schema Mapping

- [ ] Document API request schema
- [ ] Document API response schema
- [ ] Create internal schema
- [ ] Document field mappings

---

## Phase 7: Batch Processing

### Large Dataset Handling

- [ ] Determine batch size (based on API limits)
  ```
  Stripe: 100 items per batch
  Twilio: 10 concurrent requests
  SendGrid: 1000 recipients per batch
  ```

- [ ] Create batching logic:
  - [ ] Split large arrays into batches
  - [ ] Process batches sequentially
  - [ ] Add delays between batches

- [ ] Implement with Loop node:
  - [ ] Loop over batches
  - [ ] Process each batch
  - [ ] Aggregate results

### Batch Request Pattern

- [ ] Check if API supports batch operations
- [ ] If yes: use batch endpoint
- [ ] If no: process individually with delays

### Result Aggregation

- [ ] Collect results from all batches
- [ ] Summarize: total, successful, failed
- [ ] Log failures for review
- [ ] Alert if > threshold failed

---

## Phase 8: Caching

### Cache Strategy

- [ ] Identify cacheable requests (GET, idempotent)
- [ ] Determine cache TTL (time-to-live)
  - [ ] User data: 1 hour
  - [ ] Prices: 6 hours
  - [ ] Rate limits: 1 minute
  - [ ] Config: 24 hours

- [ ] Implement before each HTTP request:
  ```javascript
  const cacheKey = `api_${endpoint}_${params}`;
  const cached = await $db.get(cacheKey);
  
  if (cached && !cached.expired) {
    return cached.data;
  }
  ```

- [ ] Implement cache invalidation:
  - [ ] On create/update/delete operations
  - [ ] Clear relevant cache keys
  - [ ] Pattern-based clearing

### Cache Monitoring

- [ ] Log cache hits vs misses
- [ ] Monitor cache size
- [ ] Clean up expired entries

---

## Phase 9: Testing

### Unit Tests

- [ ] Test data transformations
  - [ ] Flatten logic
  - [ ] Field mapping
  - [ ] Date formatting
  - [ ] Edge cases

- [ ] Test validation logic
  - [ ] Valid data passes
  - [ ] Invalid data fails
  - [ ] Error messages clear

- [ ] Test error handling
  - [ ] Retry logic works
  - [ ] Exponential backoff correct
  - [ ] Circuit breaker works

### Integration Tests

- [ ] Test with real API (test account)
  - [ ] Authentication works
  - [ ] Correct endpoints called
  - [ ] Response format correct
  - [ ] Error handling works

- [ ] Test rate limiting
  - [ ] Requests don't exceed limit
  - [ ] Retry on 429 works
  - [ ] Fallback endpoint works

- [ ] Test webhooks (if applicable)
  - [ ] Signature verification works
  - [ ] Duplicate detection works
  - [ ] Idempotency works

- [ ] Test edge cases
  - [ ] Empty responses
  - [ ] Large datasets
  - [ ] Special characters
  - [ ] Concurrent requests

### Load/Stress Tests

- [ ] Test with high volume
- [ ] Monitor performance
- [ ] Verify rate limits hold
- [ ] Check error handling under load

---

## Phase 10: Monitoring & Alerting

### Metrics Collection

- [ ] Track API response times
- [ ] Count requests and responses
- [ ] Track error rates
- [ ] Monitor rate limit usage
- [ ] Track cache hit rate

### Logging

- [ ] Log all API requests
  - [ ] Timestamp
  - [ ] Endpoint
  - [ ] Status code
  - [ ] Response time

- [ ] Log errors with full context
  - [ ] Error message
  - [ ] Request details
  - [ ] Response details
  - [ ] Timestamp

- [ ] Log transformations
  - [ ] Input data
  - [ ] Transformation applied
  - [ ] Output data

### Alerting Setup

- [ ] Alert on API failures
  - [ ] Slack notification
  - [ ] Email notification
  - [ ] PagerDuty (if critical)

- [ ] Alert on performance degradation
  - [ ] Response time > threshold
  - [ ] Error rate > threshold
  - [ ] Rate limit > 80%

- [ ] Alert on connectivity issues
  - [ ] API unreachable
  - [ ] Authentication failed
  - [ ] Certificate error

### Health Checks

- [ ] Create health check workflow
  - [ ] Ping each API
  - [ ] Verify response
  - [ ] Report status

- [ ] Schedule regular checks (every 5-15 minutes)

---

## Phase 11: Security

### Credentials Management

- [ ] Store all secrets in n8n credentials
- [ ] Use environment variables for sensitive data
- [ ] Never log credentials
- [ ] Never commit secrets to version control
- [ ] Rotate API keys every 90 days
- [ ] Monitor unused credentials

### Data Security

- [ ] Use HTTPS for all API calls
- [ ] Verify SSL certificates
- [ ] Implement certificate pinning (if critical)
- [ ] Don't store raw card numbers
- [ ] Mask PII in logs
- [ ] Encrypt sensitive data at rest

### Webhook Security

- [ ] Verify webhook signatures
- [ ] Check timestamp (prevent replay)
- [ ] Use HTTPS only
- [ ] Validate webhook source (if possible)
- [ ] Implement rate limiting on webhook endpoint

### Access Control

- [ ] Restrict API key usage by scope
- [ ] Use least privilege principle
- [ ] Audit API usage logs
- [ ] Revoke unused credentials
- [ ] Implement IP whitelisting (if available)

### Input Validation

- [ ] Validate all inputs from users
- [ ] Sanitize data before sending to APIs
- [ ] Use parameterized queries (prevent injection)
- [ ] Validate response data from APIs

---

## Phase 12: Documentation

### Technical Documentation

- [ ] Document API endpoints used
- [ ] Document authentication method
- [ ] Document data mappings
- [ ] Document error handling flow
- [ ] Document caching strategy
- [ ] Document rate limits

### Operational Documentation

- [ ] How to debug workflow
- [ ] How to manually retry failed items
- [ ] How to monitor performance
- [ ] How to respond to alerts
- [ ] How to handle outages
- [ ] How to update credentials

### Team Communication

- [ ] Share documentation with team
- [ ] Train team on workflow
- [ ] Document common issues
- [ ] Create troubleshooting guide
- [ ] Schedule knowledge sharing sessions

---

## Phase 13: Deployment

### Pre-Deployment

- [ ] Code review completed
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security review done
- [ ] Performance benchmarks acceptable
- [ ] Staging tests completed

### Deployment Steps

- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Verify with test data
- [ ] Check logs for errors
- [ ] Deploy to production (off-peak if possible)
- [ ] Monitor closely for 1 hour
- [ ] Verify with real data

### Post-Deployment

- [ ] Monitor for errors
- [ ] Check metrics trending
- [ ] Verify alerts working
- [ ] Document any issues
- [ ] Get user feedback
- [ ] Schedule post-mortem if issues

---

## Phase 14: Ongoing Maintenance

### Regular Monitoring

- [ ] Check logs daily (first week)
- [ ] Monitor metrics trending
- [ ] Review error logs weekly
- [ ] Check rate limit usage
- [ ] Verify backups running

### Scheduled Maintenance

- [ ] Update API library versions (monthly)
- [ ] Review and update error handling (quarterly)
- [ ] Performance optimization review (quarterly)
- [ ] Security audit (quarterly)
- [ ] Documentation review (quarterly)

### Credential Rotation

- [ ] Rotate API keys every 90 days
- [ ] Rotate OAuth refresh tokens (if needed)
- [ ] Revoke old credentials immediately
- [ ] Document rotation dates

### Performance Optimization

- [ ] Analyze slow endpoints
- [ ] Review caching effectiveness
- [ ] Optimize batch sizes
- [ ] Reduce unnecessary API calls
- [ ] Implement query optimization

---

## Common Implementation Mistakes to Avoid

- [ ] Hardcoding API keys in workflow
- [ ] Not handling rate limits
- [ ] Missing error handling for retries
- [ ] Not verifying webhook signatures
- [ ] Not idempotent webhook processing
- [ ] Using HTTP instead of HTTPS
- [ ] Not logging errors
- [ ] Assuming APIs are always available
- [ ] Not handling timeout scenarios
- [ ] Storing credentials in workflow notes
- [ ] Not testing with real API responses
- [ ] Missing input validation
- [ ] Not monitoring error rates
- [ ] Assuming response format never changes
- [ ] Not handling concurrent requests

---

## Validation Before Going Live

- [ ] All credentials stored securely ✓
- [ ] All tests passing ✓
- [ ] Error handling working ✓
- [ ] Rate limiting implemented ✓
- [ ] Monitoring and alerts active ✓
- [ ] Documentation complete ✓
- [ ] Security review passed ✓
- [ ] Performance acceptable ✓
- [ ] Backups configured ✓
- [ ] Team trained ✓
- [ ] Runbooks created ✓
- [ ] On-call coverage arranged ✓

---

## Post-Launch (First 30 Days)

**Week 1:**
- [ ] Monitor 24/7
- [ ] Daily error log review
- [ ] Respond to any issues immediately
- [ ] Optimize based on real usage

**Week 2-4:**
- [ ] Monitor 2-3 times daily
- [ ] Review metrics trends
- [ ] Optimize performance
- [ ] Update documentation based on learnings
- [ ] Plan any improvements

**Day 30:**
- [ ] Retrospective/post-mortem
- [ ] Document lessons learned
- [ ] Update runbooks
- [ ] Plan improvements
- [ ] Move to normal monitoring schedule

---

## Support Resources

- **n8n Documentation:** https://docs.n8n.io
- **API Documentation:** Check specific API providers
- **n8n Community:** https://community.n8n.io
- **Slack Community:** n8n Slack workspace

---

**Version:** 1.0.0  
**Last Updated:** November 8, 2025  
**Status:** Production Ready  
**Estimated Implementation Time:** 2-4 weeks (varies by complexity)

