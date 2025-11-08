# Workflow Testing Framework

**Complete testing suite for n8n workflows**

---

## Test Types

### 1. Unit Tests (Node-level)
### 2. Integration Tests (Workflow-level)
### 3. End-to-End Tests (System-level)
### 4. Load Tests (Performance)

---

## Unit Testing Framework

**Test Individual Nodes:**

```javascript
// test/units/transform-data.test.js
const { expect } = require('chai');

describe('Transform Data Node', () => {
  it('should correctly transform Salesforce data to PostgreSQL format', () => {
    const input = {
      Id: 'SF001',
      FirstName: 'John',
      LastName: 'Doe',
      Email: 'john@example.com'
    };

    const expected = {
      salesforce_id: 'SF001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com'
    };

    const result = transformSalesforceData(input);

    expect(result).to.deep.equal(expected);
  });

  it('should handle missing fields gracefully', () => {
    const input = {
      Id: 'SF002',
      FirstName: 'Jane'
      // Missing LastName and Email
    };

    const result = transformSalesforceData(input);

    expect(result.first_name).to.equal('Jane');
    expect(result.last_name).to.be.null;
    expect(result.email).to.be.null;
  });

  it('should reject invalid email addresses', () => {
    const input = {
      Id: 'SF003',
      Email: 'invalid-email'
    };

    expect(() => transformSalesforceData(input)).to.throw('Invalid email format');
  });
});

// Transform function
function transformSalesforceData(data) {
  if (data.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
    throw new Error('Invalid email format');
  }

  return {
    salesforce_id: data.Id,
    first_name: data.FirstName || null,
    last_name: data.LastName || null,
    email: data.Email || null,
    synced_at: new Date().toISOString()
  };
}
```

---

## Integration Testing

**Test Complete Workflows:**

```javascript
// test/integration/salesforce-sync.test.js
const n8n = require('n8n');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Salesforce to PostgreSQL Sync Workflow', () => {
  let workflow;
  let salesforceStub;
  let databaseStub;

  beforeEach(() => {
    // Load workflow
    workflow = n8n.loadWorkflow('01-salesforce-to-postgres');

    // Stub external services
    salesforceStub = sinon.stub().resolves({
      data: [
        {Id: 'SF001', FirstName: 'John', LastName: 'Doe', Email: 'john@example.com'},
        {Id: 'SF002', FirstName: 'Jane', LastName: 'Smith', Email: 'jane@example.com'}
      ]
    });

    databaseStub = sinon.stub().resolves({rowCount: 2});

    workflow.setStubs({
      salesforce: salesforceStub,
      database: databaseStub
    });
  });

  it('should successfully sync contacts from Salesforce to PostgreSQL', async () => {
    const result = await workflow.execute();

    expect(result.success).to.be.true;
    expect(result.recordsProcessed).to.equal(2);
    expect(salesforceStub.calledOnce).to.be.true;
    expect(databaseStub.calledTwice).to.be.true; // Once per record
  });

  it('should handle API errors with retry logic', async () => {
    salesforceStub.onFirstCall().rejects(new Error('API timeout'));
    salesforceStub.onSecondCall().resolves({data: []});

    const result = await workflow.execute();

    expect(result.success).to.be.true;
    expect(salesforceStub.callCount).to.equal(2); // Retry once
  });

  it('should rollback on database failure', async () => {
    databaseStub.rejects(new Error('Database connection failed'));

    const result = await workflow.execute();

    expect(result.success).to.be.false;
    expect(result.error).to.include('Database connection failed');
    expect(databaseStub.calledOnce).to.be.true; // No retries for DB errors
  });

  it('should send notification on completion', async () => {
    const notificationStub = sinon.stub().resolves();
    workflow.setStubs({notification: notificationStub});

    await workflow.execute();

    expect(notificationStub.calledOnce).to.be.true;
    expect(notificationStub.firstCall.args[0]).to.include('Records synced: 2');
  });
});
```

---

## End-to-End Testing

**Test Complete System:**

```javascript
// test/e2e/customer-onboarding.test.js
const request = require('supertest');
const { expect } = require('chai');

describe('Customer Onboarding E2E', () => {
  const n8nWebhookUrl = 'http://localhost:5678/webhook/customer-onboarding';

  it('should complete full customer onboarding flow', async () => {
    // 1. Submit form
    const formData = {
      name: 'Test Customer',
      email: 'test@example.com',
      company: 'Test Corp',
      plan: 'pro'
    };

    const response = await request(n8nWebhookUrl)
      .post('/')
      .send(formData)
      .expect(200);

    expect(response.body.status).to.equal('success');
    const customerId = response.body.customer_id;

    // 2. Verify CRM record created
    const crmRecord = await getCRMRecord(customerId);
    expect(crmRecord.email).to.equal('test@example.com');
    expect(crmRecord.plan).to.equal('pro');

    // 3. Verify welcome email sent
    await wait(5000); // Wait for async email
    const emails = await getTestEmails('test@example.com');
    expect(emails).to.have.lengthOf(1);
    expect(emails[0].subject).to.include('Welcome');

    // 4. Verify accounts created
    const accounts = await getCustomerAccounts(customerId);
    expect(accounts.stripe).to.exist;
    expect(accounts.support).to.exist;

    // 5. Verify onboarding tasks created
    const tasks = await getOnboardingTasks(customerId);
    expect(tasks).to.have.lengthOf.at.least(3);
    expect(tasks[0].title).to.include('Complete profile');
  });

  it('should handle duplicate email gracefully', async () => {
    const formData = {
      name: 'Duplicate User',
      email: 'existing@example.com' // Already exists
    };

    const response = await request(n8nWebhookUrl)
      .post('/')
      .send(formData)
      .expect(409); // Conflict

    expect(response.body.error).to.include('Email already exists');
  });
});
```

---

## Load Testing

**Test Performance Under Load:**

```javascript
// test/load/api-endpoint.load.js
const autocannon = require('autocannon');

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:5678/webhook/high-traffic',
    connections: 100, // Concurrent connections
    duration: 60, // 60 seconds
    pipelining: 1,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.TEST_API_KEY
    },
    body: JSON.stringify({
      event: 'test',
      data: {test: 'data'}
    })
  });

  console.log(`
    Load Test Results:
    ==================
    Requests: ${result.requests.total}
    Duration: ${result.duration}s
    Throughput: ${result.throughput.mean} req/sec
    Latency:
      - Mean: ${result.latency.mean}ms
      - p95: ${result.latency.p95}ms
      - p99: ${result.latency.p99}ms
    Errors: ${result.errors}
    Timeouts: ${result.timeouts}

    Success Rate: ${((result.requests.total - result.errors) / result.requests.total * 100).toFixed(2)}%
  `);

  // Assertions
  if (result.throughput.mean < 50) {
    throw new Error('Throughput below acceptable threshold');
  }

  if (result.latency.p95 > 1000) {
    throw new Error('p95 latency above 1 second');
  }

  if (result.errors / result.requests.total > 0.01) {
    throw new Error('Error rate above 1%');
  }
}

runLoadTest();
```

---

## Test Data Generators

```javascript
// test/helpers/generators.js
const faker = require('@faker-js/faker');

class TestDataGenerator {
  static generateCustomer(overrides = {}) {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      company: faker.company.name(),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode()
      },
      ...overrides
    };
  }

  static generateOrder(customerOrId, overrides = {}) {
    return {
      customer_id: typeof customerOrId === 'string' ? customerOrId : customerOrId.id,
      order_number: `ORD-${faker.string.alphanumeric(10)}`,
      items: this.generateOrderItems(),
      total: faker.number.float({min: 10, max: 1000, precision: 0.01}),
      status: 'pending',
      created_at: faker.date.recent(),
      ...overrides
    };
  }

  static generateOrderItems(count = 3) {
    return Array.from({length: count}, () => ({
      product_id: faker.string.uuid(),
      name: faker.commerce.productName(),
      quantity: faker.number.int({min: 1, max: 5}),
      price: faker.number.float({min: 10, max: 500, precision: 0.01})
    }));
  }

  static generateWebhookEvent(type, overrides = {}) {
    const events = {
      'user.created': {
        event: 'user.created',
        data: this.generateCustomer()
      },
      'order.placed': {
        event: 'order.placed',
        data: this.generateOrder('cus_123')
      },
      'payment.succeeded': {
        event: 'payment.succeeded',
        data: {
          payment_id: faker.string.uuid(),
          amount: faker.number.float({min: 10, max: 1000, precision: 0.01}),
          currency: 'USD',
          status: 'succeeded'
        }
      }
    };

    return {
      ...events[type],
      timestamp: Date.now(),
      ...overrides
    };
  }

  static generateBulkData(generator, count = 100) {
    return Array.from({length: count}, () => generator());
  }
}

module.exports = TestDataGenerator;
```

---

## Continuous Integration

**GitHub Actions Workflow:**

```yaml
# .github/workflows/test-workflows.yml
name: Test n8n Workflows

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          N8N_WEBHOOK_URL: http://localhost:5678

      - name: Run load tests
        run: npm run test:load

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/

      - name: Publish test coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Test Runner Script

```javascript
// test/run-tests.js
const Mocha = require('mocha');
const glob = require('glob');

async function runTests() {
  const mocha = new Mocha({
    timeout: 10000,
    reporter: 'spec',
    slow: 1000
  });

  // Load all test files
  const testFiles = glob.sync('test/**/*.test.js');
  testFiles.forEach(file => mocha.addFile(file));

  // Run tests
  const runner = mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
  });

  // Handle test events
  runner.on('pass', test => {
    console.log(`✓ ${test.title}`);
  });

  runner.on('fail', (test, err) => {
    console.log(`✗ ${test.title}`);
    console.error(err.message);
  });
}

runTests();
```

---

## Test Utilities

```javascript
// test/helpers/utils.js
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      await wait(delay * Math.pow(2, attempt));
    }
  }
};

const cleanupDatabase = async (db) => {
  await db.query('TRUNCATE TABLE orders CASCADE');
  await db.query('TRUNCATE TABLE customers CASCADE');
  await db.query('TRUNCATE TABLE sync_metadata CASCADE');
};

const mockWebhook = (url, data) => {
  return request(url)
    .post('/')
    .set('X-Webhook-Signature', generateSignature(data))
    .send(data);
};

module.exports = {wait, retry, cleanupDatabase, mockWebhook};
```

---

**Complete testing framework with:**
- ✅ Unit tests for individual functions
- ✅ Integration tests for workflows
- ✅ E2E tests for complete systems
- ✅ Load tests for performance
- ✅ Test data generators
- ✅ CI/CD integration
- ✅ Test utilities and helpers
