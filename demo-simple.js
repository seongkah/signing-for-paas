#!/usr/bin/env node

/**
 * SIMPLE DEMO: TikTok Live Connector with Your Signing Service
 * 
 * This demo proves how easy it is to use your signing service
 * with ANY TikTok Live Connector project.
 * 
 * Usage: node demo-simple.js <username>
 * Example: node demo-simple.js jeffbezos
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');

// ====== STEP 1: LOAD CONFIGURATION ======
// This is the ONLY line you add to any existing project
const config = require('./tiktok-signing.config.js');

// ====== STEP 2: YOUR EXISTING CODE STAYS THE SAME ======
async function connectToLiveStream(username) {
  console.log('🔧 Demo: TikTok Live Connector with Your Signing Service');
  console.log('='.repeat(60));
  console.log('');
  
  // Show current service configuration
  console.log('📋 Current Configuration:');
  config.printStatus();
  
  console.log(`🚀 Connecting to @${username}'s live stream...`);
  console.log('');
  
  // ====== STEP 3: REPLACE CONFIG OBJECT ======
  // Before: const connection = new TikTokLiveConnection(username, { signProvider: 'eulerstream' })
  // After:  const connection = new TikTokLiveConnection(username, config.getSigningConfig())
  
  const connection = new TikTokLiveConnection(username, config.getSigningConfig());
  
  // ====== EVERYTHING BELOW IS UNCHANGED FROM ORIGINAL CODE ======
  
  connection.on('connected', (state) => {
    console.log('✅ SUCCESS: Connected to TikTok Live!');
    console.log(`👥 Viewer count: ${state.viewerCount}`);
    console.log(`🏠 Room ID: ${state.roomId}`);
    console.log(`📺 Stream title: ${state.title || 'No title'}`);
    console.log('');
    console.log('📱 Live Events:');
    console.log('-'.repeat(40));
  });
  
  connection.on('chat', (data) => {
    console.log(`💬 ${data.uniqueId}: ${data.comment}`);
  });
  
  connection.on('gift', (data) => {
    const giftInfo = `🎁 ${data.uniqueId} sent "${data.giftName}"`;
    const valueInfo = data.diamondCount > 0 ? ` (💎 ${data.diamondCount} diamonds)` : '';
    const repeatInfo = data.repeatCount > 1 ? ` x${data.repeatCount}` : '';
    
    console.log(`${giftInfo}${valueInfo}${repeatInfo}`);
  });
  
  connection.on('social', (data) => {
    const actions = {
      'follow': '➕ followed the streamer',
      'share': '📤 shared the stream', 
      'like': '❤️ liked the stream'
    };
    
    const action = actions[data.displayType.toLowerCase()] || `👥 ${data.displayType}`;
    console.log(`${action}: ${data.uniqueId}`);
  });
  
  connection.on('roomUser', (data) => {
    console.log(`👥 Viewers now: ${data.viewerCount}`);
  });
  
  connection.on('disconnected', () => {
    console.log('');
    console.log('❌ Disconnected from live stream');
    console.log('💡 This could mean:');
    console.log('   - The streamer ended their live session');
    console.log('   - Network connection was lost');  
    console.log('   - The stream became private');
  });
  
  connection.on('error', (err) => {
    console.error('');
    console.error('🚨 Connection Error:', err.message);
    
    // Smart error handling with helpful tips
    if (err.message.includes('LIVE_ACCESS_DENIED')) {
      console.error('💡 Possible reasons:');
      console.error('   - User is not currently live');
      console.error('   - Stream is private/restricted');
      console.error('   - Username does not exist');
    } else if (err.message.includes('rate limit') || err.message.includes('429')) {
      console.error('💡 Rate limit reached:');
      console.error('   - Free tier: 100 requests/day');
      console.error('   - Solution: Upgrade to paid service');
      console.error('   - Get API key: https://signing-for-paas.vercel.app/dashboard');
    } else if (err.message.includes('sign') || err.message.includes('signature')) {
      console.error('💡 Signing service issue:');
      console.error('   - Check your configuration');
      console.error('   - Test with: node config-helper.js test');
    } else if (err.message.includes('network') || err.message.includes('timeout')) {
      console.error('💡 Network issue:');
      console.error('   - Check your internet connection');
      console.error('   - Service might be temporarily unavailable');
    }
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down demo...');
    connection.disconnect();
    console.log('👋 Demo ended. Thanks for testing!');
    process.exit(0);
  });
  
  // Connect to the live stream
  try {
    await connection.connect();
    
    console.log('');
    console.log('🎉 Demo running successfully!');
    console.log('💡 Tips:');
    console.log('   - Watch for live chat messages and gifts above');
    console.log('   - Press Ctrl+C to stop the demo');
    console.log('   - Try different usernames to test various streams');
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check if user is actually live:');
    console.log(`   Visit: https://www.tiktok.com/@${username}/live`);
    console.log('2. Test your configuration:');
    console.log('   Run: node config-helper.js test');
    console.log('3. Try a different username');
    console.log('4. Check service status at dashboard');
    
    process.exit(1);
  }
}

// ====== DEMO RUNNER ======
async function runDemo() {
  // Get username from command line
  const username = process.argv[2];
  
  if (!username) {
    console.log('🎯 TikTok Live Connector Demo with Your Signing Service');
    console.log('');
    console.log('Usage: node demo-simple.js <username>');
    console.log('');
    console.log('Examples:');
    console.log('  node demo-simple.js jeffbezos');
    console.log('  node demo-simple.js cristiano');
    console.log('  node demo-simple.js khaby.lame');
    console.log('');
    console.log('💡 Tips:');
    console.log('  - Use popular TikTok usernames that are likely to be live');
    console.log('  - The demo will show live chat, gifts, and viewer counts');
    console.log('  - Press Ctrl+C to stop the demo at any time');
    console.log('');
    console.log('🔧 Configuration:');
    console.log('  - Current service: ' + (require('./tiktok-signing.config.js').service));
    console.log('  - Test config: node config-helper.js test');
    console.log('  - Switch service: node config-helper.js update service [free|paid]');
    
    process.exit(1);
  }
  
  // Validate configuration before connecting
  const validation = config.validateConfig();
  if (!validation.valid) {
    console.error('❌ Configuration Error:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    console.error('');
    console.error('🔧 Fix your configuration:');
    console.error('   1. Edit tiktok-signing.config.js');
    console.error('   2. Or run: node config-helper.js status');
    process.exit(1);
  }
  
  // Run the demo
  await connectToLiveStream(username);
}

// Start the demo
runDemo().catch(error => {
  console.error('💥 Demo crashed:', error.message);
  process.exit(1);
});