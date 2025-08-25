#!/usr/bin/env node

/**
 * Service Comparison Test
 * 
 * This tests both EulerStream and our signing service with the same user
 * to compare behavior and identify if there's a specific issue.
 */

class ServiceComparisonTest {
  constructor(username) {
    this.username = username;
    this.results = {
      eulerstream: null,
      ourService: null
    };
  }

  async runComparison() {
    console.log('🔬 Service Comparison Test');
    console.log('='.repeat(50));
    console.log('');
    console.log(`Testing @${this.username} with both services to compare behavior`);
    console.log('');

    // Test 1: EulerStream
    console.log('🧪 Test 1: EulerStream Service');
    console.log('-'.repeat(30));
    
    this.results.eulerstream = await this.testService('eulerstream');
    
    console.log('');

    // Test 2: Our Service (Free)
    console.log('🧪 Test 2: Our Service (Free Tier)');
    console.log('-'.repeat(35));
    
    this.results.ourService = await this.testService('free');
    
    console.log('');

    // Compare results
    this.compareResults();
  }

  async testService(serviceType) {
    const startTime = Date.now();
    
    try {
      const { TikTokLiveConnection } = require('tiktok-live-connector');
      
      // Configure service
      let config;
      if (serviceType === 'eulerstream') {
        config = {
          signProvider: 'eulerstream'
        };
        console.log('🔧 Using EulerStream built-in service');
      } else {
        config = {
          signProvider: 'https://signing-for-paas.vercel.app/api/eulerstream'
        };
        console.log('🔧 Using our service (free tier)');
      }
      
      console.log('🔌 Creating connection...');
      const connection = new TikTokLiveConnection(this.username, config);
      
      console.log('⏳ Attempting connection...');
      
      // Set up basic error tracking
      let errors = [];
      let connected = false;
      
      connection.on('connected', () => {
        connected = true;
        console.log('✅ Connection successful!');
      });
      
      connection.on('error', (error) => {
        let errorMsg = 'Unknown error';
        try {
          if (error && error.message) {
            errorMsg = error.message;
          } else if (error && error.toString) {
            errorMsg = error.toString();
          } else if (typeof error === 'string') {
            errorMsg = error;
          }
        } catch (e) {
          errorMsg = 'Error processing error message';
        }
        
        errors.push(errorMsg);
        console.log(`🚨 Error: ${errorMsg}`);
      });
      
      // Try connection with timeout
      const connectPromise = connection.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
      );
      
      try {
        const state = await Promise.race([connectPromise, timeoutPromise]);
        
        const responseTime = Date.now() - startTime;
        console.log(`✅ SUCCESS: Connected in ${responseTime}ms`);
        console.log(`📺 Room: ${state.roomId}`);
        console.log(`👥 Viewers: ${state.viewerCount || 'Unknown'}`);
        
        // Quick disconnect
        setTimeout(() => connection.disconnect(), 1000);
        
        return {
          success: true,
          responseTime: responseTime,
          errors: errors,
          roomId: state.roomId,
          viewerCount: state.viewerCount,
          connected: connected
        };
        
      } catch (connectionError) {
        const responseTime = Date.now() - startTime;
        
        let errorMsg = 'Connection failed';
        try {
          errorMsg = connectionError?.message || connectionError?.toString() || 'Connection failed';
        } catch (e) {
          errorMsg = 'Error processing connection error';
        }
        
        console.log(`❌ FAILED: ${errorMsg} (${responseTime}ms)`);
        
        // Analyze the specific error
        this.analyzeError(errorMsg);
        
        return {
          success: false,
          responseTime: responseTime,
          errors: [...errors, errorMsg],
          errorMessage: errorMsg,
          connected: connected
        };
      }
      
    } catch (setupError) {
      console.log(`❌ SETUP ERROR: ${setupError.message}`);
      
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errors: [setupError.message],
        errorMessage: setupError.message,
        setupError: true
      };
    }
  }

  analyzeError(errorMsg) {
    console.log('   🔍 Error Analysis:');
    
    if (errorMsg.includes('403')) {
      console.log('   📋 403 Forbidden - Authentication issue');
      console.log('      • User might not be live');
      console.log('      • Stream is private/restricted');
      console.log('      • Signature authentication failed');
      
    } else if (errorMsg.includes('404')) {
      console.log('   📋 404 Not Found');
      console.log('      • User does not exist');
      console.log('      • User is not currently live');
      
    } else if (errorMsg.includes('timeout')) {
      console.log('   📋 Timeout');
      console.log('      • Network connectivity issue');
      console.log('      • Service is slow or unavailable');
      
    } else if (errorMsg.includes('not_live') || errorMsg.includes('isn\'t online')) {
      console.log('   📋 User Not Live');
      console.log('      • User is confirmed not live');
      
    } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
      console.log('   📋 Rate Limit');
      console.log('      • Too many requests');
      
    } else if (errorMsg.includes('LIVE_ACCESS_DENIED')) {
      console.log('   📋 Access Denied');
      console.log('      • TikTok blocked the connection attempt');
      
    } else {
      console.log('   📋 Unknown Error');
      console.log('      • Could be network, service, or protocol issue');
    }
  }

  compareResults() {
    console.log('📊 COMPARISON RESULTS');
    console.log('='.repeat(30));
    
    console.log('🔸 EulerStream:');
    if (this.results.eulerstream) {
      console.log(`   Success: ${this.results.eulerstream.success ? '✅' : '❌'}`);
      console.log(`   Response Time: ${this.results.eulerstream.responseTime}ms`);
      console.log(`   Errors: ${this.results.eulerstream.errors.length}`);
      if (this.results.eulerstream.errorMessage) {
        console.log(`   Error: ${this.results.eulerstream.errorMessage}`);
      }
    } else {
      console.log('   ❌ Not tested');
    }
    
    console.log('');
    console.log('🔹 Our Service:');
    if (this.results.ourService) {
      console.log(`   Success: ${this.results.ourService.success ? '✅' : '❌'}`);
      console.log(`   Response Time: ${this.results.ourService.responseTime}ms`);
      console.log(`   Errors: ${this.results.ourService.errors.length}`);
      if (this.results.ourService.errorMessage) {
        console.log(`   Error: ${this.results.ourService.errorMessage}`);
      }
    } else {
      console.log('   ❌ Not tested');
    }
    
    console.log('');
    console.log('🎯 ANALYSIS:');
    
    if (this.results.eulerstream && this.results.ourService) {
      const eulerSuccess = this.results.eulerstream.success;
      const ourSuccess = this.results.ourService.success;
      
      if (eulerSuccess && ourSuccess) {
        console.log('   🟢 BOTH WORKING: Both services successfully connected');
        console.log('   ✅ Your service is working correctly');
        
      } else if (!eulerSuccess && !ourSuccess) {
        console.log('   🟡 BOTH FAILED: Neither service could connect');
        console.log('   💡 This suggests the user is not live or has access restrictions');
        console.log('   ✅ Your service behavior is consistent with EulerStream');
        
        // Check if errors are similar
        const eulerError = this.results.eulerstream.errorMessage || '';
        const ourError = this.results.ourService.errorMessage || '';
        
        if (eulerError.includes('403') && ourError.includes('403')) {
          console.log('   🔍 Both got 403 errors - likely user not live');
        } else if (eulerError.includes('not_live') && ourError.includes('not_live')) {
          console.log('   🔍 Both confirmed user not live');
        }
        
      } else if (eulerSuccess && !ourSuccess) {
        console.log('   🔴 EULER WORKS, OURS FAILS: There might be an issue with our service');
        console.log('   🔧 Investigation needed');
        
      } else if (!eulerSuccess && ourSuccess) {
        console.log('   🟢 OURS WORKS, EULER FAILS: Our service is working better!');
        console.log('   ✅ Your service is functioning correctly');
      }
    }
    
    console.log('');
    console.log('💡 RECOMMENDATION:');
    console.log('   Try this test with different usernames who are confirmed live');
    console.log(`   Check: https://www.tiktok.com/@${this.username}/live`);
    console.log('   Test at different times when more users are typically live');
  }
}

// Main execution
async function main() {
  const username = process.argv[2] || 'kuian888';
  
  console.log('🚀 Starting Service Comparison Test');
  console.log(`🎭 Target User: @${username}`);
  console.log('');
  
  const test = new ServiceComparisonTest(username);
  
  // Handle interruption
  process.on('SIGINT', () => {
    console.log('\\n🛑 Test interrupted');
    process.exit(0);
  });
  
  await test.runComparison();
  
  console.log('');
  console.log('🏁 COMPARISON COMPLETE!');
}

// Check dependencies
try {
  require('tiktok-live-connector');
} catch (error) {
  console.error('❌ TikTok Live Connector not installed!');
  console.error('Install with: npm install tiktok-live-connector');
  process.exit(1);
}

main().catch(error => {
  console.error('💥 Test crashed:', error.message);
  process.exit(1);
});