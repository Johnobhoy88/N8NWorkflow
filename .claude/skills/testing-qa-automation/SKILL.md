---
name: Testing & QA Automation Expert
description: Specialist in testing automation workflows, implementing test frameworks, validation strategies, and quality assurance. Use for workflow testing, QA, validation, and ensuring production readiness.
---

# Testing & QA Automation Expert Skill

You are an expert in testing automation workflows, implementing comprehensive test strategies, and ensuring production quality.

## Testing Framework

### 1. Test Pyramid for Automation

```
                    ┌─────────────┐
                    │   E2E Tests │  ← 10%
                    │  (Manual +  │
                    │  Automated) │
                    └─────────────┘
                  ┌───────────────────┐
                  │ Integration Tests │  ← 30%
                  │  (API, Workflow)  │
                  └───────────────────┘
              ┌─────────────────────────────┐
              │      Unit Tests             │  ← 60%
              │ (Functions, Transformations)│
              └─────────────────────────────┘

Unit Tests: Test individual functions, expressions, transformations
Integration Tests: Test node combinations, API integrations, data flow
E2E Tests: Test complete workflows end-to-end with real data
```

### 2. Test Data Management

**Test Data Categories:**
```javascript
const testData = {
  // Happy path - normal, expected inputs
  happy: {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      status: 'active'
    }
  },

  // Edge cases - boundary conditions
  edge: {
    emptyStrings: { name: '', email: '', age: 0 },
    maxLengths: { name: 'A'.repeat(255), email: 'long@example.com' },
    minValues: { age: 0, quantity: 1 },
    maxValues: { age: 150, quantity: 999999 },
    specialChars: { name: 'O\'Brien', email: 'test+tag@example.com' },
    unicode: { name: '日本語', email: 'user@例え.jp' }
  },

  // Invalid data - should trigger validation errors
  invalid: {
    missingRequired: { email: 'test@example.com' }, // missing name
    invalidEmail: { name: 'John', email: 'not-an-email' },
    negativeAge: { name: 'John', email: 'john@example.com', age: -5 },
    wrongTypes: { name: 123, email: true, age: '30' }
  },

  // Null/undefined handling
  nulls: {
    nullName: { name: null, email: 'test@example.com' },
    undefinedFields: { name: undefined },
    empty: {}
  }
};
```

### 3. Testing Checklist

**Pre-Production Testing:**
```
☐ Unit Tests
  ☐ All expressions validated
  ☐ All transformations tested
  ☐ Edge cases handled
  ☐ Error scenarios covered

☐ Integration Tests
  ☐ API calls successful
  ☐ Database operations work
  ☐ External services integrate
  ☐ Authentication working

☐ Workflow Tests
  ☐ Happy path completes
  ☐ Error handling triggers
  ☐ Retry logic works
  ☐ Branching logic correct
  ☐ Loops terminate

☐ Data Validation
  ☐ Input validation works
  ☐ Output format correct
  ☐ Data transformations accurate
  ☐ No data loss

☐ Performance Tests
  ☐ Acceptable response times
  ☐ Batch processing efficient
  ☐ Memory usage acceptable
  ☐ No infinite loops

☐ Security Tests
  ☐ Authentication required
  ☐ Authorization enforced
  ☐ Input sanitized
  ☐ Secrets not exposed
  ☐ Audit logging works

☐ Error Handling
  ☐ All errors caught
  ☐ Error messages helpful
  ☐ Fallbacks work
  ☐ Notifications sent
  ☐ Recovery possible

☐ Integration Points
  ☐ Webhooks verified
  ☐ API rate limits respected
  ☐ Timeouts configured
  ☐ Retries implemented

☐ Documentation
  ☐ Workflow documented
  ☐ Node purposes clear
  ☐ Error scenarios listed
  ☐ Runbook created
```

### 4. Test Cases Template

```markdown
# Test Case: [Workflow Name] - [Scenario]

## Test ID: TC-001
## Priority: High/Medium/Low
## Type: Unit/Integration/E2E

## Preconditions:
- Environment variables set
- Test database populated
- External APIs mocked/available

## Test Steps:
1. Trigger workflow with test data
2. Verify step 1 completes
3. Check intermediate data
4. Verify final output

## Test Data:
```json
{
  "input": {
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

## Expected Result:
```json
{
  "success": true,
  "userId": "12345",
  "status": "created"
}
```

## Actual Result:
[To be filled during execution]

## Status: Pass/Fail
## Notes:
```

### 5. Validation Patterns

**Input Validation:**
```javascript
function validateWorkflowInput(data) {
  const errors = [];

  // Required fields
  const required = ['name', 'email', 'userId'];
  for (const field of required) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Email format
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  // Phone format (if provided)
  if (data.phone && !/^\+?1?\d{10,15}$/.test(data.phone.replace(/\D/g, ''))) {
    errors.push('Invalid phone format');
  }

  // Age range
  if (data.age !== undefined) {
    if (typeof data.age !== 'number' || data.age < 0 || data.age > 150) {
      errors.push('Age must be between 0 and 150');
    }
  }

  // String length limits
  if (data.description && data.description.length > 1000) {
    errors.push('Description too long (max 1000 characters)');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Test the validator
try {
  validateWorkflowInput(testData.happy.user);
  console.log('✅ Validation passed');
} catch (error) {
  console.log('❌ Validation failed:', error.message);
}
```

**Output Validation:**
```javascript
function validateWorkflowOutput(output, schema) {
  const errors = [];

  // Check required fields exist
  for (const field of schema.required || []) {
    if (!(field in output)) {
      errors.push(`Missing required output field: ${field}`);
    }
  }

  // Check field types
  for (const [field, expectedType] of Object.entries(schema.types || {})) {
    if (field in output) {
      const actualType = typeof output[field];
      if (actualType !== expectedType) {
        errors.push(`${field} should be ${expectedType}, got ${actualType}`);
      }
    }
  }

  // Check field formats
  for (const [field, pattern] of Object.entries(schema.formats || {})) {
    if (field in output && !pattern.test(output[field])) {
      errors.push(`${field} format invalid`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Output validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Usage
const outputSchema = {
  required: ['userId', 'status'],
  types: {
    userId: 'string',
    status: 'string',
    createdAt: 'string'
  },
  formats: {
    userId: /^[a-zA-Z0-9_-]+$/,
    status: /^(active|pending|inactive)$/
  }
};

validateWorkflowOutput(workflowResult, outputSchema);
```

### 6. Mock Data Generators

```javascript
// Generate realistic test data
class TestDataGenerator {
  static randomEmail() {
    const names = ['john', 'jane', 'bob', 'alice', 'charlie'];
    const domains = ['example.com', 'test.com', 'demo.com'];
    return `${names[Math.floor(Math.random() * names.length)]}${Date.now()}@${domains[Math.floor(Math.random() * domains.length)]}`;
  }

  static randomPhone() {
    return `555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  }

  static randomDate(startYear = 2020, endYear = 2025) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  static generateUser(overrides = {}) {
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Test User ${Math.floor(Math.random() * 1000)}`,
      email: this.randomEmail(),
      phone: this.randomPhone(),
      age: Math.floor(Math.random() * 60) + 18,
      status: 'active',
      createdAt: this.randomDate().toISOString(),
      ...overrides
    };
  }

  static generateBatch(count = 10, generator = this.generateUser) {
    return Array.from({ length: count }, () => generator());
  }
}

// Usage
const testUsers = TestDataGenerator.generateBatch(100);
const specificUser = TestDataGenerator.generateUser({ age: 25, status: 'pending' });
```

### 7. Performance Testing

**Load Testing Pattern:**
```javascript
async function loadTest(workflow, config) {
  const {
    concurrentUsers = 10,
    requestsPerUser = 100,
    rampUpSeconds = 10
  } = config;

  const results = {
    totalRequests: 0,
    successful: 0,
    failed: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimes: []
  };

  // Ramp up users gradually
  const userDelay = (rampUpSeconds * 1000) / concurrentUsers;

  const userPromises = [];
  for (let u = 0; u < concurrentUsers; u++) {
    await new Promise(resolve => setTimeout(resolve, userDelay));

    const userPromise = (async () => {
      for (let r = 0; r < requestsPerUser; r++) {
        const startTime = Date.now();

        try {
          await workflow.execute();
          const responseTime = Date.now() - startTime;

          results.successful++;
          results.responseTimes.push(responseTime);
          results.minResponseTime = Math.min(results.minResponseTime, responseTime);
          results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
        } catch (error) {
          results.failed++;
        }

        results.totalRequests++;
      }
    })();

    userPromises.push(userPromise);
  }

  await Promise.all(userPromises);

  // Calculate statistics
  results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  results.p50 = calculatePercentile(results.responseTimes, 50);
  results.p95 = calculatePercentile(results.responseTimes, 95);
  results.p99 = calculatePercentile(results.responseTimes, 99);

  return results;
}

function calculatePercentile(arr, percentile) {
  const sorted = arr.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}
```

### 8. Test Automation

**Automated Test Execution:**
```javascript
// Test runner for n8n workflows
class WorkflowTestRunner {
  constructor(workflow) {
    this.workflow = workflow;
    this.results = [];
  }

  async runTest(testCase) {
    const result = {
      testId: testCase.id,
      name: testCase.name,
      status: 'pending',
      startTime: new Date(),
      error: null,
      output: null
    };

    try {
      // Execute workflow with test data
      const output = await this.workflow.execute(testCase.input);

      // Validate output
      testCase.validate(output);

      result.status = 'passed';
      result.output = output;
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime - result.startTime;
    }

    this.results.push(result);
    return result;
  }

  async runAllTests(testCases) {
    for (const testCase of testCases) {
      await this.runTest(testCase);
    }

    return this.getReport();
  }

  getReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    return {
      summary: {
        total,
        passed,
        failed,
        passRate: `${((passed / total) * 100).toFixed(1)}%`
      },
      results: this.results
    };
  }
}
```

## Best Practices

### ✅ DO

1. **Test early and often**
2. **Use real test data** (anonymized production data)
3. **Test edge cases** and error scenarios
4. **Automate regression tests**
5. **Test with different data volumes**
6. **Validate both inputs and outputs**
7. **Monitor test execution times**
8. **Document test cases**
9. **Test integrations** with external services
10. **Review test coverage** regularly

### ❌ DON'T

1. **Don't skip testing** ("it works on my machine")
2. **Don't test only happy paths**
3. **Don't ignore performance** implications
4. **Don't use production data** without anonymization
5. **Don't test in production** first
6. **Don't skip edge cases**
7. **Don't ignore flaky tests**
8. **Don't test without assertions**
9. **Don't forget to clean up** test data
10. **Don't deploy without testing**

## When to Use This Skill

Invoke when:
- Testing new workflows before deployment
- Creating test suites for workflows
- Validating data transformations
- Performing load/performance testing
- Setting up continuous testing
- Debugging workflow failures
- Ensuring production readiness
- Creating test automation frameworks
- Validating integrations
- Conducting QA reviews

---

*Follows testing best practices with 70-90% error reduction through comprehensive testing.*
