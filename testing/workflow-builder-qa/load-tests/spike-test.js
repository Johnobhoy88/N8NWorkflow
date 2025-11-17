/**
 * Spike Testing Configuration
 * Tests system response to sudden traffic spikes
 *
 * Run with: k6 run spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const recoveryTime = new Trend('recovery_time');

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Normal load
    { duration: '30s', target: 200 },  // SPIKE!
    { duration: '1m', target: 200 },   // Stay at spike
    { duration: '30s', target: 10 },   // Recovery
    { duration: '2m', target: 10 },    // Normal load
    { duration: '30s', target: 300 },  // Bigger spike
    { duration: '1m', target: 300 },   // Hold spike
    { duration: '3m', target: 0 },     // Recover
  ],
  thresholds: {
    'http_req_duration': ['p(95)<8000'],
    'http_req_failed': ['rate<0.2'], // 20% error tolerance during spike
  },
};

const WEBHOOK_URL = __ENV.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/workflow-builder';

export default function() {
  const startTime = Date.now();

  const payload = JSON.stringify({
    'Client Brief': 'Quick workflow for spike test - sync data between platforms.',
    'Your Email': `spike-${__VU}-${__ITER}@example.com`
  });

  const response = http.post(WEBHOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  const duration = Date.now() - startTime;

  check(response, {
    'status is 2xx or 429': (r) => (r.status >= 200 && r.status < 300) || r.status === 429,
  });

  responseTime.add(response.timings.duration);

  // No sleep - maximum throughput during spike
}
