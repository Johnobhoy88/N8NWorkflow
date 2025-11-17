// n8n Workflow Builder v3.0 - k6 Load Test Configuration
// Production load testing scenarios

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://your-domain.com';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Custom metrics
const workflowGenerationTime = new Trend('workflow_generation_time');
const workflowSuccessRate = new Rate('workflow_success_rate');
const errorRate = new Rate('error_rate');
const apiCallsCounter = new Counter('api_calls_total');
const activeVUs = new Gauge('active_vus');

// Test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Smoke Test
    smoke_test: {
      executor: 'constant-vus',
      vus: 2,
      duration: '1m',
      tags: { scenario: 'smoke' },
      exec: 'smokeTest',
      startTime: '0s',
    },

    // Scenario 2: Load Test
    load_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },  // Ramp up to 10 VUs
        { duration: '5m', target: 10 },  // Stay at 10 VUs
        { duration: '2m', target: 20 },  // Ramp up to 20 VUs
        { duration: '5m', target: 20 },  // Stay at 20 VUs
        { duration: '2m', target: 0 },   // Ramp down to 0 VUs
      ],
      tags: { scenario: 'load' },
      exec: 'loadTest',
      startTime: '2m',
    },

    // Scenario 3: Stress Test
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 50 },   // Ramp up quickly
        { duration: '3m', target: 50 },   // Stay at 50 VUs
        { duration: '1m', target: 100 },  // Push to 100 VUs
        { duration: '3m', target: 100 },  // Stay at 100 VUs
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { scenario: 'stress' },
      exec: 'stressTest',
      startTime: '20m',
    },

    // Scenario 4: Spike Test
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 5 },    // Baseline
        { duration: '10s', target: 100 },  // Sudden spike
        { duration: '30s', target: 100 },  // Stay at spike
        { duration: '10s', target: 5 },    // Back to baseline
      ],
      tags: { scenario: 'spike' },
      exec: 'spikeTest',
      startTime: '35m',
    },

    // Scenario 5: Soak Test (Endurance)
    soak_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '60m',
      tags: { scenario: 'soak' },
      exec: 'soakTest',
      startTime: '40m',
    },
  },

  // Thresholds
  thresholds: {
    http_req_duration: [
      'p(95)<2000',  // 95% of requests must complete below 2s
      'p(99)<5000',  // 99% of requests must complete below 5s
    ],
    http_req_failed: ['rate<0.05'],  // Error rate must be below 5%
    workflow_success_rate: ['rate>0.95'],  // 95% success rate for workflows
    workflow_generation_time: [
      'p(95)<30000',  // 95% of workflows generated within 30s
      'avg<15000',    // Average generation time below 15s
    ],
  },

  // Tags
  tags: {
    environment: 'production',
    version: 'v3.0.0',
    test_run: new Date().toISOString(),
  },
};

// Helper functions
function generateWorkflowRequest() {
  const workflowTypes = [
    'API integration with data transformation',
    'Email automation with conditional logic',
    'Database sync with error handling',
    'Webhook processing with multiple outputs',
    'Scheduled report generation with email delivery',
  ];

  const priorities = ['High', 'Medium', 'Low'];
  const companies = ['Acme Corp', 'Tech Co', 'Data Inc', 'Auto Systems', 'Cloud Nine'];

  return {
    brief: randomItem(workflowTypes) + ' - ' + randomString(10),
    email: `loadtest-${randomString(8)}@example.com`,
    company: randomItem(companies),
    priority: randomItem(priorities),
    gdpr_consent: true,
    source: 'load-test',
    metadata: {
      test_id: randomString(16),
      timestamp: new Date().toISOString(),
    }
  };
}

function makeAPICall(endpoint, payload, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers: Object.assign({
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    }, headers),
    tags: { endpoint: endpoint },
    timeout: '60s',
  };

  apiCallsCounter.add(1);
  const response = http.post(url, JSON.stringify(payload), params);
  return response;
}

// Test Functions

export function smokeTest() {
  group('Smoke Test - Basic Functionality', () => {
    // Test health endpoint
    const healthCheck = http.get(`${BASE_URL}/health`);
    check(healthCheck, {
      'Health check status is 200': (r) => r.status === 200,
      'Health check response time < 500ms': (r) => r.timings.duration < 500,
    });

    // Test workflow generation
    const workflowRequest = generateWorkflowRequest();
    const startTime = new Date().getTime();
    const response = makeAPICall('/webhook/workflow-builder', workflowRequest);
    const generationTime = new Date().getTime() - startTime;

    workflowGenerationTime.add(generationTime);

    const success = check(response, {
      'Workflow generation status is 200': (r) => r.status === 200,
      'Response has workflow JSON': (r) => r.json() && r.json().workflowJson !== undefined,
      'No error in response': (r) => !r.json().error,
    });

    workflowSuccessRate.add(success);
    errorRate.add(!success);

    sleep(1);
  });
}

export function loadTest() {
  activeVUs.add(__VU);

  group('Load Test - Standard Operations', () => {
    // Simulate realistic user behavior
    const scenarios = [
      { weight: 0.4, action: 'generateSimpleWorkflow' },
      { weight: 0.3, action: 'generateComplexWorkflow' },
      { weight: 0.2, action: 'checkExistingWorkflow' },
      { weight: 0.1, action: 'healthCheck' },
    ];

    const random = Math.random();
    let cumulativeWeight = 0;

    for (const scenario of scenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        switch(scenario.action) {
          case 'generateSimpleWorkflow':
            generateSimpleWorkflow();
            break;
          case 'generateComplexWorkflow':
            generateComplexWorkflow();
            break;
          case 'checkExistingWorkflow':
            checkExistingWorkflow();
            break;
          case 'healthCheck':
            performHealthCheck();
            break;
        }
        break;
      }
    }

    sleep(randomItem([1, 2, 3, 5]));  // Varying think time
  });

  activeVUs.add(-__VU);
}

export function stressTest() {
  group('Stress Test - High Load', () => {
    // Rapid fire requests to stress the system
    for (let i = 0; i < 3; i++) {
      const workflowRequest = generateWorkflowRequest();
      workflowRequest.priority = 'High';  // All high priority
      workflowRequest.brief = 'Complex multi-step workflow with 50+ nodes and external API calls';

      const response = makeAPICall('/webhook/workflow-builder', workflowRequest);

      check(response, {
        'System responds under stress': (r) => r.status < 500,
        'Response time under stress < 10s': (r) => r.timings.duration < 10000,
      });
    }

    sleep(0.5);  // Minimal think time
  });
}

export function spikeTest() {
  group('Spike Test - Sudden Load', () => {
    // Simulate sudden burst of traffic
    const batchSize = 10;
    const requests = [];

    for (let i = 0; i < batchSize; i++) {
      requests.push(generateWorkflowRequest());
    }

    const responses = http.batch(
      requests.map(req => ['POST', `${BASE_URL}/webhook/workflow-builder`, JSON.stringify(req), {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        }
      }])
    );

    check(responses, {
      'All batch requests successful': (rs) => rs.every(r => r.status === 200),
    });

    sleep(0.1);
  });
}

export function soakTest() {
  group('Soak Test - Extended Duration', () => {
    // Steady load for extended period to detect memory leaks
    const workflowRequest = generateWorkflowRequest();
    const response = makeAPICall('/webhook/workflow-builder', workflowRequest);

    check(response, {
      'Sustained load response OK': (r) => r.status === 200,
      'No degradation over time': (r) => r.timings.duration < 3000,
    });

    // Check for memory/resource exhaustion indicators
    if (__ITER % 100 === 0) {
      const metricsCheck = http.get(`${BASE_URL}/metrics`);
      check(metricsCheck, {
        'Metrics endpoint responsive': (r) => r.status === 200,
      });
    }

    sleep(5);  // Steady pace
  });
}

// Helper test functions
function generateSimpleWorkflow() {
  const request = generateWorkflowRequest();
  request.brief = 'Simple 3-node workflow for data processing';

  const startTime = new Date().getTime();
  const response = makeAPICall('/webhook/workflow-builder', request);
  const generationTime = new Date().getTime() - startTime;

  workflowGenerationTime.add(generationTime);

  const success = check(response, {
    'Simple workflow generated': (r) => r.status === 200,
    'Simple workflow fast generation': (r) => r.timings.duration < 5000,
  });

  workflowSuccessRate.add(success);
  return response;
}

function generateComplexWorkflow() {
  const request = generateWorkflowRequest();
  request.brief = `
    Create a comprehensive workflow that:
    1. Monitors multiple APIs for data changes
    2. Processes and transforms the data
    3. Applies complex conditional logic
    4. Stores results in multiple databases
    5. Sends notifications via email, Slack, and SMS
    6. Includes error handling and retry logic
    7. Generates detailed reports
    8. Schedules follow-up tasks
  `;

  const startTime = new Date().getTime();
  const response = makeAPICall('/webhook/workflow-builder', request);
  const generationTime = new Date().getTime() - startTime;

  workflowGenerationTime.add(generationTime);

  const success = check(response, {
    'Complex workflow generated': (r) => r.status === 200,
    'Complex workflow reasonable time': (r) => r.timings.duration < 30000,
  });

  workflowSuccessRate.add(success);
  return response;
}

function checkExistingWorkflow() {
  // Simulate checking on a previously generated workflow
  const requestId = randomString(36);  // UUID format
  const response = http.get(`${BASE_URL}/workflow/${requestId}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  check(response, {
    'Workflow query responds': (r) => r.status === 200 || r.status === 404,
    'Query response fast': (r) => r.timings.duration < 1000,
  });

  return response;
}

function performHealthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  check(response, {
    'Health check OK': (r) => r.status === 200,
    'Health check fast': (r) => r.timings.duration < 200,
  });
  return response;
}

// Lifecycle hooks
export function setup() {
  console.log('Starting n8n Workflow Builder v3.0 Load Test');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test started: ${new Date().toISOString()}`);

  // Verify system is ready
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error('System health check failed. Aborting test.');
  }

  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
  };
}

export function teardown(data) {
  console.log('Load test completed');
  console.log(`Duration: ${new Date() - new Date(data.startTime)}ms`);
  console.log('Generating summary report...');
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/var/n8n/load-test-results.json': JSON.stringify(data),
    '/var/n8n/load-test-results.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  // Custom text summary implementation
  let summary = '\n=== n8n Workflow Builder Load Test Results ===\n\n';
  summary += `Test Duration: ${data.state.testRunDurationMs}ms\n`;
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Success Rate: ${(data.metrics.workflow_success_rate.values.rate * 100).toFixed(2)}%\n`;
  summary += `Error Rate: ${(data.metrics.error_rate.values.rate * 100).toFixed(2)}%\n`;
  summary += `Avg Generation Time: ${data.metrics.workflow_generation_time.values.avg.toFixed(0)}ms\n`;
  summary += '\n=== Thresholds ===\n';

  for (const [key, value] of Object.entries(data.metrics)) {
    if (value.thresholds) {
      summary += `${key}: ${value.thresholds.passes}/${value.thresholds.total} passed\n`;
    }
  }

  return summary;
}

function htmlReport(data) {
  // Generate HTML report
  return `<!DOCTYPE html>
<html>
<head>
    <title>n8n Load Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .metric { margin: 20px 0; padding: 10px; background: #f0f0f0; }
        .pass { color: green; }
        .fail { color: red; }
    </style>
</head>
<body>
    <h1>n8n Workflow Builder v3.0 - Load Test Results</h1>
    <div class="metric">
        <h2>Summary</h2>
        <p>Total Requests: ${data.metrics.http_reqs.values.count}</p>
        <p>Duration: ${data.state.testRunDurationMs}ms</p>
    </div>
    <!-- Add more metrics here -->
</body>
</html>`;
}