/**
 * Stress Testing Configuration
 * Tests system behavior under extreme load conditions
 *
 * Run with: k6 run stress-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '5m', target: 50 },    // Hold at 50
    { duration: '2m', target: 100 },   // Ramp to 100
    { duration: '5m', target: 100 },   // Hold at 100
    { duration: '2m', target: 200 },   // Ramp to 200 (stress point)
    { duration: '5m', target: 200 },   // Hold at stress level
    { duration: '2m', target: 300 },   // Push beyond limits
    { duration: '5m', target: 300 },   // Hold at extreme
    { duration: '5m', target: 0 },     // Recover
  ],
  thresholds: {
    'http_req_duration': ['p(99)<10000'], // 99% under 10s
    'http_req_failed': ['rate<0.3'],      // Tolerate 30% errors under stress
    'errors': ['rate<0.3'],
  },
};

const WEBHOOK_URL = __ENV.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/workflow-builder';

export default function() {
  const payload = JSON.stringify({
    'Client Brief': `Stress test workflow ${__ITER} - Create integration between systems.`,
    'Your Email': `stress-test-${__VU}-${__ITER}@example.com`
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '60s', // Higher timeout for stress conditions
  };

  const response = http.post(WEBHOOK_URL, payload, params);

  const success = check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);

  sleep(1); // Minimal sleep for stress testing
}
