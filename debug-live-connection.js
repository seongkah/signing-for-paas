#!/usr/bin/env node

/**
 * Debug Live Connection Issues
 * 
 * Since kuian888 is confirmed live but we're getting 403 errors,
 * let's debug what's actually happening in the TikTok Live Connector.
 */

const config = require('./tiktok-signing.config.js');

class ConnectionDebugger {
  async debugConnection(username) {
    console.log('🔍 Debugging TikTok Live Connection Issues');
    console.log('='.repeat(50));
    console.log('');
    console.log(`🎯 Target: @${username} (confirmed live)`);
    console.log('');

    // Test 1: Check TikTok Live Connector version
    console.log('📦 Step 1: TikTok Live Connector Info');
    console.log('-'.repeat(35));
    
    try {
      const tiktokPackage = require('tiktok-live-connector/package.json');
      console.log(`✅ Version: ${tiktokPackage.version}`);
      console.log(`📅 Last updated: ${tiktokPackage._updated || 'Unknown'}`);
    } catch (e) {
      console.log('⚠️ Could not read package info');
    }
    
    console.log('');

    // Test 2: Test with maximum debugging
    console.log('🔍 Step 2: Detailed Connection Debug');
    console.log('-'.repeat(35));
    
    await this.detailedConnectionTest(username);
  }

  async detailedConnectionTest(username) {
    try {
      const { TikTokLiveConnection } = require('tiktok-live-connector');
      
      // Test with our service (free tier)
      config.service = 'free';
      const signingConfig = config.getSigningConfig();
      
      console.log('🔧 Configuration:');
      console.log(JSON.stringify(signingConfig, null, 2));
      console.log('');
      
      console.log('🔌 Creating connection with detailed monitoring...');
      const connection = new TikTokLiveConnection(username, {
        ...signingConfig,
        // Add debugging options if available
        debug: true,
        enableExtendedGiftInfo: true,
        requestOptions: {
          timeout: 10000
        }
      });
      
      // Set up comprehensive event monitoring
      const events = [];
      
      connection.on('connected', (state) => {
        console.log('✅ CONNECTION SUCCESS!');
        console.log('📊 Connection State:');
        console.log(JSON.stringify(state, null, 2));
        events.push({ type: 'connected', data: state });
      });
      
      connection.on('disconnected', () => {
        console.log('🔌 Disconnected');
        events.push({ type: 'disconnected' });
      });
      
      connection.on('error', (error) => {
        console.log('🚨 ERROR EVENT:');
        console.log('Error type:', typeof error);
        console.log('Error constructor:', error?.constructor?.name);
        
        try {
          if (error && typeof error === 'object') {
            console.log('Error keys:', Object.keys(error));
            console.log('Error message:', error.message);
            console.log('Error code:', error.code);
            console.log('Error stack:', error.stack?.slice(0, 300));
            
            // Try to stringify the full error
            try {
              console.log('Full error object:', JSON.stringify(error, null, 2));
            } catch (e) {
              console.log('Error object not JSON serializable');
            }
          } else {
            console.log('Error value:', error);
          }
        } catch (e) {
          console.log('Error processing error:', e.message);
        }
        
        events.push({ type: 'error', data: error });
      });
      
      // Monitor WebSocket events if possible
      try {
        // Try to access internal WebSocket events
        connection.on('rawData', (data) => {
          console.log('📡 Raw data received:', data?.length || 'unknown', 'bytes');
        });
        
        connection.on('websocketConnected', () => {
          console.log('🔗 WebSocket layer connected');
        });
        
        connection.on('streamData', (data) => {
          console.log('📺 Stream data:', data?.length || 'unknown', 'bytes');
        });
        
      } catch (e) {
        console.log('⚠️ Advanced monitoring not available');
      }
      
      console.log('⏳ Attempting connection...');
      console.log('');
      
      try {
        // Try connection with extended timeout
        const connectPromise = connection.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)
        );
        
        const state = await Promise.race([connectPromise, timeoutPromise]);
        
        console.log('🎉 CONNECTION SUCCESSFUL!');
        console.log('');
        console.log('📊 Final State:');
        console.log(JSON.stringify(state, null, 2));
        
        // Monitor for a few seconds to see events
        console.log('');
        console.log('📱 Monitoring for live events...');
        
        // Set up live event monitoring
        try {
          const { WebcastEvent } = require('tiktok-live-connector');
          
          connection.on(WebcastEvent.CHAT, (data) => {
            console.log(`💬 CHAT: ${data.user.uniqueId} → ${data.comment}`);
          });
          
          connection.on(WebcastEvent.GIFT, (data) => {
            console.log(`🎁 GIFT: ${data.user.uniqueId} → ${data.giftName || 'Gift'}`);
          });
          
        } catch (e) {
          console.log('Using fallback event monitoring');
        }
        
        // Wait 10 seconds for events
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        connection.disconnect();
        
        console.log('');
        console.log('✅ SUCCESS: Your config.js system is working perfectly!');
        console.log('The connection to the live stream was successful.');
        
        return true;
        
      } catch (connectionError) {
        console.log('❌ CONNECTION FAILED:');
        console.log('');
        
        // Detailed error analysis
        console.log('🔍 Error Analysis:');
        console.log('Error type:', typeof connectionError);
        console.log('Error message:', connectionError.message);
        console.log('Error code:', connectionError.code);
        
        if (connectionError.message?.includes('403')) {
          console.log('');
          console.log('📋 403 Error Deep Dive:');
          console.log('This could mean:');
          console.log('1. TikTok is blocking the connection attempt');
          console.log('2. The signing service signature is not compatible');
          console.log('3. TikTok has changed their authentication requirements');
          console.log('4. Geographic/IP restrictions');
          console.log('5. User privacy settings blocking external connections');
          
          console.log('');
          console.log('🧪 Let\'s test the signature service directly...');
          await this.testSignatureDirectly(username);
        }
        
        console.log('');
        console.log('📊 Event Summary:');
        events.forEach((event, i) => {
          console.log(`${i + 1}. ${event.type}: ${JSON.stringify(event.data).slice(0, 100)}`);
        });
        
        return false;
      }
      
    } catch (setupError) {
      console.log('❌ SETUP ERROR:', setupError.message);
      return false;
    }
  }

  async testSignatureDirectly(username) {
    console.log('🧪 Testing signature service directly...');
    
    try {
      const https = require('https');
      const url = require('url');
      
      const testUrl = 'https://signing-for-paas.vercel.app/api/eulerstream';
      const testData = JSON.stringify({ 
        url: `https://www.tiktok.com/@${username}/live` 
      });
      
      console.log(`📡 Making direct request to: ${testUrl}`);
      
      const response = await new Promise((resolve, reject) => {
        const parsedUrl = url.parse(testUrl);
        
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TikTok-Live-Connector-Test'
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                data: JSON.parse(data),
                raw: data
              });
            } catch (parseError) {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                data: null,
                raw: data,
                parseError: parseError.message
              });
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Direct request timeout')));
        
        req.write(testData);
        req.end();
      });
      
      console.log('📊 Direct signature test results:');
      console.log(`Status: ${response.statusCode}`);
      console.log(`Success: ${response.data?.success ? '✅' : '❌'}`);
      
      if (response.data?.success) {
        console.log('✅ Signature service is working correctly');
        console.log('The issue might be with TikTok\'s WebSocket authentication requirements');
      } else {
        console.log('❌ Signature service issue detected');
        console.log('Response:', response.raw.slice(0, 500));
      }
      
    } catch (error) {
      console.log(`❌ Direct signature test failed: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const username = process.argv[2] || 'kuian888';
  
  console.log('🚀 Starting Connection Debug');
  console.log(`🎭 Target User: @${username} (confirmed live)`);
  console.log('');
  
  const connectionDebugger = new ConnectionDebugger();
  
  // Handle interruption
  process.on('SIGINT', () => {
    console.log('\\n🛑 Debug interrupted');
    process.exit(0);
  });
  
  const success = await connectionDebugger.debugConnection(username);
  
  console.log('');
  console.log('🏁 DEBUG COMPLETE');
  
  if (success) {
    console.log('✅ Your config.js system is working!');
  } else {
    console.log('🔍 Issue identified - needs investigation');
  }
}

main().catch(error => {
  console.error('💥 Debug crashed:', error.message);
  process.exit(1);
});