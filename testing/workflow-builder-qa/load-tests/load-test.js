/**
 * Load Testing Configuration for n8n Workflow Builder
 * Uses k6 for performance and load testing
 *
 * Run with: k6 run load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const workflowGenerationTime = new Trend('workflow_generation_time');
const emailDeliveryTime = new Trend('email_delivery_time');
const apiCallCount = new Counter('api_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 25 },   // Ramp up to 25 users
    { duration: '5m', target: 25 },   // Stay at 25 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '3m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'], // 95% of requests should be below 5s
    'http_req_failed': ['rate<0.1'],     // Error rate should be below 10%
    'errors': ['rate<0.1'],              // Custom error rate below 10%
    'workflow_generation_time': ['p(95)<30000'], // 95% complete within 30s
  },
};

// Environment configuration
const WEBHOOK_URL = __ENV.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/workflow-builder';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'loadtest@example.com';

// Test data generators
function generateWorkflowBrief(index) {
  const templates = [
    'Create a workflow that syncs HubSpot deals to Asana projects when marked as Closed Won.',
    'Build an automation that monitors Google Sheets for new rows and sends Slack notifications.',
    'Set up a workflow to enrich lead data from form submissions using Clearbit and create HubSpot contacts.',
    'Automate customer onboarding: Stripe subscription → Airtable → Welcome email → Intercom.',
    'Create a workflow that processes invoice payments from Stripe and updates QuickBooks.',
    'Build an automation that monitors support tickets in Zendesk and escalates to Slack.',
    'Set up a workflow to sync calendar events from Google Calendar to Salesforce activities.',
    'Automate social media posting: Schedule posts from Airtable to Twitter, LinkedIn, and Facebook.',
    'Create a workflow that monitors GitHub issues and creates tasks in Jira.',
    'Build an automation that processes form submissions, validates data, and sends to multiple CRMs.'
  ];

  const complexTemplates = [
    `Advanced workflow requirements:
    1. Trigger: New deal in HubSpot (stage = "Qualified")
    2. Enrich company data using Clearbit API
    3. Score lead based on company size, industry, revenue
    4. If score > 80: Create Salesforce opportunity, assign to AE, send Slack alert
    5. If score 50-80: Add to nurture campaign in ActiveCampaign
    6. If score < 50: Archive in Airtable
    7. Error handling: Retry failed API calls, log errors to Sentry
    8. Send daily summary email of processed leads`,

    `Multi-system integration workflow:
    - Monitor Stripe for new subscriptions
    - Create customer record in PostgreSQL database
    - Provision user account via REST API
    - Send welcome email sequence (Day 0, Day 3, Day 7)
    - Add to Intercom for customer success
    - Create onboarding tasks in Asana
    - Post to Slack #new-customers channel
    - Schedule first check-in call in Calendly
    - Track in Amplitude analytics`
  ];

  if (index % 5 === 0) {
    // 20% of requests use complex templates
    return complexTemplates[index % complexTemplates.length];
  }

  return templates[index % templates.length];
}

function generateEmail(vuid) {
  return `loadtest-${vuid}-${Date.now()}@example.com`;
}

// Main test scenario
export default function() {
  const vuid = __VU; // Virtual User ID
  const email = generateEmail(vuid);
  const brief = generateWorkflowBrief(__ITER);

  group('Workflow Builder - Form Submission', function() {
    const startTime = new Date();

    // Submit workflow request
    const payload = JSON.stringify({
      'Client Brief': brief,
      'Your Email': email
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'SubmitWorkflowRequest' },
    };

    const response = http.post(WEBHOOK_URL, payload, params);

    // Increment API call counter
    apiCallCount.add(1);

    // Check response
    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 3s': (r) => r.timings.duration < 3000,
      'has response body': (r) => r.body.length > 0,
    });

    if (!success) {
      errorRate.add(1);
      console.error(`Request failed: ${response.status} - ${response.body}`);
    } else {
      errorRate.add(0);
    }

    const endTime = new Date();
    const duration = endTime - startTime;
    workflowGenerationTime.add(duration);
  });

  // Simulate realistic user behavior with think time
  sleep(Math.random() * 3 + 2); // Sleep 2-5 seconds
}

// Setup function (runs once per VU)
export function setup() {
  console.log('Starting load test...');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Test configuration: ${JSON.stringify(options.stages)}`);

  // Verify webhook is accessible
  const response = http.get(WEBHOOK_URL);
  console.log(`Webhook status: ${response.status}`);

  return { startTime: new Date().toISOString() };
}

// Teardown function (runs once at end)
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
  console.log('Check metrics for detailed results.');
}
