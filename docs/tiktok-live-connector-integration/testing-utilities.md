# Testing Utilities for TikTok Live Connector Compatibility

## Overview

This document provides comprehensive testing utilities and scripts to verify TikTok Live Connector compatibility with our signing service. These tools help ensure your integration works correctly before deploying to production.

## Built-in Testing Endpoints

### 1. Service Health Check
**Endpoint**: `GET /api/health`

```bash
curl https://your-app.vercel.app/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "signature_generator_ready": true,
  "database_connected": true,
  "quota_status": {
    "edge_functions": {
      "used": 1250,
      "limit": 2000000,
      "percentage": 0.06
    }
  },
  "response_time_ms": 45
}
```

### 2. Compatibility Test Suite
**Endpoint**: `POST /api/test/compatibility`

```bash
curl -X POST https://your-app.vercel.app/api/test/compatibility \
  -H "Content-Type: application/json" \
  -d '{
    "testSuite": "full_compatibility",
    "testUrl": "https://www.tiktok.com/@testuser/live"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "testSuite": "full_compatibility",
  "results": {
    "eulerstream_format": {
      "passed": true,
      "response_time_ms": 156,
      "signature_valid": true
    },
    "tiktok_live_connector": {
      "passed": true,
      "response_time_ms": 142,
      "connection_successful": true
    },
    "error_handling": {
      "passed": true,
      "invalid_url_handled": true,
      "rate_limit_handled": true
    }
  },
  "overall_score": "100%",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. TikTok Live Connector Integration Test
**Endpoint**: `POST /api/test/tiktok-connector`

```bash
curl -X POST https://your-app.vercel.app/api/test/tiktok-connector \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "timeout": 10000,
    "testEvents": ["chat", "gift", "like"]
  }'
```

## JavaScript Testing Utilities

### 1. Basic Connection Tester

```javascript
// test-connection.js
const { TikTokLiveConnector } = require('tiktok-live-connector');

class ConnectionTester {
    constructor(serviceUrl, apiKey = null) {
        this.serviceUrl = serviceUrl;
        this.apiKey = apiKey;
        this.testResults = [];
    }

    async testBasicConnection(username = 'testuser') {
        console.log('🧪 Testing basic connection...');
        
        const config = {
            signProvider: `${this.serviceUrl}/api/eulerstream`
        };

        if (this.apiKey) {
            config.signProviderHeaders = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };
        }

        const connection = new TikTokLiveConnector(username, config);
        
        try {
            const startTime = Date.now();
            const state = await connection.connect();
            const responseTime = Date.now() - startTime;
            
            connection.disconnect();
            
            const result = {
                test: 'basic_connection',
                passed: true,
                responseTime,
                state,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            console.log('✅ Basic connection test passed');
            console.log(`   Response time: ${responseTime}ms`);
            console.log(`   State: ${JSON.stringify(state)}`);
            
            return result;
        } catch (error) {
            const result = {
                test: 'basic_connection',
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            console.log('❌ Basic connection test failed');
            console.log(`   Error: ${error.message}`);
            
            return result;
        }
    }

    async testServiceHealth() {
        console.log('🏥 Testing service health...');
        
        try {
            const response = await fetch(`${this.serviceUrl}/api/health`);
            const health = await response.json();
            
            const result = {
                test: 'service_health',
                passed: health.status === 'healthy',
                health,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            
            if (result.passed) {
                console.log('✅ Service health test passed');
                console.log(`   Status: ${health.status}`);
                console.log(`   Response time: ${health.response_time_ms}ms`);
            } else {
                console.log('❌ Service health test failed');
                console.log(`   Status: ${health.status}`);
            }
            
            return result;
        } catch (error) {
            const result = {
                test: 'service_health',
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            console.log('❌ Service health test failed');
            console.log(`   Error: ${error.message}`);
            
            return result;
        }
    }

    async testSignatureGeneration(testUrl = 'https://www.tiktok.com/@testuser/live') {
        console.log('🔐 Testing signature generation...');
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const startTime = Date.now();
            const response = await fetch(`${this.serviceUrl}/api/eulerstream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ url: testUrl })
            });
            const responseTime = Date.now() - startTime;
            
            const data = await response.json();
            
            const result = {
                test: 'signature_generation',
                passed: data.success && data.data && data.data.signature,
                responseTime,
                data,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            
            if (result.passed) {
                console.log('✅ Signature generation test passed');
                console.log(`   Response time: ${responseTime}ms`);
                console.log(`   Signature length: ${data.data.signature.length}`);
            } else {
                console.log('❌ Signature generation test failed');
                console.log(`   Response: ${JSON.stringify(data)}`);
            }
            
            return result;
        } catch (error) {
            const result = {
                test: 'signature_generation',
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            console.log('❌ Signature generation test failed');
            console.log(`   Error: ${error.message}`);
            
            return result;
        }
    }

    async testErrorHandling() {
        console.log('🚨 Testing error handling...');
        
        const tests = [
            {
                name: 'invalid_url',
                url: 'invalid-url',
                expectedError: true
            },
            {
                name: 'empty_url',
                url: '',
                expectedError: true
            },
            {
                name: 'non_tiktok_url',
                url: 'https://www.youtube.com/watch?v=test',
                expectedError: true
            }
        ];

        const results = [];
        
        for (const test of tests) {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };

                if (this.apiKey) {
                    headers['Authorization'] = `Bearer ${this.apiKey}`;
                }

                const response = await fetch(`${this.serviceUrl}/api/eulerstream`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ url: test.url })
                });
                
                const data = await response.json();
                
                const passed = test.expectedError ? !data.success : data.success;
                
                const result = {
                    test: `error_handling_${test.name}`,
                    passed,
                    expectedError: test.expectedError,
                    actualError: !data.success,
                    response: data,
                    timestamp: new Date().toISOString()
                };
                
                results.push(result);
                this.testResults.push(result);
                
                if (passed) {
                    console.log(`✅ Error handling test (${test.name}) passed`);
                } else {
                    console.log(`❌ Error handling test (${test.name}) failed`);
                    console.log(`   Expected error: ${test.expectedError}, Got error: ${!data.success}`);
                }
                
            } catch (error) {
                const result = {
                    test: `error_handling_${test.name}`,
                    passed: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                
                results.push(result);
                this.testResults.push(result);
                console.log(`❌ Error handling test (${test.name}) failed with exception: ${error.message}`);
            }
        }
        
        return results;
    }

    async runAllTests(username = 'testuser') {
        console.log('🚀 Running comprehensive test suite...\n');
        
        const tests = [
            () => this.testServiceHealth(),
            () => this.testSignatureGeneration(),
            () => this.testBasicConnection(username),
            () => this.testErrorHandling()
        ];
        
        for (const test of tests) {
            await test();
            console.log(''); // Add spacing between tests
        }
        
        this.printSummary();
        return this.testResults;
    }

    printSummary() {
        console.log('📊 Test Summary');
        console.log('================');
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const percentage = Math.round((passed / total) * 100);
        
        console.log(`Total tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        console.log(`Success rate: ${percentage}%`);
        
        if (percentage === 100) {
            console.log('🎉 All tests passed! Your integration is ready.');
        } else {
            console.log('⚠️ Some tests failed. Check the results above.');
        }
        
        console.log('\nDetailed Results:');
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.responseTime) {
                console.log(`   Response time: ${result.responseTime}ms`);
            }
        });
    }

    getResults() {
        return {
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.passed).length,
                failed: this.testResults.filter(r => !r.passed).length,
                successRate: Math.round((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100)
            },
            details: this.testResults
        };
    }
}

// Usage example
async function main() {
    const serviceUrl = process.env.SERVICE_URL || 'https://your-app.vercel.app';
    const apiKey = process.env.TIKTOK_API_KEY; // Optional
    const username = process.argv[2] || 'testuser';
    
    const tester = new ConnectionTester(serviceUrl, apiKey);
    
    try {
        await tester.runAllTests(username);
    } catch (error) {
        console.error('Test suite failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ConnectionTester;
```

### 2. Load Testing Utility

```javascript
// load-test.js
const { TikTokLiveConnector } = require('tiktok-live-connector');

class LoadTester {
    constructor(serviceUrl, apiKey = null) {
        this.serviceUrl = serviceUrl;
        this.apiKey = apiKey;
        this.results = [];
    }

    async testConcurrentConnections(usernames, maxConcurrent = 5) {
        console.log(`🔄 Testing ${usernames.length} connections with max ${maxConcurrent} concurrent...`);
        
        const results = [];
        const chunks = this.chunkArray(usernames, maxConcurrent);
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`\nBatch ${i + 1}/${chunks.length}: Testing ${chunk.length} connections...`);
            
            const promises = chunk.map(username => this.testSingleConnection(username));
            const batchResults = await Promise.allSettled(promises);
            
            batchResults.forEach((result, index) => {
                const username = chunk[index];
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                    console.log(`✅ ${username}: ${result.value.responseTime}ms`);
                } else {
                    results.push({
                        username,
                        success: false,
                        error: result.reason.message,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`❌ ${username}: ${result.reason.message}`);
                }
            });
            
            // Wait between batches to avoid overwhelming the service
            if (i < chunks.length - 1) {
                await this.sleep(2000);
            }
        }
        
        this.analyzeResults(results);
        return results;
    }

    async testSingleConnection(username) {
        const config = {
            signProvider: `${this.serviceUrl}/api/eulerstream`
        };

        if (this.apiKey) {
            config.signProviderHeaders = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };
        }

        const connection = new TikTokLiveConnector(username, config);
        const startTime = Date.now();
        
        try {
            const state = await connection.connect();
            const responseTime = Date.now() - startTime;
            
            connection.disconnect();
            
            return {
                username,
                success: true,
                responseTime,
                state,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                username,
                success: false,
                responseTime,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async testRateLimiting() {
        console.log('⏱️ Testing rate limiting...');
        
        const requests = [];
        const startTime = Date.now();
        
        // Send 20 requests rapidly
        for (let i = 0; i < 20; i++) {
            requests.push(this.makeSignatureRequest(`https://www.tiktok.com/@testuser${i}/live`));
        }
        
        const results = await Promise.allSettled(requests);
        const endTime = Date.now();
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const rateLimited = results.filter(r => 
            r.status === 'fulfilled' && 
            r.value.error && 
            r.value.error.includes('rate limit')
        ).length;
        
        console.log(`📊 Rate limiting test results:`);
        console.log(`   Total requests: ${requests.length}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Rate limited: ${rateLimited}`);
        console.log(`   Total time: ${endTime - startTime}ms`);
        
        return {
            totalRequests: requests.length,
            successful,
            rateLimited,
            totalTime: endTime - startTime,
            results
        };
    }

    async makeSignatureRequest(url) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        try {
            const response = await fetch(`${this.serviceUrl}/api/eulerstream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ url })
            });
            
            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    analyzeResults(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        if (successful.length > 0) {
            const responseTimes = successful.map(r => r.responseTime);
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const minResponseTime = Math.min(...responseTimes);
            const maxResponseTime = Math.max(...responseTimes);
            
            console.log(`\n📈 Performance Analysis:`);
            console.log(`   Successful connections: ${successful.length}/${results.length}`);
            console.log(`   Average response time: ${Math.round(avgResponseTime)}ms`);
            console.log(`   Min response time: ${minResponseTime}ms`);
            console.log(`   Max response time: ${maxResponseTime}ms`);
            console.log(`   Success rate: ${Math.round((successful.length / results.length) * 100)}%`);
        }
        
        if (failed.length > 0) {
            console.log(`\n❌ Failed connections: ${failed.length}`);
            const errorCounts = {};
            failed.forEach(f => {
                const error = f.error || 'Unknown error';
                errorCounts[error] = (errorCounts[error] || 0) + 1;
            });
            
            Object.entries(errorCounts).forEach(([error, count]) => {
                console.log(`   ${error}: ${count} times`);
            });
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Usage example
async function main() {
    const serviceUrl = process.env.SERVICE_URL || 'https://your-app.vercel.app';
    const apiKey = process.env.TIKTOK_API_KEY;
    
    const tester = new LoadTester(serviceUrl, apiKey);
    
    // Test with multiple usernames
    const usernames = [
        'testuser1', 'testuser2', 'testuser3', 'testuser4', 'testuser5',
        'testuser6', 'testuser7', 'testuser8', 'testuser9', 'testuser10'
    ];
    
    try {
        console.log('🚀 Starting load tests...\n');
        
        // Test concurrent connections
        await tester.testConcurrentConnections(usernames, 3);
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Test rate limiting (only if no API key)
        if (!apiKey) {
            await tester.testRateLimiting();
        } else {
            console.log('⏭️ Skipping rate limiting test (API key provided)');
        }
        
    } catch (error) {
        console.error('Load test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = LoadTester;
```

### 3. Integration Test Suite

```javascript
// integration-test.js
const { TikTokLiveConnector } = require('tiktok-live-connector');
const ConnectionTester = require('./test-connection');
const LoadTester = require('./load-test');

class IntegrationTestSuite {
    constructor(serviceUrl, apiKey = null) {
        this.serviceUrl = serviceUrl;
        this.apiKey = apiKey;
        this.connectionTester = new ConnectionTester(serviceUrl, apiKey);
        this.loadTester = new LoadTester(serviceUrl, apiKey);
        this.allResults = [];
    }

    async runFullTestSuite() {
        console.log('🎯 Running Full Integration Test Suite');
        console.log('=====================================\n');
        
        const tests = [
            { name: 'Basic Functionality', fn: () => this.testBasicFunctionality() },
            { name: 'Event Handling', fn: () => this.testEventHandling() },
            { name: 'Error Recovery', fn: () => this.testErrorRecovery() },
            { name: 'Performance', fn: () => this.testPerformance() },
            { name: 'Compatibility', fn: () => this.testCompatibility() }
        ];
        
        for (const test of tests) {
            console.log(`\n🧪 Running ${test.name} Tests...`);
            console.log('-'.repeat(40));
            
            try {
                const result = await test.fn();
                this.allResults.push({
                    testSuite: test.name,
                    success: true,
                    result,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error(`❌ ${test.name} tests failed:`, error);
                this.allResults.push({
                    testSuite: test.name,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        this.printFinalSummary();
        return this.allResults;
    }

    async testBasicFunctionality() {
        console.log('Testing basic service functionality...');
        
        const results = await this.connectionTester.runAllTests('testuser');
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        
        console.log(`✅ Basic functionality: ${passed}/${total} tests passed`);
        return { passed, total, details: results };
    }

    async testEventHandling() {
        console.log('Testing TikTok Live Connector event handling...');
        
        const config = {
            signProvider: `${this.serviceUrl}/api/eulerstream`
        };

        if (this.apiKey) {
            config.signProviderHeaders = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };
        }

        const connection = new TikTokLiveConnector('testuser', config);
        const events = [];
        const timeout = 10000; // 10 seconds
        
        // Set up event listeners
        const eventTypes = ['connected', 'disconnected', 'error', 'chat', 'gift', 'like', 'follow'];
        eventTypes.forEach(eventType => {
            connection.on(eventType, (data) => {
                events.push({
                    type: eventType,
                    data,
                    timestamp: new Date().toISOString()
                });
            });
        });
        
        try {
            // Test connection
            const startTime = Date.now();
            await connection.connect();
            
            // Wait for potential events
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            connection.disconnect();
            
            const responseTime = Date.now() - startTime;
            
            console.log(`✅ Event handling test completed`);
            console.log(`   Connection time: ${responseTime}ms`);
            console.log(`   Events captured: ${events.length}`);
            
            return {
                success: true,
                responseTime,
                eventsCount: events.length,
                events: events.slice(0, 5) // First 5 events for brevity
            };
            
        } catch (error) {
            console.log(`❌ Event handling test failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                eventsCount: events.length,
                events
            };
        }
    }

    async testErrorRecovery() {
        console.log('Testing error recovery and reconnection...');
        
        const config = {
            signProvider: `${this.serviceUrl}/api/eulerstream`
        };

        if (this.apiKey) {
            config.signProviderHeaders = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };
        }

        // Test with invalid username first
        const invalidConnection = new TikTokLiveConnector('', config);
        
        try {
            await invalidConnection.connect();
            console.log('⚠️ Expected error for invalid username, but connection succeeded');
            return { errorHandling: false };
        } catch (error) {
            console.log('✅ Properly handled invalid username error');
        }
        
        // Test with valid username
        const validConnection = new TikTokLiveConnector('testuser', config);
        
        try {
            await validConnection.connect();
            validConnection.disconnect();
            console.log('✅ Recovery to valid connection successful');
            
            return {
                errorHandling: true,
                recovery: true
            };
        } catch (error) {
            console.log(`❌ Recovery test failed: ${error.message}`);
            return {
                errorHandling: true,
                recovery: false,
                error: error.message
            };
        }
    }

    async testPerformance() {
        console.log('Testing performance with multiple connections...');
        
        const usernames = ['testuser1', 'testuser2', 'testuser3'];
        const results = await this.loadTester.testConcurrentConnections(usernames, 2);
        
        const successful = results.filter(r => r.success);
        const avgResponseTime = successful.length > 0 
            ? successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length 
            : 0;
        
        console.log(`✅ Performance test completed`);
        console.log(`   Success rate: ${Math.round((successful.length / results.length) * 100)}%`);
        console.log(`   Average response time: ${Math.round(avgResponseTime)}ms`);
        
        return {
            totalTests: results.length,
            successful: successful.length,
            averageResponseTime: Math.round(avgResponseTime),
            successRate: Math.round((successful.length / results.length) * 100)
        };
    }

    async testCompatibility() {
        console.log('Testing EulerStream compatibility...');
        
        try {
            const response = await fetch(`${this.serviceUrl}/api/test/compatibility`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                body: JSON.stringify({
                    testSuite: 'eulerstream_compatibility',
                    testUrl: 'https://www.tiktok.com/@testuser/live'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ EulerStream compatibility test passed');
                console.log(`   Overall score: ${result.overall_score}`);
                
                return {
                    success: true,
                    score: result.overall_score,
                    details: result.results
                };
            } else {
                console.log('❌ EulerStream compatibility test failed');
                return {
                    success: false,
                    error: result.error || 'Unknown error'
                };
            }
            
        } catch (error) {
            console.log(`❌ Compatibility test failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    printFinalSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('🎯 FINAL TEST SUMMARY');
        console.log('='.repeat(50));
        
        const successful = this.allResults.filter(r => r.success).length;
        const total = this.allResults.length;
        const successRate = Math.round((successful / total) * 100);
        
        console.log(`\nOverall Results:`);
        console.log(`   Test Suites: ${total}`);
        console.log(`   Passed: ${successful}`);
        console.log(`   Failed: ${total - successful}`);
        console.log(`   Success Rate: ${successRate}%`);
        
        console.log(`\nDetailed Results:`);
        this.allResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.testSuite}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        if (successRate === 100) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('Your TikTok Live Connector integration is fully compatible and ready for production.');
        } else if (successRate >= 80) {
            console.log('\n⚠️ MOSTLY SUCCESSFUL');
            console.log('Your integration is mostly working, but some issues were found. Review the failed tests above.');
        } else {
            console.log('\n❌ SIGNIFICANT ISSUES FOUND');
            console.log('Your integration has significant issues. Please review and fix the failed tests before proceeding.');
        }
        
        console.log('\nNext Steps:');
        if (successRate === 100) {
            console.log('• Deploy to production');
            console.log('• Set up monitoring and alerts');
            console.log('• Consider getting API keys for unlimited access');
        } else {
            console.log('• Review failed test details');
            console.log('• Check service health and configuration');
            console.log('• Consult troubleshooting guide');
            console.log('• Re-run tests after fixes');
        }
    }
}

// Usage
async function main() {
    const serviceUrl = process.env.SERVICE_URL || 'https://your-app.vercel.app';
    const apiKey = process.env.TIKTOK_API_KEY;
    
    console.log(`🚀 Starting Integration Test Suite`);
    console.log(`Service URL: ${serviceUrl}`);
    console.log(`API Key: ${apiKey ? 'Provided' : 'Not provided (using free tier)'}`);
    
    const testSuite = new IntegrationTestSuite(serviceUrl, apiKey);
    
    try {
        const results = await testSuite.runFullTestSuite();
        
        // Save results to file
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `test-results-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify({
            timestamp: new Date().toISOString(),
            serviceUrl,
            hasApiKey: !!apiKey,
            results
        }, null, 2));
        
        console.log(`\n📄 Test results saved to: ${filename}`);
        
    } catch (error) {
        console.error('Integration test suite failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = IntegrationTestSuite;
```

## Bash Testing Scripts

### 1. Quick Health Check Script

```bash
#!/bin/bash
# quick-health-check.sh

SERVICE_URL=${1:-"https://your-app.vercel.app"}
API_KEY=${2:-""}

echo "🏥 Quick Health Check for $SERVICE_URL"
echo "========================================"

# Test service health
echo "1. Testing service health..."
HEALTH_RESPONSE=$(curl -s "$SERVICE_URL/api/health")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status // "unknown"')

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Service is healthy"
    RESPONSE_TIME=$(echo $HEALTH_RESPONSE | jq -r '.response_time_ms // 0')
    echo "   Response time: ${RESPONSE_TIME}ms"
else
    echo "❌ Service health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test signature generation
echo ""
echo "2. Testing signature generation..."
if [ -n "$API_KEY" ]; then
    AUTH_HEADER="Authorization: Bearer $API_KEY"
else
    AUTH_HEADER=""
fi

SIGNATURE_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/eulerstream" \
    -H "Content-Type: application/json" \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
    -d '{"url": "https://www.tiktok.com/@testuser/live"}')

SUCCESS=$(echo $SIGNATURE_RESPONSE | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
    echo "✅ Signature generation working"
    SIGNATURE_LENGTH=$(echo $SIGNATURE_RESPONSE | jq -r '.data.signature | length')
    echo "   Signature length: $SIGNATURE_LENGTH characters"
else
    echo "❌ Signature generation failed"
    ERROR=$(echo $SIGNATURE_RESPONSE | jq -r '.error // "Unknown error"')
    echo "   Error: $ERROR"
    exit 1
fi

# Test compatibility endpoint
echo ""
echo "3. Testing compatibility..."
COMPAT_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/test/compatibility" \
    -H "Content-Type: application/json" \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
    -d '{"testSuite": "basic", "testUrl": "https://www.tiktok.com/@testuser/live"}')

COMPAT_SUCCESS=$(echo $COMPAT_RESPONSE | jq -r '.success // false')

if [ "$COMPAT_SUCCESS" = "true" ]; then
    echo "✅ Compatibility test passed"
    SCORE=$(echo $COMPAT_RESPONSE | jq -r '.overall_score // "N/A"')
    echo "   Score: $SCORE"
else
    echo "❌ Compatibility test failed"
    echo "   Response: $COMPAT_RESPONSE"
fi

echo ""
echo "🎉 Health check completed!"
```

### 2. Load Testing Script

```bash
#!/bin/bash
# load-test.sh

SERVICE_URL=${1:-"https://your-app.vercel.app"}
API_KEY=${2:-""}
CONCURRENT=${3:-5}
TOTAL_REQUESTS=${4:-20}

echo "⚡ Load Testing $SERVICE_URL"
echo "Concurrent requests: $CONCURRENT"
echo "Total requests: $TOTAL_REQUESTS"
echo "================================"

# Create temporary directory for results
TEMP_DIR=$(mktemp -d)
echo "Temp directory: $TEMP_DIR"

# Function to make a single request
make_request() {
    local id=$1
    local start_time=$(date +%s%3N)
    
    if [ -n "$API_KEY" ]; then
        AUTH_HEADER="Authorization: Bearer $API_KEY"
    else
        AUTH_HEADER=""
    fi
    
    local response=$(curl -s -w "%{http_code},%{time_total}" -X POST "$SERVICE_URL/api/eulerstream" \
        -H "Content-Type: application/json" \
        ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
        -d "{\"url\": \"https://www.tiktok.com/@testuser$id/live\"}")
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    echo "$id,$duration,$response" >> "$TEMP_DIR/results.csv"
}

# Export function for parallel execution
export -f make_request
export SERVICE_URL API_KEY TEMP_DIR

# Create results header
echo "request_id,duration_ms,http_code,curl_time" > "$TEMP_DIR/results.csv"

# Run requests in parallel batches
echo "🚀 Starting load test..."
seq 1 $TOTAL_REQUESTS | xargs -n 1 -P $CONCURRENT -I {} bash -c 'make_request {}'

# Analyze results
echo ""
echo "📊 Analyzing results..."

# Count successful requests
SUCCESSFUL=$(awk -F',' 'NR>1 && $3==200 {count++} END {print count+0}' "$TEMP_DIR/results.csv")
TOTAL_ACTUAL=$(awk 'NR>1 {count++} END {print count+0}' "$TEMP_DIR/results.csv")

echo "Total requests: $TOTAL_ACTUAL"
echo "Successful: $SUCCESSFUL"
echo "Failed: $((TOTAL_ACTUAL - SUCCESSFUL))"
echo "Success rate: $(awk "BEGIN {printf \"%.1f%%\", ($SUCCESSFUL/$TOTAL_ACTUAL)*100}")"

# Calculate response time statistics
if [ $SUCCESSFUL -gt 0 ]; then
    echo ""
    echo "Response Time Statistics:"
    awk -F',' 'NR>1 && $3==200 {
        times[NR] = $2
        sum += $2
        count++
        if (min == "" || $2 < min) min = $2
        if (max == "" || $2 > max) max = $2
    } END {
        if (count > 0) {
            avg = sum / count
            print "   Average: " avg "ms"
            print "   Min: " min "ms" 
            print "   Max: " max "ms"
        }
    }' "$TEMP_DIR/results.csv"
fi

# Check for rate limiting
RATE_LIMITED=$(grep -c "429" "$TEMP_DIR/results.csv" 2>/dev/null || echo 0)
if [ $RATE_LIMITED -gt 0 ]; then
    echo ""
    echo "⚠️ Rate limiting detected: $RATE_LIMITED requests"
    if [ -z "$API_KEY" ]; then
        echo "   Consider using an API key for unlimited access"
    fi
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Load test completed!"
```

## Usage Instructions

### Running the Tests

1. **Install Dependencies**:
```bash
npm install tiktok-live-connector
```

2. **Set Environment Variables**:
```bash
export SERVICE_URL="https://your-app.vercel.app"
export TIKTOK_API_KEY="your-api-key-here"  # Optional
```

3. **Run Basic Tests**:
```bash
node test-connection.js
```

4. **Run Load Tests**:
```bash
node load-test.js
```

5. **Run Full Integration Suite**:
```bash
node integration-test.js
```

6. **Run Bash Scripts**:
```bash
chmod +x quick-health-check.sh load-test.sh
./quick-health-check.sh https://your-app.vercel.app your-api-key
./load-test.sh https://your-app.vercel.app your-api-key 3 10
```

### Interpreting Results

- **100% Success Rate**: Your integration is ready for production
- **80-99% Success Rate**: Minor issues, review failed tests
- **Below 80%**: Significant issues, check service health and configuration

### Troubleshooting Test Failures

1. **Connection Timeouts**: Increase timeout values in test configuration
2. **Rate Limiting**: Get an API key or reduce concurrent requests
3. **Service Unavailable**: Check service health endpoint
4. **Authentication Errors**: Verify API key format and headers

These testing utilities provide comprehensive verification of your TikTok Live Connector integration, ensuring compatibility and reliability before production deployment.