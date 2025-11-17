/**
 * Global test setup and utilities
 */
require('dotenv').config();

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-api-key-mock';
process.env.N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/workflow-builder';

// Global test utilities
global.testUtils = {
  /**
   * Wait for a condition with timeout
   */
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
  },

  /**
   * Generate random email
   */
  randomEmail: () => {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  },

  /**
   * Sleep helper
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Deep clone object
   */
  clone: (obj) => JSON.parse(JSON.stringify(obj)),

  /**
   * Validate workflow structure
   */
  validateWorkflowStructure: (workflow) => {
    if (!workflow || typeof workflow !== 'object') {
      return { valid: false, error: 'Workflow is not an object' };
    }
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return { valid: false, error: 'Missing or invalid nodes array' };
    }
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      return { valid: false, error: 'Missing or invalid connections object' };
    }
    if (workflow.nodes.length === 0) {
      return { valid: false, error: 'Workflow has no nodes' };
    }

    // Check for duplicate IDs
    const ids = workflow.nodes.map(n => n.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      return { valid: false, error: 'Duplicate node IDs found' };
    }

    // Check node structure
    for (const node of workflow.nodes) {
      if (!node.id || !node.name || !node.type) {
        return { valid: false, error: `Invalid node structure: ${JSON.stringify(node)}` };
      }
    }

    return { valid: true };
  },

  /**
   * Extract JSON from markdown code blocks
   */
  extractJson: (text) => {
    let jsonText = text;
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }
    return JSON.parse(jsonText);
  }
};

// Console override for test output control
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

if (process.env.SILENT_TESTS === 'true') {
  console.log = () => {};
  console.error = () => {};
}

// Restore console after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});
