const fs = require('fs');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: 'config/.env' });

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_PATH = process.argv[2] || 'n8n-workflows/workflow-builder-gemini-v2-with-qa.json';

if (!API_URL || !API_KEY) {
  console.error('Missing N8N_API_URL or N8N_API_KEY in config/.env');
  process.exit(1);
}

// Read workflow
const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));

// Clean up workflow for API import (remove fields that might not be accepted)
const cleanWorkflow = {
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections,
  settings: workflow.settings || {},
  staticData: workflow.staticData || null
};

// Remove undefined/null fields
Object.keys(cleanWorkflow).forEach(key => {
  if (cleanWorkflow[key] === undefined || cleanWorkflow[key] === null) {
    delete cleanWorkflow[key];
  }
});

// Prepare API request
const url = new URL('/api/v1/workflows', API_URL);
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
};

const postData = JSON.stringify(cleanWorkflow);

console.log('Deploying workflow to n8n Cloud...');
console.log(`API Endpoint: ${url.href}`);
console.log(`Workflow: ${workflow.name}`);
console.log(`Nodes: ${workflow.nodes.length}`);
console.log(`\nCleaned workflow fields: ${Object.keys(cleanWorkflow).join(', ')}`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\nResponse Status: ${res.statusCode}`);

    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('\n✓ Workflow deployed successfully!');
        console.log(JSON.stringify({
          success: true,
          workflow: {
            id: response.id,
            name: response.name,
            active: response.active,
            url: `${API_URL}/workflow/${response.id}`,
            nodes: response.nodes?.length || workflow.nodes.length,
            connections: Object.keys(response.connections || {}).length
          }
        }, null, 2));
        process.exit(0);
      } else {
        console.error('\n✗ Deployment failed');
        console.error(JSON.stringify(response, null, 2));
        process.exit(1);
      }
    } catch (e) {
      console.error('\n✗ Failed to parse response');
      console.error('Raw response:', data);
      console.error('Error:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n✗ Request failed');
  console.error('Error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
