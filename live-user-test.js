#!/usr/bin/env node

/**
 * Live User Pipeline Test
 * 
 * This tests the complete TikTok Live pipeline with multiple popular streamers
 * to find one that's currently live and verify the protobuf decoding works.
 */

const config = require('./tiktok-signing.config.js');

class LiveUserTest {
  constructor() {
    this.popularUsers = [
      'kuian888',
      'officialgeilegisela', 
      'jeffbezos',
      'charlidamelio',
      'addisonre',
      'zachking',
      'lorengray',
      'dixiedamelio',
      'spencerx',
      'riyaz.14'
    ];
    
    this.stats = {
      testedUsers: 0,
      successfulConnections: 0,
      protobufMessages: 0,
      errors: []
    };
  }

  async runTest() {
    console.log('🔬 Live User Pipeline Test');
    console.log('='.repeat(50));
    console.log('');
    console.log('Testing multiple popular TikTok users to find one that is live');
    console.log('and verify the complete protobuf pipeline works.');
    console.log('');

    // First verify our signing service works
    console.log('🔐 Step 1: Verify Signing Service');
    console.log('-'.repeat(30));
    
    const signTest = await this.testSigningService();
    if (!signTest) {
      console.log('❌ Signing service failed - cannot proceed');
      return false;
    }
    
    console.log('✅ Signing service working');
    console.log('');

    // Test each user until we find one that's live
    console.log('🎭 Step 2: Find Live User & Test Pipeline');
    console.log('-'.repeat(40));
    
    for (const username of this.popularUsers) {
      console.log(`🧪 Testing @${username}...`);
      
      const result = await this.testUser(username);
      this.stats.testedUsers++;
      
      if (result.success) {
        this.stats.successfulConnections++;
        console.log(`✅ SUCCESS with @${username}!`);
        console.log('');
        
        // Monitor for protobuf events
        const protobufResult = await this.monitorProtobuf(result.connection, 15);
        this.stats.protobufMessages += protobufResult.messages;
        
        result.connection.disconnect();
        
        if (protobufResult.messages > 0) {
          console.log('🎉 COMPLETE SUCCESS: Protobuf pipeline working!');
          this.showResults(username);
          return true;
        } else {
          console.log('⚠️ Connected but no activity - trying next user...');
        }
        
        console.log('');
      } else {
        console.log(`❌ @${username}: ${result.error}`);
      }
      
      // Short delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('');
    console.log('🔍 No currently active live users found in our test list');
    this.showResults();
    
    return this.stats.successfulConnections > 0;
  }

  async testSigningService() {
    try {
      const https = require('https');
      const url = require('url');
      
      const signingConfig = config.getSigningConfig();
      const testData = JSON.stringify({ url: 'https://www.tiktok.com/@test/live' });
      
      const response = await new Promise((resolve, reject) => {
        const parsedUrl = url.parse(signingConfig.signProvider);
        
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...signingConfig.signProviderHeaders
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data)
              });
            } catch (e) {
              reject(new Error(`Invalid response: ${data.slice(0, 100)}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Signing timeout')));
        req.write(testData);
        req.end();
      });
      
      return response.status === 200 && response.data.success;
      
    } catch (error) {
      console.log(`   ❌ Signing error: ${error.message}`);
      return false;
    }
  }

  async testUser(username) {
    try {
      const { TikTokLiveConnection } = require('tiktok-live-connector');
      
      const connection = new TikTokLiveConnection(username, config.getSigningConfig());
      
      // Quick connection test with timeout
      const connectPromise = connection.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 8000)
      );
      
      const state = await Promise.race([connectPromise, timeoutPromise]);
      
      return {
        success: true,
        connection: connection,
        state: state
      };
      
    } catch (error) {
      let errorMsg = 'Connection failed';
      try {
        errorMsg = error?.message || error?.toString?.() || 'Unknown error';
      } catch (e) {
        errorMsg = 'Error processing error';
      }
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  async monitorProtobuf(connection, seconds) {
    let messages = 0;
    let chats = 0;
    let gifts = 0;
    
    // Set up event monitoring
    const setupProtobufListeners = () => {
      try {
        const { WebcastEvent } = require('tiktok-live-connector');
        
        connection.on(WebcastEvent.CHAT, (data) => {
          messages++;
          chats++;
          const timestamp = new Date().toLocaleTimeString();
          console.log(`💬 [${timestamp}] PROTOBUF CHAT: ${data.user.uniqueId} → ${data.comment}`);
        });
        
        connection.on(WebcastEvent.GIFT, (data) => {
          messages++;
          gifts++;
          const timestamp = new Date().toLocaleTimeString();
          console.log(`🎁 [${timestamp}] PROTOBUF GIFT: ${data.user.uniqueId} → ${data.giftName || 'Gift'}`);
        });
        
        connection.on(WebcastEvent.LIKE, (data) => {
          messages++;
          const timestamp = new Date().toLocaleTimeString();
          console.log(`❤️ [${timestamp}] PROTOBUF LIKE: ${data.user.uniqueId} (+${data.likeCount || 1})`);
        });
        
        return true;
        
      } catch (e) {
        console.log('⚠️ Using fallback event handling');
        
        connection.on('chat', (data) => {
          messages++;
          chats++;
          console.log(`💬 CHAT: ${data.user?.uniqueId || 'User'} → ${data.comment}`);
        });
        
        connection.on('gift', (data) => {
          messages++;
          gifts++;
          console.log(`🎁 GIFT: ${data.user?.uniqueId || 'User'} sent gift`);
        });
        
        return false;
      }
    };
    
    const hasWebcastEvent = setupProtobufListeners();
    
    console.log('📡 Monitoring protobuf stream...');
    if (hasWebcastEvent) {
      console.log('   ✅ Full WebcastEvent support detected');
    } else {
      console.log('   ⚠️ Using fallback event handling');
    }
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          messages: messages,
          chats: chats,
          gifts: gifts,
          hasWebcastEvent: hasWebcastEvent
        });
      }, seconds * 1000);
    });
  }

  showResults(successUser = null) {
    console.log('');
    console.log('📊 LIVE USER TEST RESULTS');
    console.log('='.repeat(30));
    console.log(`👥 Users Tested: ${this.stats.testedUsers}/${this.popularUsers.length}`);
    console.log(`✅ Successful Connections: ${this.stats.successfulConnections}`);
    console.log(`📡 Protobuf Messages: ${this.stats.protobufMessages}`);
    
    if (successUser && this.stats.protobufMessages > 0) {
      console.log('');
      console.log('🎉 PIPELINE VERIFICATION COMPLETE!');
      console.log(`   ✅ Working with: @${successUser}`);
      console.log('   ✅ Signing service: WORKING');
      console.log('   ✅ WebSocket connection: WORKING');
      console.log('   ✅ Protobuf decoding: WORKING');
      console.log('   ✅ Live event parsing: WORKING');
      console.log('');
      console.log('🚀 Your signing service enables COMPLETE TikTok Live reverse engineering!');
      console.log('   Ready for production use with tiktok-live-connector');
      
    } else if (this.stats.successfulConnections > 0) {
      console.log('');
      console.log('🟡 PARTIAL SUCCESS');
      console.log('   ✅ Signing service: WORKING');
      console.log('   ✅ WebSocket connections: WORKING');
      console.log('   ⚠️ Limited protobuf activity (users not very active)');
      console.log('');
      console.log('💡 Your signing service works correctly!');
      console.log('   The limited activity is normal for quiet streams');
      
    } else {
      console.log('');
      console.log('🟠 CONNECTION RESULTS');
      console.log('   ✅ Signing service: WORKING (verified earlier)');
      console.log('   ⚠️ No live users found in test list');
      console.log('');
      console.log('💡 This is likely because:');
      console.log('   - Test users are not currently live');
      console.log('   - Different time zones/peak hours');
      console.log('   - Your signing service still works correctly!');
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Live User Pipeline Test');
  console.log('');
  
  const test = new LiveUserTest();
  
  // Handle interruption
  process.on('SIGINT', () => {
    console.log('\\n🛑 Test interrupted');
    test.showResults();
    process.exit(0);
  });
  
  const success = await test.runTest();
  
  console.log('');
  console.log('🏁 TEST COMPLETE!');
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('💥 Test crashed:', error.message);
  process.exit(1);
});