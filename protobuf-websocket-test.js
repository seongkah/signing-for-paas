#!/usr/bin/env node

/**
 * Complete TikTok Live Protobuf WebSocket Pipeline Test
 * 
 * This tests the COMPLETE reverse engineering flow:
 * 1. Use your signing service to get authentication data
 * 2. Establish WebSocket connection to TikTok's servers
 * 3. Decode protobuf messages from the live stream
 * 4. Parse events (chat, gifts, etc.)
 * 
 * This is the REAL test of whether your signing service works
 * for the complete TikTok Live reverse engineering pipeline.
 */

const config = require('./tiktok-signing.config.js');

class ProtobufWebSocketTest {
  constructor(username) {
    this.username = username;
    this.stats = {
      signatureTime: null,
      websocketConnected: false,
      protobufMessages: 0,
      chatMessages: 0,
      giftEvents: 0,
      errors: []
    };
  }

  async runCompleteTest() {
    console.log('🔬 Complete TikTok Live Protobuf WebSocket Pipeline Test');
    console.log('=' .repeat(60));
    console.log('');
    console.log('This tests the COMPLETE reverse engineering flow:');
    console.log('  1. 🔐 Authentication via your signing service');
    console.log('  2. 🌐 WebSocket connection to TikTok servers');
    console.log('  3. 📡 Protobuf message reception and decoding');
    console.log('  4. 🎯 Live event parsing (chat, gifts, etc.)');
    console.log('');
    
    // Step 1: Test Signing Service
    console.log('🔐 STEP 1: Testing Your Signing Service');
    console.log('-'.repeat(40));
    
    const signatureData = await this.testSigningService();
    if (!signatureData) {
      console.log('❌ Signing service failed - cannot proceed');
      return false;
    }
    
    console.log('✅ Signing service working - proceeding to WebSocket test');
    console.log('');
    
    // Step 2: Test Complete TikTok Live Connector Pipeline
    console.log('🌐 STEP 2: Complete TikTok Live Connector Pipeline Test');
    console.log('-'.repeat(50));
    
    const pipelineResult = await this.testCompletePipeline();
    
    // Step 3: Results Analysis
    console.log('');
    console.log('📊 STEP 3: Pipeline Analysis');
    console.log('-'.repeat(30));
    this.analyzeResults();
    
    return pipelineResult;
  }

  async testSigningService() {
    console.log(`🎭 Target user: @${this.username}`);
    console.log(`🔗 Live URL: https://www.tiktok.com/@${this.username}/live`);
    
    // Get signing configuration
    const signingConfig = config.getSigningConfig();
    console.log('🔧 Signing config generated:');
    console.log(`   Provider: ${signingConfig.signProvider}`);
    console.log(`   Has API Key: ${signingConfig.signProviderHeaders?.['X-API-Key'] ? '✅' : '❌'}`);
    
    // Test the signing service API directly
    console.log('');
    console.log('🧪 Testing signature generation...');
    
    const startTime = Date.now();
    
    try {
      const https = require('https');
      const url = require('url');
      
      const testData = JSON.stringify({ 
        url: `https://www.tiktok.com/@${this.username}/live` 
      });
      
      const response = await new Promise((resolve, reject) => {
        const parsedUrl = url.parse(signingConfig.signProvider);
        
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...signingConfig.signProviderHeaders
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data),
                responseTime: Date.now() - startTime
              });
            } catch (e) {
              reject(new Error(`Invalid JSON: ${data.slice(0, 100)}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(15000, () => reject(new Error('Signature request timeout')));
        req.write(testData);
        req.end();
      });
      
      this.stats.signatureTime = response.responseTime;
      
      if (response.status === 200 && response.data.success) {
        console.log('✅ Signature service SUCCESS:');
        console.log(`   Response time: ${response.responseTime}ms`);
        console.log(`   Signature: ${response.data.data.signature ? '✅ Generated' : '❌ Missing'}`);
        console.log(`   X-Bogus: ${response.data.data['X-Bogus'] ? '✅ Generated' : '❌ Missing'}`);
        console.log(`   Navigator data: ${response.data.data.navigator ? '✅ Present' : '❌ Missing'}`);
        
        return response.data;
      } else {
        console.log('❌ Signature service FAILED:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${response.data.error || 'Unknown'}`);
        return null;
      }
      
    } catch (error) {
      console.log('❌ Signature service ERROR:');
      console.log(`   ${error.message}`);
      this.stats.errors.push(`Signature: ${error.message}`);
      return null;
    }
  }

  async testCompletePipeline() {
    console.log('🔌 Initializing TikTok Live Connector with your signing service...');
    
    try {
      const { TikTokLiveConnection } = require('tiktok-live-connector');
      
      // Create connection with your signing service
      const connection = new TikTokLiveConnection(this.username, config.getSigningConfig());
      
      console.log('✅ TikTok Live Connector created with your signing config');
      
      // Set up comprehensive event monitoring
      this.setupEventMonitoring(connection);
      
      console.log('🎯 Attempting WebSocket connection...');
      console.log('   This will test the complete pipeline:');
      console.log('   - Your signature → TikTok authentication');  
      console.log('   - WebSocket handshake');
      console.log('   - Protobuf message stream');
      console.log('   - Event decoding');
      console.log('');
      
      try {
        // Connect with timeout
        const connectPromise = connection.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Pipeline timeout after 20 seconds')), 20000)
        );
        
        const state = await Promise.race([connectPromise, timeoutPromise]);
        
        console.log('🎉 PIPELINE SUCCESS: Full connection established!');
        console.log('📺 Connection details:');
        console.log(`   Room ID: ${state.roomId}`);
        console.log(`   Status: ${state.liveStatus || 'Live'}`);
        console.log(`   Viewers: ${state.viewerCount || 'Unknown'}`);
        
        this.stats.websocketConnected = true;
        
        // Monitor the protobuf stream for 30 seconds
        console.log('');
        console.log('📡 Monitoring protobuf message stream...');
        console.log('   Waiting for live events (chat, gifts, etc.)...');
        console.log('   Duration: 30 seconds');
        console.log('-'.repeat(50));
        
        await this.monitorProtobufStream(30);
        
        // Disconnect
        connection.disconnect();
        
        return true;
        
      } catch (connectionError) {
        console.log('❌ PIPELINE FAILED at WebSocket connection:');
        console.log(`   Error: ${connectionError.message}`);
        
        this.analyzeConnectionFailure(connectionError);
        this.stats.errors.push(`WebSocket: ${connectionError.message}`);
        
        return false;
      }
      
    } catch (packageError) {
      console.log('❌ TikTok Live Connector package error:');
      console.log(`   ${packageError.message}`);
      console.log('💡 Install with: npm install tiktok-live-connector');
      return false;
    }
  }

  setupEventMonitoring(connection) {
    // WebSocket connection events
    connection.on('connected', (state) => {
      console.log('🟢 WebSocket CONNECTED - protobuf stream active');
      this.stats.websocketConnected = true;
    });
    
    connection.on('disconnected', () => {
      console.log('🔴 WebSocket DISCONNECTED - protobuf stream ended');
    });
    
    connection.on('error', (error) => {
      let errorMsg = 'Unknown error';
      try {
        errorMsg = error?.message || error?.toString?.() || JSON.stringify(error) || 'Unknown error';
      } catch (e) {
        errorMsg = 'Error processing error message';
      }
      console.log(`🚨 Pipeline ERROR: ${errorMsg}`);
      this.stats.errors.push(`Pipeline: ${errorMsg}`);
    });
    
    // Try to handle protobuf events
    try {
      const { WebcastEvent } = require('tiktok-live-connector');
      
      // Chat messages (protobuf decoded)
      connection.on(WebcastEvent.CHAT, (data) => {
        this.stats.protobufMessages++;
        this.stats.chatMessages++;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`💬 [${timestamp}] CHAT DECODED: ${data.user.uniqueId} → ${data.comment}`);
      });
      
      // Gift events (protobuf decoded)
      connection.on(WebcastEvent.GIFT, (data) => {
        this.stats.protobufMessages++;
        this.stats.giftEvents++;
        const timestamp = new Date().toLocaleTimeString();
        const giftName = data.giftName || `Gift ${data.giftId}`;
        const diamonds = data.diamondCount > 0 ? ` (💎${data.diamondCount})` : '';
        console.log(`🎁 [${timestamp}] GIFT DECODED: ${data.user.uniqueId} → ${giftName}${diamonds}`);
      });
      
      // Other protobuf events
      connection.on(WebcastEvent.LIKE, (data) => {
        this.stats.protobufMessages++;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`❤️ [${timestamp}] LIKE DECODED: ${data.user.uniqueId} (+${data.likeCount || 1})`);
      });
      
      connection.on(WebcastEvent.SOCIAL, (data) => {
        this.stats.protobufMessages++;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`👥 [${timestamp}] SOCIAL DECODED: ${data.user.uniqueId} ${data.displayType}`);
      });
      
      connection.on(WebcastEvent.ROOM_USER, (data) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`📊 [${timestamp}] ROOM UPDATE: ${data.viewerCount} viewers`);
      });
      
      // Raw protobuf message (if available)
      connection.on(WebcastEvent.STREAMDATA, (data) => {
        this.stats.protobufMessages++;
        console.log(`📡 RAW PROTOBUF: ${data.length} bytes received`);
      });
      
    } catch (e) {
      console.log('⚠️ Using fallback event handling (WebcastEvent not fully available)');
      
      // Fallback event handlers
      connection.on('chat', (data) => {
        this.stats.protobufMessages++;
        this.stats.chatMessages++;
        console.log(`💬 CHAT: ${data.user?.uniqueId || 'User'} → ${data.comment}`);
      });
      
      connection.on('gift', (data) => {
        this.stats.protobufMessages++;
        this.stats.giftEvents++;
        console.log(`🎁 GIFT: ${data.user?.uniqueId || 'User'} sent gift`);
      });
    }
  }

  async monitorProtobufStream(seconds) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = seconds - elapsed;
        
        if (remaining <= 0) {
          clearInterval(interval);
          resolve();
          return;
        }
        
        // Show progress every 10 seconds if no activity
        if (elapsed > 0 && elapsed % 10 === 0) {
          console.log(`⏳ Monitoring... ${remaining}s left (${this.stats.protobufMessages} protobuf messages decoded)`);
        }
      }, 1000);
    });
  }

  analyzeConnectionFailure(error) {
    console.log('');
    console.log('🔍 CONNECTION FAILURE ANALYSIS:');
    
    const errorMsg = error.message || error.toString();
    
    if (errorMsg.includes('403')) {
      console.log('   📋 403 Forbidden - Authentication/Access Issue:');
      console.log('      • User might not be currently live');
      console.log('      • Stream might be private/restricted');
      console.log('      • Signature format might be incompatible');
      console.log('      • TikTok may have changed authentication requirements');
      
    } else if (errorMsg.includes('404')) {
      console.log('   📋 404 Not Found - User/Stream Issue:');
      console.log('      • User does not exist');
      console.log('      • User is not live');
      console.log('      • Incorrect username format');
      
    } else if (errorMsg.includes('timeout')) {
      console.log('   📋 Timeout - Network/Server Issue:');
      console.log('      • Slow network connection');
      console.log('      • TikTok servers under load');
      console.log('      • Signature generation too slow');
      
    } else if (errorMsg.includes('websocket') || errorMsg.includes('WebSocket')) {
      console.log('   📋 WebSocket Issue - Protocol Problem:');
      console.log('      • WebSocket handshake failed');
      console.log('      • Signature not compatible with WebSocket auth');
      console.log('      • Network blocking WebSocket connections');
      
    } else {
      console.log('   📋 Unknown Issue:');
      console.log('      • TikTok may have changed their protocol');
      console.log('      • Network connectivity problems');
      console.log('      • Temporary server issues');
    }
    
    console.log('');
    console.log('💡 DEBUGGING STEPS:');
    console.log(`   1. Verify @${this.username} is live: https://www.tiktok.com/@${this.username}/live`);
    console.log('   2. Try a different username that is definitely live');
    console.log('   3. Test at different times of day');
    console.log('   4. Check if your IP/location is blocked');
  }

  analyzeResults() {
    console.log('📊 COMPLETE PIPELINE TEST RESULTS:');
    console.log('='.repeat(40));
    
    // Signing service results
    console.log('🔐 Signing Service:');
    console.log(`   Response Time: ${this.stats.signatureTime || 'N/A'}ms`);
    console.log(`   Status: ${this.stats.signatureTime ? '✅ Working' : '❌ Failed'}`);
    
    // WebSocket connection results
    console.log('');
    console.log('🌐 WebSocket Connection:');
    console.log(`   Connected: ${this.stats.websocketConnected ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Authentication: ${this.stats.websocketConnected ? '✅ Passed' : '❌ Failed'}`);
    
    // Protobuf decoding results
    console.log('');
    console.log('📡 Protobuf Message Decoding:');
    console.log(`   Total Messages: ${this.stats.protobufMessages}`);
    console.log(`   Chat Messages: ${this.stats.chatMessages}`);
    console.log(`   Gift Events: ${this.stats.giftEvents}`);
    console.log(`   Decoding Status: ${this.stats.protobufMessages > 0 ? '✅ Working' : '⚠️ No data'}`);
    
    // Error summary
    console.log('');
    console.log('🚨 Errors:');
    if (this.stats.errors.length === 0) {
      console.log('   ✅ No errors detected');
    } else {
      this.stats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    // Overall assessment
    console.log('');
    console.log('🎯 OVERALL ASSESSMENT:');
    if (this.stats.websocketConnected && this.stats.protobufMessages > 0) {
      console.log('   🟢 COMPLETE SUCCESS: Full pipeline working!');
      console.log('   ✅ Your signing service enables complete TikTok Live reverse engineering');
      console.log('   ✅ Ready for production use');
      
    } else if (this.stats.websocketConnected) {
      console.log('   🟡 PARTIAL SUCCESS: Connection works, limited activity');
      console.log('   ✅ Your signing service works for WebSocket connection');
      console.log('   ⚠️ User might not be very active or live stream is quiet');
      
    } else if (this.stats.signatureTime) {
      console.log('   🟠 SIGNING WORKS: WebSocket connection issues');
      console.log('   ✅ Your signing service generates valid signatures');
      console.log('   ❌ WebSocket connection failed (likely user not live)');
      console.log('   💡 Try with a different active live streamer');
      
    } else {
      console.log('   🔴 CRITICAL: Signing service not working');
      console.log('   ❌ Basic signature generation failed');
      console.log('   🔧 Check your configuration and API key');
    }
  }
}

// Main execution
async function main() {
  const username = process.argv[2];
  
  if (!username) {
    console.log('🔬 TikTok Live Protobuf WebSocket Pipeline Test');
    console.log('');
    console.log('This tests the COMPLETE reverse engineering pipeline:');
    console.log('  Signing Service → WebSocket → Protobuf → Live Events');
    console.log('');
    console.log('Usage: node protobuf-websocket-test.js <username>');
    console.log('');
    console.log('Examples:');
    console.log('  node protobuf-websocket-test.js kuian888');
    console.log('  node protobuf-websocket-test.js officialgeilegisela');
    console.log('');
    console.log('💡 Important: Use a username that is CURRENTLY LIVE');
    console.log('   Check https://www.tiktok.com/@username/live first');
    console.log('');
    process.exit(1);
  }
  
  const test = new ProtobufWebSocketTest(username);
  
  // Handle interruption
  process.on('SIGINT', () => {
    console.log('\\n🛑 Test interrupted by user');
    test.analyzeResults();
    process.exit(0);
  });
  
  console.log('🚀 Starting complete pipeline test...');
  console.log('This will test the ENTIRE reverse engineering flow!');
  console.log('');
  
  const success = await test.runCompleteTest();
  
  console.log('');
  console.log('🏁 PIPELINE TEST COMPLETE!');
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('💥 Pipeline test crashed:', error.message);
  console.error('This indicates a serious issue with the setup');
  process.exit(1);
});