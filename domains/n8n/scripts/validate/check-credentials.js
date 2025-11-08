const https = require('https');

// Load environment variables
require('dotenv').config({ path: 'config/.env' });

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

if (!API_URL || !API_KEY) {
  console.error('Missing N8N_API_URL or N8N_API_KEY in config/.env');
  process.exit(1);
}

// Prepare API request to list credentials
const url = new URL('/api/v1/credentials', API_URL);
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'GET',
  headers: {
    'X-N8N-API-KEY': API_KEY
  }
};

console.log('Checking credentials in n8n Cloud...');
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
        const credentials = response.data || response;
        console.log(`\n✓ Found ${credentials.length} credentials:\n`);

        const gmailCredentials = credentials.filter(c => c.type === 'gmailOAuth2');
        const allTypes = [...new Set(credentials.map(c => c.type))];

        console.log('Credential types:', allTypes.join(', '));
        console.log(`\nGmail OAuth2 credentials: ${gmailCredentials.length}`);

        gmailCredentials.forEach(cred => {
          console.log(`  - ID: ${cred.id}, Name: ${cred.name}`);
        });

        if (gmailCredentials.length === 0) {
          console.log('\n⚠ WARNING: No Gmail OAuth2 credentials found!');
          console.log('You need to create Gmail OAuth2 credentials manually in n8n Cloud UI.');
          console.log('Steps:');
          console.log('1. Go to https://highlandai.app.n8n.cloud/credentials');
          console.log('2. Click "Add Credential"');
          console.log('3. Search for "Gmail OAuth2"');
          console.log('4. Follow the OAuth2 setup wizard');
          console.log('5. Name it "Gmail OAuth2" to match the workflow');
        } else {
          console.log(`\n✓ Gmail OAuth2 configured: ${gmailCredentials[0].id}`);
        }

        process.exit(0);
      } else {
        console.error('\n✗ Failed to fetch credentials');
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

req.end();
