const { WebcastPushConnection } = require('tiktok-live-connector');

console.log('🔍 Testing WebcastPushConnection with External Signing Service');
console.log('=' .repeat(60));

// Try the WebcastPushConnection class with signProviderOptions
const connection = new WebcastPushConnection('qi6064', {
    signProviderOptions: {
        host: 'https://signing-for-paas.vercel.app/api/eulerstream',
        headers: {
            'X-API-Key': 'ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c',
            'Content-Type': 'application/json'
        }
    }
});

console.log('🔧 Using WebcastPushConnection with signProviderOptions');
console.log('🔧 Sign Provider Host:', 'https://signing-for-paas.vercel.app/api/eulerstream');
console.log('🔑 API Key:', 'ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c');

let eventCount = 0;

connection.connect().then(state => {
    console.log('\n✅ CONNECTED!');
    console.log('📊 Room ID:', state.roomId);
    console.log('👥 Viewers:', state.viewerCount || 'Unknown');
    
    console.log('\n📡 Monitoring for signature requests...');
    
    // Monitor events briefly
    connection.on('chat', data => {
        eventCount++;
        console.log(`💬 Chat ${eventCount}: ${data.uniqueId}: ${data.comment}`);
        if (eventCount >= 5) {
            console.log('\n🔌 Disconnecting after 5 chat messages...');
            connection.disconnect();
        }
    });
    
    // Auto-disconnect after 10 seconds
    setTimeout(() => {
        console.log('\n⏰ 10 seconds elapsed - disconnecting...');
        connection.disconnect();
    }, 10000);
    
}).catch(err => {
    console.error('\n❌ Connection failed:', err.message);
    
    if (err.message && (err.message.includes('signing') || err.message.includes('signature') || err.message.includes('sign'))) {
        console.log('✅ This error suggests our signing service was contacted!');
        console.log('🔍 Check signature_logs table for any requests');
    } else {
        console.log('🤔 Error might be unrelated to signing service');
        console.log('🔍 Still check signature_logs table just in case');
    }
    
    process.exit(1);
});

connection.on('disconnected', () => {
    console.log('\n📊 ANALYSIS COMPLETE:');
    console.log('🔍 Check signature_logs table for any requests during this connection');
    console.log('⏱️ Connection duration: ~10 seconds or until 5 chat messages');
    process.exit(0);
});

// Handle errors during connection
connection.on('error', (err) => {
    console.error('\n❌ Connection error during stream:', err.message);
    if (err.message && (err.message.includes('signing') || err.message.includes('signature'))) {
        console.log('✅ This error confirms our signing service was used!');
    }
});

console.log('\n🚀 Starting WebcastPushConnection test...');