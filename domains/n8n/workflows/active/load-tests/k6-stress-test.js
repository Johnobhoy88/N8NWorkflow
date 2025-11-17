/**
 * k6 Load Test: Peak Load Stress Test
 *
 * Purpose: Identify breaking points and bottlenecks
 * Duration: 20 minutes
 * Peak Load: 50 concurrent users
 * Goal: Find system limits and degradation points
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const apiErrors = new Counter('api_errors');
const timeoutErrors = new Counter('timeout_errors');

export const options = {
  stages: [
    { duration: '5m', target: 10 },   // Stage 1: Warm-up
    { duration: '5m', target: 25 },   // Stage 2: Ramp to 25 users
    { duration: '5m', target: 50 },   // Stage 3: Ramp to 50 users (PEAK)
    { duration: '3m', target: 50 },   // Stage 4: Sustain peak load
    { duration: '2m', target: 0 },    // Stage 5: Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<15000'],      // 95% under 15s (degraded acceptable)
    http_req_failed: ['rate<0.1'],           // Less than 10% failures (stress tolerance)
    errors: ['rate<0.15'],                   // Less than 15% errors
    success: ['rate>0.85'],                  // At least 85% success
  },
};

const BASE_URL = __ENV.N8N_URL || 'https://your-n8n-instance.com';
const FORM_PATH = '/form/workflow-builder';

// Diverse test data to prevent excessive caching
const briefTemplates = [
  'Create a workflow that syncs {source} to {destination}',
  'Build an automation that monitors {source} and alerts via {destination}',
  'Design a workflow that processes {source} data and saves to {destination}',
  'Create a scheduled job that extracts from {source} and loads to {destination}',
  'Build a webhook receiver that transforms {source} data for {destination}',
];

const sources = ['HubSpot', 'Salesforce', 'Google Sheets', 'Airtable', 'PostgreSQL', 'MongoDB', 'Stripe', 'Shopify'];
const destinations = ['Slack', 'Discord', 'Email', 'SMS', 'Database', 'Spreadsheet', 'API', 'Webhook'];

function generateBrief() {
  const template = briefTemplates[Math.floor(Math.random() * briefTemplates.length)];
  const source = sources[Math.floor(Math.random() * sources.length)];
  const destination = destinations[Math.floor(Math.random() * destinations.length)];

  return template.replace('{source}', source).replace('{destination}', destination);
}

export default function () {
  const brief = generateBrief();

  const payload = JSON.stringify({
    'Client Brief': brief,
    'Your Email': `stress-test-${__VU}-${__ITER}@example.com`
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '60s', // Longer timeout for stress test
  };

  const startTime = new Date();
  const response = http.post(`${BASE_URL}${FORM_PATH}`, payload, params);
  const duration = new Date() - startTime;

  // Detailed error categorization
  const isSuccess = response.status === 200 && !response.body.includes('error');
  const isTimeout = response.status === 0;
  const isServerError = response.status >= 500;
  const isClientError = response.status >= 400 && response.status < 500;

  // Record metrics
  successRate.add(isSuccess ? 1 : 0);
  errorRate.add(isSuccess ? 0 : 1);

  if (isTimeout) timeoutErrors.add(1);
  if (isServerError || isClientError) apiErrors.add(1);

  // Comprehensive checks
  const checks = check(response, {
    'status is 200': (r) => r.status === 200,
    'no timeout': (r) => r.status !== 0,
    'no server error': (r) => r.status < 500,
    'response time acceptable': (r) => duration < 20000,
    'contains workflow': (r) => r.body && r.body.includes('workflow'),
  });

  // Log failures and slow requests
  if (!isSuccess) {
    console.error(`[VU ${__VU}] FAILURE - Status: ${response.status}, Duration: ${duration}ms`);
  } else if (duration > 15000) {
    console.warn(`[VU ${__VU}] SLOW - Duration: ${duration}ms`);
  }

  // Adaptive sleep based on load stage
  const currentStage = Math.floor(__ENV.STAGE || 0);
  const sleepTime = currentStage < 3 ? 5 : 2; // Faster requests during peak load
  sleep(sleepTime);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const failedRequests = data.metrics.http_req_failed.values.count;
  const successRateValue = data.metrics.success.values.rate;
  const errorRateValue = data.metrics.errors.values.rate;

  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const max = data.metrics.http_req_duration.values.max;

  const report = `
╔════════════════════════════════════════════════════════════════╗
║         Workflow Builder - Stress Test Results                 ║
╚════════════════════════════════════════════════════════════════╝

🔥 STRESS TEST SUMMARY
  Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes
  Total Requests: ${totalRequests}
  Successful: ${(successRateValue * totalRequests).toFixed(0)} (${(successRateValue * 100).toFixed(2)}%)
  Failed: ${failedRequests} (${(errorRateValue * 100).toFixed(2)}%)

📊 PERFORMANCE UNDER LOAD
  Response Time (all requests):
    - Average: ${data.metrics.http_req_duration.values.avg.toFixed(0)}ms
    - Median (P50): ${data.metrics.http_req_duration.values.med.toFixed(0)}ms
    - P95: ${p95.toFixed(0)}ms ${p95 < 15000 ? '✅' : '❌'}
    - P99: ${p99.toFixed(0)}ms
    - Max: ${max.toFixed(0)}ms

  Request Rate:
    - Average: ${(totalRequests / (data.state.testRunDurationMs / 1000)).toFixed(2)} req/s
    - Peak (estimated): ${(50 / 2).toFixed(2)} req/s (50 users, 2s interval)

⚠️  ERROR ANALYSIS
  Total Errors: ${(errorRateValue * totalRequests).toFixed(0)}
  Error Breakdown:
    - Timeouts: ${data.metrics.timeout_errors.values.count}
    - API Errors: ${data.metrics.api_errors.values.count}
    - Other: ${(errorRateValue * totalRequests - data.metrics.timeout_errors.values.count - data.metrics.api_errors.values.count).toFixed(0)}

  Error Rate by Stage:
    - 0-10 users: Baseline (expected <1%)
    - 10-25 users: Moderate load (expected <3%)
    - 25-50 users: Peak load (expected <10%)

🎯 THRESHOLD VALIDATION
  Success Rate > 85%: ${successRateValue > 0.85 ? '✅ PASS' : '❌ FAIL'} (${(successRateValue * 100).toFixed(2)}%)
  Error Rate < 15%: ${errorRateValue < 0.15 ? '✅ PASS' : '❌ FAIL'} (${(errorRateValue * 100).toFixed(2)}%)
  P95 < 15s: ${p95 < 15000 ? '✅ PASS' : '❌ FAIL'} (${(p95 / 1000).toFixed(2)}s)
  Failure Rate < 10%: ${data.metrics.http_req_failed.values.rate < 0.1 ? '✅ PASS' : '❌ FAIL'}

🔍 BOTTLENECK ANALYSIS
  ${p95 > 15000 ? '⚠️  P95 exceeds 15s - investigate API rate limits or resource constraints' : '✅ P95 within acceptable range'}
  ${errorRateValue > 0.1 ? '⚠️  High error rate - check server logs and API quota' : '✅ Error rate acceptable'}
  ${data.metrics.timeout_errors.values.count > totalRequests * 0.05 ? '⚠️  Significant timeouts - consider increasing resources' : '✅ Timeout rate acceptable'}
  ${max > 30000 ? '⚠️  Max response time > 30s - investigate outliers' : '✅ Max response time reasonable'}

📈 CAPACITY PLANNING
  Estimated Capacity:
    - Max Concurrent Users: ${successRateValue > 0.85 ? '50+ ✅' : '<50 ⚠️'}
    - Requests per Hour: ${(totalRequests / (data.state.testRunDurationMs / 1000 / 3600)).toFixed(0)}
    - Daily Capacity (8hrs): ${((totalRequests / (data.state.testRunDurationMs / 1000 / 3600)) * 8).toFixed(0)}

  Recommendations:
    ${successRateValue > 0.95 ? '✅ System handles peak load well - current capacity sufficient' : '⚠️  Consider scaling resources for better peak performance'}
    ${p95 < 12000 ? '✅ Response times excellent even under stress' : '⚠️  Response time degradation observed - optimize critical path'}
    ${data.metrics.timeout_errors.values.count === 0 ? '✅ No timeouts - system stable' : '⚠️  Timeout issues detected - investigate queue depth and worker capacity'}

💡 NEXT STEPS
  1. ${p95 > 15000 ? 'Investigate slow requests - check Gemini API latency and queue depth' : 'Maintain current configuration'}
  2. ${errorRateValue > 0.05 ? 'Review error logs to identify root causes' : 'Continue monitoring in production'}
  3. ${data.metrics.timeout_errors.values.count > 0 ? 'Increase timeout or optimize long-running operations' : 'No timeout optimization needed'}
  4. ${successRateValue < 0.9 ? 'Consider horizontal scaling or resource limits' : 'Current scaling sufficient'}

════════════════════════════════════════════════════════════════

Test completed at: ${new Date().toISOString()}
Report saved to: stress-test-results.txt
  `;

  return {
    'stress-test-results.txt': report,
    'stress-test-data.json': JSON.stringify(data, null, 2),
    stdout: report,
  };
}
