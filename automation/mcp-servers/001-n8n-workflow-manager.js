#!/usr/bin/env node

/**
 * n8n Workflow Manager MCP Server
 *
 * Enables Claude Code to manage n8n workflows:
 * - List workflows
 * - Get workflow details
 * - Execute workflows
 * - Check execution status
 * - Get execution logs
 */

const { McpServer } = require('@anthropic-ai/sdk/mcp');
const axios = require('axios');

// Configuration from environment variables
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';

if (!N8N_API_KEY) {
  console.error('Error: N8N_API_KEY environment variable is required');
  process.exit(1);
}

// n8n API client
const n8nClient = axios.create({
  baseURL: `${N8N_BASE_URL}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Create MCP server
const server = new McpServer({
  name: 'n8n-workflow-manager',
  version: '1.0.0',
  description: 'Manage n8n workflows via MCP'
});

// Tool: List all workflows
server.tool({
  name: 'list_workflows',
  description: 'List all n8n workflows with their status',
  parameters: {
    active: {
      type: 'boolean',
      description: 'Filter by active status (true/false/undefined for all)',
      required: false
    },
    limit: {
      type: 'number',
      description: 'Maximum number of workflows to return',
      default: 50,
      required: false
    }
  },
  execute: async ({ active, limit = 50 }) => {
    try {
      const params = { limit };
      if (active !== undefined) {
        params.active = active;
      }

      const response = await n8nClient.get('/workflows', { params });
      const workflows = response.data.data;

      const summary = workflows.map(w => ({
        id: w.id,
        name: w.name,
        active: w.active,
        tags: w.tags?.map(t => t.name) || [],
        nodes: w.nodes?.length || 0,
        updatedAt: w.updatedAt
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }
});

// Tool: Get workflow details
server.tool({
  name: 'get_workflow',
  description: 'Get detailed information about a specific workflow',
  parameters: {
    workflowId: {
      type: 'string',
      description: 'ID or name of the workflow',
      required: true
    }
  },
  execute: async ({ workflowId }) => {
    try {
      // Try by ID first
      let workflow;
      try {
        const response = await n8nClient.get(`/workflows/${workflowId}`);
        workflow = response.data;
      } catch {
        // Try by name
        const allWorkflows = await n8nClient.get('/workflows');
        workflow = allWorkflows.data.data.find(w => w.name === workflowId);
        if (!workflow) {
          throw new Error(`Workflow not found: ${workflowId}`);
        }
      }

      const details = {
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        tags: workflow.tags?.map(t => t.name) || [],
        nodes: workflow.nodes?.length || 0,
        connections: Object.keys(workflow.connections || {}).length,
        settings: workflow.settings,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(details, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }
});

// Tool: Execute workflow
server.tool({
  name: 'execute_workflow',
  description: 'Trigger a workflow execution',
  parameters: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to execute',
      required: true
    },
    data: {
      type: 'object',
      description: 'Input data for the workflow (optional)',
      required: false
    }
  },
  execute: async ({ workflowId, data }) => {
    try {
      const response = await n8nClient.post(`/workflows/${workflowId}/execute`, {
        data: data || {}
      });

      return {
        content: [{
          type: 'text',
          text: `Workflow executed successfully\nExecution ID: ${response.data.data.executionId}\nStatus: ${response.data.data.status}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }
});

// Tool: Get executions
server.tool({
  name: 'list_executions',
  description: 'List recent workflow executions',
  parameters: {
    workflowId: {
      type: 'string',
      description: 'Filter by workflow ID (optional)',
      required: false
    },
    status: {
      type: 'string',
      description: 'Filter by status: success, error, running, waiting',
      required: false
    },
    limit: {
      type: 'number',
      description: 'Maximum number of executions to return',
      default: 20,
      required: false
    }
  },
  execute: async ({ workflowId, status, limit = 20 }) => {
    try {
      const params = { limit };
      if (workflowId) params.workflowId = workflowId;
      if (status) params.status = status;

      const response = await n8nClient.get('/executions', { params });
      const executions = response.data.data;

      const summary = executions.map(e => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflowData?.name || 'Unknown',
        status: e.status,
        mode: e.mode,
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt,
        duration: e.stoppedAt && e.startedAt
          ? `${((new Date(e.stoppedAt) - new Date(e.startedAt)) / 1000).toFixed(2)}s`
          : 'N/A'
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }
});

// Tool: Get execution details
server.tool({
  name: 'get_execution',
  description: 'Get detailed information about a specific execution',
  parameters: {
    executionId: {
      type: 'string',
      description: 'ID of the execution',
      required: true
    }
  },
  execute: async ({ executionId }) => {
    try {
      const response = await n8nClient.get(`/executions/${executionId}`);
      const execution = response.data;

      const details = {
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflowData?.name,
        status: execution.status,
        mode: execution.mode,
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        duration: execution.stoppedAt && execution.startedAt
          ? `${((new Date(execution.stoppedAt) - new Date(execution.startedAt)) / 1000).toFixed(2)}s`
          : 'N/A',
        error: execution.data?.resultData?.error,
        lastNodeExecuted: execution.data?.resultData?.lastNodeExecuted
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(details, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }
});

// Tool: Activate/deactivate workflow
server.tool({
  name: 'toggle_workflow',
  description: 'Activate or deactivate a workflow',
  parameters: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow',
      required: true
    },
    active: {
      type: 'boolean',
      description: 'Set to true to activate, false to deactivate',
      required: true
    }
  },
  execute: async ({ workflowId, active }) => {
    try {
      await n8nClient.patch(`/workflows/${workflowId}`, {
        active: active
      });

      return {
        content: [{
          type: 'text',
          text: `Workflow ${active ? 'activated' : 'deactivated'} successfully`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }
});

// Start the server
console.log('Starting n8n Workflow Manager MCP Server...');
console.log(`n8n URL: ${N8N_BASE_URL}`);
server.start().then(() => {
  console.log('MCP Server started successfully');
}).catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
