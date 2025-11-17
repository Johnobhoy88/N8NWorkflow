# Workflow Builder QA Test Suite

Comprehensive integration testing suite for the n8n Workflow Builder with Gemini AI. This test suite provides complete coverage of all critical paths, error cases, security vulnerabilities, and performance benchmarks.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Load Testing](#load-testing)
- [Test Structure](#test-structure)
- [Contributing](#contributing)

## Overview

This test suite validates the n8n Workflow Builder workflow that:
1. Accepts workflow requests via Email (Gmail) or Web Form
2. Normalizes and validates input data
3. Uses Gemini AI to parse requirements, architect, and synthesize workflows
4. Performs QA validation on generated workflows
5. Delivers completed workflows via email

## Features

✅ **Comprehensive Test Coverage**
- Unit tests for individual components
- Integration tests for workflow execution
- End-to-end tests for complete user journeys
- Security tests for vulnerability assessment
- Performance tests for optimization
- Load tests for scalability validation

✅ **Test Types**
- Happy path validation (Email & Form triggers)
- Error handling (Invalid inputs, API failures)
- Edge cases (Long inputs, special characters, rate limiting)
- Security tests (XSS, SQL injection, credential exposure)
- Performance tests (Concurrent requests, large payloads)
- Load tests (Stress, spike, endurance testing)

✅ **Quality Metrics**
- 80%+ code coverage threshold
- Automated CI/CD pipeline
- Test result reporting
- Coverage badges
- Performance benchmarks

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- k6 (for load testing)
- Access to n8n instance
- Gemini API key

### Install Dependencies

```bash
cd testing/workflow-builder-qa
npm install
```

### Install k6 (for load testing)

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
GEMINI_API_KEY=your_gemini_api_key
N8N_WEBHOOK_URL=http://localhost:5678/webhook/workflow-builder
TEST_EMAIL=test@example.com
```

3. Update test configuration in `jest.config.js` if needed.

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites

**Unit Tests:**
```bash
npm run test:unit
```

**Integration Tests:**
```bash
npm run test:integration
```

**End-to-End Tests:**
```bash
npm run test:e2e
```

**Security Tests:**
```bash
npm run test:security
```

**Performance Tests:**
```bash
npm run test:performance
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run coverage
npm run coverage:view  # Opens HTML report in browser
```

## Load Testing

### Standard Load Test
```bash
npm run test:load
```

### Stress Test
```bash
npm run test:load:stress
```

### Custom k6 Tests
```bash
k6 run load-tests/load-test.js
k6 run load-tests/stress-test.js
k6 run load-tests/spike-test.js
```

### Load Test Configuration

The load tests include:

**Load Test** (load-test.js):
- Ramps up to 50 concurrent users
- Maintains steady load
- Validates 95% of requests complete in <5s

**Stress Test** (stress-test.js):
- Pushes system to 300+ concurrent users
- Identifies breaking points
- Validates degradation patterns

**Spike Test** (spike-test.js):
- Sudden traffic spikes (10 → 200 users in 30s)
- Tests auto-scaling and recovery
- Validates queue handling

## Test Coverage

Current test coverage includes:

### Happy Path Tests
- ✅ Valid email trigger with detailed brief
- ✅ Valid form submission
- ✅ Email with signature removal
- ✅ Complex workflow requests
- ✅ End-to-end workflow execution

### Error Cases
- ✅ Empty brief validation
- ✅ Invalid email format
- ✅ Short briefs (< 10 chars)
- ✅ Gemini API failures (rate limit, invalid key, server errors)
- ✅ Malformed API responses
- ✅ Network timeouts

### Edge Cases
- ✅ Very long briefs (> 5000 chars)
- ✅ Special characters and Unicode
- ✅ Multiple whitespace normalization
- ✅ Minimal valid inputs
- ✅ Very long email addresses

### Security Tests
- ✅ SQL injection prevention
- ✅ XSS attack prevention
- ✅ Command injection prevention
- ✅ Environment variable leak protection
- ✅ Credential exposure checks
- ✅ Input sanitization
- ✅ Output encoding
- ✅ Rate limiting

### Performance Tests
- ✅ Response time validation
- ✅ Concurrent request handling
- ✅ Large payload processing
- ✅ Memory efficiency
- ✅ API call optimization

## Test Structure

```
testing/workflow-builder-qa/
├── tests/
│   ├── setup.js                          # Test configuration
│   ├── integration/
│   │   └── workflow-builder.test.js      # Main integration tests
│   ├── e2e/
│   │   └── workflow-execution.test.js    # End-to-end tests
│   └── security/
│       └── security-validation.test.js   # Security tests
├── fixtures/
│   ├── email-trigger-data.json           # Email test data
│   └── form-trigger-data.json            # Form test data
├── mocks/
│   └── gemini-responses.json             # Mock API responses
├── load-tests/
│   ├── load-test.js                      # Standard load test
│   ├── stress-test.js                    # Stress test
│   └── spike-test.js                     # Spike test
├── reports/                              # Test reports (auto-generated)
├── coverage/                             # Coverage reports (auto-generated)
├── package.json                          # Dependencies and scripts
├── jest.config.js                        # Jest configuration
├── .env.example                          # Environment template
└── README.md                             # This file
```

## CI/CD Integration

### GitHub Actions

The test suite includes a comprehensive GitHub Actions workflow:

**Triggered on:**
- Push to main/develop branches
- Pull requests
- Daily schedule (2 AM UTC)
- Manual workflow dispatch

**Test Jobs:**
1. Unit Tests
2. Integration Tests
3. End-to-End Tests
4. Security Tests
5. Performance Tests
6. Load Tests (scheduled only)
7. Coverage Report
8. Test Summary

### Setup GitHub Secrets

Add these secrets to your GitHub repository:

```
GEMINI_API_KEY: Your Gemini API key
N8N_WEBHOOK_URL: Your n8n webhook URL
```

### CI Configuration

```yaml
# .github/workflows/test-suite.yml
name: Workflow Builder QA Test Suite
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
```

## Test Results & Reporting

### JUnit XML Reports
Located in `reports/junit.xml` for CI/CD integration.

### HTML Coverage Reports
Located in `coverage/lcov-report/index.html` after running coverage.

### k6 Load Test Reports
JSON output with metrics:
- Response times (p50, p95, p99)
- Error rates
- Request throughput
- Custom metrics

## Best Practices

### Writing Tests

1. **Use descriptive test names:**
```javascript
test('should reject empty brief from form', async () => {
  // Test implementation
});
```

2. **Use fixtures for test data:**
```javascript
const formData = formFixtures.valid_form_submission;
```

3. **Mock external dependencies:**
```javascript
nock('https://generativelanguage.googleapis.com')
  .post(/generateContent/)
  .reply(200, geminiMocks.brief_parser_success);
```

4. **Assert meaningful expectations:**
```javascript
expect(result.error).toBe(false);
expect(result.clientEmail).toBe('test@example.com');
```

### Running Tests Locally

1. Start your n8n instance
2. Activate the workflow
3. Configure environment variables
4. Run tests: `npm test`

### Debugging Tests

**Run specific test:**
```bash
npx jest -t "should process valid email trigger"
```

**Run with verbose output:**
```bash
npm test -- --verbose
```

**Run in debug mode:**
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Threshold |
|--------|--------|-----------|
| Response Time (p95) | < 3s | < 5s |
| Workflow Generation (p95) | < 20s | < 30s |
| Error Rate | < 1% | < 10% |
| Concurrent Users | 50 | 100 |
| Throughput | 10 req/s | 5 req/s |

## Security Checklist

- ✅ No hardcoded credentials
- ✅ Environment variables for secrets
- ✅ OAuth2 for Gmail authentication
- ✅ Input validation and sanitization
- ✅ Output encoding
- ✅ Error message sanitization
- ✅ Rate limiting support
- ✅ HTTPS for all external calls
- ✅ No eval() or unsafe code execution
- ✅ SQL/NoSQL injection prevention

## Troubleshooting

### Tests Failing

**Check environment variables:**
```bash
cat .env
```

**Verify n8n is running:**
```bash
curl http://localhost:5678/webhook/workflow-builder
```

**Check Gemini API key:**
```bash
echo $GEMINI_API_KEY
```

### Load Tests Timing Out

- Reduce concurrent users in k6 config
- Increase timeout thresholds
- Check n8n server resources

### Coverage Below Threshold

```bash
npm run coverage
# Review uncovered lines in coverage/lcov-report/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Open a GitHub issue
- Contact: qa-team@example.com
- Documentation: [Link to docs]

## Changelog

### v1.0.0 (2025-11-17)
- Initial release
- Comprehensive test coverage
- CI/CD integration
- Load testing suite
- Security validation
