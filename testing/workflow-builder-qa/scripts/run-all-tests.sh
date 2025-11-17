#!/bin/bash

# Comprehensive Test Runner Script
# Runs all test suites and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     n8n Workflow Builder - Comprehensive Test Suite       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section header
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to run test suite
run_test_suite() {
    local name=$1
    local command=$2

    echo -e "${YELLOW}▶ Running $name...${NC}"

    if eval "$command"; then
        echo -e "${GREEN}✓ $name passed${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ $name failed${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
    echo ""
}

# Check prerequisites
print_header "Checking Prerequisites"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check k6
if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version)
    echo -e "${GREEN}✓ k6: $K6_VERSION${NC}"
    K6_INSTALLED=true
else
    echo -e "${YELLOW}⚠ k6 not found. Load tests will be skipped${NC}"
    K6_INSTALLED=false
fi

echo ""

# Check environment variables
print_header "Checking Environment Configuration"

if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
    source .env
else
    echo -e "${YELLOW}⚠ .env file not found. Using defaults${NC}"
fi

if [ -n "$GEMINI_API_KEY" ]; then
    echo -e "${GREEN}✓ GEMINI_API_KEY configured${NC}"
else
    echo -e "${YELLOW}⚠ GEMINI_API_KEY not set${NC}"
fi

if [ -n "$N8N_WEBHOOK_URL" ]; then
    echo -e "${GREEN}✓ N8N_WEBHOOK_URL configured${NC}"
else
    echo -e "${YELLOW}⚠ N8N_WEBHOOK_URL not set${NC}"
fi

echo ""

# Install dependencies
print_header "Installing Dependencies"
echo -e "${YELLOW}▶ Running npm install...${NC}"
npm install --silent
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Clean previous reports
print_header "Cleaning Previous Reports"
rm -rf reports coverage
mkdir -p reports coverage
echo -e "${GREEN}✓ Reports directory cleaned${NC}"
echo ""

# Run test suites
print_header "Running Test Suites"

# Unit Tests
run_test_suite "Unit Tests" "npm run test:unit --silent"

# Integration Tests
run_test_suite "Integration Tests" "npm run test:integration --silent"

# End-to-End Tests
run_test_suite "E2E Tests" "npm run test:e2e --silent"

# Security Tests
run_test_suite "Security Tests" "npm run test:security --silent"

# Performance Tests
run_test_suite "Performance Tests" "npm run test:performance --silent"

# Load Tests (if k6 is installed)
if [ "$K6_INSTALLED" = true ]; then
    print_header "Running Load Tests"

    echo -e "${YELLOW}▶ Running Standard Load Test...${NC}"
    if k6 run --quiet --out json=reports/load-test-results.json load-tests/load-test.js; then
        echo -e "${GREEN}✓ Load test passed${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠ Load test completed with warnings${NC}"
    fi
    echo ""
fi

# Generate coverage report
print_header "Generating Coverage Report"
echo -e "${YELLOW}▶ Generating coverage...${NC}"
npm run coverage --silent
echo -e "${GREEN}✓ Coverage report generated${NC}"
echo ""

# Parse coverage
if [ -f coverage/coverage-summary.json ]; then
    COVERAGE=$(node -p "const c = require('./coverage/coverage-summary.json'); Math.round(c.total.lines.pct)")

    if [ "$COVERAGE" -ge 80 ]; then
        echo -e "${GREEN}✓ Coverage: ${COVERAGE}% (meets 80% threshold)${NC}"
    else
        echo -e "${YELLOW}⚠ Coverage: ${COVERAGE}% (below 80% threshold)${NC}"
    fi
fi
echo ""

# Generate summary report
print_header "Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

echo -e "Total Test Suites: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Success Rate: ${BLUE}${SUCCESS_RATE}%${NC}"

if [ -n "$COVERAGE" ]; then
    echo -e "Code Coverage: ${BLUE}${COVERAGE}%${NC}"
fi

echo ""

# Generate HTML report
print_header "Test Reports"
echo -e "Coverage Report: ${BLUE}coverage/lcov-report/index.html${NC}"
echo -e "JUnit Report: ${BLUE}reports/junit.xml${NC}"

if [ "$K6_INSTALLED" = true ]; then
    echo -e "Load Test Report: ${BLUE}reports/load-test-results.json${NC}"
fi

echo ""

# Final result
print_header "Final Result"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   ALL TESTS PASSED! ✓                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                  SOME TESTS FAILED! ✗                      ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
