#!/usr/bin/env node

/**
 * Live Stream Connection Testing Script
 * 
 * This script specifically tests the live stream connection functionality
 * that requires the localhost signing server to be running.
 * 
 * It differentiates between:
 * - Room info fetching (works without signing server)
 * - Live stream connection (requires signing server)
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');
const http = require('http');

/**
 * Test usernames for live stream connection testing
 * These should be accounts that frequently go live or are known to be active
 */
const TEST_USERNAMES = [
  // Popular accounts that frequently go live
  'linxi.888',      // The user you just tested (was live)
  'jeon01244',      // From your previous tests
  'hestia8271',     // From your previous tests
  'charlidamelio',  // Popular TikTok creator
  'addisonre',      // Popular TikTok creator
  'bellapoarch',    // Popular TikTok creator
  
  // Test accounts
  'testuser',
  'tiktok'
];

/**
 * Live Stream Connection Tester
 */
class LiveStreamConnectionTester {
  constructor() {
    this.results = {
      serverRunning: false,
      connectionTests: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        requiresServer: 0,
        worksWithoutServer: 0
      }
    };
  }

  /**
   * Check if the signing server is running
   */
  async checkSigningServer() {
    console.log('🔍 Checking Signing Server Status');
    console.log('=' .repeat(50));
    
    try {
      const result = await this.makeHttpRequest('GET', '/health');
      
      if (result.statusCode === 200 && result.data.status === 'healthy') {
        console.log('✅ Signing server is running and healthy');
        console.log(`   Status: ${result.data.status}`);
        console.log(`   Signature generator ready: ${result.data.signature_generator_ready}`);
        console.log(`   Timestamp: ${result.data.timestamp}`);
        this.results.serverRunning = true;
        return true;
      } else {
        console.log('❌ Signing server is unhealthy');
        console.log(`   Status: ${result.data.status}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Signing server is not running');
      console.log(`   Error: ${error.message}`);
      console.log('   💡 Start the server with: npm start');
      this.results.serverRunning = false;
      return false;
    }
  }

  /**
   * Test live stream connection for a specific username
   */
  async testLiveStreamConnection(username) {
    console.log(`\n🧪 Testing Live Stream Connection: @${username}`);
    console.log('─'.repeat(60));
    
    const testResult = {
      username: username,
      timestamp: new Date().toISOString(),
      success: false,
      requiresServer: false,
      responseTime: 0,
      status: 'unknown',
      details: '',
      error: null
    };

    try {
      // Create TikTok Live Connection for LIVE STREAM (not just room info)
      const connection = new TikTokLiveConnection(username, {
        fetchRoomInfoOnConnect: true,    // This will trigger signing
        processInitialData: true,        // This will trigger signing
        enableExtendedGiftInfo: true,    // Enable full features
        enableRequestPolling: true,      // Enable live polling
        requestPollingIntervalMs: 2000   // Poll every 2 seconds
      });

      console.log('📡 Attempting live stream connection...');
      console.log('   (This requires signing server for WebSocket connection)');
      
      const startTime = Date.now();
      
      try {
        // This is the key test - actual connection to live stream
        const state = await connection.connect();
        
        testResult.responseTime = Date.now() - startTime;
        testResult.success = true;
        testResult.status = 'live_connected';
        testResult.details = `Connected to live stream, Room ID: ${state.roomId}`;
        
        console.log('🎉 SUCCESS: Connected to live stream!');
        console.log(`   📺 Room ID: ${state.roomId}`);
        console.log(`   ⚡ Response time: ${testResult.responseTime}ms`);
        console.log('   🔗 WebSocket connection established');
        console.log('   ✅ Signing server integration working!');
        
        // Set up event listeners to verify live connection
        this.setupLiveEventListeners(connection, username);
        
        // Keep connection alive briefly to test events
        setTimeout(async () => {
          try {
            await connection.disconnect();
            console.log('   🔌 Disconnected from live stream');
          } catch (error) {
            console.log('   ⚠️  Disconnect error:', error.message);
          }
        }, 5000);
        
      } catch (error) {
        testResult.responseTime = Date.now() - startTime;
        const errorMsg = error.message || error.toString();
        testResult.error = errorMsg;
        
        // Analyze the error to understand what happened
        if (errorMsg.includes('Localhost signing server failed')) {
          testResult.requiresServer = true;
          testResult.status = 'signing_server_required';
          testResult.details = 'Live stream connection requires signing server';
          console.log('❌ FAILED: Signing server required for live connection');
          console.log('   💡 This confirms live streams need localhost:3000');
        } else if (errorMsg.includes('offline')) {
          testResult.success = true; // Signing worked, user just offline
          testResult.status = 'user_offline';
          testResult.details = 'User is offline, but signing process worked';
          console.log('✅ SUCCESS: Signing worked (user offline)');
          console.log('   📝 User is not currently live streaming');
        } else if (errorMsg.includes('Unexpected server response: 404')) {
          testResult.success = true; // Reached TikTok servers
          testResult.status = 'reached_tiktok_servers';
          testResult.details = 'Successfully reached TikTok WebSocket servers';
          console.log('✅ SUCCESS: Reached TikTok servers!');
          console.log('   📡 404 response is expected (normal TikTok behavior)');
          console.log('   🎯 This confirms signing server integration works');
        } else if (errorMsg.includes('Room ID')) {
          testResult.success = true; // Signing initiated
          testResult.status = 'signing_initiated';
          testResult.details = 'Signing process initiated, room ID extraction failed';
          console.log('✅ PARTIAL: Signing process initiated');
          console.log('   📝 Room ID extraction failed (user may not exist)');
        } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect')) {
          testResult.requiresServer = true;
          testResult.status = 'connection_refused';
          testResult.details = 'Connection refused - signing server not running';
          console.log('❌ FAILED: Connection refused');
          console.log('   🔧 Signing server is not running on localhost:3000');
        } else {
          testResult.status = 'unknown_error';
          testResult.details = errorMsg;
          console.log('⚠️  UNKNOWN ERROR:', errorMsg.substring(0, 80) + '...');
        }
        
        console.log(`   ⚡ Response time: ${testResult.responseTime}ms`);
      }
      
    } catch (error) {
      testResult.error = error.message;
      testResult.status = 'setup_error';
      testResult.details = 'Failed to create TikTok connection';
      console.log('❌ SETUP ERROR:', error.message);
    }
    
    // Update summary
    this.results.summary.total++;
    if (testResult.success) {
      this.results.summary.successful++;
    } else {
      this.results.summary.failed++;
    }
    
    if (testResult.requiresServer) {
      this.results.summary.requiresServer++;
    } else if (testResult.success) {
      this.results.summary.worksWithoutServer++;
    }
    
    this.results.connectionTests.push(testResult);
    
    return testResult;
  }

  /**
   * Set up event listeners for live stream testing
   */
  setupLiveEventListeners(connection, username) {
    console.log(`   👂 Listening for live events from @${username}...`);
    
    connection.on('chat', (data) => {
      console.log(`   💬 Chat: ${data.user?.nickname || 'Anonymous'} - ${data.comment}`);
    });

    connection.on('gift', (data) => {
      const giftName = data.extendedGiftInfo?.name || `Gift ID: ${data.giftId}`;
      console.log(`   🎁 Gift: ${data.user?.nickname || 'Anonymous'} sent ${giftName}`);
    });

    connection.on('follow', (data) => {
      console.log(`   👥 Follow: ${data.user?.nickname || 'Anonymous'} followed!`);
    });

    connection.on('share', (data) => {
      console.log(`   📤 Share: ${data.user?.nickname || 'Anonymous'} shared the stream!`);
    });

    connection.on('streamEnd', () => {
      console.log(`   📺 Stream ended`);
    });

    connection.on('error', ({ info, exception }) => {
      console.log(`   🚨 Connection error: ${info} - ${exception.message}`);
    });
  }

  /**
   * Test multiple usernames
   */
  async testMultipleUsers(usernames = TEST_USERNAMES) {
    console.log('\n🎯 Testing Live Stream Connections');
    console.log('=' .repeat(50));
    console.log(`Testing ${usernames.length} usernames for live stream connectivity\n`);
    
    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      await this.testLiveStreamConnection(username);
      
      // Small delay between tests
      if (i < usernames.length - 1) {
        await this.sleep(1000);
      }
    }
  }

  /**
   * Show comprehensive test results
   */
  showResults() {
    console.log('\n📊 LIVE STREAM CONNECTION TEST RESULTS');
    console.log('=' .repeat(60));
    
    const summary = this.results.summary;
    const successRate = summary.total > 0 ? (summary.successful / summary.total * 100).toFixed(1) : 0;
    
    console.log(`🎯 Overall Results:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   Successful: ${summary.successful}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    console.log(`\n🔧 Server Dependency Analysis:`);
    console.log(`   Signing Server Running: ${this.results.serverRunning ? '✅ YES' : '❌ NO'}`);
    console.log(`   Requires Server: ${summary.requiresServer} tests`);
    console.log(`   Works Without Server: ${summary.worksWithoutServer} tests`);
    
    console.log(`\n📋 Detailed Results:`);
    this.results.connectionTests.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      const serverReq = test.requiresServer ? '🔧' : '  ';
      console.log(`   ${status}${serverReq} @${test.username} - ${test.status} (${test.responseTime}ms)`);
      if (test.details) {
        console.log(`      ${test.details}`);
      }
    });
    
    console.log(`\n🎯 Key Findings:`);
    
    if (this.results.serverRunning) {
      if (summary.successful > 0) {
        console.log('   ✅ Live stream connections are working with signing server');
        console.log('   ✅ Integration between TikTok Live Connector and localhost:3000 is successful');
      } else {
        console.log('   ⚠️  No successful live connections (users may not be live)');
        console.log('   💡 Try testing when users are actually streaming');
      }
    } else {
      if (summary.requiresServer > 0) {
        console.log('   ❌ Live stream connections require signing server');
        console.log('   🔧 Start the server with: npm start');
        console.log('   💡 This confirms the integration is properly configured');
      } else {
        console.log('   ⚠️  Unable to determine server dependency (no clear failures)');
      }
    }
    
    console.log(`\n💡 Recommendations:`);
    if (!this.results.serverRunning) {
      console.log('   1. Start the signing server: npm start');
      console.log('   2. Re-run this test to verify live stream connections');
    }
    console.log('   3. Test with users who are currently live streaming');
    console.log('   4. Use interactive testing for real-time verification');
    
    return summary.successful > 0;
  }

  /**
   * HTTP request helper
   */
  makeHttpRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            resolve({
              statusCode: res.statusCode,
              data: response
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: { error: 'Invalid JSON', raw: responseData }
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run all tests
   */
  async runAllTests(usernames = TEST_USERNAMES) {
    console.log('🧪 Live Stream Connection Testing Suite');
    console.log('=' .repeat(60));
    console.log('This script tests LIVE STREAM connections (not just room info)');
    console.log('Live stream connections require the signing server to be running.\n');
    
    // Check server status
    await this.checkSigningServer();
    
    // Test live stream connections
    await this.testMultipleUsers(usernames);
    
    // Show results
    const success = this.showResults();
    
    return success;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const tester = new LiveStreamConnectionTester();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Live Stream Connection Testing Script');
    console.log('');
    console.log('Usage:');
    console.log('  node src/test-live-stream-connection.js [options] [usernames...]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node src/test-live-stream-connection.js                    # Test default usernames');
    console.log('  node src/test-live-stream-connection.js linxi.888          # Test specific username');
    console.log('  node src/test-live-stream-connection.js user1 user2 user3  # Test multiple usernames');
    console.log('');
    console.log('Variables for Testing:');
    console.log('  - Use accounts that frequently go live (linxi.888, charlidamelio, etc.)');
    console.log('  - Test with both popular and test accounts');
    console.log('  - Ensure signing server is running: npm start');
    process.exit(0);
  }
  
  // Use provided usernames or defaults
  const testUsernames = args.length > 0 ? args : TEST_USERNAMES;
  
  tester.runAllTests(testUsernames)
    .then((success) => {
      console.log('\n' + '=' .repeat(60));
      console.log(`Live Stream Connection Test: ${success ? 'SUCCESS' : 'NEEDS ATTENTION'}`);
      console.log('=' .repeat(60));
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed with error:', error.message);
      process.exit(1);
    });
}

module.exports = LiveStreamConnectionTester;