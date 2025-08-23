/**
 * Test API Key Header Detection
 * This test checks what headers TikTok Live Connector actually sends
 */

const { TikTokLiveConnection } = require('tiktok-live-connector');
const { signingConfig } = require('./signing-config');

console.log('🔍 API KEY HEADER DETECTION TEST');
console.log('================================');

async function testApiKeyHeaders() {
    // Set up test API key
    const testApiKey = 'test-header-detection-key-12345';
    
    console.log('🔧 Setting up API key for TikTok Live Connector...');
    console.log(`   Test API Key: ${testApiKey}`);
    
    // Configure the API key through environment variable (how TikTok Live Connector expects it)
    process.env.SIGN_API_KEY = testApiKey;
    process.env.SIGN_API_URL = 'https://signing-for-paas.vercel.app/api';
    
    console.log('✅ Environment variables set:');
    console.log(`   SIGN_API_URL: ${process.env.SIGN_API_URL}`);
    console.log(`   SIGN_API_KEY: ${process.env.SIGN_API_KEY}`);
    console.log('');
    
    // Create a simple HTTP server to capture what headers TikTok Live Connector sends
    console.log('🎯 This test will show what headers TikTok Live Connector actually sends');
    console.log('   Check the server logs in our /api/webcast/fetch endpoint');
    console.log('');
    
    // Test with TikTok Live Connector
    const username = 'inhawlee12';
    
    console.log(`📱 Testing TikTok Live Connector with @${username}...`);
    console.log('   Watch the server logs to see what headers are sent!');
    console.log('');
    
    try {
        const connection = new TikTokLiveConnection(username, {
            signProvider: 'eulerstream'
        });
        
        let testTimeout = setTimeout(() => {
            console.log('⏰ Test complete - check server logs');
            connection.disconnect();
            process.exit(0);
        }, 15000);
        
        connection.on('connected', (state) => {
            clearTimeout(testTimeout);
            console.log('🎉 Connection successful!');
            console.log('   Check signature_logs table for the authentication details');
            connection.disconnect();
            process.exit(0);
        });
        
        connection.on('error', (error) => {
            clearTimeout(testTimeout);
            console.log('📋 Connection completed (with expected error)');
            console.log('   Check signature_logs table for the authentication details');
            console.log('');
            console.log('🔍 Key things to check in signature_logs:');
            console.log('   1. Is tier now "paid" or "unlimited" instead of "free"?');
            console.log('   2. Is authentication_method "api_key" instead of "ip_based"?');  
            console.log('   3. What IP address is logged?');
            console.log('');
            process.exit(0);
        });
        
        console.log('🔌 Connecting (this should trigger our authentication logging)...');
        await connection.connect();
        
    } catch (error) {
        console.log('Connection attempt completed - check logs for authentication details');
        process.exit(0);
    }
}

testApiKeyHeaders().catch(console.error);