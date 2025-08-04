const { TikTokLiveConnection } = require('tiktok-live-connector');

/**
 * Demonstration of TikTok Room Info Fetching
 * Shows how to use fetchRoomInfo() with our localhost signing server integration
 */
class RoomInfoDemo {
  constructor() {
    this.results = [];
  }

  /**
   * Demonstrate fetching room info for a TikTok user
   */
  async demonstrateRoomInfoFetching(username) {
    console.log(`🔍 Room Info Fetching Demo for @${username}`);
    console.log('='.repeat(60));
    console.log('This demo shows how to fetch detailed TikTok room information');
    console.log('using our localhost signing server integration.\n');

    try {
      // Create TikTok Live Connection (uses localhost signing automatically)
      console.log('1️⃣ Creating TikTok Live Connection...');
      const connection = new TikTokLiveConnection(username, {
        fetchRoomInfoOnConnect: false, // We'll fetch manually to show the process
        processInitialData: false,
        enableExtendedGiftInfo: false
      });

      console.log('✅ Connection created (localhost signing will be used automatically)\n');

      // Method 1: Fetch Room ID first, then get room info
      console.log('2️⃣ Method 1: Fetch Room ID first...');
      try {
        const roomId = await connection.fetchRoomId();
        console.log(`✅ Room ID extracted: ${roomId}`);
        
        // Now fetch detailed room info using the room ID
        console.log('   📡 Fetching detailed room info...');
        const roomInfo = await connection.webClient.fetchRoomInfo({ roomId: roomId });
        
        console.log('✅ Room info fetched successfully!');
        this.displayRoomInfo(roomInfo, 'Method 1 (Room ID → Room Info)');
        
      } catch (error) {
        console.log(`❌ Method 1 failed: ${error.message}`);
      }

      console.log('\n' + '─'.repeat(60) + '\n');

      // Method 2: Fetch room info from API Live (using username)
      console.log('3️⃣ Method 2: Fetch from API Live (username-based)...');
      try {
        const apiLiveInfo = await connection.webClient.fetchRoomInfoFromApiLive({ uniqueId: username });
        
        console.log('✅ API Live room info fetched successfully!');
        this.displayRoomInfo(apiLiveInfo, 'Method 2 (API Live)');
        
      } catch (error) {
        console.log(`❌ Method 2 failed: ${error.message}`);
      }

      console.log('\n' + '─'.repeat(60) + '\n');

      // Method 3: Fetch room info from HTML parsing
      console.log('4️⃣ Method 3: Fetch from HTML parsing...');
      try {
        const htmlInfo = await connection.webClient.fetchRoomInfoFromHtml({ uniqueId: username });
        
        console.log('✅ HTML room info fetched successfully!');
        this.displayRoomInfo(htmlInfo, 'Method 3 (HTML Parsing)');
        
      } catch (error) {
        console.log(`❌ Method 3 failed: ${error.message}`);
      }

      console.log('\n' + '─'.repeat(60) + '\n');

      // Method 4: Using the built-in fetchRoomInfo() method
      console.log('5️⃣ Method 4: Using built-in fetchRoomInfo() method...');
      try {
        // First we need to set the room ID
        const roomId = await connection.fetchRoomId();
        connection.webClient.roomId = roomId;
        
        // Now use the built-in method
        const builtInInfo = await connection.fetchRoomInfo();
        
        console.log('✅ Built-in fetchRoomInfo() successful!');
        this.displayRoomInfo(builtInInfo, 'Method 4 (Built-in fetchRoomInfo)');
        
      } catch (error) {
        console.log(`❌ Method 4 failed: ${error.message}`);
      }

    } catch (error) {
      console.log(`❌ Demo failed: ${error.message}`);
    }
  }

  /**
   * Display room information in a formatted way
   */
  displayRoomInfo(roomInfo, methodName) {
    console.log(`\n📊 ${methodName} Results:`);
    console.log('─'.repeat(40));
    
    try {
      // Handle different response formats
      let data = roomInfo;
      if (roomInfo.data) {
        data = roomInfo.data;
      }

      // Extract key information
      const info = {
        roomId: data.roomId || data.room?.roomId || data.user?.roomId || 'N/A',
        status: data.status || data.room?.status || data.liveRoom?.status || 'N/A',
        title: data.title || data.room?.title || data.liveRoom?.title || 'N/A',
        userCount: data.userCount || data.room?.userCount || data.stats?.userCount || 'N/A',
        totalUser: data.totalUser || data.room?.totalUser || data.stats?.totalUser || 'N/A',
        likeCount: data.likeCount || data.room?.likeCount || data.stats?.likeCount || 'N/A',
        owner: {
          id: data.owner?.id || data.user?.id || data.liveRoomUserInfo?.user?.id || 'N/A',
          nickname: data.owner?.nickname || data.user?.nickname || data.liveRoomUserInfo?.user?.nickname || 'N/A',
          uniqueId: data.owner?.uniqueId || data.user?.uniqueId || data.liveRoomUserInfo?.user?.uniqueId || 'N/A',
          followerCount: data.owner?.stats?.followerCount || data.user?.stats?.followerCount || 'N/A'
        }
      };

      // Display formatted information
      console.log(`🏠 Room ID: ${info.roomId}`);
      console.log(`📺 Status: ${this.getStatusText(info.status)} (${info.status})`);
      console.log(`📝 Title: ${info.title}`);
      console.log(`👥 Current Viewers: ${info.userCount}`);
      console.log(`📊 Total Viewers: ${info.totalUser}`);
      console.log(`❤️  Like Count: ${info.likeCount}`);
      console.log(`👤 Owner: ${info.owner.nickname} (@${info.owner.uniqueId})`);
      console.log(`🆔 Owner ID: ${info.owner.id}`);
      console.log(`👥 Followers: ${info.owner.followerCount}`);

      // Store result for summary
      this.results.push({
        method: methodName,
        success: true,
        roomId: info.roomId,
        status: info.status,
        owner: info.owner.nickname
      });

    } catch (error) {
      console.log(`⚠️  Error parsing room info: ${error.message}`);
      console.log('📄 Raw response structure:');
      console.log(JSON.stringify(roomInfo, null, 2).substring(0, 500) + '...');
      
      this.results.push({
        method: methodName,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Convert status code to readable text
   */
  getStatusText(status) {
    switch (parseInt(status)) {
      case 2: return '🔴 LIVE';
      case 4: return '⚫ OFFLINE';
      default: return '❓ UNKNOWN';
    }
  }

  /**
   * Show summary of all methods tested
   */
  showSummary() {
    console.log('\n📋 SUMMARY OF ROOM INFO FETCHING METHODS');
    console.log('='.repeat(60));
    
    const successful = this.results.filter(r => r.success).length;
    console.log(`✅ Successful methods: ${successful}/${this.results.length}`);
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const details = result.success 
        ? `Room ID: ${result.roomId}, Status: ${result.status}, Owner: ${result.owner}`
        : `Error: ${result.error}`;
      console.log(`${status} ${result.method}: ${details}`);
    });

    console.log('\n🎯 Key Findings:');
    console.log('- All methods use our localhost:3000 signing server automatically');
    console.log('- Different methods provide different levels of detail');
    console.log('- Room status 2 = LIVE, 4 = OFFLINE');
    console.log('- fetchRoomInfo() requires room ID, others can use username');
  }

  /**
   * Interactive demo allowing user to test different usernames
   */
  async runInteractiveDemo() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer);
        });
      });
    };

    console.log('🎮 Interactive Room Info Fetching Demo');
    console.log('=====================================');
    console.log('Test TikTok room info fetching with different usernames!\n');

    while (true) {
      const username = await askQuestion('🎯 Enter TikTok username (or "quit" to exit): ');
      
      if (username.toLowerCase() === 'quit') {
        break;
      }

      if (username.trim() === '') {
        console.log('⚠️  Please enter a username.\n');
        continue;
      }

      const cleanUsername = username.replace('@', '');
      console.log(''); // Empty line for readability
      
      await this.demonstrateRoomInfoFetching(cleanUsername);
      
      console.log('\n' + '='.repeat(60) + '\n');
    }

    this.showSummary();
    rl.close();
    console.log('\n👋 Demo completed! Thanks for testing room info fetching!');
  }
}

// Run the demo
if (require.main === module) {
  const demo = new RoomInfoDemo();
  
  // Check if username provided as argument
  const username = process.argv[2];
  
  if (username) {
    // Single user demo
    demo.demonstrateRoomInfoFetching(username)
      .then(() => {
        demo.showSummary();
      })
      .catch((error) => {
        console.error('❌ Demo error:', error);
      });
  } else {
    // Interactive demo
    demo.runInteractiveDemo()
      .catch((error) => {
        console.error('❌ Interactive demo error:', error);
      });
  }
}

module.exports = RoomInfoDemo;