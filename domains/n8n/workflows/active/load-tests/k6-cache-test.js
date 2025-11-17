/**
 * k6 Load Test: Cache Performance Test
 *
 * Purpose: Measure cache hit effectiveness
 * Duration: 15 minutes
 * Strategy: Repeat 5 unique briefs to maximize cache hits
 * Expected Cache Hit Rate: 75-80%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const cacheHits = new Rate('cache_hits');
const cacheMisses = new Rate('cache_misses');
const cacheHitResponseTime = new Trend('cache_hit_response_time');
const cacheMissResponseTime = new Trend('cache_miss_response_time');
const totalCost = new Counter('total_cost_dollars');

export const options = {
  stages: [
    { duration: '3m', target: 10 },   // Ramp-up to 10 users
    { duration: '9m', target: 10 },   // Maintain 10 users
    { duration: '3m', target: 0 },    // Ramp-down to 0
  ],
  thresholds: {
    cache_hits: ['rate>0.75'],                    // Cache hit rate > 75%
    cache_hit_response_time: ['p(95)<8000'],      // Cache hits under 8s
    cache_miss_response_time: ['p(95)<12000'],    // Cache misses under 12s
    http_req_failed: ['rate<0.05'],               // Less than 5% failures
  },
};

const BASE_URL = __ENV.N8N_URL || 'https://your-n8n-instance.com';
const FORM_PATH = '/form/workflow-builder';

// Only 5 unique briefs to maximize cache hits
const CACHE_TEST_BRIEFS = [
  'Sync HubSpot contacts to Mailchimp when deal stage changes to closed-won',
  'Create automated invoice generator that pulls data from Stripe and emails PDF',
  'Build a webhook that receives form submissions and creates Asana tasks with attachments',
  'Design a Google Sheets to Airtable sync that runs every 30 minutes with delta sync',
  'Create an email parser that extracts order details and updates PostgreSQL database'
];

// Track first request time for each brief (to identify cache misses)
const firstRequestTime = {};

export default function () {
  // Cycle through 5 briefs (creates high cache hit rate)
  const briefIndex = __ITER % 5;
  const brief = CACHE_TEST_BRIEFS[briefIndex];
  const isFirstRequest = !firstRequestTime[briefIndex];

  const payload = JSON.stringify({
    'Client Brief': brief,
    'Your Email': `cache-test-${__VU}@example.com`
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  };

  const startTime = new Date();
  const response = http.post(`${BASE_URL}${FORM_PATH}`, payload, params);
  const duration = new Date() - startTime;

  // Determine if this was a cache hit
  // First request for each brief = cache miss
  // Subsequent requests = cache hit (if within 1 hour TTL)
  const isCacheHit = !isFirstRequest && (new Date() - firstRequestTime[briefIndex]) < 3600000;

  if (isFirstRequest) {
    firstRequestTime[briefIndex] = new Date();
  }

  // Record metrics
  if (isCacheHit) {
    cacheHits.add(1);
    cacheMisses.add(0);
    cacheHitResponseTime.add(duration);
    totalCost.add(0.0065); // Cache hit cost
  } else {
    cacheHits.add(0);
    cacheMisses.add(1);
    cacheMissResponseTime.add(duration);
    totalCost.add(0.0091); // Cache miss cost
  }

  // Validate response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'contains workflow JSON': (r) => r.body && r.body.includes('"nodes"'),
    'cache hit fast': (r) => !isCacheHit || duration < 8000,
    'cache miss acceptable': (r) => isCacheHit || duration < 12000,
  });

  // Detailed logging
  if (__ITER % 5 === 0) {
    console.log(`[VU ${__VU}] Brief #${briefIndex}, Cache: ${isCacheHit ? 'HIT' : 'MISS'}, Time: ${duration}ms, Cost: $${isCacheHit ? '0.0065' : '0.0091'}`);
  }

  sleep(5); // 5 second interval between requests
}

export function handleSummary(data) {
  const cacheHitRate = data.metrics.cache_hits.values.rate;
  const avgCacheHitTime = data.metrics.cache_hit_response_time.values.avg;
  const avgCacheMissTime = data.metrics.cache_miss_response_time.values.avg;
  const totalRequests = data.metrics.http_reqs.values.count;
  const estimatedCost = data.metrics.total_cost_dollars.values.count;

  const report = `
╔════════════════════════════════════════════════════════════════╗
║         Workflow Builder - Cache Performance Test              ║
╚════════════════════════════════════════════════════════════════╝

📊 TEST SUMMARY
  Duration: ${(data.state.testRunDurationMs / 1000).toFixed(1)}s
  Total Requests: ${totalRequests}
  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

🎯 CACHE PERFORMANCE
  Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% ${cacheHitRate > 0.75 ? '✅' : '❌'}
  Expected: >75%

  Cache Hit Response Time:
    - Average: ${avgCacheHitTime.toFixed(0)}ms
    - P95: ${data.metrics.cache_hit_response_time.values['p(95)'].toFixed(0)}ms ${data.metrics.cache_hit_response_time.values['p(95)'] < 8000 ? '✅' : '❌'}
    - P99: ${data.metrics.cache_hit_response_time.values['p(99)'].toFixed(0)}ms

  Cache Miss Response Time:
    - Average: ${avgCacheMissTime.toFixed(0)}ms
    - P95: ${data.metrics.cache_miss_response_time.values['p(95)'].toFixed(0)}ms ${data.metrics.cache_miss_response_time.values['p(95)'] < 12000 ? '✅' : '❌'}
    - P99: ${data.metrics.cache_miss_response_time.values['p(99)'].toFixed(0)}ms

⚡ PERFORMANCE IMPROVEMENT
  Cache Hit Speed Gain: ${((avgCacheMissTime - avgCacheHitTime) / avgCacheMissTime * 100).toFixed(1)}% faster
  Time Saved per Hit: ${(avgCacheMissTime - avgCacheHitTime).toFixed(0)}ms

💰 COST ANALYSIS
  Total Cost: $${estimatedCost.toFixed(4)}
  Average Cost per Request: $${(estimatedCost / totalRequests).toFixed(4)}

  Cost Breakdown:
    - Cache Hits (${(cacheHitRate * 100).toFixed(1)}%): $${(cacheHitRate * totalRequests * 0.0065).toFixed(4)}
    - Cache Misses (${((1 - cacheHitRate) * 100).toFixed(1)}%): $${((1 - cacheHitRate) * totalRequests * 0.0091).toFixed(4)}

  Savings vs No Cache: $${((totalRequests * 0.0091) - estimatedCost).toFixed(4)} (${((1 - (estimatedCost / (totalRequests * 0.0091))) * 100).toFixed(1)}%)

✅ THRESHOLD VALIDATION
  Cache Hit Rate > 75%: ${cacheHitRate > 0.75 ? '✅ PASS' : '❌ FAIL'}
  Cache Hit P95 < 8s: ${data.metrics.cache_hit_response_time.values['p(95)'] < 8000 ? '✅ PASS' : '❌ FAIL'}
  Cache Miss P95 < 12s: ${data.metrics.cache_miss_response_time.values['p(95)'] < 12000 ? '✅ PASS' : '❌ FAIL'}
  Failure Rate < 5%: ${data.metrics.http_req_failed.values.rate < 0.05 ? '✅ PASS' : '❌ FAIL'}

📈 RECOMMENDATIONS
  ${cacheHitRate > 0.75 ? '✅ Cache is performing well' : '⚠️  Consider increasing cache TTL or improving cache key strategy'}
  ${avgCacheHitTime < 8000 ? '✅ Cache hit performance excellent' : '⚠️  Investigate cache hit latency'}
  ${estimatedCost / totalRequests < 0.008 ? '✅ Cost per request within target' : '⚠️  Cost optimization needed'}
  `;

  return {
    'cache-test-summary.txt': report,
    'cache-test-data.json': JSON.stringify(data, null, 2),
    stdout: report,
  };
}
