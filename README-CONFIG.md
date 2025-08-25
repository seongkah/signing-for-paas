# TikTok Signing Service Configuration

Simple configuration system to easily switch between TikTok signing services in your projects.

## 🚀 Quick Start

### 1. Download Configuration Files

Download these two files to your TikTok Live Connector project:
- **`tiktok-signing.config.js`** - Main configuration file
- **`config-helper.js`** - Helper utilities (optional)

### 2. Choose Your Service

Edit `tiktok-signing.config.js` and change **one line**:

```javascript
// Choose your service: 'eulerstream' | 'free' | 'paid'
service: 'free',  // ← CHANGE THIS LINE
```

### 3. Use in Your Code

```javascript
const { TikTokLiveConnection } = require('tiktok-live-connector');
const config = require('./tiktok-signing.config.js');

const connection = new TikTokLiveConnection('@username', config.getSigningConfig());
await connection.connect();
```

**That's it!** No other code changes needed.

## 📋 Service Options

| Service | Description | Cost | Rate Limit | API Key |
|---------|-------------|------|------------|---------|
| **`eulerstream`** | Original EulerStream service | $29-99/month | Based on plan | EulerStream subscription |
| **`free`** | Our free service | Free | 100/day per IP | None required |
| **`paid`** | Our unlimited service | API key | Unlimited | Required |

## ⚙️ Configuration Examples

### Free Service (Recommended for Testing)
```javascript
module.exports = {
  service: 'free',  // No API key needed
  // ... rest of config
}
```

### Paid Service (Recommended for Production)
```javascript
module.exports = {
  service: 'paid',
  apiKey: 'your-api-key-from-dashboard',
  // ... rest of config
}
```

### EulerStream (Original Service)
```javascript
module.exports = {
  service: 'eulerstream',  // Uses original EulerStream
  // ... rest of config
}
```

## 🔑 Getting API Keys

For unlimited access with our paid service:

1. Visit: https://signing-for-paas.vercel.app/dashboard
2. Register/login with your email
3. Create an API key
4. Copy the key to your config file:

```javascript
service: 'paid',
apiKey: 'your-actual-api-key-here',
```

## 🛠️ Helper Commands

If you downloaded `config-helper.js`, you can use these commands:

```bash
# Check current configuration
node config-helper.js status

# Test your configuration
node config-helper.js test

# Switch to free service
node config-helper.js update service free

# Switch to paid service with API key
node config-helper.js update service paid
node config-helper.js update apikey your-api-key

# Generate code examples
node config-helper.js examples
```

## 📝 Complete Usage Examples

### Basic TikTok Live Connector
```javascript
const { TikTokLiveConnection } = require('tiktok-live-connector');
const config = require('./tiktok-signing.config.js');

const connection = new TikTokLiveConnection('@username', config.getSigningConfig());

connection.on('connected', (state) => {
  console.log('🎉 Connected to TikTok Live!');
  console.log(`Viewer count: ${state.viewerCount}`);
});

connection.on('chat', (data) => {
  console.log(`💬 ${data.uniqueId}: ${data.comment}`);
});

connection.on('gift', (data) => {
  console.log(`🎁 ${data.uniqueId} sent ${data.giftName} (${data.diamondCount} diamonds)`);
});

connection.on('social', (data) => {
  console.log(`👥 ${data.uniqueId} ${data.displayType}`);
});

await connection.connect();
```

### With Error Handling
```javascript
const { TikTokLiveConnection } = require('tiktok-live-connector');
const config = require('./tiktok-signing.config.js');

async function connectToTikTokLive(username) {
  // Validate configuration first
  const validation = config.validateConfig();
  if (!validation.valid) {
    console.error('❌ Configuration error:', validation.errors.join(', '));
    return;
  }
  
  const connection = new TikTokLiveConnection(username, config.getSigningConfig());
  
  connection.on('connected', (state) => {
    console.log(`✅ Connected to @${username}'s live stream`);
    console.log(`👥 ${state.viewerCount} viewers watching`);
  });
  
  connection.on('disconnected', () => {
    console.log('❌ Disconnected from live stream');
  });
  
  connection.on('error', (err) => {
    console.error('🚨 Connection error:', err.message);
  });
  
  try {
    await connection.connect();
  } catch (error) {
    console.error('Failed to connect:', error.message);
    
    if (error.message.includes('LIVE_ACCESS_DENIED')) {
      console.log('💡 Tip: The user might not be live or their stream is private');
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      console.log('💡 Tip: Rate limit exceeded. Try switching to paid service or wait');
    }
  }
}

connectToTikTokLive('your-target-username');
```

### Multiple Users
```javascript
const { TikTokLiveConnection } = require('tiktok-live-connector');
const config = require('./tiktok-signing.config.js');

const usernames = ['user1', 'user2', 'user3'];

async function connectToMultipleUsers(usernames) {
  const connections = [];
  
  for (const username of usernames) {
    const connection = new TikTokLiveConnection(username, config.getSigningConfig());
    
    connection.on('connected', (state) => {
      console.log(`✅ Connected to @${username}: ${state.viewerCount} viewers`);
    });
    
    connection.on('chat', (data) => {
      console.log(`[@${username}] ${data.uniqueId}: ${data.comment}`);
    });
    
    connections.push(connection);
    
    // Connect with delay to avoid overwhelming the service
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      await connection.connect();
    } catch (error) {
      console.error(`Failed to connect to @${username}:`, error.message);
    }
  }
  
  return connections;
}

connectToMultipleUsers(usernames);
```

## 🔧 Troubleshooting

### Configuration Issues
```bash
# Check your configuration
node config-helper.js status

# Test your configuration
node config-helper.js test
```

### Common Problems

**❌ "Rate limit exceeded"**
- Solution: Switch to paid service or wait for rate limit reset
- Free tier: 100 requests/day per IP

**❌ "Invalid API key"**
- Solution: Check your API key in the dashboard
- Make sure you copied it correctly

**❌ "Connection failed"**
- Solution: Test your configuration with `node config-helper.js test`
- Check if the user is actually live

**❌ "Module not found"**
- Solution: Make sure config file is in the same directory as your script

## 📚 Migration Guide

### From EulerStream
1. Download `tiktok-signing.config.js`
2. Change `service: 'eulerstream'` to `service: 'free'`
3. No other code changes needed!

### From Direct URL Configuration
**Before:**
```javascript
const connection = new TikTokLiveConnection('@username', {
  signProvider: 'https://some-service.com/api/sign'
});
```

**After:**
```javascript
const config = require('./tiktok-signing.config.js');
const connection = new TikTokLiveConnection('@username', config.getSigningConfig());
```

## 🌟 Pro Tips

1. **Use Free for Testing**: Start with `service: 'free'` to test your integration
2. **Upgrade for Production**: Switch to `service: 'paid'` for unlimited usage
3. **Keep Config Separate**: Don't commit API keys to version control
4. **Test Configuration**: Use `node config-helper.js test` before deploying
5. **Monitor Usage**: Check your dashboard for usage statistics

## 📞 Support

- **Dashboard**: https://signing-for-paas.vercel.app/dashboard
- **Documentation**: https://signing-for-paas.vercel.app/docs
- **Issues**: Report problems via GitHub issues

## 📄 License

This configuration system is provided as-is for use with TikTok Live Connector projects.