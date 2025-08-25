// CommonJS version of test to isolate ES module issues
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const tiktokUsername = 'kuian888';

console.log('🧪 Original Environment - CommonJS Test');
console.log('='.repeat(50));
console.log(`🎯 Target: @${tiktokUsername}`);
console.log('📦 Package: tiktok-live-connector@2.0.7-beta1 (original install)');
console.log('🔧 Method: CommonJS (same as fresh environment)');
console.log('');

// Create a new wrapper object and pass the username
const connection = new TikTokLiveConnection(tiktokUsername);

console.log('🔌 Creating connection...');

// Set up event handlers
connection.on('connected', (state) => {
    console.log('✅ ORIGINAL ENVIRONMENT SUCCESS!');
    console.log(`📺 Connected to roomId ${state.roomId}`);
    console.log(`👥 Viewers: ${state.viewerCount || 'Unknown'}`);
    console.log('📱 Monitoring live events...');
});

connection.on('error', (error) => {
    console.log('🚨 Original Environment Error:');
    if (error && typeof error === 'object') {
        if (error.info) console.log(`   Info: ${error.info}`);
        if (error.exception) console.log(`   Exception: ${error.exception}`);
        if (error.message) console.log(`   Message: ${error.message}`);
    } else {
        console.log(`   Error: ${error}`);
    }
});

connection.on(WebcastEvent.CHAT, data => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`💬 [${timestamp}] ${data.user.uniqueId}: ${data.comment}`);
});

connection.on(WebcastEvent.GIFT, data => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎁 [${timestamp}] ${data.user.uniqueId} → ${data.giftName || 'Gift'}`);
});

connection.on(WebcastEvent.LIKE, data => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`❤️ [${timestamp}] ${data.user.uniqueId} liked (+${data.likeCount || 1})`);
});

console.log('⏳ Attempting connection...');

connection.connect().then(state => {
    console.log('🎉 Connection established successfully!');
    
    setTimeout(() => {
        console.log('⏰ Test complete - disconnecting...');
        connection.disconnect();
        process.exit(0);
    }, 10000);
    
}).catch(err => {
    console.log('❌ Original Environment Connection Failed:');
    console.log(`   Error: ${err}`);
    
    console.log('');
    console.log('🔍 COMPARISON ANALYSIS:');
    console.log('Fresh Environment: ✅ SUCCESS (live events received)');
    console.log('Original Environment: ❌ FAILED (403 error)');
    console.log('');
    console.log('📋 This indicates an environment-specific issue in original setup');
    process.exit(1);
});