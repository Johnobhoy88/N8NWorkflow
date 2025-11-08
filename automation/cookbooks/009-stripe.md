# Stripe Integration Guide

## Overview

Complete guide for integrating Stripe payment processing with n8n workflows.

**Difficulty:** Intermediate
**Prerequisites:**
- Stripe account
- n8n instance
- Basic understanding of webhooks

---

## Table of Contents

1. [Authentication Setup](#authentication-setup)
2. [Common Use Cases](#common-use-cases)
3. [Webhook Integration](#webhook-integration)
4. [Code Snippets](#code-snippets)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Authentication Setup

### 1. Get API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API Keys**
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. **Important:** Never expose secret keys in client-side code

### 2. Configure in n8n

#### Method 1: HTTP Request Node

```javascript
// In HTTP Request node
{
  "method": "POST",
  "url": "https://api.stripe.com/v1/customers",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "httpHeaderAuth": {
    "name": "Authorization",
    "value": "Bearer {{ $env.STRIPE_SECRET_KEY }}"
  }
}
```

#### Method 2: Stripe Credential

1. In n8n, go to **Credentials → New**
2. Select **Stripe API**
3. Enter your Secret Key
4. Test connection
5. Save

### 3. Environment Variables

```bash
# .env file
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Common Use Cases

### Use Case 1: Create Customer

```javascript
// HTTP Request Node
{
  "method": "POST",
  "url": "https://api.stripe.com/v1/customers",
  "headers": {
    "Authorization": "Bearer {{ $env.STRIPE_SECRET_KEY }}",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "email": "{{ $json.email }}",
    "name": "{{ $json.name }}",
    "phone": "{{ $json.phone }}",
    "metadata[user_id]": "{{ $json.user_id }}"
  }
}
```

### Use Case 2: Create Payment Intent

```javascript
// Create payment intent for $50.00
{
  "method": "POST",
  "url": "https://api.stripe.com/v1/payment_intents",
  "headers": {
    "Authorization": "Bearer {{ $env.STRIPE_SECRET_KEY }}",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "amount": "5000", // Amount in cents
    "currency": "usd",
    "customer": "{{ $json.customer_id }}",
    "payment_method_types[]": "card",
    "metadata[order_id]": "{{ $json.order_id }}"
  }
}
```

### Use Case 3: List All Customers

```javascript
// With pagination
{
  "method": "GET",
  "url": "https://api.stripe.com/v1/customers",
  "headers": {
    "Authorization": "Bearer {{ $env.STRIPE_SECRET_KEY }}"
  },
  "qs": {
    "limit": "100",
    "starting_after": "{{ $json.last_customer_id }}" // For pagination
  }
}
```

### Use Case 4: Create Subscription

```javascript
{
  "method": "POST",
  "url": "https://api.stripe.com/v1/subscriptions",
  "headers": {
    "Authorization": "Bearer {{ $env.STRIPE_SECRET_KEY }}",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "customer": "{{ $json.customer_id }}",
    "items[0][price]": "{{ $json.price_id }}",
    "trial_period_days": "14",
    "metadata[user_id]": "{{ $json.user_id }}"
  }
}
```

### Use Case 5: Process Refund

```javascript
{
  "method": "POST",
  "url": "https://api.stripe.com/v1/refunds",
  "headers": {
    "Authorization": "Bearer {{ $env.STRIPE_SECRET_KEY }}",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "payment_intent": "{{ $json.payment_intent_id }}",
    "amount": "{{ $json.refund_amount }}", // Optional: partial refund
    "reason": "requested_by_customer"
  }
}
```

---

## Webhook Integration

### 1. Create Webhook in Stripe

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your n8n webhook URL: `https://your-n8n.com/webhook/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `charge.refunded`
5. Copy the **Webhook Signing Secret** (`whsec_...`)

### 2. n8n Webhook Node Configuration

```javascript
// Webhook Trigger Node
{
  "httpMethod": "POST",
  "path": "stripe",
  "responseMode": "lastNode"
}
```

### 3. Verify Webhook Signature

```javascript
// Code Node - CRITICAL for security
const crypto = require('crypto');

const signature = $request.headers['stripe-signature'];
const secret = $env.STRIPE_WEBHOOK_SECRET;
const payload = $request.rawBody; // Use raw body!

// Parse signature header
const elements = signature.split(',');
const sigData = {};
elements.forEach(element => {
  const [key, value] = element.split('=');
  sigData[key] = value;
});

const timestamp = sigData.t;
const receivedSignature = sigData.v1;

// Create expected signature
const signedPayload = `${timestamp}.${payload}`;
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(signedPayload)
  .digest('hex');

// Verify signature
if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

// Verify timestamp (prevent replay attacks)
const now = Math.floor(Date.now() / 1000);
const tolerance = 300; // 5 minutes

if (Math.abs(now - parseInt(timestamp)) > tolerance) {
  throw new Error('Webhook timestamp too old');
}

// Signature verified - process event
return {
  json: $request.body
};
```

### 4. Handle Different Event Types

```javascript
// Switch Node or Code Node
const event = $json;

switch (event.type) {
  case 'payment_intent.succeeded':
    // Payment successful
    await updateOrderStatus(event.data.object.id, 'paid');
    await sendReceiptEmail(event.data.object.customer);
    break;

  case 'payment_intent.payment_failed':
    // Payment failed
    await updateOrderStatus(event.data.object.id, 'failed');
    await notifyCustomerPaymentFailed(event.data.object.customer);
    break;

  case 'customer.subscription.created':
    // New subscription
    await activateSubscription(event.data.object.id);
    await sendWelcomeEmail(event.data.object.customer);
    break;

  case 'customer.subscription.deleted':
    // Subscription cancelled
    await deactivateSubscription(event.data.object.id);
    await sendCancellationEmail(event.data.object.customer);
    break;

  case 'charge.refunded':
    // Refund processed
    await processRefund(event.data.object.id);
    await notifyRefundProcessed(event.data.object.customer);
    break;

  default:
    console.log(`Unhandled event type: ${event.type}`);
}
```

---

## Code Snippets

### Idempotency (Prevent Duplicate Charges)

```javascript
// Add idempotency key to prevent duplicate charges
const idempotencyKey = `payment_${userId}_${Date.now()}`;

{
  "method": "POST",
  "url": "https://api.stripe.com/v1/payment_intents",
  "headers": {
    "Authorization": "Bearer {{ $env.STRIPE_SECRET_KEY }}",
    "Idempotency-Key": idempotencyKey
  },
  "body": {...}
}
```

### Error Handling

```javascript
// Comprehensive error handling
try {
  const response = await $http.request({
    method: 'POST',
    url: 'https://api.stripe.com/v1/payment_intents',
    headers: {
      'Authorization': `Bearer ${$env.STRIPE_SECRET_KEY}`
    },
    body: {...}
  });

  return { json: response };

} catch (error) {
  // Stripe returns detailed error information
  const stripeError = error.response?.body?.error;

  if (stripeError) {
    console.error('Stripe Error:', {
      type: stripeError.type,
      code: stripeError.code,
      message: stripeError.message,
      param: stripeError.param
    });

    // Handle specific error types
    switch (stripeError.code) {
      case 'card_declined':
        await notifyCardDeclined(customerId);
        break;
      case 'insufficient_funds':
        await notifyInsufficientFunds(customerId);
        break;
      case 'expired_card':
        await requestCardUpdate(customerId);
        break;
      default:
        await notifyGenericError(customerId, stripeError.message);
    }
  }

  throw error;
}
```

### Pagination (Get All Records)

```javascript
// Get all customers with pagination
async function getAllCustomers() {
  let allCustomers = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const response = await $http.request({
      method: 'GET',
      url: 'https://api.stripe.com/v1/customers',
      headers: {
        'Authorization': `Bearer ${$env.STRIPE_SECRET_KEY}`
      },
      qs: {
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter })
      }
    });

    allCustomers = allCustomers.concat(response.data);
    hasMore = response.has_more;

    if (hasMore) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  return allCustomers;
}
```

### Metadata for Custom Data

```javascript
// Store custom data in Stripe metadata
{
  "customer": "cus_xxxxx",
  "metadata[user_id]": "12345",
  "metadata[source]": "website",
  "metadata[campaign]": "summer_2025",
  "metadata[referrer]": "john_doe"
}

// Query by metadata
{
  "method": "GET",
  "url": "https://api.stripe.com/v1/customers/search",
  "qs": {
    "query": "metadata['user_id']:'12345'"
  }
}
```

---

## Best Practices

### 1. Security

✅ **DO:**
- Store API keys in environment variables
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement timestamp validation
- Use idempotency keys for POST requests

❌ **DON'T:**
- Expose secret keys in client code
- Skip webhook signature verification
- Log full card numbers or CVV
- Use test keys in production

### 2. Error Handling

```javascript
// Retry logic for transient errors
async function stripeRequestWithRetry(config, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await $http.request(config);
    } catch (error) {
      const isRetryable =
        error.statusCode >= 500 || // Server errors
        error.statusCode === 429; // Rate limit

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 3. Testing

```javascript
// Use test mode for development
const apiKey = process.env.NODE_ENV === 'production'
  ? process.env.STRIPE_LIVE_KEY
  : process.env.STRIPE_TEST_KEY;

// Test card numbers
// 4242 4242 4242 4242 - Success
// 4000 0000 0000 0002 - Card declined
// 4000 0000 0000 9995 - Insufficient funds
```

### 4. Rate Limiting

Stripe allows:
- **100 requests/second** in live mode
- **25 requests/second** in test mode

```javascript
// Implement rate limiting
const rateLimiter = {
  tokens: 100,
  lastRefill: Date.now(),
  refillRate: 100, // tokens per second

  async getToken() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(100, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.getToken();
    }

    this.tokens -= 1;
  }
};
```

### 5. Monitoring

```javascript
// Log all Stripe operations
async function logStripeOperation(operation, data, result) {
  await $db.query(`
    INSERT INTO stripe_operations_log
    (operation, request_data, response_data, status, timestamp)
    VALUES ($1, $2, $3, $4, NOW())
  `, [
    operation,
    JSON.stringify(data),
    JSON.stringify(result),
    result.status
  ]);
}
```

---

## Troubleshooting

### Issue: "Invalid API Key"
**Solution:** Verify you're using the correct key (test vs. live) and check for typos.

### Issue: "Webhook signature verification failed"
**Solution:**
- Ensure you're using `$request.rawBody`, not `$request.body`
- Verify webhook secret matches Stripe dashboard
- Check system clock is synchronized

### Issue: "Rate limit exceeded"
**Solution:** Implement exponential backoff and reduce request frequency.

### Issue: "Payment requires authentication"
**Solution:** Handle 3D Secure with Stripe.js client-side or Payment Intents API.

### Testing Webhook Locally

```bash
# Install Stripe CLI
stripe listen --forward-to https://localhost:5678/webhook/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

---

## Resources

- [Stripe API Docs](https://stripe.com/docs/api)
- [Webhook Event Reference](https://stripe.com/docs/api/events/types)
- [Testing Guide](https://stripe.com/docs/testing)
- [n8n Stripe Node Docs](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.stripe/)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

**Version:** 1.0.0
**Last Updated:** 2025-11-08
