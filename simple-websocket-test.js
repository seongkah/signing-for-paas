#!/usr/bin/env node

/**
 * Simple WebSocket Connection Test
 * 
 * Basic test to verify your signing service works with TikTok Live Connector
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');
const config = require('./tiktok-signing.config.js');

async function testWebSocketConnection(username) {
  console.log('🧪 Simple WebSocket Connection Test');
  console.log('=' .repeat(40));
  console.log('');
  
  // Show what we're testing
  console.log(`🎭 Target: @${username}`);
  console.log(`🔗 URL: https://www.tiktok.com/@${username}/live`);
  console.log(`🔧 Service: ${config.service} (${config.apiKey ? 'with API key' : 'no API key'})`);
  console.log('');
  
  // Create connection with your signing service
  console.log('🔌 Creating connection with your signing service...');
  const connection = new TikTokLiveConnection(username, config.getSigningConfig());
  
  let stats = {
    connected: false,
    messages: 0,
    gifts: 0,
    errors: []
  };
  
  // Simple event handlers
  connection.on('connected', (state) => {
    stats.connected = true;
    console.log('✅ WebSocket Connected!');
    console.log(`📺 Room ID: ${state.roomId || 'Unknown'}`);
    console.log(`👥 Viewers: ${state.viewerCount || 'Unknown'}`);
    console.log('');
    console.log('📱 Live Events:');
  });
  
  connection.on('disconnected', () => {
    console.log('🔌 Disconnected');
  });
  
  connection.on('error', (error) => {
    const errorMsg = error?.message || error?.toString() || 'Unknown error';
    stats.errors.push(errorMsg);
    console.log(`🚨 Error: ${errorMsg}`);
  });
  
  // Try to get WebcastEvent, but handle if it doesn't exist
  try {
    const { WebcastEvent } = require('tiktok-live-connector');
    
    connection.on(WebcastEvent.CHAT, (data) => {
      stats.messages++;
      console.log(`💬 ${data.user.uniqueId}: ${data.comment}`);
    });
    
    connection.on(WebcastEvent.GIFT, (data) => {
      stats.gifts++;
      console.log(`🎁 ${data.user.uniqueId} sent gift`);
    });
    
  } catch (e) {
    console.log('⚠️ Using basic event handling (WebcastEvent not available)');
    
    connection.on('chat', (data) => {
      stats.messages++;
      console.log(`💬 ${data.user?.uniqueId || 'User'}: ${data.comment || data.message}`);
    });
    
    connection.on('gift', (data) => {
      stats.gifts++;
      console.log(`🎁 ${data.user?.uniqueId || 'User'} sent gift`);
    });
  }
  
  // Test connection
  console.log('⏳ Attempting connection...');
  
  try {
    const state = await connection.connect();
    console.log('🎉 SUCCESS! Connection established!');
    
    // Monitor for a short time
    console.log('📊 Monitoring for 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    connection.disconnect();
    
    // Show results
    console.log('');
    console.log('📋 Test Results:');
    console.log(`   Connected: ${stats.connected ? '✅' : '❌'}`);
    console.log(`   Messages: ${stats.messages}`);
    console.log(`   Gifts: ${stats.gifts}`);
    console.log(`   Errors: ${stats.errors.length}`);
    
    if (stats.connected) {
      console.log('');
      console.log('🎉 CONCLUSION: Your signing service is working!');
      console.log('✅ WebSocket connection successful');
      console.log('✅ Ready for production use');
    } else {
      console.log('');
      console.log('⚠️ Connection issues detected');
      console.log('Check if the user is currently live');
    }
    
    return stats.connected;
    
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || 'Connection failed';
    console.log(`❌ Connection failed: ${errorMsg}`);
    
    console.log('');
    console.log('🔍 Possible reasons:');
    
    if (errorMsg.includes('LIVE_ACCESS_DENIED') || errorMsg.includes('not_live')) {
      console.log('   💡 User is not currently live');
      console.log(`   🔗 Check: https://www.tiktok.com/@${username}/live`);
    } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
      console.log('   💡 Rate limit reached - wait and try again');
    } else if (errorMsg.includes('signature') || errorMsg.includes('sign')) {
      console.log('   💡 Signing service issue - check your API key');
    } else {
      console.log('   💡 Network or service issue');
    }
    
    console.log('');
    console.log('🧪 Test your config: node config-helper.js test');
    
    return false;
  }
}

// Main
async function main() {
  const username = process.argv[2] || 'kuian888';
  
  console.log('🚀 Starting WebSocket test...');
  console.log('');
  
  const success = await testWebSocketConnection(username);
  
  console.log('');
  console.log('🏁 Test complete!');
  
  process.exit(success ? 0 : 1);
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\\n🛑 Test interrupted');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Test error:', error.message || error);
  process.exit(1);
});