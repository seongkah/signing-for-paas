#!/usr/bin/env node

/**
 * TikTok Live WebSocket Test Script
 * 
 * Simple test to verify WebSocket connection using your signing service
 * Uses CommonJS syntax for compatibility
 * 
 * Usage: node websocket-test.js <username>
 * Example: node websocket-test.js kuian888
 */

const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');
const config = require('./tiktok-signing.config.js');

class WebSocketTest {
  constructor(username) {
    this.username = username;
    this.connection = null;
    this.stats = {
      startTime: Date.now(),
      messages: 0,
      gifts: 0,
      likes: 0,
      connected: false,
      errors: []
    };
  }

  async test() {
    console.log('🧪 TikTok WebSocket Connection Test');
    console.log('=' .repeat(45));
    console.log('');
    
    // Show configuration
    console.log('🔧 Configuration Status:');
    config.printStatus();
    
    console.log(`🎭 Testing with: @${this.username}`);
    console.log(`🌐 Stream URL: https://www.tiktok.com/@${this.username}/live`);
    console.log('');
    
    // Validate config
    const validation = config.validateConfig();
    if (!validation.valid) {
      console.error('❌ Configuration Error:');
      validation.errors.forEach(error => console.error(`   ${error}`));
      return false;
    }
    
    console.log('🔌 Creating WebSocket connection...');
    console.log('📡 Using your signing service for authentication...');
    console.log('');
    
    // Create connection with your signing config
    this.connection = new TikTokLiveConnection(this.username, config.getSigningConfig());
    
    // Set up event listeners
    this.setupEvents();
    
    // Test connection
    try {
      console.log('⏳ Attempting connection...');
      const state = await this.connection.connect();
      
      console.log('✅ WebSocket Connected Successfully!');
      console.log('');
      console.log('📊 Connection Details:');
      console.log(`   Room ID: ${state.roomId}`);
      console.log(`   Streamer: ${state.uniqueId || this.username}`);
      console.log(`   Viewers: ${state.viewerCount || 'Unknown'}`);
      console.log(`   Status: ${state.liveStatus || 'Live'}`);
      console.log('');
      console.log('🎉 SUCCESS! Your signing service is working!');
      console.log('');
      console.log('📱 Monitoring live events for 30 seconds...');
      console.log('   (You should see chat messages, gifts, likes, etc. below)');
      console.log('-'.repeat(50));
      
      this.stats.connected = true;
      
      // Monitor for 30 seconds
      await this.monitorEvents(30);
      
      return true;
      
    } catch (error) {
      console.error('❌ WebSocket Connection Failed!');
      console.error(`   Error: ${error.message}`);
      console.log('');
      
      this.stats.errors.push(error.message);
      this.diagnoseError(error);
      
      return false;
    }
  }
  
  setupEvents() {
    this.connection.on('connected', (state) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🟢 [${timestamp}] Connected to live room!`);
    });
    
    this.connection.on('disconnected', () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🔴 [${timestamp}] Disconnected from live room`);
    });
    
    this.connection.on('error', (err) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🚨 [${timestamp}] Error: ${err.message}`);
      this.stats.errors.push(err.message);
    });
    
    // Live events
    this.connection.on(WebcastEvent.CHAT, (data) => {
      this.stats.messages++;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`💬 [${timestamp}] ${data.user.uniqueId}: ${data.comment}`);
    });
    
    this.connection.on(WebcastEvent.GIFT, (data) => {
      this.stats.gifts++;
      const timestamp = new Date().toLocaleTimeString();
      const giftName = data.giftName || `Gift ${data.giftId}`;
      const diamonds = data.diamondCount > 0 ? ` (💎${data.diamondCount})` : '';
      console.log(`🎁 [${timestamp}] ${data.user.uniqueId} → ${giftName}${diamonds}`);
    });
    
    this.connection.on(WebcastEvent.LIKE, (data) => {
      this.stats.likes += (data.likeCount || 1);
      const timestamp = new Date().toLocaleTimeString();
      console.log(`❤️ [${timestamp}] ${data.user.uniqueId} liked (+${data.likeCount || 1})`);
    });
    
    this.connection.on(WebcastEvent.SOCIAL, (data) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`👥 [${timestamp}] ${data.user.uniqueId} ${data.displayType || 'interacted'}`);
    });
    
    this.connection.on(WebcastEvent.ROOM_USER, (data) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`📊 [${timestamp}] Viewers: ${data.viewerCount}`);
    });
  }
  
  async monitorEvents(seconds) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let lastActivity = Date.now();
      
      const checkActivity = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = seconds - elapsed;
        
        if (remaining <= 0) {
          clearInterval(checkActivity);
          resolve();
          return;
        }
        
        // Show progress every 5 seconds if no activity
        if (elapsed > 0 && elapsed % 5 === 0 && (Date.now() - lastActivity) > 4000) {
          console.log(`⏳ Still monitoring... ${remaining}s remaining (${this.stats.messages} messages, ${this.stats.gifts} gifts)`);
        }
      }, 1000);
      
      // Update last activity time when events occur
      const originalMessages = this.stats.messages;
      const activityCheck = setInterval(() => {
        if (this.stats.messages > originalMessages || this.stats.gifts > 0 || this.stats.likes > 0) {
          lastActivity = Date.now();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkActivity);
        clearInterval(activityCheck);
        resolve();
      }, seconds * 1000);
    });
  }
  
  diagnoseError(error) {
    console.log('🔍 Error Analysis:');
    
    if (error.message.includes('LIVE_ACCESS_DENIED') || error.message.includes('not_live')) {
      console.log('   💡 User might not be live currently');
      console.log(`   🔗 Check: https://www.tiktok.com/@${this.username}/live`);
      console.log('   📝 Try: node websocket-test.js <different-username>');
      
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      console.log('   💡 Rate limit reached');
      console.log('   ⏰ Wait a few minutes and try again');
      console.log('   🔑 Consider using paid tier for higher limits');
      
    } else if (error.message.includes('signature') || error.message.includes('sign')) {
      console.log('   💡 Signing service issue');
      console.log('   🧪 Test: node config-helper.js test');
      console.log('   🔐 Check your API key configuration');
      
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('   💡 Network connectivity issue');
      console.log('   🌐 Check your internet connection');
      console.log('   ⏱️ Service might be temporarily slow');
      
    } else {
      console.log('   💡 Unknown error - this might be a TikTok or service issue');
      console.log('   🔄 Try again in a few minutes');
    }
    
    console.log('');
    console.log('🛠️ Debug Commands:');
    console.log('   node config-helper.js test      # Test your configuration');
    console.log('   node config-helper.js status    # Check current settings');
    console.log('   node examples/service-comparison.js  # Compare services');
  }
  
  showResults() {
    const duration = Math.floor((Date.now() - this.stats.startTime) / 1000);
    
    console.log('');
    console.log('📋 Test Results Summary');
    console.log('=' .repeat(30));
    console.log(`⏱️  Test Duration: ${duration} seconds`);
    console.log(`🔌 Connection Success: ${this.stats.connected ? '✅ Yes' : '❌ No'}`);
    console.log(`💬 Messages Received: ${this.stats.messages}`);
    console.log(`🎁 Gifts Received: ${this.stats.gifts}`);
    console.log(`❤️ Likes Received: ${this.stats.likes}`);
    console.log(`🚨 Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('');
      console.log('❌ Errors encountered:');
      this.stats.errors.forEach((error, i) => {
        console.log(`   ${i+1}. ${error}`);
      });
    }
    
    console.log('');
    console.log('🎯 Overall Result:');
    if (this.stats.connected && this.stats.messages > 0) {
      console.log('   🟢 EXCELLENT: Full connection with live data!');
      console.log('   ✅ Your signing service is working perfectly');
    } else if (this.stats.connected) {
      console.log('   🟡 GOOD: Connected but limited live activity');
      console.log('   ✅ Your signing service works (user might not be very active)');
    } else {
      console.log('   🔴 NEEDS ATTENTION: Connection failed');
      console.log('   ⚠️ Check configuration or try different username');
    }
    
    console.log('');
    console.log('🏁 WebSocket Test Complete!');
  }
  
  disconnect() {
    if (this.connection) {
      this.connection.disconnect();
    }
  }
}

// Main execution
async function main() {
  const username = process.argv[2];
  
  if (!username) {
    console.log('🧪 TikTok WebSocket Connection Test');
    console.log('');
    console.log('This script tests if your signing service can successfully');
    console.log('establish a WebSocket connection to TikTok Live streams.');
    console.log('');
    console.log('Usage: node websocket-test.js <username>');
    console.log('');
    console.log('Examples:');
    console.log('  node websocket-test.js kuian888');
    console.log('  node websocket-test.js officialgeilegisela');
    console.log('');
    console.log('💡 Tips:');
    console.log('  - Choose users who are currently live');
    console.log('  - The test will run for 30 seconds');
    console.log('  - You will see live chat, gifts, and activity');
    console.log('  - Press Ctrl+C to stop early');
    console.log('');
    
    // Show current config
    try {
      const config = require('./tiktok-signing.config.js');
      console.log('🔧 Current Configuration:');
      console.log(`  Service: ${config.service}`);
      const hasKey = config.apiKey && config.apiKey !== 'YOUR_API_KEY_HERE';
      console.log(`  API Key: ${hasKey ? '✅ Configured' : '❌ Not configured'}`);
    } catch (error) {
      console.log('❌ Configuration file not found!');
      console.log('   Make sure tiktok-signing.config.js exists');
    }
    
    process.exit(1);
  }
  
  const test = new WebSocketTest(username);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\\n🛑 Test interrupted...');
    test.disconnect();
    test.showResults();
    process.exit(0);
  });
  
  // Run the test
  const success = await test.test();
  
  // Disconnect and show results
  test.disconnect();
  test.showResults();
  
  process.exit(success ? 0 : 1);
}

// Check if tiktok-live-connector is installed
try {
  require('tiktok-live-connector');
} catch (error) {
  console.error('❌ TikTok Live Connector not installed!');
  console.error('');
  console.error('Install it with:');
  console.error('  npm install tiktok-live-connector');
  console.error('');
  process.exit(1);
}

// Run the test
main().catch(error => {
  console.error('💥 Test crashed:', error.message);
  console.error('');
  console.error('🔧 This might be due to:');
  console.error('  - Missing dependencies');
  console.error('  - Configuration issues');
  console.error('  - Network problems');
  process.exit(1);
});