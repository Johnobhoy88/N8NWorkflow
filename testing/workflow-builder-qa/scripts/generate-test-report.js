#!/usr/bin/env node

/**
 * Test Report Generator
 * Generates comprehensive test reports from test results
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function generateCoverageReport() {
  const summaryPath = path.join(__dirname, '../coverage/coverage-summary.json');
  const summary = readJsonFile(summaryPath);

  if (!summary) {
    console.log(colorize('⚠ Coverage report not found', 'yellow'));
    return null;
  }

  const total = summary.total;

  return {
    lines: total.lines.pct.toFixed(2),
    statements: total.statements.pct.toFixed(2),
    functions: total.functions.pct.toFixed(2),
    branches: total.branches.pct.toFixed(2),
  };
}

function generateJUnitReport() {
  const junitPath = path.join(__dirname, '../reports/junit.xml');

  if (!fs.existsSync(junitPath)) {
    return null;
  }

  const content = fs.readFileSync(junitPath, 'utf8');

  // Simple XML parsing for test counts
  const testsMatch = content.match(/tests="(\d+)"/);
  const failuresMatch = content.match(/failures="(\d+)"/);
  const errorsMatch = content.match(/errors="(\d+)"/);
  const timeMatch = content.match(/time="([\d.]+)"/);

  return {
    total: testsMatch ? parseInt(testsMatch[1]) : 0,
    failures: failuresMatch ? parseInt(failuresMatch[1]) : 0,
    errors: errorsMatch ? parseInt(errorsMatch[1]) : 0,
    time: timeMatch ? parseFloat(timeMatch[1]) : 0,
  };
}

function generateLoadTestReport() {
  const loadTestPath = path.join(__dirname, '../reports/load-test-results.json');

  if (!fs.existsSync(loadTestPath)) {
    return null;
  }

  const content = fs.readFileSync(loadTestPath, 'utf8');
  const lines = content.trim().split('\n');

  // Parse k6 JSON output
  const metrics = {
    http_req_duration: { p95: 0, p99: 0 },
    http_req_failed: { rate: 0 },
    iterations: { count: 0 },
  };

  lines.forEach(line => {
    try {
      const data = JSON.parse(line);

      if (data.type === 'Point' && data.metric) {
        if (data.metric === 'http_req_duration') {
          if (data.data.tags && data.data.tags.percentile === '95') {
            metrics.http_req_duration.p95 = data.data.value;
          }
        }
      }
    } catch (e) {
      // Skip invalid lines
    }
  });

  return metrics;
}

function generateMarkdownReport() {
  const coverage = generateCoverageReport();
  const junit = generateJUnitReport();
  const loadTest = generateLoadTestReport();

  let markdown = '# Test Report\n\n';
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Test Results Section
  markdown += '## Test Results\n\n';

  if (junit) {
    const passed = junit.total - junit.failures - junit.errors;
    const passRate = ((passed / junit.total) * 100).toFixed(2);

    markdown += '| Metric | Value |\n';
    markdown += '|--------|-------|\n';
    markdown += `| Total Tests | ${junit.total} |\n`;
    markdown += `| Passed | ${passed} |\n`;
    markdown += `| Failed | ${junit.failures} |\n`;
    markdown += `| Errors | ${junit.errors} |\n`;
    markdown += `| Pass Rate | ${passRate}% |\n`;
    markdown += `| Duration | ${junit.time.toFixed(2)}s |\n\n`;
  } else {
    markdown += '*No test results available*\n\n';
  }

  // Coverage Section
  markdown += '## Code Coverage\n\n';

  if (coverage) {
    markdown += '| Type | Coverage |\n';
    markdown += '|------|----------|\n';
    markdown += `| Lines | ${coverage.lines}% |\n`;
    markdown += `| Statements | ${coverage.statements}% |\n`;
    markdown += `| Functions | ${coverage.functions}% |\n`;
    markdown += `| Branches | ${coverage.branches}% |\n\n`;

    // Coverage status
    const avgCoverage = (
      parseFloat(coverage.lines) +
      parseFloat(coverage.statements) +
      parseFloat(coverage.functions) +
      parseFloat(coverage.branches)
    ) / 4;

    if (avgCoverage >= 80) {
      markdown += '✅ **Coverage meets 80% threshold**\n\n';
    } else {
      markdown += '⚠️ **Coverage below 80% threshold**\n\n';
    }
  } else {
    markdown += '*No coverage data available*\n\n';
  }

  // Load Test Section
  if (loadTest) {
    markdown += '## Load Test Results\n\n';
    markdown += '| Metric | Value |\n';
    markdown += '|--------|-------|\n';
    markdown += `| HTTP Request Duration (p95) | ${loadTest.http_req_duration.p95.toFixed(2)}ms |\n`;
    markdown += `| HTTP Request Failed Rate | ${(loadTest.http_req_failed.rate * 100).toFixed(2)}% |\n`;
    markdown += `| Total Iterations | ${loadTest.iterations.count} |\n\n`;
  }

  // Recommendations
  markdown += '## Recommendations\n\n';

  if (junit && junit.failures > 0) {
    markdown += '- ⚠️ Fix failing tests before deployment\n';
  }

  if (coverage && parseFloat(coverage.lines) < 80) {
    markdown += '- 📊 Increase test coverage to meet 80% threshold\n';
  }

  if (loadTest && loadTest.http_req_duration.p95 > 5000) {
    markdown += '- ⚡ Optimize response times (p95 should be < 5s)\n';
  }

  if (loadTest && loadTest.http_req_failed.rate > 0.1) {
    markdown += '- 🔧 Investigate and fix error rate issues\n';
  }

  markdown += '\n---\n\n';
  markdown += 'Report generated by Workflow Builder QA Test Suite\n';

  return markdown;
}

function generateConsoleReport() {
  console.log('\n' + colorize('═'.repeat(60), 'blue'));
  console.log(colorize('  Test Report Summary', 'blue'));
  console.log(colorize('═'.repeat(60), 'blue') + '\n');

  // Test Results
  const junit = generateJUnitReport();
  if (junit) {
    console.log(colorize('Test Results:', 'cyan'));
    console.log(`  Total: ${junit.total}`);
    console.log(colorize(`  Passed: ${junit.total - junit.failures - junit.errors}`, 'green'));

    if (junit.failures > 0) {
      console.log(colorize(`  Failed: ${junit.failures}`, 'red'));
    }

    if (junit.errors > 0) {
      console.log(colorize(`  Errors: ${junit.errors}`, 'red'));
    }

    console.log(`  Duration: ${junit.time.toFixed(2)}s\n`);
  }

  // Coverage
  const coverage = generateCoverageReport();
  if (coverage) {
    console.log(colorize('Code Coverage:', 'cyan'));
    console.log(`  Lines: ${coverage.lines}%`);
    console.log(`  Statements: ${coverage.statements}%`);
    console.log(`  Functions: ${coverage.functions}%`);
    console.log(`  Branches: ${coverage.branches}%\n`);

    const avgCoverage = (
      parseFloat(coverage.lines) +
      parseFloat(coverage.statements) +
      parseFloat(coverage.functions) +
      parseFloat(coverage.branches)
    ) / 4;

    if (avgCoverage >= 80) {
      console.log(colorize('  ✓ Coverage meets threshold', 'green') + '\n');
    } else {
      console.log(colorize('  ✗ Coverage below threshold', 'yellow') + '\n');
    }
  }

  // Load Tests
  const loadTest = generateLoadTestReport();
  if (loadTest) {
    console.log(colorize('Load Test Results:', 'cyan'));
    console.log(`  Response Time (p95): ${loadTest.http_req_duration.p95.toFixed(2)}ms`);
    console.log(`  Error Rate: ${(loadTest.http_req_failed.rate * 100).toFixed(2)}%`);
    console.log(`  Iterations: ${loadTest.iterations.count}\n`);
  }

  console.log(colorize('═'.repeat(60), 'blue') + '\n');
}

function saveReport() {
  const markdown = generateMarkdownReport();
  const reportPath = path.join(__dirname, '../reports/TEST_REPORT.md');

  fs.writeFileSync(reportPath, markdown);
  console.log(colorize(`✓ Report saved to ${reportPath}`, 'green'));
}

// Main execution
if (require.main === module) {
  generateConsoleReport();
  saveReport();
}

module.exports = {
  generateCoverageReport,
  generateJUnitReport,
  generateLoadTestReport,
  generateMarkdownReport,
};
