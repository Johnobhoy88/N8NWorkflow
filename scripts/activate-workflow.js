const https = require('https');

// Load environment variables
require('dotenv').config({ path: 'config/.env' });

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = process.argv[2];

if (!API_URL || !API_KEY) {
  console.error('Missing N8N_API_URL or N8N_API_KEY in config/.env');
  process.exit(1);
}

if (!WORKFLOW_ID) {
  console.error('Usage: node activate-workflow.js <workflow-id>');
  process.exit(1);
}

// Prepare API request
const url = new URL(`/api/v1/workflows/${WORKFLOW_ID}`, API_URL);
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'PATCH',
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
};

const postData = JSON.stringify({ active: true });

console.log('Activating workflow...');
console.log(`Workflow ID: ${WORKFLOW_ID}`);
console.log(`API Endpoint: ${url.href}`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\nResponse Status: ${res.statusCode}`);

    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log('\n✓ Workflow activated successfully!');
        console.log(JSON.stringify({
          success: true,
          workflow: {
            id: response.id,
            name: response.name,
            active: response.active,
            url: `${API_URL}/workflow/${response.id}`
          }
        }, null, 2));

        // Check if this is a form trigger workflow
        const formNode = response.nodes?.find(n => n.type === 'n8n-nodes-base.formTrigger');
        if (formNode) {
          const formPath = formNode.parameters?.path || 'unknown';
          console.log(`\n✓ Form endpoint available at:`);
          console.log(`${API_URL}/form/${formPath}`);
        }

        process.exit(0);
      } else {
        console.error('\n✗ Activation failed');
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
