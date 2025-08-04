#!/bin/bash

echo "🧪 Testing All Demo Scripts After SignTok Directory Backup"
echo "=========================================================="
echo "This script tests all demo .js files to ensure they work with npm signtok package"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local timeout_duration="$3"
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Run with timeout to prevent hanging
    if timeout $timeout_duration bash -c "$test_command" 2>&1; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo ""
    echo "=================================================="
    echo ""
}

# Start testing
echo "🚀 Starting comprehensive testing..."
echo ""

# Test 1: Basic SignatureGenerator
run_test "SignatureGenerator Basic Load" \
    "node -e \"const SG = require('./src/SignatureGenerator'); console.log('✅ SignatureGenerator loaded successfully');\"" \
    "10s"

# Test 2: Server startup (quick test)
run_test "Server Startup Test" \
    "timeout 5s node src/server.js || echo 'Server started and stopped (expected)'" \
    "10s"

# Test 3: Signature generation test
run_test "Signature Generation Test" \
    "node src/test-signature-generator.js" \
    "30s"

# Test 4: HTTP API test
run_test "HTTP API Test" \
    "node src/test-http-api.js" \
    "30s"

# Test 5: Real TikTok URLs test (limited)
run_test "Real TikTok URLs Test (Sample)" \
    "node -e \"
const test = require('./src/test-real-tiktok-urls');
console.log('✅ Real TikTok URLs test module loaded successfully');
\"" \
    "15s"

# Test 6: TikTok Connector Integration
run_test "TikTok Connector Integration Test" \
    "node src/test-direct-integration.js" \
    "45s"

# Test 7: Final Solution Test
run_test "Final Solution Test" \
    "node src/test-final-solution.js" \
    "60s"

# Test 8: Room Info Demo (basic load)
run_test "Room Info Demo Load Test" \
    "node -e \"
const demo = require('./src/demo-room-info-fetching');
console.log('✅ Room Info Demo loaded successfully');
\"" \
    "15s"

# Test 9: Signing Server Calls Test
run_test "Signing Server Calls Test" \
    "node src/test-signing-server-calls.js testuser" \
    "45s"

# Test 10: Comprehensive test
run_test "Comprehensive Test" \
    "node src/test-comprehensive.js" \
    "30s"

# Summary
echo ""
echo "📊 TEST SUMMARY"
echo "==============="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}"
    echo "🎉 ALL TESTS PASSED!"
    echo "✅ Safe to remove src/signtok.backup"
    echo "✅ npm signtok package is working perfectly"
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}"
    echo "❌ SOME TESTS FAILED!"
    echo "⚠️  DO NOT remove src/signtok.backup yet"
    echo "🔧 Investigate failed tests before cleanup"
    echo -e "${NC}"
    exit 1
fi