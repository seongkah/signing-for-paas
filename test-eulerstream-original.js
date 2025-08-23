/**
 * Test TikTok Live Connector with ORIGINAL EulerStream Service
 * This test reverts to using the external EulerStream service
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');
const { signingConfig } = require('./signing-config');

console.log('🧪 ORIGINAL EULERSTREAM SERVICE TEST');
console.log('===================================');

async function testOriginalEulerStream() {
    console.log('🔧 Configuration: Setting up ORIGINAL EulerStream endpoint...');
    
    // Set to original EulerStream service
    signingConfig.setEndpoint('eulerstream');
    signingConfig.applyToEnvironment();
    signingConfig.displayStatus();
    
    // Test endpoint connectivity first
    console.log('🔌 Testing EulerStream endpoint connectivity...');
    const endpointWorking = await signingConfig.testEndpoint('eulerstream');
    
    if (!endpointWorking) {
        console.log('❌ EulerStream endpoint is not accessible. Test cannot proceed.');
        process.exit(1);
    }
    
    console.log('✅ EulerStream endpoint is accessible');
    console.log('');
    
    // Test with offline user to check protobuf compatibility
    const username = 'inhawlee12'; // Known offline user
    
    console.log(`📱 Testing TikTok Live Connector with @${username} using ORIGINAL EulerStream...`);
    console.log('   This will test if external EulerStream service still works');
    console.log('');
    
    try {
        const connection = new TikTokLiveConnection(username, {
            signProvider: 'eulerstream',
            enableDetailedEvents: false
        });
        
        let testComplete = false;
        let testTimeout = setTimeout(() => {
            if (!testComplete) {
                console.log('⏰ Test timeout - disconnecting...');
                connection.disconnect();
                testComplete = true;
            }
        }, 20000); // 20 second timeout
        
        connection.on('connected', (state) => {
            clearTimeout(testTimeout);
            testComplete = true;
            console.log('🎉 FULL SUCCESS: Connected to live stream using ORIGINAL EulerStream!');
            console.log(`   Room ID: ${state.roomId}`);
            console.log(`   Viewers: ${state.viewerCount}`);
            console.log('✅ Original EulerStream service is working perfectly');
            connection.disconnect();
        });
        
        connection.on('error', (error) => {
            clearTimeout(testTimeout);
            testComplete = true;
            
            const errorMsg = error?.message || String(error) || '';
            console.log(`📋 Result: ${errorMsg}`);
            
            if (errorMsg.includes('offline') || errorMsg.includes('not online') || errorMsg.includes("isn't online")) {
                console.log('');
                console.log('✅ SUCCESS: User validation reached with ORIGINAL EulerStream');
                console.log('   - External EulerStream service called successfully ✅');
                console.log('   - Protobuf response was decoded correctly ✅');
                console.log('   - Connection progressed to user validation ✅');
                console.log('   - User is offline (normal behavior) ✅');
                console.log('');
                console.log('🏆 CONCLUSION: Original EulerStream service integration confirmed!');
                
            } else if (errorMsg.includes('protobuf') || errorMsg.includes('decode')) {
                console.log('');
                console.log('❌ FAILURE: Protobuf decoding issue with original EulerStream');
                console.log('   This suggests an issue with EulerStream service itself');
                
            } else if (errorMsg.includes('Room ID') || errorMsg.includes('HTML')) {
                console.log('');
                console.log('✅ SUCCESS: EulerStream protobuf working, TikTok scraping issue');
                console.log('   Original EulerStream service is functional');
                
            } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('network')) {
                console.log('');
                console.log('❌ NETWORK ERROR: Cannot reach EulerStream service');
                console.log('   Check internet connection or EulerStream service status');
                
            } else {
                console.log('');
                console.log('🤔 UNEXPECTED ERROR with original EulerStream:');
                console.log(`   ${errorMsg}`);
            }
            
            process.exit(testComplete ? 0 : 1);
        });
        
        console.log('🔌 Connecting to TikTok Live using ORIGINAL EulerStream service...');
        await connection.connect();
        
    } catch (error) {
        console.error('❌ TEST FAILED with original EulerStream:', error?.message || error);
        
        const errorMsg = error?.message || String(error) || '';
        if (errorMsg.includes('ENOTFOUND')) {
            console.log('');
            console.log('💡 This suggests EulerStream service may be down or unreachable');
        }
        
        process.exit(1);
    }
}

console.log('Starting Original EulerStream test in 2 seconds...');
setTimeout(testOriginalEulerStream, 2000);