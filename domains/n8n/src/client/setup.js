#!/usr/bin/env node

/**
 * n8n MCP Setup & Connection Script
 * Initializes persistent connection to n8n Cloud instance
 * Auto-loads from config/.env
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../config/.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

class N8nMCPSetup {
  constructor() {
    this.apiUrl = process.env.N8N_API_URL || 'https://highlandai.app.n8n.cloud';
    this.apiKey = process.env.N8N_API_KEY;
    this.isConnected = false;
  }

  /**
   * Validate API key and connection
   */
  async validateConnection() {
    if (!this.apiKey) {
      console.error('❌ N8N_API_KEY not found in config/.env');
      return false;
    }

    try {
      console.log('🔌 Testing n8n connection...');
      const response = await fetch(`${this.apiUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ n8n connection successful!');
        this.isConnected = true;
        return true;
      } else {
        console.error(`❌ Connection failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Connection error:', error.message);
      return false;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId) {
    if (!this.isConnected) {
      throw new Error('Not connected to n8n. Call validateConnection() first.');
    }

    const response = await fetch(`${this.apiUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all workflows
   */
  async getWorkflows() {
    if (!this.isConnected) {
      throw new Error('Not connected to n8n. Call validateConnection() first.');
    }

    const response = await fetch(`${this.apiUrl}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate workflow JSON
   */
  async validateWorkflow(workflowJson) {
    if (!this.isConnected) {
      throw new Error('Not connected to n8n. Call validateConnection() first.');
    }

    const response = await fetch(`${this.apiUrl}/api/v1/workflows/validate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowJson)
    });

    return response.json();
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      url: this.apiUrl,
      hasApiKey: !!this.apiKey
    };
  }
}

// Export for use as module
module.exports = N8nMCPSetup;

// Run connection test if executed directly
if (require.main === module) {
  (async () => {
    const setup = new N8nMCPSetup();
    const connected = await setup.validateConnection();

    if (connected) {
      try {
        const workflows = await setup.getWorkflows();
        console.log(`\n📋 Found ${workflows.data.length} workflows:`);
        workflows.data.forEach(wf => {
          console.log(`   • ${wf.name} (ID: ${wf.id})`);
        });
        console.log('\n✨ n8n MCP is ready to use!');
      } catch (error) {
        console.error('Error fetching workflows:', error.message);
      }
    } else {
      console.log('\n⚠️  Please check your API key in config/.env');
      process.exit(1);
    }
  })();
}
