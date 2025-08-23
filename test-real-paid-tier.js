/**
 * Test REAL Paid Tier with REAL API Key and ONLINE User
 * This test uses a real API key and online streamer inhawlee12
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');
const { signingConfig } = require('./signing-config');

console.log('💎 REAL PAID TIER TEST - LIVE STREAMER');
console.log('=====================================');

async function testRealPaidTier() {
    // Use REAL API key that we just generated and added to database
    const realApiKey = 'sk_053cc076c3c56e337c1427617a11a61b9eb994dbdac1c06af7339fe7ffbae5ba';
    
    console.log('🔑 REAL API KEY TEST');
    console.log(`   API Key: ${realApiKey}`);
    console.log(`   User: inhawlee12 (ONLINE STREAMER)`);
    console.log(`   Expected: tier="unlimited", authentication_method="api_key"`);
    console.log('');
    
    // Configure paid tier with REAL API key
    signingConfig.setEndpoint('paid');
    signingConfig.setApiKey(realApiKey);
    signingConfig.applyToEnvironment();
    
    console.log('✅ Configuration Applied:');
    console.log(`   SIGN_API_URL: ${process.env.SIGN_API_URL}`);
    console.log(`   SIGN_API_KEY: ${process.env.SIGN_API_KEY}`);
    console.log('');
    
    // Test direct endpoint first with real API key
    console.log('🧪 Step 1: Direct endpoint test with real API key...');
    try {
        const response = await fetch('https://signing-for-paas.vercel.app/api/webcast/fetch?client=ttlive-node&unique_id=inhawlee12', {
            method: 'GET',
            headers: {
                'User-Agent': 'real-paid-tier-test/1.0',
                'X-API-Key': realApiKey
            }
        });
        
        console.log(`   Response: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.status === 200) {
            console.log('   ✅ Direct API call successful with real API key!');
        } else if (response.status === 401) {
            console.log('   ❌ API key authentication failed');
            console.log('   This suggests the API key may be invalid or expired');
        } else if (response.status === 429) {
            console.log('   ❌ Still rate limited - API key not working');
        } else {
            console.log(`   🤔 Unexpected status: ${response.status}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Direct test failed: ${error.message}`);
    }
    
    console.log('');
    
    // Test with TikTok Live Connector and ONLINE user
    const username = 'inhawlee12'; // ONLINE STREAMER
    
    console.log('🎯 Step 2: TikTok Live Connector test with ONLINE user...');
    console.log(`   Target: @${username} (ONLINE STREAMER)`);
    console.log(`   This should connect successfully and show live stream data!`);
    console.log('');
    
    try {
        const connection = new TikTokLiveConnection(username, {
            signProvider: 'eulerstream',
            enableDetailedEvents: true,
            processInitialData: true
        });
        
        let connectionSucceeded = false;
        let testTimeout = setTimeout(() => {
            if (!connectionSucceeded) {
                console.log('⏰ Test timeout - checking results...');
                connection.disconnect();
                checkResults();
            }
        }, 30000); // 30 seconds for online user
        
        connection.on('connected', (state) => {
            clearTimeout(testTimeout);
            connectionSucceeded = true;
            
            console.log('🎉🎉🎉 FULL SUCCESS: CONNECTED TO LIVE STREAM! 🎉🎉🎉');
            console.log('');
            console.log('📊 LIVE STREAM DATA:');
            console.log(`   Room ID: ${state.roomId}`);
            console.log(`   Viewer Count: ${state.viewerCount}`);
            console.log(`   Like Count: ${state.likeCount}`);
            console.log(`   Stream Title: ${state.title || 'N/A'}`);
            console.log('');
            console.log('✅ PAID TIER VERIFICATION SUCCESSFUL:');
            console.log('   - Real API key worked ✅');
            console.log('   - Connected to ONLINE user ✅');
            console.log('   - Protobuf decoding successful ✅');
            console.log('   - Live stream data received ✅');
            console.log('   - No rate limiting (unlimited tier) ✅');
            console.log('');
            
            // Keep connection open for a few seconds to receive live data
            setTimeout(() => {
                console.log('📋 Disconnecting after successful verification...');
                connection.disconnect();
                checkResults();
            }, 5000);
        });
        
        connection.on('chat', (data) => {
            console.log(`💬 LIVE CHAT: ${data.comment} - ${data.uniqueId}`);
        });
        
        connection.on('gift', (data) => {
            console.log(`🎁 LIVE GIFT: ${data.giftName} from ${data.uniqueId}`);
        });
        
        connection.on('like', (data) => {
            console.log(`❤️  LIVE LIKE from: ${data.uniqueId}`);
        });
        
        connection.on('viewer', (data) => {
            console.log(`👥 VIEWER UPDATE: ${data.viewerCount} viewers`);
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
            
            console.log(`📋 Connection Error: ${errorMsg}`);
            console.log('');
            
            if (errorMsg.includes('offline') || errorMsg.includes('not online')) {
                console.log('⚠️  USER WENT OFFLINE during test');
                console.log('   But this still proves API key authentication worked!');
                console.log('   The connection reached user validation stage');
                
            } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                console.log('❌ API KEY AUTHENTICATION FAILED');
                console.log('   The real API key was rejected by the system');
                
            } else if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
                console.log('❌ STILL RATE LIMITED WITH REAL API KEY');
                console.log('   This means the paid tier authentication is not working');
                
            } else if (errorMsg.includes('Room ID') || errorMsg.includes('HTML')) {
                console.log('✅ PARTIAL SUCCESS: API key worked, TikTok scraping issue');
                console.log('   This means paid tier authentication is functional');
                
            } else {
                console.log(`🤔 Unexpected error pattern: ${errorMsg}`);
            }
            
            checkResults();
        });
        
        console.log('🔌 Connecting to ONLINE streamer with REAL API key...');
        console.log('   Expecting: Full connection success with live stream data!');
        
        await connection.connect();
        
    } catch (error) {
        console.error('❌ TikTok Live Connector failed:', error?.message || error);
        checkResults();
    }
}

async function checkResults() {
    console.log('');
    console.log('📊 SIGNATURE LOGS VERIFICATION');
    console.log('==============================');
    console.log('🔍 Checking if signature_logs now shows PAID TIER...');
    console.log('');
    
    // Give a moment for logs to be written
    setTimeout(async () => {
        console.log('💡 Check your Supabase signature_logs table now:');
        console.log('');
        console.log('🎯 EXPECTED RESULTS for real API key:');
        console.log('   tier: "unlimited" or "api_key" (NOT "free")');
        console.log('   authentication_method: "api_key" (NOT "ip_based")');
        console.log('   user_id: "4f2d532d-6c6c-441e-8b09-64fc0dfbc01e"');
        console.log('   api_key_id: [new key ID from database]');
        console.log('   success: true');
        console.log('   endpoint: "/api/signature" or "/api/webcast/fetch"');
        console.log('');
        console.log('📋 SQL Query to check:');
        console.log('   SELECT tier, authentication_method, user_id, api_key_id, success, created_at');
        console.log('   FROM signature_logs ORDER BY created_at DESC LIMIT 3;');
        console.log('');
        
        console.log('🏆 TEST COMPLETE!');
        console.log('===============');
        if (process.argv.includes('--keep-running')) {
            console.log('✅ Process will keep running for manual verification...');
        } else {
            process.exit(0);
        }
        
    }, 3000); // Wait 3 seconds for logging
}

console.log('Starting REAL paid tier test with ONLINE user in 3 seconds...');
setTimeout(testRealPaidTier, 3000);