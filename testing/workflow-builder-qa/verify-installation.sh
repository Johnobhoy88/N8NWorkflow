#!/bin/bash

# Installation Verification Script
# Verifies that all test suite components are properly installed

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Suite Installation Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 ${RED}(missing)${NC}"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        return 0
    else
        echo -e "${RED}✗${NC} $1/ ${RED}(missing)${NC}"
        return 1
    fi
}

ERRORS=0

echo -e "${YELLOW}Checking directory structure...${NC}\n"

# Check directories
check_dir "tests" || ((ERRORS++))
check_dir "tests/integration" || ((ERRORS++))
check_dir "tests/e2e" || ((ERRORS++))
check_dir "tests/security" || ((ERRORS++))
check_dir "fixtures" || ((ERRORS++))
check_dir "mocks" || ((ERRORS++))
check_dir "load-tests" || ((ERRORS++))
check_dir "scripts" || ((ERRORS++))
check_dir ".github/workflows" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking test files...${NC}\n"

# Check test files
check_file "tests/setup.js" || ((ERRORS++))
check_file "tests/integration/workflow-builder.test.js" || ((ERRORS++))
check_file "tests/e2e/workflow-execution.test.js" || ((ERRORS++))
check_file "tests/security/security-validation.test.js" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking fixture files...${NC}\n"

check_file "fixtures/email-trigger-data.json" || ((ERRORS++))
check_file "fixtures/form-trigger-data.json" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking mock files...${NC}\n"

check_file "mocks/gemini-responses.json" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking load test files...${NC}\n"

check_file "load-tests/load-test.js" || ((ERRORS++))
check_file "load-tests/stress-test.js" || ((ERRORS++))
check_file "load-tests/spike-test.js" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking configuration files...${NC}\n"

check_file "package.json" || ((ERRORS++))
check_file "jest.config.js" || ((ERRORS++))
check_file ".env.example" || ((ERRORS++))
check_file ".gitignore" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking documentation...${NC}\n"

check_file "README.md" || ((ERRORS++))
check_file "QUICKSTART.md" || ((ERRORS++))
check_file "DELIVERABLES.md" || ((ERRORS++))
check_file "TEST_COVERAGE_SUMMARY.md" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking scripts...${NC}\n"

check_file "scripts/run-all-tests.sh" || ((ERRORS++))
check_file "scripts/generate-test-report.js" || ((ERRORS++))

echo ""
echo -e "${YELLOW}Checking CI/CD configuration...${NC}\n"

check_file ".github/workflows/test-suite.yml" || ((ERRORS++))

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All files present - Installation verified!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Run: npm install"
    echo "2. Copy: cp .env.example .env"
    echo "3. Edit .env with your credentials"
    echo "4. Run: npm test"
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS file(s) missing - Installation incomplete${NC}"
    echo ""
    exit 1
fi
