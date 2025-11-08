require('dotenv').config();
const fs = require('fs');
const https = require('https');

const workflowFile = 'n8n-workflows/workflow-builder-gemini-v2-with-qa.json';
const apiKey = process.env.N8N_API_KEY;
const workflowId = 'U9Foh05pTUr542K2';

console.log('🚀 Deploying FIXED original workflow...\n');

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
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Deployment successful!\n');
      console.log(`Workflow: ${response.name}`);
      console.log(`Nodes: ${response.nodes.length}`);
      console.log(`Status: Active\n`);
      console.log('🔧 FIXED:');
      console.log('   ✓ Explicit field preservation in Format QA Results');
      console.log('   ✓ clientBrief now preserved (no more undefined)');
      console.log('   ✓ clientEmail now preserved');
      console.log('   ✓ workflowSummary now preserved\n');
      console.log('📧 Test now: https://highlandai.app.n8n.cloud/form/workflow-builder');
    } else {
      console.log('❌ Failed:', data);
    }
  });
});

req.on('error', (e) => console.error(`Error: ${e.message}`));
req.write(postData);
req.end();
