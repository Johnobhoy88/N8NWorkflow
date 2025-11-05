require('dotenv').config();
const https = require('https');

const apiKey = process.env.N8N_API_KEY;
const workflowId = 'U9Foh05pTUr542K2';

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

console.log('🚀 Triggering workflow with real test data...');
console.log(`📧 Email: jpmcmillan67@gmail.com`);
console.log(`📝 Brief: 10-node email & database automation request`);
console.log(`\n⏳ Processing...\n`);

const postData = JSON.stringify(testData);

const options = {
  hostname: 'highlandai.app.n8n.cloud',
  port: 443,
  path: `/api/v1/workflows/${workflowId}/execute`,
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 300000  // 5 minute timeout for long-running workflow
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode}`);
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      try {
        const response = JSON.parse(data);
        console.log('\n✅ Workflow triggered successfully!\n');
        console.log(`📊 Execution Details:`);
        console.log(`  Status: Success`);
        console.log(`  Execution ID: ${response.id || 'Processing...'}`);
        console.log(`  Target Email: jpmcmillan67@gmail.com`);
        
        if (response.data) {
          if (response.data.workflowSummary) {
            console.log(`\n📋 Workflow Summary: Generated`);
          }
          if (response.data.finalWorkflowJson) {
            const wf = response.data.finalWorkflowJson;
            if (typeof wf === 'object') {
              console.log(`📦 Workflow JSON:`);
              console.log(`   - Nodes: ${wf.nodes?.length || 'N/A'}`);
              console.log(`   - Name: ${wf.name || 'Generated Workflow'}`);
            }
          }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📱 CHECK YOUR PHONE!');
        console.log('='.repeat(60));
        console.log('\n✨ The workflow is processing in n8n Cloud...');
        console.log('   → Analyzing your messy brief with Gemini AI');
        console.log('   → Generating a 10-node automation workflow');
        console.log('   → Running QA validation');
        console.log('   → Sending complete workflow JSON to your email');
        console.log('\n⏱️  This should take 30-60 seconds');
        console.log('📧 Email: jpmcmillan67@gmail.com');
        console.log('\n💡 What you\'ll receive:');
        console.log('   - Generated n8n workflow JSON');
        console.log('   - Architecture breakdown');
        console.log('   - QA validation results');
        
      } catch (e) {
        console.log('Raw Response:', data.substring(0, 500));
      }
    } else {
      console.log('\n⚠️  Execution status:', res.statusCode);
      try {
        const error = JSON.parse(data);
        console.log('Error details:', error);
      } catch {
        console.log('Response:', data.substring(0, 300));
      }
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Error: ${e.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.log('\n⏱️  Request timeout - workflow still processing in cloud');
  console.log('   Email will be sent when complete');
});

req.write(postData);
req.end();
