const { TikTokLiveConnection } = require('tiktok-live-connector');

console.log('🔍 Testing Forced External Signing Service Usage');
console.log('=' .repeat(60));

const connection = new TikTokLiveConnection('qi6064', {
    // Try different configurations to force external signing
    signProvider: 'https://signing-for-paas.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'X-API-Key': 'ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c',
        'Content-Type': 'application/json'
    },
    
    // Force disable internal signing if possible
    enableWebsocketUpgrade: false,
    enableExtendedGiftInfo: false,
    
    // Try legacy configurations
    signProvider2: 'https://signing-for-paas.vercel.app/api/eulerstream',
    requestOptions: {
        timeout: 10000,
    }
});

console.log('🔧 Sign Provider:', connection.signProvider || 'NONE SET');
console.log('🔧 Configuration:');
console.log('   - signProvider:', 'https://signing-for-paas.vercel.app/api/eulerstream');
console.log('   - enableWebsocketUpgrade:', false);
console.log('   - enableExtendedGiftInfo:', false);

let requestCount = 0;

// Monitor connection events
connection.on('connected', (state) => {
    console.log('\n✅ CONNECTED!');
    console.log('📊 Room ID:', state.roomId);
    console.log('👥 Viewers:', state.viewerCount || 'Unknown');
    
    // Immediately disconnect to test if signing was used
    setTimeout(() => {
        console.log('\n🔌 Disconnecting after 5 seconds...');
        connection.disconnect();
        
        console.log('\n📊 ANALYSIS:');
        console.log('✅ Connection successful');
        console.log('🔍 Check signature_logs table for any requests during this time');
        console.log('🕐 Connection time: ~5 seconds');
        
        process.exit(0);
    }, 5000);
});

connection.on('error', (err) => {
    console.error('\n❌ Connection error:', err.message);
    
    if (err.message.includes('signing') || err.message.includes('signature')) {
        console.log('✅ This error confirms our signing service was contacted!');
    } else {
        console.log('🤔 Error unrelated to signing service');
    }
    
    process.exit(1);
});

connection.on('disconnected', () => {
    console.log('\n🔌 Disconnected');
    process.exit(0);
});

console.log('\n🚀 Starting connection test...');
connection.connect().catch(err => {
    console.error('\n❌ Connection failed:', err.message);
    
    if (err.message.includes('signing') || err.message.includes('signature')) {
        console.log('✅ This error confirms our signing service was contacted!');
    }
    
    process.exit(1);
});