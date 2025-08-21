# TikTok Live Connector Integration Guide

## Overview

This guide provides comprehensive instructions for integrating TikTok Live Connector with our TikTok signing service. Whether you're migrating from EulerStream or setting up a new project, this guide covers everything you need.

## Prerequisites

- Node.js 14+ installed
- TikTok Live Connector package (`npm install tiktok-live-connector`)
- Basic understanding of TikTok Live streaming
- Optional: Account on our service for API key generation

## Installation

### 1. Install TikTok Live Connector
```bash
npm install tiktok-live-connector
```

### 2. Basic Setup
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

// Replace 'username' with actual TikTok username (without @)
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'
});
```

## Configuration Options

### Basic Configuration
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 1000,
    sessionId: null,
    clientParams: {},
    requestHeaders: {},
    websocketHeaders: {},
    requestOptions: {},
    websocketOptions: {}
});
```

### With API Key Authentication
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
        'User-Agent': 'MyApp/1.0.0'
    },
    signProviderTimeout: 10000 // 10 seconds
});
```

### Advanced Configuration
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    // Custom request options
    requestOptions: {
        timeout: 10000,
        headers: {
            'User-Agent': 'Custom-Agent/1.0'
        }
    },
    // WebSocket options
    websocketOptions: {
        timeout: 5000
    },
    // Enable detailed logging
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true
});
```

## Available Endpoints

### 1. `/api/eulerstream` (Recommended)
- **Purpose**: Drop-in EulerStream replacement
- **Format**: EulerStream-compatible JSON
- **Authentication**: Optional
- **Best for**: Migrating from EulerStream

```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'
});
```

### 2. `/api/signature` (Modern)
- **Purpose**: Enhanced modern API
- **Format**: Extended JSON with metadata
- **Authentication**: Optional
- **Best for**: New integrations

```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/signature'
});
```

### 3. `/api/sign` (Legacy)
- **Purpose**: Local server compatibility
- **Format**: Simple JSON/text
- **Authentication**: Optional
- **Best for**: Migrating from local server

```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/sign'
});
```

## Authentication Methods

### Free Tier (No Authentication)
- **Rate Limits**: 1000 requests/hour per IP
- **Features**: Full signature generation
- **Best for**: Testing, small projects
- **Setup**: No setup required

```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'
});
```

### API Key Authentication (Unlimited)
- **Rate Limits**: Unlimited
- **Features**: Priority processing, detailed analytics
- **Best for**: Production applications
- **Setup**: Get API key from dashboard

#### Step 1: Get API Key
1. Visit `https://your-app.vercel.app/dashboard`
2. Register/login with email
3. Generate new API key
4. Copy the key securely

#### Step 2: Use API Key
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY_HERE',
        'Content-Type': 'application/json'
    }
});
```

## Event Handling

### Basic Event Listeners
```javascript
// Connection events
connection.on('connected', state => {
    console.log('✅ Connected to TikTok Live:', state);
});

connection.on('disconnected', () => {
    console.log('❌ Disconnected from TikTok Live');
});

connection.on('error', err => {
    console.error('🚨 Connection error:', err);
});

// Chat events
connection.on('chat', data => {
    console.log(`💬 ${data.uniqueId}: ${data.comment}`);
});

connection.on('gift', data => {
    console.log(`🎁 ${data.uniqueId} sent ${data.giftName} x${data.repeatCount}`);
});

connection.on('like', data => {
    console.log(`👍 ${data.uniqueId} liked the stream`);
});

connection.on('follow', data => {
    console.log(`➕ ${data.uniqueId} followed the streamer`);
});

connection.on('share', data => {
    console.log(`📤 ${data.uniqueId} shared the stream`);
});
```

### Advanced Event Handling
```javascript
// Stream metadata
connection.on('streamEnd', () => {
    console.log('📺 Stream ended');
});

connection.on('roomUser', data => {
    console.log(`👥 Room users: ${data.viewerCount}`);
});

// Social interactions
connection.on('social', data => {
    console.log(`🤝 Social interaction:`, data);
});

// Emotes and stickers
connection.on('emote', data => {
    console.log(`😀 Emote from ${data.uniqueId}:`, data);
});

// Error handling with retry logic
connection.on('error', async (err) => {
    console.error('Connection error:', err);
    
    if (err.message.includes('signature')) {
        console.log('🔄 Signature error, retrying in 5 seconds...');
        setTimeout(() => {
            connection.connect();
        }, 5000);
    }
});
```

## Complete Integration Example

```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

class TikTokLiveBot {
    constructor(username, apiKey = null) {
        this.username = username;
        this.apiKey = apiKey;
        this.connection = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async connect() {
        const config = {
            signProvider: 'https://your-app.vercel.app/api/eulerstream',
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true
        };

        // Add API key if provided
        if (this.apiKey) {
            config.signProviderHeaders = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };
        }

        this.connection = new TikTokLiveConnector(this.username, config);
        this.setupEventListeners();

        try {
            const state = await this.connection.connect();
            console.log('✅ Connected successfully:', state);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            return state;
        } catch (error) {
            console.error('❌ Connection failed:', error);
            await this.handleConnectionError(error);
            throw error;
        }
    }

    setupEventListeners() {
        // Connection events
        this.connection.on('connected', state => {
            console.log('🎉 Connected to TikTok Live!');
            this.isConnected = true;
        });

        this.connection.on('disconnected', () => {
            console.log('📡 Disconnected from TikTok Live');
            this.isConnected = false;
            this.handleReconnection();
        });

        this.connection.on('error', error => {
            console.error('🚨 Connection error:', error);
            this.handleConnectionError(error);
        });

        // Chat events
        this.connection.on('chat', data => {
            this.handleChatMessage(data);
        });

        this.connection.on('gift', data => {
            this.handleGift(data);
        });

        this.connection.on('like', data => {
            this.handleLike(data);
        });

        this.connection.on('follow', data => {
            this.handleFollow(data);
        });

        // Stream events
        this.connection.on('streamEnd', () => {
            console.log('📺 Stream ended');
            this.isConnected = false;
        });

        this.connection.on('roomUser', data => {
            console.log(`👥 Viewers: ${data.viewerCount}`);
        });
    }

    handleChatMessage(data) {
        console.log(`💬 ${data.uniqueId}: ${data.comment}`);
        
        // Example: Respond to specific commands
        if (data.comment.toLowerCase().includes('hello')) {
            console.log(`👋 Hello ${data.uniqueId}!`);
        }
    }

    handleGift(data) {
        const giftValue = data.diamondCount * data.repeatCount;
        console.log(`🎁 ${data.uniqueId} sent ${data.giftName} x${data.repeatCount} (${giftValue} diamonds)`);
        
        // Example: Thank users for gifts
        if (giftValue > 100) {
            console.log(`🙏 Thank you ${data.uniqueId} for the generous gift!`);
        }
    }

    handleLike(data) {
        console.log(`👍 ${data.uniqueId} liked the stream`);
    }

    handleFollow(data) {
        console.log(`➕ Welcome new follower: ${data.uniqueId}!`);
    }

    async handleConnectionError(error) {
        if (error.message.includes('signature')) {
            console.log('🔧 Signature generation error, checking service status...');
            await this.checkServiceHealth();
        }
        
        if (error.message.includes('rate limit')) {
            console.log('⏰ Rate limit reached, consider using API key for unlimited access');
        }
    }

    async handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s...`);
            
            setTimeout(async () => {
                try {
                    await this.connect();
                } catch (error) {
                    console.error('Reconnection failed:', error);
                }
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }

    async checkServiceHealth() {
        try {
            const response = await fetch('https://your-app.vercel.app/api/health');
            const health = await response.json();
            console.log('🏥 Service health:', health);
            return health;
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return null;
        }
    }

    disconnect() {
        if (this.connection && this.isConnected) {
            this.connection.disconnect();
            console.log('👋 Disconnected from TikTok Live');
        }
    }

    getConnectionState() {
        return {
            isConnected: this.isConnected,
            username: this.username,
            reconnectAttempts: this.reconnectAttempts,
            hasApiKey: !!this.apiKey
        };
    }
}

// Usage example
async function main() {
    const bot = new TikTokLiveBot('username', 'YOUR_API_KEY'); // API key optional
    
    try {
        await bot.connect();
        
        // Keep the connection alive
        process.on('SIGINT', () => {
            console.log('🛑 Shutting down...');
            bot.disconnect();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Run the bot
if (require.main === module) {
    main();
}

module.exports = TikTokLiveBot;
```

## Testing Your Integration

### 1. Basic Connectivity Test
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

async function testConnection() {
    const connection = new TikTokLiveConnector('testuser', {
        signProvider: 'https://your-app.vercel.app/api/eulerstream'
    });

    try {
        const state = await connection.connect();
        console.log('✅ Connection test passed:', state);
        connection.disconnect();
        return true;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
}

testConnection();
```

### 2. Service Health Check
```javascript
async function checkServiceHealth() {
    try {
        const response = await fetch('https://your-app.vercel.app/api/health');
        const health = await response.json();
        
        if (health.status === 'healthy') {
            console.log('✅ Service is healthy');
            return true;
        } else {
            console.log('⚠️ Service health issues:', health);
            return false;
        }
    } catch (error) {
        console.error('❌ Health check failed:', error);
        return false;
    }
}
```

### 3. Compatibility Test
```javascript
async function testCompatibility() {
    try {
        const response = await fetch('https://your-app.vercel.app/api/test/compatibility', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                testSuite: 'tiktok_live_connector',
                testUrl: 'https://www.tiktok.com/@testuser/live'
            })
        });
        
        const result = await response.json();
        console.log('🧪 Compatibility test result:', result);
        return result.success;
    } catch (error) {
        console.error('❌ Compatibility test failed:', error);
        return false;
    }
}
```

## Best Practices

### 1. Error Handling
- Always implement reconnection logic
- Handle signature generation errors gracefully
- Monitor service health regularly
- Use exponential backoff for retries

### 2. Performance Optimization
- Use API keys for production applications
- Implement connection pooling for multiple streams
- Cache connection states when possible
- Monitor response times and adjust timeouts

### 3. Security
- Store API keys securely (environment variables)
- Use HTTPS endpoints only
- Validate TikTok usernames before connecting
- Implement rate limiting on your side

### 4. Monitoring
- Log connection events and errors
- Track usage patterns
- Monitor service health
- Set up alerts for failures

## Next Steps

- Review [Migration Examples](./migration-examples.md) for specific EulerStream replacement scenarios
- Check [Testing Utilities](./testing-utilities.md) for comprehensive testing tools
- Consult [Troubleshooting Guide](./troubleshooting-guide.md) if you encounter issues
- Visit the dashboard at `https://your-app.vercel.app/dashboard` for monitoring and API key management