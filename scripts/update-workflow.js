require('dotenv').config();

const fs = require('fs');
const https = require('https');

const workflowFile = 'n8n-workflows/workflow-builder-gemini-v2-with-qa.json';
const apiKey = process.env.N8N_API_KEY;
const workflowId = 'U9Foh05pTUr542K2';

console.log('Updating workflow on n8n Cloud...');
console.log(`Workflow ID: ${workflowId}`);

const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));

// Keep only essential fields for update
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
    console.log(`\nResponse Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('\n✓ Workflow updated successfully!');
      console.log(JSON.stringify({
        success: true,
        workflow: {
          id: response.id,
          name: response.name,
          active: response.active,
          url: `https://highlandai.app.n8n.cloud/workflow/${response.id}`,
          nodes: response.nodes.length,
          connections: Object.keys(response.connections).length
        }
      }, null, 2));
    } else {
      console.log('\n✗ Update failed');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`✗ Error: ${e.message}`);
});

req.write(postData);
req.end();
