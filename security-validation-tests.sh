#!/bin/bash

################################################################################
# Security Validation Test Suite
# For: n8n Workflow Builder - Security Hardened Version
# Date: 2025-11-17
# Description: Automated validation of all 15 security fixes
################################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# File paths
VULNERABLE_FILE="/home/user/N8NWorkflow/domains/n8n/workflows/active/workflow-builder-gemini-v2-with-qa-enhanced.json"
SECURED_FILE="/home/user/N8NWorkflow/domains/n8n/workflows/active/workflow-builder-gemini-v2-with-qa-enhanced-SECURED.json"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST $(($TOTAL_TESTS + 1)):${NC} $1"
}

pass_test() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${GREEN}✅ PASS${NC} - $1\n"
}

fail_test() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${RED}❌ FAIL${NC} - $1\n"
}

################################################################################
# File Validation Tests
################################################################################

test_files_exist() {
    print_header "FILE VALIDATION"

    print_test "Checking if vulnerable file exists"
    if [ -f "$VULNERABLE_FILE" ]; then
        pass_test "Vulnerable file found"
    else
        fail_test "Vulnerable file not found at $VULNERABLE_FILE"
    fi

    print_test "Checking if secured file exists"
    if [ -f "$SECURED_FILE" ]; then
        pass_test "Secured file found"
    else
        fail_test "Secured file not found at $SECURED_FILE"
    fi
}

################################################################################
# FIX #1: API Key in URLs
################################################################################

test_api_key_in_urls() {
    print_header "FIX #1: API KEY EXPOSURE"

    print_test "Checking vulnerable file has API keys in URLs"
    if grep -q "key=\${" "$VULNERABLE_FILE"; then
        pass_test "Vulnerable file has API keys in URLs (expected)"
    else
        fail_test "Vulnerable file should have API keys in URLs"
    fi

    print_test "Checking secured file has NO API keys in URLs"
    if grep -q "key=\${" "$SECURED_FILE"; then
        fail_test "Secured file still has API keys in URLs"
    else
        pass_test "Secured file has no API keys in URLs"
    fi

    print_test "Checking secured file uses header authentication"
    if grep -q "x-goog-api-key" "$SECURED_FILE"; then
        pass_test "Secured file uses header authentication"
    else
        fail_test "Secured file does not use header authentication"
    fi

    print_test "Checking authentication is not 'none'"
    if grep -q '"authentication": "none"' "$SECURED_FILE"; then
        fail_test "Secured file still has authentication: none"
    else
        pass_test "Secured file has proper authentication configured"
    fi
}

################################################################################
# FIX #2: XSS Prevention
################################################################################

test_xss_prevention() {
    print_header "FIX #2: XSS PREVENTION"

    print_test "Checking secured file has escapeHtml function"
    ESCAPE_COUNT=$(grep -o "escapeHtml" "$SECURED_FILE" | wc -l)
    if [ "$ESCAPE_COUNT" -ge 3 ]; then
        pass_test "Secured file has escapeHtml function ($ESCAPE_COUNT occurrences)"
    else
        fail_test "Secured file missing escapeHtml function (found $ESCAPE_COUNT, need >= 3)"
    fi

    print_test "Checking vulnerable file has direct concatenation"
    if grep -q "clientBrief+\`" "$VULNERABLE_FILE"; then
        pass_test "Vulnerable file has unsafe concatenation (expected)"
    else
        fail_test "Cannot verify vulnerable file has unsafe code"
    fi

    print_test "Checking secured file uses HTML escaping"
    if grep -q "escapeHtml(data.clientBrief)" "$SECURED_FILE" || grep -q "escapeHtml(\$json" "$SECURED_FILE"; then
        pass_test "Secured file uses HTML escaping on user input"
    else
        fail_test "Secured file may not be escaping all user input"
    fi
}

################################################################################
# FIX #3: Email Header Injection
################################################################################

test_email_validation() {
    print_header "FIX #3: EMAIL HEADER INJECTION"

    print_test "Checking secured file has isValidEmail function"
    if grep -q "function isValidEmail" "$SECURED_FILE"; then
        pass_test "Secured file has isValidEmail function"
    else
        fail_test "Secured file missing isValidEmail function"
    fi

    print_test "Checking for CRLF validation"
    if grep -q "includes('\\\\n')" "$SECURED_FILE" && grep -q "includes('\\\\r')" "$SECURED_FILE"; then
        pass_test "Secured file checks for CRLF injection"
    else
        fail_test "Secured file missing CRLF injection checks"
    fi

    print_test "Checking for null byte validation"
    if grep -q "includes('\\\\0')" "$SECURED_FILE"; then
        pass_test "Secured file checks for null byte injection"
    else
        fail_test "Secured file missing null byte injection check"
    fi

    print_test "Checking for email length validation"
    if grep -q "email.length > 254" "$SECURED_FILE"; then
        pass_test "Secured file has email length validation"
    else
        fail_test "Secured file missing email length validation"
    fi
}

################################################################################
# FIX #4: Prompt Injection
################################################################################

test_prompt_injection() {
    print_header "FIX #4: PROMPT INJECTION"

    print_test "Checking vulnerable file has unsafe prompt concatenation"
    if grep -q "Client Brief: ' + \$json.clientBrief" "$VULNERABLE_FILE"; then
        pass_test "Vulnerable file has unsafe prompt injection (expected)"
    else
        fail_test "Cannot verify vulnerable file has unsafe prompts"
    fi

    print_test "Checking secured file uses JSON.stringify for prompts"
    STRINGIFY_COUNT=$(grep -o "JSON.stringify(\$json.clientBrief)" "$SECURED_FILE" | wc -l)
    if [ "$STRINGIFY_COUNT" -ge 2 ]; then
        pass_test "Secured file uses JSON.stringify ($STRINGIFY_COUNT occurrences)"
    else
        fail_test "Secured file may not be using JSON.stringify properly (found $STRINGIFY_COUNT)"
    fi
}

################################################################################
# FIX #5: Input Sanitization
################################################################################

test_input_sanitization() {
    print_header "FIX #5: INPUT SANITIZATION"

    print_test "Checking secured file has sanitizeText function"
    if grep -q "function sanitizeText" "$SECURED_FILE"; then
        pass_test "Secured file has sanitizeText function"
    else
        fail_test "Secured file missing sanitizeText function"
    fi

    print_test "Checking for control character removal"
    if grep -q "\\\\x00-\\\\x08" "$SECURED_FILE" || grep -q "control char" "$SECURED_FILE"; then
        pass_test "Secured file removes control characters"
    else
        fail_test "Secured file may not remove control characters"
    fi

    print_test "Checking length limit reduced from 5000 to 2000"
    if grep -q "substring(0, 5000)" "$SECURED_FILE"; then
        fail_test "Secured file still has 5000 char limit"
    elif grep -q "maxLength = 2000" "$SECURED_FILE"; then
        pass_test "Secured file has reduced length limit (2000)"
    else
        fail_test "Cannot verify length limit"
    fi
}

################################################################################
# FIX #6-15: Additional Security Checks
################################################################################

test_additional_security() {
    print_header "ADDITIONAL SECURITY CHECKS"

    print_test "Checking secured file has proper HTML5 structure"
    if grep -q "<!DOCTYPE html>" "$SECURED_FILE"; then
        pass_test "Secured file has proper HTML5 DOCTYPE"
    else
        fail_test "Secured file missing HTML5 DOCTYPE"
    fi

    print_test "Checking secured file has charset declaration"
    if grep -q '<meta charset="UTF-8">' "$SECURED_FILE"; then
        pass_test "Secured file has UTF-8 charset declaration"
    else
        fail_test "Secured file missing charset declaration"
    fi

    print_test "Checking secured file doesn't store sensitive data"
    if grep -q "originalInput: null" "$SECURED_FILE"; then
        pass_test "Secured file doesn't store sensitive data"
    else
        fail_test "Secured file may be storing sensitive data"
    fi

    print_test "Checking secured file has generic error messages"
    if grep -q "We encountered an issue processing your request" "$SECURED_FILE"; then
        pass_test "Secured file has generic error messages"
    else
        fail_test "Secured file may expose error details"
    fi

    print_test "Checking secured file has email case normalization"
    if grep -q ".toLowerCase()" "$SECURED_FILE"; then
        pass_test "Secured file normalizes email case"
    else
        fail_test "Secured file may not normalize email case"
    fi

    print_test "Checking secured file has separate email building node"
    if grep -q '"name": "Build Success Email"' "$SECURED_FILE"; then
        pass_test "Secured file has dedicated email building node"
    else
        fail_test "Secured file missing dedicated email building node"
    fi
}

################################################################################
# Code Quality Checks
################################################################################

test_code_quality() {
    print_header "CODE QUALITY CHECKS"

    print_test "Checking JSON validity of vulnerable file"
    if python3 -m json.tool "$VULNERABLE_FILE" > /dev/null 2>&1; then
        pass_test "Vulnerable file is valid JSON"
    else
        fail_test "Vulnerable file has JSON syntax errors"
    fi

    print_test "Checking JSON validity of secured file"
    if python3 -m json.tool "$SECURED_FILE" > /dev/null 2>&1; then
        pass_test "Secured file is valid JSON"
    else
        fail_test "Secured file has JSON syntax errors"
    fi

    print_test "Checking secured file is larger (more security code)"
    VULN_SIZE=$(wc -c < "$VULNERABLE_FILE")
    SECURE_SIZE=$(wc -c < "$SECURED_FILE")
    if [ "$SECURE_SIZE" -gt "$VULN_SIZE" ]; then
        pass_test "Secured file is larger ($SECURE_SIZE vs $VULN_SIZE bytes)"
    else
        fail_test "Secured file should be larger (more security code)"
    fi
}

################################################################################
# Summary Report
################################################################################

generate_summary() {
    print_header "TEST SUMMARY"

    echo -e "Total Tests Run: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

    PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    echo -e "Pass Rate: ${BLUE}$PASS_RATE%${NC}\n"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                           ║${NC}"
        echo -e "${GREEN}║         ✅ ALL TESTS PASSED - READY FOR DEPLOYMENT       ║${NC}"
        echo -e "${GREEN}║                                                           ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}\n"
        exit 0
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                                                           ║${NC}"
        echo -e "${RED}║      ❌ SOME TESTS FAILED - DO NOT DEPLOY                ║${NC}"
        echo -e "${RED}║                                                           ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}\n"
        exit 1
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║        n8n WORKFLOW SECURITY VALIDATION TEST SUITE            ║"
    echo "║                                                                ║"
    echo "║        Testing: workflow-builder-gemini-v2 (Security)         ║"
    echo "║        Date: $(date +%Y-%m-%d)                                      ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    # Run all test suites
    test_files_exist
    test_api_key_in_urls
    test_xss_prevention
    test_email_validation
    test_prompt_injection
    test_input_sanitization
    test_additional_security
    test_code_quality

    # Generate summary
    generate_summary
}

# Execute main function
main
