require('dotenv').config();
const https = require('https');

const testBrief = `Hi there,

Our business is growing and we need to automate some stuff. right now we're manually doing everything.

here's what we need:
1. when a customer fills out a form on our website (contact form), send them a confirmation email
2. also save their info to our database
3. when they submit an order, send them an order confirmation email  
4. log the order to our database too
5. we want to send weekly summary emails to our team about all the orders we got
6. save those summaries to a database table
7. if a customer hasn't ordered in 30 days, send them a "we miss you" email reminder
8. track these reminders in our database for analytics
9. when payment fails, send an alert email to our finance team
10. log all failed payments to database for reporting

we also need to integrate with our CRM but lets ignore that for now. can you build this? we need it asap. budget is flexible but needs to be done this week.

thanks
sarah`;

const testData = {
  "Client Brief": testBrief.trim(),
  "Your Email": "jpmcmillan67@gmail.com"
};

console.log('🧪 Testing Form Submission...\n');
console.log('Attempting multiple endpoints:\n');

const endpoints = [
  {
    path: '/api/v1/workflows/U9Foh05pTUr542K2/execute',
    name: 'API Execute Endpoint',
    headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
  },
  {
    path: '/form/workflow-builder',
    name: 'Form Endpoint',
    headers: {}
  },
  {
    path: '/api/v1/form/workflow-builder', 
    name: 'Form API Endpoint',
    headers: {}
  }
];

let completed = 0;

endpoints.forEach((endpoint, index) => {
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'highlandai.app.n8n.cloud',
    port: 443,
    path: endpoint.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      ...endpoint.headers
    },
    timeout: 10000
  };

  console.log(`${index + 1}. Testing: ${endpoint.name}`);
  console.log(`   Path: ${endpoint.path}`);

  const req = https.request(options, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
      console.log(`   ✅ SUCCESS!\n`);
    } else {
      console.log(`   ❌ Not this endpoint\n`);
    }
    
    completed++;
    if (completed === endpoints.length) {
      showManualInstructions();
    }
  });

  req.on('error', (e) => {
    console.log(`   ❌ Error: ${e.message}\n`);
    completed++;
    if (completed === endpoints.length) {
      showManualInstructions();
    }
  });

  req.on('timeout', () => {
    req.destroy();
    console.log(`   ⏱️  Timeout (likely processing)\n`);
    completed++;
    if (completed === endpoints.length) {
      showManualInstructions();
    }
  });

  req.write(postData);
  req.end();
});

function showManualInstructions() {
  console.log('\n' + '='.repeat(70));
  console.log('MANUAL FORM SUBMISSION REQUIRED');
  console.log('='.repeat(70));
  console.log('\nThe Form Trigger webhook needs to be initialized through the n8n UI.');
  console.log('Follow these steps to test with your real email:\n');
  
  console.log('📍 STEP 1: Log into n8n Cloud');
  console.log('   https://highlandai.app.n8n.cloud\n');
  
  console.log('📍 STEP 2: Open the workflow');
  console.log('   Name: "n8n Workflow Builder (Gemini) - with QA Validator"');
  console.log('   ID: U9Foh05pTUr542K2\n');
  
  console.log('📍 STEP 3: Toggle the workflow OFF then back ON');
  console.log('   (This initializes the Form Trigger webhook)\n');
  
  console.log('📍 STEP 4: Click the "Form" button');
  console.log('   Or access: https://highlandai.app.n8n.cloud/form/workflow-builder\n');
  
  console.log('📍 STEP 5: Fill in the form:');
  console.log('   Client Brief: (paste the messy brief)');
  console.log('   Your Email: jpmcmillan67@gmail.com\n');
  
  console.log('📍 STEP 6: Submit the form\n');
  
  console.log('⏱️  Wait 45-90 seconds for processing');
  console.log('📱 Check your phone for email at: jpmcmillan67@gmail.com\n');
  
  console.log('='.repeat(70));
}
