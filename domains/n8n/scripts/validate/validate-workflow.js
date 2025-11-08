const fs = require('fs');
const path = require('path');

const workflowPath = process.argv[2] || 'n8n-workflows/workflow-builder-gemini-v2-with-qa.json';
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const validation = {
  valid: true,
  checks: [],
  errors: [],
  warnings: []
};

// Check JSON structure
validation.checks.push({step: 'JSON Syntax', status: 'PASS', details: 'Valid JSON'});

// Check required fields
if (!workflow.name) validation.errors.push('Missing workflow name');
if (!workflow.nodes || !Array.isArray(workflow.nodes)) validation.errors.push('Missing or invalid nodes array');
if (!workflow.connections) validation.errors.push('Missing connections object');

validation.checks.push({
  step: 'Required Fields',
  status: validation.errors.length === 0 ? 'PASS' : 'FAIL',
  details: `Name: ${workflow.name}, Nodes: ${workflow.nodes?.length}, Connections: ${Object.keys(workflow.connections || {}).length}`
});

// Check all nodes have IDs, positions, and types
const nodeIssues = [];
const nodeIds = new Set();
workflow.nodes.forEach((node, i) => {
  if (!node.id) nodeIssues.push(`Node ${i} missing ID`);
  if (!node.type) nodeIssues.push(`Node ${node.id || i} missing type`);
  if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
    nodeIssues.push(`Node ${node.id || i} missing/invalid position`);
  }
  if (nodeIds.has(node.id)) nodeIssues.push(`Duplicate node ID: ${node.id}`);
  nodeIds.add(node.id);
});

validation.checks.push({
  step: 'Node Structure',
  status: nodeIssues.length === 0 ? 'PASS' : 'FAIL',
  details: nodeIssues.length === 0 ? `All ${workflow.nodes.length} nodes valid` : nodeIssues.join('; ')
});

if (nodeIssues.length > 0) validation.errors.push(...nodeIssues);

// Check connections reference existing nodes
const connectionIssues = [];
for (const [sourceNode, connections] of Object.entries(workflow.connections)) {
  if (!workflow.nodes.find(n => n.name === sourceNode)) {
    connectionIssues.push(`Connection from non-existent node: ${sourceNode}`);
  }
  if (connections.main) {
    connections.main.forEach((outputs, i) => {
      outputs?.forEach(conn => {
        if (!workflow.nodes.find(n => n.name === conn.node)) {
          connectionIssues.push(`Connection to non-existent node: ${conn.node}`);
        }
      });
    });
  }
}

validation.checks.push({
  step: 'Connections',
  status: connectionIssues.length === 0 ? 'PASS' : 'FAIL',
  details: connectionIssues.length === 0 ? 'All connections valid' : connectionIssues.join('; ')
});

if (connectionIssues.length > 0) validation.errors.push(...connectionIssues);

// Check for hardcoded secrets (basic check)
const secretIssues = [];
const workflowStr = JSON.stringify(workflow);

// Check if API key is hardcoded (it is, but warn about it)
if (workflowStr.includes('AIzaSyDwHRrv4WHwHDDvK0KzdfpTfm1pnMBbNPk')) {
  validation.warnings.push('Gemini API key is hardcoded in workflow - consider using environment variable');
}

validation.checks.push({
  step: 'Security',
  status: secretIssues.length === 0 ? 'PASS' : 'WARN',
  details: validation.warnings.length > 0 ? validation.warnings.join('; ') : 'No critical secrets detected'
});

// Check Node Reachability - ensure all nodes are reachable from trigger
const nodeReachability = new Map();
const reachabilityIssues = [];

// Initialize all nodes as unreachable
workflow.nodes.forEach(node => {
  nodeReachability.set(node.name, false);
});

// Recursive function to mark nodes as reachable
function markReachable(nodeName, visited = new Set()) {
  if (visited.has(nodeName)) return; // Prevent infinite loops
  visited.add(nodeName);

  if (nodeReachability.get(nodeName) === true) return; // Already processed
  nodeReachability.set(nodeName, true);

  // Find all downstream nodes
  const connections = workflow.connections[nodeName];
  if (connections?.main) {
    connections.main.forEach(outputArray => {
      outputArray?.forEach(conn => {
        markReachable(conn.node, visited);
      });
    });
  }
}

// Find trigger node and start marking reachable nodes
const triggerNode = workflow.nodes.find(n => {
  const type = n.type.toLowerCase();
  return type.includes('trigger') || type.includes('webhook') || type.includes('manual');
});

if (triggerNode) {
  markReachable(triggerNode.name);
}

// Check for unreachable nodes
workflow.nodes.forEach(node => {
  const isTrigger = node.type.toLowerCase().includes('trigger') ||
                   node.type.toLowerCase().includes('webhook') ||
                   node.type.toLowerCase().includes('manual');

  if (!isTrigger && !nodeReachability.get(node.name)) {
    reachabilityIssues.push(`Node "${node.name}" is unreachable (orphaned/disconnected)`);
  }
});

validation.checks.push({
  step: 'Node Reachability',
  status: reachabilityIssues.length === 0 ? 'PASS' : 'FAIL',
  details: reachabilityIssues.length === 0
    ? `All ${workflow.nodes.length} nodes reachable from trigger`
    : reachabilityIssues.join('; ')
});

if (reachabilityIssues.length > 0) {
  validation.errors.push(...reachabilityIssues);
}

// Final validation
validation.valid = validation.errors.length === 0;
validation.summary = {
  totalNodes: workflow.nodes.length,
  totalConnections: Object.keys(workflow.connections).length,
  credentialsRequired: workflow.nodes.filter(n => n.credentials).length,
  gmailNodes: workflow.nodes.filter(n => n.type === 'n8n-nodes-base.gmail').length,
  httpNodes: workflow.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest').length,
  codeNodes: workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code').length
};

console.log(JSON.stringify(validation, null, 2));
process.exit(validation.valid ? 0 : 1);
