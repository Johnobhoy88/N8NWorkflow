#!/bin/bash

# n8n Workflow Builder v3.0 - Smoke Tests
# Quick validation script for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://your-domain.com}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/health}"
WEBHOOK_ENDPOINT="${WEBHOOK_ENDPOINT:-/webhook-test/workflow-builder}"
FORM_ENDPOINT="${FORM_ENDPOINT:-/form/workflow-builder}"
API_KEY="${API_KEY:-test-api-key}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Logging
LOG_FILE="/var/log/n8n/smoke-test-$(date +%Y%m%d_%H%M%S).log"

# Function to print test results
print_result() {
    local test_name=$1
    local status=$2
    local message=$3

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: PASSED"
        ((PASSED++))
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}✗${NC} $test_name: FAILED - $message"
        ((FAILED++))
    else
        echo -e "${YELLOW}⚠${NC} $test_name: WARNING - $message"
        ((WARNINGS++))
    fi

    echo "[$(date)] $test_name: $status - $message" >> "$LOG_FILE"
}

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3

    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response_code" == "$expected_code" ]; then
        print_result "$name" "PASS" "Response code: $response_code"
    else
        print_result "$name" "FAIL" "Expected $expected_code, got $response_code"
    fi
}

echo "========================================="
echo "n8n Workflow Builder v3.0 - Smoke Tests"
echo "========================================="
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date)"
echo ""

# Test 1: Health Check Endpoint
echo "Test 1: Health Check Endpoint"
test_endpoint "Health Check" "$BASE_URL$HEALTH_ENDPOINT" "200"
echo ""

# Test 2: Service Availability
echo "Test 2: Service Availability"
services=("postgresql" "redis" "nginx")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        print_result "Service: $service" "PASS" "Service is running"
    else
        print_result "Service: $service" "FAIL" "Service is not running"
    fi
done
echo ""

# Test 3: Database Connectivity
echo "Test 3: Database Connectivity"
if psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod -c "SELECT 1;" > /dev/null 2>&1; then
    print_result "Database Connection" "PASS" "Connected successfully"
else
    print_result "Database Connection" "FAIL" "Cannot connect to database"
fi
echo ""

# Test 4: Redis Connectivity
echo "Test 4: Redis Connectivity"
if redis-cli ping > /dev/null 2>&1; then
    print_result "Redis Connection" "PASS" "Redis is responsive"
else
    print_result "Redis Connection" "FAIL" "Cannot connect to Redis"
fi
echo ""

# Test 5: Form Endpoint
echo "Test 5: Form Endpoint"
test_endpoint "Form Endpoint" "$BASE_URL$FORM_ENDPOINT" "200"
echo ""

# Test 6: Webhook Test
echo "Test 6: Webhook Test"
webhook_response=$(curl -s -X POST "$BASE_URL$WEBHOOK_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d '{
        "test": true,
        "timestamp": "'$(date -Iseconds)'",
        "source": "smoke-test"
    }' \
    -w "\n%{http_code}")

response_code=$(echo "$webhook_response" | tail -n1)
response_body=$(echo "$webhook_response" | head -n-1)

if [ "$response_code" == "200" ] || [ "$response_code" == "204" ]; then
    print_result "Webhook Test" "PASS" "Webhook accepted request"
else
    print_result "Webhook Test" "FAIL" "Response code: $response_code"
fi
echo ""

# Test 7: SSL Certificate
echo "Test 7: SSL Certificate"
cert_expiry=$(echo | openssl s_client -connect "${BASE_URL#https://}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$cert_expiry" ]; then
    expiry_epoch=$(date -d "$cert_expiry" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))

    if [ $days_until_expiry -gt 30 ]; then
        print_result "SSL Certificate" "PASS" "Valid for $days_until_expiry days"
    elif [ $days_until_expiry -gt 7 ]; then
        print_result "SSL Certificate" "WARNING" "Expires in $days_until_expiry days"
    else
        print_result "SSL Certificate" "FAIL" "Expires in $days_until_expiry days"
    fi
else
    print_result "SSL Certificate" "FAIL" "Could not verify certificate"
fi
echo ""

# Test 8: Metrics Endpoint
echo "Test 8: Metrics Endpoint"
test_endpoint "Metrics Endpoint" "$BASE_URL/metrics" "200"
echo ""

# Test 9: Recent Workflow Executions
echo "Test 9: Recent Workflow Executions"
recent_count=$(psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod -t -c \
    "SELECT COUNT(*) FROM workflow_audit_log WHERE created_at > NOW() - INTERVAL '1 hour';" 2>/dev/null | tr -d ' ')

if [ -n "$recent_count" ] && [ "$recent_count" -ge 0 ]; then
    print_result "Recent Executions" "PASS" "Found $recent_count executions in last hour"
else
    print_result "Recent Executions" "WARNING" "Could not query recent executions"
fi
echo ""

# Test 10: Error Rate Check
echo "Test 10: Error Rate Check"
error_rate=$(psql -h localhost -U n8n_workflow_user -d n8n_workflows_prod -t -c \
    "SELECT COALESCE(
        ROUND(100.0 * COUNT(CASE WHEN error = true THEN 1 END) / NULLIF(COUNT(*), 0), 2),
        0
    )
    FROM workflow_audit_log
    WHERE created_at > NOW() - INTERVAL '1 hour';" 2>/dev/null | tr -d ' ')

if [ -n "$error_rate" ]; then
    if (( $(echo "$error_rate < 5" | bc -l) )); then
        print_result "Error Rate" "PASS" "Error rate: ${error_rate}%"
    elif (( $(echo "$error_rate < 10" | bc -l) )); then
        print_result "Error Rate" "WARNING" "Error rate: ${error_rate}%"
    else
        print_result "Error Rate" "FAIL" "Error rate: ${error_rate}%"
    fi
else
    print_result "Error Rate" "WARNING" "Could not calculate error rate"
fi
echo ""

# Test 11: Disk Space
echo "Test 11: Disk Space"
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    print_result "Disk Space" "PASS" "Disk usage: ${disk_usage}%"
elif [ "$disk_usage" -lt 90 ]; then
    print_result "Disk Space" "WARNING" "Disk usage: ${disk_usage}%"
else
    print_result "Disk Space" "FAIL" "Disk usage: ${disk_usage}%"
fi
echo ""

# Test 12: Memory Usage
echo "Test 12: Memory Usage"
memory_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$memory_usage" -lt 80 ]; then
    print_result "Memory Usage" "PASS" "Memory usage: ${memory_usage}%"
elif [ "$memory_usage" -lt 90 ]; then
    print_result "Memory Usage" "WARNING" "Memory usage: ${memory_usage}%"
else
    print_result "Memory Usage" "FAIL" "Memory usage: ${memory_usage}%"
fi
echo ""

# Test 13: Log File Access
echo "Test 13: Log File Access"
if [ -w "/var/log/n8n/" ]; then
    print_result "Log Directory" "PASS" "Log directory is writable"
else
    print_result "Log Directory" "FAIL" "Cannot write to log directory"
fi
echo ""

# Test 14: Backup Directory
echo "Test 14: Backup Directory"
if [ -d "/var/n8n/backups" ] && [ -w "/var/n8n/backups" ]; then
    print_result "Backup Directory" "PASS" "Backup directory exists and is writable"
else
    print_result "Backup Directory" "WARNING" "Backup directory issue"
fi
echo ""

# Test 15: API Response Time
echo "Test 15: API Response Time"
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL$HEALTH_ENDPOINT")
response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)

if [ "$response_time_ms" -lt 1000 ]; then
    print_result "API Response Time" "PASS" "${response_time_ms}ms"
elif [ "$response_time_ms" -lt 2000 ]; then
    print_result "API Response Time" "WARNING" "${response_time_ms}ms"
else
    print_result "API Response Time" "FAIL" "${response_time_ms}ms"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

# Overall result
if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All smoke tests passed successfully!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Smoke tests passed with warnings${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ Smoke tests failed! Please investigate failures.${NC}"
    echo "Check log file: $LOG_FILE"
    exit 1
fi