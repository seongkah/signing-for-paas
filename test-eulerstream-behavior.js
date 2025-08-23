const { TikTokLiveConnection } = require('tiktok-live-connector');

console.log('🔍 TESTING: TikTok Live Connector EulerStream Behavior');
console.log('=' .repeat(60));

// First, let's see the current configuration
const SignConfig = require('tiktok-live-connector/dist/lib/config').SignConfig;
console.log('📊 Current SignConfig:');
console.log('   basePath:', SignConfig.basePath);
console.log('   apiKey:', SignConfig.apiKey || 'Not set');
console.log('');

// Test 1: Try with signProvider: 'eulerstream' (current default)
console.log('🧪 TEST 1: Default EulerStream behavior');
console.log('-'.repeat(40));

const connection1 = new TikTokLiveConnection('inhawlee12', {
    signProvider: 'eulerstream'
});

connection1.connect().then(state => {
    console.log('✅ TEST 1 SUCCESS: Connected using default EulerStream');
    console.log(`   Room ID: ${state.roomId}`);
    console.log('   This means EulerStream is working normally');
    
    // Disconnect quickly
    setTimeout(() => {
        connection1.disconnect();
        runTest2();
    }, 3000);
    
}).catch(err => {
    console.log('❌ TEST 1 FAILED:', err.message);
    runTest2();
});

function runTest2() {
    console.log('\n🧪 TEST 2: Override SignConfig to point to our server');
    console.log('-'.repeat(40));
    
    // Override the SignConfig to point to our server
    const SignConfig = require('tiktok-live-connector/dist/lib/config').SignConfig;
    SignConfig.basePath = 'https://signing-for-paas.vercel.app/api';
    
    console.log('📊 Updated SignConfig:');
    console.log('   basePath:', SignConfig.basePath);
    console.log('');
    
    const connection2 = new TikTokLiveConnection('inhawlee12', {
        signProvider: 'eulerstream'  // This should now use OUR server
    });
    
    connection2.connect().then(state => {
        console.log('✅ TEST 2 SUCCESS: Connected using OUR server as EulerStream replacement!');
        console.log(`   Room ID: ${state.roomId}`);
        console.log('   This means our server was used instead of EulerStream');
        
        setTimeout(() => {
            connection2.disconnect();
            runTest3();
        }, 3000);
        
    }).catch(err => {
        console.log('❌ TEST 2 FAILED:', err.message);
        console.log('   This tells us what endpoints our server is missing');
        console.log('   Error details:', err);
        runTest3();
    });
}

function runTest3() {
    console.log('\n🧪 TEST 3: Test with environment variable override');
    console.log('-'.repeat(40));
    
    // Test with environment variable
    process.env.SIGN_API_URL = 'https://signing-for-paas.vercel.app/api';
    
    console.log('📊 Environment override:');
    console.log('   SIGN_API_URL:', process.env.SIGN_API_URL);
    
    // Re-require to pick up env var changes
    delete require.cache[require.resolve('tiktok-live-connector/dist/lib/config')];
    const NewSignConfig = require('tiktok-live-connector/dist/lib/config').SignConfig;
    console.log('   New basePath:', NewSignConfig.basePath);
    console.log('');
    
    const connection3 = new TikTokLiveConnection('inhawlee12', {
        signProvider: 'eulerstream'
    });
    
    connection3.connect().then(state => {
        console.log('✅ TEST 3 SUCCESS: Environment variable override worked!');
        console.log(`   Room ID: ${state.roomId}`);
        
        setTimeout(() => {
            connection3.disconnect();
            console.log('\n🎯 ANALYSIS COMPLETE');
            console.log('Check signature_logs table for any requests to our server');
            process.exit(0);
        }, 3000);
        
    }).catch(err => {
        console.log('❌ TEST 3 FAILED:', err.message);
        console.log('   This confirms what API endpoints we need to implement');
        
        console.log('\n🎯 ANALYSIS COMPLETE');
        console.log('Check signature_logs table for any requests to our server');
        process.exit(0);
    });
}

// Handle errors and cleanup
process.on('uncaughtException', (err) => {
    console.log('\n🚨 Uncaught Exception:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.log('\n🚨 Unhandled Rejection:', err.message);
    process.exit(1);
});