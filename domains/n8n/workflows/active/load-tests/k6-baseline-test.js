/**
 * k6 Load Test: Baseline Performance Test
 *
 * Purpose: Validate optimizations under normal load
 * Duration: 10 minutes
 * Concurrent Users: 5
 * Request Rate: 1 request/10 seconds
 *
 * Run: k6 run k6-baseline-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const cacheHitRate = new Rate('cache_hits');
const executionTime = new Trend('execution_time');
const costPerExecution = new Trend('cost_per_execution');

export const options = {
  stages: [
    { duration: '2m', target: 5 },   // Ramp-up to 5 users
    { duration: '6m', target: 5 },   // Maintain 5 users
    { duration: '2m', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<12000'],        // 95% of requests under 12s
    http_req_failed: ['rate<0.05'],            // Less than 5% failures
    cache_hits: ['rate>0.20'],                 // Cache hit rate > 20%
    execution_time: ['p(95)<12000', 'avg<10000'], // P95 < 12s, avg < 10s
  },
  ext: {
    loadimpact: {
      projectID: 3589524,
      name: 'Workflow Builder Baseline Test'
    }
  }
};

// Test configuration
const BASE_URL = __ENV.N8N_URL || 'https://your-n8n-instance.com';
const FORM_PATH = '/form/workflow-builder';

// Sample workflow briefs for testing
const testBriefs = [
  'Create a workflow that syncs Google Sheets to Airtable every hour',
  'Build an automation that sends Slack notifications when HubSpot deals close',
  'Design a workflow to backup Gmail attachments to Google Drive',
  'Create an email parser that extracts invoice data and saves to database',
  'Build a webhook receiver that logs data to PostgreSQL',
  'Design a scheduled workflow that generates weekly reports from Salesforce',
  'Create an automation that monitors Twitter mentions and sends to Discord',
  'Build a workflow that processes CSV uploads and creates Trello cards',
  'Design a system that validates form submissions using AI',
  'Create a multi-step approval workflow with Slack integration'
];

export default function () {
  // Select a test brief (creates natural cache behavior)
  const briefIndex = Math.floor(Math.random() * testBriefs.length);
  const brief = testBriefs[briefIndex];

  // Prepare request payload
  const payload = JSON.stringify({
    'Client Brief': brief,
    'Your Email': `test${__VU}@example.com`
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  };

  // Track start time
  const startTime = new Date();

  // Make request
  const response = http.post(`${BASE_URL}${FORM_PATH}`, payload, params);

  // Track end time
  const duration = new Date() - startTime;
  executionTime.add(duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response contains workflow': (r) => r.body && r.body.includes('workflow'),
    'execution time acceptable': (r) => duration < 15000,
    'no errors in response': (r) => !r.body.includes('error'),
  });

  // Estimate cost based on response (simplified)
  // Cache hit: $0.0065, Cache miss: $0.0091
  const isCacheHit = response.body.includes('cache') && response.body.includes('hit');
  const cost = isCacheHit ? 0.0065 : 0.0091;

  cacheHitRate.add(isCacheHit ? 1 : 0);
  costPerExecution.add(cost);

  // Log metrics every 10th iteration
  if (__ITER % 10 === 0) {
    console.log(`[VU ${__VU}] Iteration ${__ITER}: ${duration}ms, Cache: ${isCacheHit}, Cost: $${cost}`);
  }

  // Wait before next request (creates ~1 request per 10 seconds per VU)
  sleep(10);
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  const colors = opts.enableColors || false;

  let summary = `
${indent}Workflow Builder - Baseline Performance Test
${indent}============================================

${indent}Test Duration: ${data.state.testRunDurationMs / 1000}s
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%

${indent}Response Time:
${indent}  - Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  - Median (P50): ${data.metrics.http_req_duration.values.med.toFixed(2)}ms
${indent}  - P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  - P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  - Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

${indent}Cache Performance:
${indent}  - Cache Hit Rate: ${(data.metrics.cache_hits.values.rate * 100).toFixed(2)}%

${indent}Cost Analysis:
${indent}  - Average Cost: $${data.metrics.cost_per_execution.values.avg.toFixed(4)}
${indent}  - Total Cost: $${(data.metrics.cost_per_execution.values.avg * data.metrics.http_reqs.values.count).toFixed(4)}

${indent}Thresholds:
${indent}  - P95 < 12s: ${data.metrics.http_req_duration.values['p(95)'] < 12000 ? '✅ PASS' : '❌ FAIL'}
${indent}  - Failure Rate < 5%: ${data.metrics.http_req_failed.values.rate < 0.05 ? '✅ PASS' : '❌ FAIL'}
${indent}  - Cache Hit > 20%: ${data.metrics.cache_hits.values.rate > 0.20 ? '✅ PASS' : '❌ FAIL'}
  `;

  return summary;
}
