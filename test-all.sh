#!/bin/bash

# TikTok Signature Server - Comprehensive Test Runner
# This script provides easy access to all testing capabilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if server is running
check_server() {
    print_status "Checking if server is running..."
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Server is running on localhost:3000"
        return 0
    else
        print_warning "Server is not running on localhost:3000"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "TikTok Signature Server - Test Runner"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all                Run comprehensive test suite (all stages)"
    echo "  stage N            Run specific stage (1-4)"
    echo "  interactive        Run interactive username testing"
    echo "  quick              Run quick validation tests"
    echo "  final              Run final integration test"
    echo "  demo               Run room info fetching demo"
    echo "  setup              Run environment setup and health check"
    echo "  help               Show this help message"
    echo ""
    echo "Stages:"
    echo "  1. Core Components    - SignatureGenerator and basic functionality"
    echo "  2. HTTP Server        - Health check and API endpoints"
    echo "  3. TikTok Integration - Live Connector integration testing"
    echo "  4. Performance        - Response time and performance metrics"
    echo ""
    echo "Examples:"
    echo "  $0 all                # Run complete test suite"
    echo "  $0 stage 3            # Run TikTok integration tests only"
    echo "  $0 interactive        # Interactive username testing"
    echo "  $0 quick              # Quick validation"
    echo "  $0 final              # Final integration test"
    echo ""
    echo "Options:"
    echo "  --no-server-check     Skip server health check"
    echo "  --verbose             Enable verbose output"
}

# Parse command line arguments
COMMAND=${1:-"help"}
SKIP_SERVER_CHECK=false
VERBOSE=false

# Parse options
for arg in "$@"; do
    case $arg in
        --no-server-check)
            SKIP_SERVER_CHECK=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
    esac
done

# Main execution
case $COMMAND in
    "all")
        print_status "Running comprehensive test suite..."
        
        if [ "$SKIP_SERVER_CHECK" = false ]; then
            if ! check_server; then
                print_error "Server is not running. Start it with: npm start"
                exit 1
            fi
        fi
        
        print_status "Starting all test stages..."
        node src/test-suite.js --all
        ;;
        
    "stage")
        STAGE_NUM=${2:-"1"}
        print_status "Running test stage $STAGE_NUM..."
        
        if [ "$SKIP_SERVER_CHECK" = false ] && [ "$STAGE_NUM" != "1" ]; then
            if ! check_server; then
                print_error "Server is not running. Start it with: npm start"
                exit 1
            fi
        fi
        
        node src/test-suite.js --stage $STAGE_NUM
        ;;
        
    "interactive")
        print_status "Starting interactive testing mode..."
        
        if [ "$SKIP_SERVER_CHECK" = false ]; then
            if ! check_server; then
                print_error "Server is not running. Start it with: npm start"
                exit 1
            fi
        fi
        
        node src/test-suite.js --interactive
        ;;
        
    "quick")
        print_status "Running quick validation tests..."
        
        # Run core components and basic HTTP tests
        print_status "Stage 1: Core Components"
        node src/test-suite.js --stage 1
        
        if [ "$SKIP_SERVER_CHECK" = false ]; then
            if check_server; then
                print_status "Stage 2: HTTP Server"
                node src/test-suite.js --stage 2
            else
                print_warning "Skipping HTTP tests - server not running"
            fi
        fi
        
        print_success "Quick validation completed"
        ;;
        
    "final")
        print_status "Running final integration test..."
        
        if [ "$SKIP_SERVER_CHECK" = false ]; then
            if ! check_server; then
                print_error "Server is not running. Start it with: npm start"
                exit 1
            fi
        fi
        
        node src/test-final-solution.js
        ;;
        
    "demo")
        print_status "Running room info fetching demo..."
        
        if [ "$SKIP_SERVER_CHECK" = false ]; then
            if ! check_server; then
                print_error "Server is not running. Start it with: npm start"
                exit 1
            fi
        fi
        
        USERNAME=${2:-""}
        if [ -n "$USERNAME" ]; then
            node src/demo-room-info-fetching.js "$USERNAME"
        else
            node src/demo-room-info-fetching.js
        fi
        ;;
        
    "setup")
        print_status "Running environment setup and health check..."
        node src/test-setup.js all
        ;;
        
    "help"|*)
        show_help
        ;;
esac