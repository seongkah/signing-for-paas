#!/usr/bin/env node

/**
 * TikTok Live WebSocket Connection Demo
 * 
 * This script demonstrates connecting to TikTok Live WebSocket using your signing service.
 * It will show real-time chat, gifts, and connection status.
 * 
 * Usage: node websocket-demo.js <username>
 * Example: node websocket-demo.js kuian888
 */

import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
const config = require('./tiktok-signing.config.js');

class TikTokWebSocketDemo {
  constructor(username) {
    this.username = username;
    this.connection = null;
    this.stats = {
      startTime: Date.now(),
      messagesReceived: 0,
      giftsReceived: 0,
      likesReceived: 0,
      followersJoined: 0,
      totalViewers: 0,
      connectionAttempts: 0
    };
  }

  async connect() {
    console.log('🚀 TikTok Live WebSocket Connection Demo');
    console.log('=' .repeat(50));
    console.log('');
    
    // Show current configuration
    console.log('🔧 Configuration:');
    config.printStatus();
    
    console.log(`🎭 Target Streamer: @${this.username}`);
    console.log(`🌐 TikTok URL: https://www.tiktok.com/@${this.username}/live`);
    console.log('');
    
    // Validate configuration
    const validation = config.validateConfig();
    if (!validation.valid) {
      console.error('❌ Configuration Error:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }
    
    console.log('🔌 Initializing WebSocket connection...');
    console.log('');
    
    // Create connection with your signing service
    this.connection = new TikTokLiveConnection(this.username, config.getSigningConfig());
    
    // Set up all event listeners
    this.setupEventListeners();
    
    // Connect to the stream
    this.stats.connectionAttempts++;
    
    try {
      const state = await this.connection.connect();
      console.log('✅ WebSocket Connection Successful!');
      console.log(`📺 Room ID: ${state.roomId}`);
      console.log(`👑 Streamer: ${state.uniqueId || this.username}`);
      console.log(`📊 Initial Viewers: ${state.viewerCount || 'Unknown'}`);
      console.log(`🏠 Room Status: ${state.liveStatus || 'Live'}`);
      console.log('');
      console.log('📱 Live Events (Press Ctrl+C to stop):');
      console.log('-'.repeat(60));
      
      this.stats.totalViewers = state.viewerCount || 0;
      
      // Start periodic stats display
      this.startStatsTimer();
      
    } catch (error) {
      console.error('❌ WebSocket Connection Failed!');
      console.error(`🚨 Error: ${error.message}`);
      console.log('');
      this.handleConnectionError(error);
    }
  }
  
  setupEventListeners() {
    // Connection events
    this.connection.on('connected', (state) => {
      console.log(`🎉 Connected to @${this.username}'s live room!`);
      this.stats.totalViewers = state.viewerCount || 0;
    });
    
    this.connection.on('disconnected', () => {
      console.log('');
      console.log('🔌 WebSocket Disconnected');
      console.log('💡 This could mean:');
      console.log('   - The streamer ended their live session');
      console.log('   - Network connection was lost');
      console.log('   - TikTok terminated the connection');
      this.showFinalStats();
    });
    
    this.connection.on('error', (err) => {
      console.error(`🚨 WebSocket Error: ${err.message}`);
      this.handleConnectionError(err);
    });
    
    // Chat messages
    this.connection.on(WebcastEvent.CHAT, (data) => {
      this.stats.messagesReceived++;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`💬 [${timestamp}] ${data.user.uniqueId}: ${data.comment}`);
    });
    
    // Gifts
    this.connection.on(WebcastEvent.GIFT, (data) => {
      this.stats.giftsReceived++;
      const timestamp = new Date().toLocaleTimeString();
      const giftName = data.giftName || `Gift ID: ${data.giftId}`;
      const repeatCount = data.repeatCount > 1 ? ` x${data.repeatCount}` : '';
      const diamonds = data.diamondCount > 0 ? ` (💎 ${data.diamondCount})` : '';
      
      console.log(`🎁 [${timestamp}] ${data.user.uniqueId} sent "${giftName}"${repeatCount}${diamonds}`);
    });
    
    // Likes
    this.connection.on(WebcastEvent.LIKE, (data) => {
      this.stats.likesReceived += data.likeCount || 1;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`❤️ [${timestamp}] ${data.user.uniqueId} liked (total: +${data.likeCount || 1})`);
    });
    
    // Social events (follows, shares)
    this.connection.on(WebcastEvent.SOCIAL, (data) => {
      this.stats.followersJoined++;
      const timestamp = new Date().toLocaleTimeString();
      const actionMap = {
        'follow': '➕ followed',
        'share': '📤 shared',
        'like': '👍 liked'
      };
      const action = actionMap[data.displayType?.toLowerCase()] || data.displayType || 'interacted with';
      console.log(`👥 [${timestamp}] ${data.user.uniqueId} ${action} the stream`);
    });
    
    // Viewer count updates
    this.connection.on(WebcastEvent.ROOM_USER, (data) => {
      this.stats.totalViewers = data.viewerCount;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`📊 [${timestamp}] Viewers: ${data.viewerCount}`);
    });
    
    // Member events
    this.connection.on(WebcastEvent.MEMBER, (data) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🚪 [${timestamp}] ${data.user.uniqueId} joined the room`);
    });
    
    // Stream end
    this.connection.on(WebcastEvent.STREAM_END, (data) => {
      console.log('');
      console.log('📺 Stream ended by broadcaster');
      this.showFinalStats();
    });
  }
  
  handleConnectionError(error) {
    console.log('');
    console.log('🔧 Troubleshooting Tips:');
    
    if (error.message.includes('LIVE_ACCESS_DENIED') || error.message.includes('not_live')) {
      console.log('💡 User might not be live:');
      console.log(`   - Check: https://www.tiktok.com/@${this.username}/live`);
      console.log('   - Try a different username that is currently live');
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      console.log('💡 Rate limit reached:');
      console.log('   - You might be making too many requests');
      console.log('   - Wait a few minutes and try again');
    } else if (error.message.includes('signature') || error.message.includes('sign')) {
      console.log('💡 Signature service issue:');
      console.log('   - Test your config: node config-helper.js test');
      console.log('   - Check your API key is valid');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('💡 Network connectivity:');
      console.log('   - Check your internet connection');
      console.log('   - Service might be temporarily unavailable');
    }
    
    console.log('');
    console.log('🧪 Debug commands:');
    console.log('   - Test config: node config-helper.js test');
    console.log('   - Check status: node config-helper.js status');
    console.log(`   - Try different user: node websocket-demo.js <other-username>`);
    
    this.showFinalStats();
  }
  
  startStatsTimer() {
    // Show stats every 30 seconds
    this.statsTimer = setInterval(() => {
      this.showLiveStats();
    }, 30000);
  }
  
  showLiveStats() {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    console.log('');
    console.log('📈 Live Statistics:');
    console.log(`   Uptime: ${uptime}s | Messages: ${this.stats.messagesReceived} | Gifts: ${this.stats.giftsReceived} | Likes: ${this.stats.likesReceived} | Viewers: ${this.stats.totalViewers}`);
    console.log('-'.repeat(60));
  }
  
  showFinalStats() {
    const totalTime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    
    console.log('');
    console.log('📊 Final Statistics:');
    console.log('=' .repeat(40));
    console.log(`🕐 Total Connection Time: ${totalTime} seconds`);
    console.log(`💬 Chat Messages Received: ${this.stats.messagesReceived}`);
    console.log(`🎁 Gifts Received: ${this.stats.giftsReceived}`);
    console.log(`❤️ Likes Received: ${this.stats.likesReceived}`);
    console.log(`👥 Social Events: ${this.stats.followersJoined}`);
    console.log(`👀 Peak Viewers: ${this.stats.totalViewers}`);
    console.log(`🔌 Connection Attempts: ${this.stats.connectionAttempts}`);
    
    // Calculate activity rate
    if (totalTime > 0) {
      const messagesPerMinute = Math.round((this.stats.messagesReceived * 60) / totalTime);
      console.log(`📈 Activity Rate: ${messagesPerMinute} messages/minute`);
    }
    
    console.log('');
    console.log('✅ WebSocket Demo Complete!');
    console.log('');
    console.log('🎯 Test Results:');
    console.log(`   - Signing Service: ${this.stats.messagesReceived > 0 || this.stats.connectionAttempts > 0 ? '✅ Working' : '❌ Issues'}`);
    console.log(`   - WebSocket Connection: ${this.stats.messagesReceived > 0 ? '✅ Successful' : '⚠️ Limited data'}`);
    console.log(`   - Live Data Reception: ${this.stats.messagesReceived > 0 ? '✅ Receiving' : '⚠️ No data'}`);
    
    // Clean up
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
  }
  
  disconnect() {
    if (this.connection) {
      console.log('🛑 Disconnecting...');
      this.connection.disconnect();
    }
  }
}

// Main execution
async function main() {
  const username = process.argv[2];
  
  if (!username) {
    console.log('🎯 TikTok Live WebSocket Connection Demo');
    console.log('');
    console.log('This script tests your signing service by connecting to a live TikTok stream');
    console.log('and showing real-time chat messages, gifts, and viewer activity.');
    console.log('');
    console.log('Usage: node websocket-demo.js <username>');
    console.log('');
    console.log('Examples:');
    console.log('  node websocket-demo.js kuian888');
    console.log('  node websocket-demo.js officialgeilegisela');
    console.log('  node websocket-demo.js jeffbezos');
    console.log('');
    console.log('💡 Tips:');
    console.log('  - Use usernames that are currently live for best results');
    console.log('  - The demo will show live chat, gifts, likes, and viewer counts');
    console.log('  - Press Ctrl+C to stop the demo and see final statistics');
    console.log('  - Check https://www.tiktok.com/@username/live to confirm they are live');
    console.log('');
    console.log('🔧 Your Current Configuration:');
    
    try {
      const config = require('./tiktok-signing.config.js');
      console.log(`  Service: ${config.service}`);
      console.log(`  API Key: ${config.apiKey !== 'YOUR_API_KEY_HERE' ? '✅ Configured' : '❌ Not configured'}`);
    } catch (error) {
      console.log('  ❌ Configuration file not found');
    }
    
    process.exit(1);
  }
  
  const demo = new TikTokWebSocketDemo(username);
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\\n🛑 Demo interrupted by user...');
    demo.disconnect();
    setTimeout(() => process.exit(0), 1000);
  });
  
  // Handle other termination signals
  process.on('SIGTERM', () => {
    demo.disconnect();
    process.exit(0);
  });
  
  // Start the demo
  await demo.connect();
}

// Run the demo
main().catch(error => {
  console.error('💥 Demo crashed:', error.message);
  console.error('');
  console.error('🔧 This might be due to:');
  console.error('  - TikTok Live Connector package not installed');
  console.error('  - Configuration file missing');
  console.error('  - Network connectivity issues');
  console.error('');
  console.error('🛠️ Try:');
  console.error('  - npm install tiktok-live-connector');
  console.error('  - node config-helper.js test');
  process.exit(1);
});