require('dotenv').config();
const fs = require('fs');
const https = require('https');

const workflowFile = 'n8n-workflows/workflow-builder-gemini-v2-with-qa-enhanced.json';
const apiKey = process.env.N8N_API_KEY;
const workflowId = 'U9Foh05pTUr542K2';

console.log('🚀 Deploying enhanced workflow with email trigger...\n');
console.log(`📄 Workflow: ${workflowFile}`);
console.log(`🌐 Target: n8n Cloud (U9Foh05pTUr542K2)`);
console.log(`⏳ Deploying...\n`);

const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));

const updatePayload = {
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections,
  settings: workflow.settings || {}
};

const postData = JSON.stringify(updatePayload);

const options = {
  hostname: 'highlandai.app.n8n.cloud',
  port: 443,
  path: `/api/v1/workflows/${workflowId}`,
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode}\n`);
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Deployment successful!\n');
      console.log('📊 Workflow Details:');
      console.log(`   ID: ${response.id}`);
      console.log(`   Name: ${response.name}`);
      console.log(`   Nodes: ${response.nodes.length}`);
      console.log(`   Active: ${response.active}`);
      console.log(`   URL: https://highlandai.app.n8n.cloud/workflow/${response.id}\n`);
      
      console.log('🎉 NEW FEATURES ENABLED:');
      console.log('   ✓ Email Trigger - Email briefs to workflows@yourdomain.com');
      console.log('   ✓ Data Normalizer - Unifies email and form inputs');
      console.log('   ✓ Input Validation - Catches errors before processing\n');
      
      console.log('📧 How to submit via email:');
      console.log('   1. Email to: workflows@yourdomain.com');
      console.log('   2. Subject: [WORKFLOW] Your brief title');
      console.log('   3. Body: Your workflow requirements');
      console.log('   4. Wait 45-90 seconds for response\n');
      
      console.log('📝 Workflow submission methods:');
      console.log('   • Form: https://highlandai.app.n8n.cloud/form/workflow-builder');
      console.log('   • Email: workflows@yourdomain.com (with [WORKFLOW] in subject)\n');
      
    } else {
      console.log('❌ Deployment failed');
      console.log('Error:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.write(postData);
req.end();
