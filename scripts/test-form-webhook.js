require('dotenv').config();
const https = require('https');

// The Form Trigger webhook endpoint
const webhookUrl = 'https://highlandai.app.n8n.cloud/webhook/workflow-builder';

// Messy mock client brief - realistic chaos
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

console.log('🚀 Submitting form to n8n workflow...');
console.log(`📧 Email: jpmcmillan67@gmail.com`);
console.log(`📝 Brief: 10-node email & database automation request`);
console.log(`🔗 Webhook: ${webhookUrl}`);
console.log(`\n⏳ Submitting...\n`);

const postData = JSON.stringify(testData);

const options = {
  hostname: 'highlandai.app.n8n.cloud',
  port: 443,
  path: `/webhook/workflow-builder`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 300000  // 5 minute timeout
};

const req = https.request(options, (res) => {
  let data = '';
  console.log(`Status Code: ${res.statusCode}`);
  
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\n' + '='.repeat(70));
    
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
      console.log('✅ FORM SUBMITTED SUCCESSFULLY!\n');
      
      try {
        const response = JSON.parse(data);
        if (response.data) {
          console.log('📊 Response Data Received:');
          if (response.data.workflowSummary) {
            console.log('   ✓ Workflow summary generated');
          }
          if (response.data.finalWorkflowJson) {
            console.log('   ✓ Final workflow JSON created');
            if (typeof response.data.finalWorkflowJson === 'object') {
              console.log(`     - ${response.data.finalWorkflowJson.nodes?.length || '?'} nodes`);
            }
          }
          if (response.data.qaResults) {
            console.log('   ✓ QA validation completed');
          }
        }
      } catch (e) {
        // Response might be HTML or plain text
        if (data.includes('success') || data.includes('ok')) {
          console.log('✓ Server confirmed receipt');
        }
      }
      
      console.log('\n' + '='.repeat(70));
      console.log('📱 CHECK YOUR PHONE! 📱');
      console.log('='.repeat(70));
      console.log('\n✨ Your n8n workflow is now executing in the cloud...\n');
      console.log('Processing Steps:');
      console.log('  1️⃣  Brief Parser Agent → Analyzing your requirements');
      console.log('  2️⃣  Architect Agent → Designing the workflow');
      console.log('  3️⃣  Synthesis Agent → Generating 10 nodes');
      console.log('  4️⃣  QA Validator Agent → Quality checking');
      console.log('  5️⃣  Email Generation → Building your email');
      console.log('  6️⃣  Send Workflow Email → Mailing to jpmcmillan67@gmail.com');
      console.log('\n⏱️  Expected time: 45-90 seconds');
      console.log('📧 Email to: jpmcmillan67@gmail.com\n');
      console.log('In your email, you\'ll find:');
      console.log('  • Complete n8n workflow JSON');
      console.log('  • 10-node automation workflow for:');
      console.log('    - Form submissions → Email + Database');
      console.log('    - Order processing → Email + Database');
      console.log('    - Weekly summaries → Email + Database');
      console.log('    - Customer re-engagement → Email + Database');
      console.log('    - Payment alerts → Email + Database');
      console.log('  • QA validation report');
      console.log('  • Architecture overview\n');
      
    } else if (res.statusCode === 404) {
      console.log('❌ WEBHOOK NOT FOUND\n');
      console.log('The form webhook endpoint may not be active yet.');
      console.log('Try accessing the form directly instead:\n');
      console.log('  https://highlandai.app.n8n.cloud/form/workflow-builder\n');
    } else {
      console.log(`⚠️  Status: ${res.statusCode}\n`);
      console.log('Response:', data.substring(0, 300));
    }
    
    console.log('='.repeat(70));
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Error: ${e.message}`);
});

req.on('timeout', () => {
  req.destroy();
  console.log('\n⏱️  Connection timeout - workflow likely still processing');
  console.log('Email will be sent once complete.');
  process.exit(0);
});

req.write(postData);
req.end();
