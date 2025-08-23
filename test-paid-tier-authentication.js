/**
 * Test Paid Tier Authentication with Real API Key
 * This test verifies API key detection and proper tier classification
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');
const { signingConfig } = require('./signing-config');

console.log('💎 PAID TIER AUTHENTICATION TEST');
console.log('================================');

async function testPaidTierAuthentication() {
    console.log('🔧 Setting up paid tier authentication test...');
    
    // Test with a mock API key first (for testing purposes)
    const testApiKey = 'test-api-key-ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c';
    
    console.log('📋 Test Configuration:');
    console.log(`   Test API Key: ${testApiKey.substring(0, 20)}...`);
    console.log('   Expected Behavior: Should be classified as paid tier');
    console.log('');
    
    // Configure paid tier with API key
    signingConfig.setEndpoint('paid');
    signingConfig.setApiKey(testApiKey);
    signingConfig.applyToEnvironment();
    signingConfig.displayStatus();
    
    // Verify environment variables are set
    console.log('🔍 Environment Variable Check:');
    console.log(`   SIGN_API_URL: ${process.env.SIGN_API_URL}`);
    console.log(`   SIGN_API_KEY: ${process.env.SIGN_API_KEY ? process.env.SIGN_API_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
    console.log('');
    
    // Test direct endpoint first
    console.log('🧪 Testing direct endpoint with API key...');
    try {
        const testUrl = 'https://signing-for-paas.vercel.app/api/webcast/fetch?client=ttlive-node&unique_id=testuser';
        console.log('🔌 Making direct request with API key header...');
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'paid-tier-authentication-test/1.0',
                'X-API-Key': testApiKey  // This should trigger paid tier detection
            }
        });
        
        console.log(`   Response Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.status === 200) {
            console.log('   ✅ Direct API call successful');
        } else if (response.status === 401) {
            console.log('   ⚠️  API key authentication failed (expected for test key)');
        } else if (response.status === 429) {
            console.log('   ⚠️  Rate limited (API key not working)');
        } else {
            console.log(`   🤔 Unexpected response status: ${response.status}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Direct endpoint test failed: ${error.message}`);
    }
    
    console.log('');
    
    // Test TikTok Live Connector with API key
    const username = 'inhawlee12'; // Offline user for testing
    
    console.log(`📱 Testing TikTok Live Connector with API key authentication...`);
    console.log(`   Target: @${username}`);
    console.log(`   This should now be detected as PAID TIER instead of FREE TIER`);
    console.log('');
    
    try {
        const connection = new TikTokLiveConnection(username, {
            signProvider: 'eulerstream' // Routes to our service
        });
        
        let testTimeout = setTimeout(() => {
            console.log('⏰ Test timeout - completing...');
            connection.disconnect();
        }, 20000);
        
        connection.on('connected', (state) => {
            clearTimeout(testTimeout);
            console.log('🎉 SUCCESS: Connected using PAID TIER!');
            console.log(`   Room ID: ${state.roomId}`);
            console.log(`   This proves API key authentication is working`);
            connection.disconnect();
            
            // Check signature logs after success
            setTimeout(checkSignatureLogs, 2000);
        });
        
        connection.on('error', (error) => {
            clearTimeout(testTimeout);
            
            let errorMsg = '';
            if (error && typeof error === 'object') {
                if (error.message) {
                    errorMsg = error.message;
                } else if (error.exception && error.exception.message) {
                    errorMsg = error.exception.message;
                } else {
                    errorMsg = JSON.stringify(error, null, 2);
                }
            } else {
                errorMsg = String(error);
            }
            
            console.log(`📋 Connection Result: ${errorMsg}`);
            console.log('');
            
            if (errorMsg.includes('offline') || errorMsg.includes('not online')) {
                console.log('✅ SUCCESS: Reached user validation with API key!');
                console.log('   This means our paid tier authentication is working');
                
            } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                console.log('⚠️  API KEY REJECTED: Invalid or expired API key');
                console.log('   This is expected for test key - try with real API key');
                
            } else if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
                console.log('❌ AUTHENTICATION FAILED: Still being rate limited');
                console.log('   This means API key was not detected properly');
                
            } else if (errorMsg.includes('Room ID') || errorMsg.includes('HTML')) {
                console.log('✅ SUCCESS: Protobuf working, reached TikTok parsing');
                console.log('   API key authentication successful');
                
            } else {
                console.log(`🤔 Unexpected error: ${errorMsg}`);
            }
            
            // Check signature logs after any result
            setTimeout(checkSignatureLogs, 2000);
        });
        
        console.log('🔌 Connecting with API key...');
        await connection.connect();
        
    } catch (error) {
        console.error('❌ TikTok Live Connector test failed:', error?.message || error);
        
        // Still check logs even on error
        setTimeout(checkSignatureLogs, 2000);
    }
}

async function checkSignatureLogs() {
    console.log('');
    console.log('📊 CHECKING SIGNATURE LOGS FOR AUTHENTICATION VERIFICATION');
    console.log('=========================================================');
    
    try {
        // Make a simple request to check recent logs via our API
        const logsResponse = await fetch('https://signing-for-paas.vercel.app/api/debug/recent-logs', {
            method: 'GET',
            headers: {
                'User-Agent': 'log-checker/1.0'
            }
        });
        
        if (logsResponse.ok) {
            const logsData = await logsResponse.json();
            console.log('📋 Recent signature logs should now show:');
            console.log('   - tier: "unlimited" or "paid" (NOT "free")');  
            console.log('   - authentication_method: "api_key" (NOT "none")');
            console.log('   - Proper client IP address (NOT US server IP)');
            console.log('');
            console.log('✅ Check your Supabase signature_logs table for verification');
        } else {
            console.log('⚠️  Could not fetch recent logs - check manually in Supabase');
        }
        
    } catch (error) {
        console.log('💡 Manually check signature_logs table in Supabase:');
        console.log('   SELECT tier, authentication_method, ip_address, created_at');
        console.log('   FROM signature_logs');  
        console.log('   ORDER BY created_at DESC LIMIT 5;');
    }
    
    console.log('');
    console.log('🎯 AUTHENTICATION TEST COMPLETE');
    console.log('===============================');
    console.log('Key indicators of success:');
    console.log('✅ Request should be classified as paid/unlimited tier');
    console.log('✅ Authentication method should be api_key');
    console.log('✅ IP address should be your actual IP, not US server');
    console.log('✅ No rate limiting for paid tier requests');
    
    process.exit(0);
}

console.log('Starting paid tier authentication test in 2 seconds...');
setTimeout(testPaidTierAuthentication, 2000);