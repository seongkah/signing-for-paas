# Migration Examples: EulerStream to Our Service

## Overview

This document provides comprehensive before/after code examples for migrating from EulerStream to our TikTok signing service. All examples maintain full compatibility while providing enhanced features and monitoring.

## Basic Migration Examples

### Example 1: Simple EulerStream Replacement

#### Before (EulerStream)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'eulerstream'
});

connection.connect().then(state => {
    console.log('Connected:', state);
}).catch(err => {
    console.error('Connection failed:', err);
});
```

#### After (Our Service)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'
});

connection.connect().then(state => {
    console.log('Connected:', state);
}).catch(err => {
    console.error('Connection failed:', err);
});
```

**Changes Made:**
- ✅ Only URL change required
- ✅ No code logic changes
- ✅ Same functionality maintained

---

### Example 2: With Custom Headers

#### Before (EulerStream)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'eulerstream',
    requestHeaders: {
        'User-Agent': 'MyBot/1.0'
    }
});
```

#### After (Our Service)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY', // Optional for unlimited access
        'Content-Type': 'application/json'
    },
    requestHeaders: {
        'User-Agent': 'MyBot/1.0'
    }
});
```

**Changes Made:**
- ✅ URL updated to our service
- ✅ Added optional API key authentication
- ✅ Existing headers preserved

---

### Example 3: Advanced Configuration

#### Before (EulerStream)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'eulerstream',
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 1000,
    requestOptions: {
        timeout: 10000
    }
});
```

#### After (Our Service)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    signProviderTimeout: 10000, // Timeout for signature requests
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 1000,
    requestOptions: {
        timeout: 10000
    }
});
```

**Changes Made:**
- ✅ URL updated to our service
- ✅ Added API key for unlimited access
- ✅ Added signature provider timeout
- ✅ All existing options preserved

## Real-World Migration Examples

### Example 4: Chat Bot Application

#### Before (EulerStream)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

class TikTokChatBot {
    constructor(username) {
        this.username = username;
        this.connection = new TikTokLiveConnector(username, {
            signProvider: 'eulerstream'
        });
        this.setupEvents();
    }

    setupEvents() {
        this.connection.on('chat', data => {
            this.handleChat(data);
        });

        this.connection.on('gift', data => {
            this.handleGift(data);
        });

        this.connection.on('error', err => {
            console.error('Connection error:', err);
            // Simple retry logic
            setTimeout(() => this.connect(), 5000);
        });
    }

    async connect() {
        try {
            await this.connection.connect();
            console.log('Bot connected successfully');
        } catch (error) {
            console.error('Failed to connect:', error);
        }
    }

    handleChat(data) {
        console.log(`${data.uniqueId}: ${data.comment}`);
        
        if (data.comment.toLowerCase().includes('hello')) {
            console.log(`Hello ${data.uniqueId}!`);
        }
    }

    handleGift(data) {
        console.log(`${data.uniqueId} sent ${data.giftName}`);
    }
}

const bot = new TikTokChatBot('@username');
bot.connect();
```

#### After (Our Service)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

class TikTokChatBot {
    constructor(username, apiKey = null) {
        this.username = username;
        this.apiKey = apiKey;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        const config = {
            signProvider: 'https://your-app.vercel.app/api/eulerstream',
            enableExtendedGiftInfo: true
        };

        // Add API key if provided
        if (this.apiKey) {
            config.signProviderHeaders = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };
        }

        this.connection = new TikTokLiveConnector(username, config);
        this.setupEvents();
    }

    setupEvents() {
        this.connection.on('chat', data => {
            this.handleChat(data);
        });

        this.connection.on('gift', data => {
            this.handleGift(data);
        });

        this.connection.on('connected', () => {
            console.log('✅ Bot connected successfully');
            this.reconnectAttempts = 0; // Reset on successful connection
        });

        this.connection.on('error', err => {
            console.error('Connection error:', err);
            this.handleConnectionError(err);
        });

        this.connection.on('disconnected', () => {
            console.log('Bot disconnected, attempting to reconnect...');
            this.handleReconnection();
        });
    }

    async connect() {
        try {
            // Check service health before connecting
            await this.checkServiceHealth();
            await this.connection.connect();
        } catch (error) {
            console.error('Failed to connect:', error);
            throw error;
        }
    }

    async checkServiceHealth() {
        try {
            const response = await fetch('https://your-app.vercel.app/api/health');
            const health = await response.json();
            
            if (health.status !== 'healthy') {
                throw new Error('Service is not healthy');
            }
        } catch (error) {
            console.warn('Health check failed:', error.message);
        }
    }

    handleConnectionError(error) {
        if (error.message.includes('signature')) {
            console.log('🔧 Signature generation error detected');
        } else if (error.message.includes('rate limit')) {
            console.log('⏰ Rate limit reached - consider using API key');
        }
        
        this.handleReconnection();
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s`);
            
            setTimeout(() => {
                this.connect().catch(err => {
                    console.error('Reconnection failed:', err);
                });
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }

    handleChat(data) {
        console.log(`💬 ${data.uniqueId}: ${data.comment}`);
        
        if (data.comment.toLowerCase().includes('hello')) {
            console.log(`👋 Hello ${data.uniqueId}!`);
        }
    }

    handleGift(data) {
        const value = data.diamondCount * data.repeatCount;
        console.log(`🎁 ${data.uniqueId} sent ${data.giftName} x${data.repeatCount} (${value} diamonds)`);
    }

    disconnect() {
        this.connection.disconnect();
    }
}

// Usage with API key for production
const bot = new TikTokChatBot('@username', process.env.TIKTOK_API_KEY);
bot.connect().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    bot.disconnect();
    process.exit(0);
});
```

**Enhancements Added:**
- ✅ API key support for unlimited access
- ✅ Service health checking
- ✅ Improved error handling and reconnection logic
- ✅ Exponential backoff for retries
- ✅ Graceful shutdown handling
- ✅ Enhanced logging with emojis

---

### Example 5: Multi-Stream Monitor

#### Before (EulerStream)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

class MultiStreamMonitor {
    constructor(usernames) {
        this.usernames = usernames;
        this.connections = new Map();
    }

    async connectAll() {
        for (const username of this.usernames) {
            try {
                const connection = new TikTokLiveConnector(username, {
                    signProvider: 'eulerstream'
                });

                connection.on('chat', data => {
                    console.log(`[${username}] ${data.uniqueId}: ${data.comment}`);
                });

                await connection.connect();
                this.connections.set(username, connection);
                console.log(`Connected to ${username}`);
            } catch (error) {
                console.error(`Failed to connect to ${username}:`, error);
            }
        }
    }

    disconnectAll() {
        for (const [username, connection] of this.connections) {
            connection.disconnect();
            console.log(`Disconnected from ${username}`);
        }
        this.connections.clear();
    }
}

const monitor = new MultiStreamMonitor(['user1', 'user2', 'user3']);
monitor.connectAll();
```

#### After (Our Service)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

class MultiStreamMonitor {
    constructor(usernames, apiKey = null) {
        this.usernames = usernames;
        this.apiKey = apiKey;
        this.connections = new Map();
        this.connectionStates = new Map();
        this.reconnectTimers = new Map();
    }

    async connectAll() {
        // Check service health first
        const isHealthy = await this.checkServiceHealth();
        if (!isHealthy) {
            throw new Error('Service is not healthy, aborting connections');
        }

        const connectionPromises = this.usernames.map(username => 
            this.connectToUser(username)
        );

        const results = await Promise.allSettled(connectionPromises);
        
        results.forEach((result, index) => {
            const username = this.usernames[index];
            if (result.status === 'fulfilled') {
                console.log(`✅ Connected to ${username}`);
            } else {
                console.error(`❌ Failed to connect to ${username}:`, result.reason);
            }
        });

        console.log(`📊 Connected to ${this.connections.size}/${this.usernames.length} streams`);
    }

    async connectToUser(username) {
        try {
            const config = {
                signProvider: 'https://your-app.vercel.app/api/eulerstream',
                enableExtendedGiftInfo: true,
                enableWebsocketUpgrade: true
            };

            // Add API key if available
            if (this.apiKey) {
                config.signProviderHeaders = {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                };
            }

            const connection = new TikTokLiveConnector(username, config);
            this.setupEventHandlers(username, connection);

            await connection.connect();
            this.connections.set(username, connection);
            this.connectionStates.set(username, 'connected');
            
            return connection;
        } catch (error) {
            this.connectionStates.set(username, 'failed');
            throw error;
        }
    }

    setupEventHandlers(username, connection) {
        connection.on('connected', () => {
            console.log(`🎉 [${username}] Connected successfully`);
            this.connectionStates.set(username, 'connected');
        });

        connection.on('disconnected', () => {
            console.log(`📡 [${username}] Disconnected`);
            this.connectionStates.set(username, 'disconnected');
            this.scheduleReconnection(username);
        });

        connection.on('error', error => {
            console.error(`🚨 [${username}] Error:`, error);
            this.connectionStates.set(username, 'error');
            this.handleConnectionError(username, error);
        });

        connection.on('chat', data => {
            console.log(`💬 [${username}] ${data.uniqueId}: ${data.comment}`);
        });

        connection.on('gift', data => {
            const value = data.diamondCount * data.repeatCount;
            console.log(`🎁 [${username}] ${data.uniqueId} sent ${data.giftName} x${data.repeatCount} (${value} diamonds)`);
        });

        connection.on('like', data => {
            console.log(`👍 [${username}] ${data.uniqueId} liked`);
        });

        connection.on('follow', data => {
            console.log(`➕ [${username}] ${data.uniqueId} followed`);
        });

        connection.on('roomUser', data => {
            console.log(`👥 [${username}] Viewers: ${data.viewerCount}`);
        });

        connection.on('streamEnd', () => {
            console.log(`📺 [${username}] Stream ended`);
            this.connectionStates.set(username, 'stream_ended');
        });
    }

    handleConnectionError(username, error) {
        if (error.message.includes('rate limit') && !this.apiKey) {
            console.log(`⚠️ [${username}] Rate limit reached - consider using API key for unlimited access`);
        }
        
        this.scheduleReconnection(username);
    }

    scheduleReconnection(username) {
        // Clear existing timer
        if (this.reconnectTimers.has(username)) {
            clearTimeout(this.reconnectTimers.get(username));
        }

        // Schedule reconnection with exponential backoff
        const delay = 5000 + Math.random() * 5000; // 5-10 seconds with jitter
        const timer = setTimeout(async () => {
            try {
                console.log(`🔄 [${username}] Attempting reconnection...`);
                await this.connectToUser(username);
            } catch (error) {
                console.error(`❌ [${username}] Reconnection failed:`, error);
            }
        }, delay);

        this.reconnectTimers.set(username, timer);
    }

    async checkServiceHealth() {
        try {
            const response = await fetch('https://your-app.vercel.app/api/health');
            const health = await response.json();
            
            console.log('🏥 Service health:', health.status);
            return health.status === 'healthy';
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return false;
        }
    }

    getConnectionStats() {
        const stats = {
            total: this.usernames.length,
            connected: 0,
            disconnected: 0,
            failed: 0,
            stream_ended: 0
        };

        for (const state of this.connectionStates.values()) {
            stats[state] = (stats[state] || 0) + 1;
        }

        return stats;
    }

    printStats() {
        const stats = this.getConnectionStats();
        console.log('📊 Connection Statistics:');
        console.log(`   Connected: ${stats.connected}/${stats.total}`);
        console.log(`   Disconnected: ${stats.disconnected}`);
        console.log(`   Failed: ${stats.failed}`);
        console.log(`   Stream Ended: ${stats.stream_ended}`);
    }

    disconnectAll() {
        // Clear all reconnection timers
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();

        // Disconnect all connections
        for (const [username, connection] of this.connections) {
            try {
                connection.disconnect();
                console.log(`👋 Disconnected from ${username}`);
            } catch (error) {
                console.error(`Error disconnecting from ${username}:`, error);
            }
        }

        this.connections.clear();
        this.connectionStates.clear();
    }

    // Monitor connections and print stats periodically
    startMonitoring() {
        const interval = setInterval(() => {
            this.printStats();
        }, 30000); // Every 30 seconds

        // Return cleanup function
        return () => clearInterval(interval);
    }
}

// Usage example
async function main() {
    const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const apiKey = process.env.TIKTOK_API_KEY; // Optional but recommended for multiple streams
    
    const monitor = new MultiStreamMonitor(usernames, apiKey);
    
    try {
        await monitor.connectAll();
        
        // Start monitoring
        const stopMonitoring = monitor.startMonitoring();
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('🛑 Shutting down multi-stream monitor...');
            stopMonitoring();
            monitor.disconnectAll();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Failed to start monitor:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = MultiStreamMonitor;
```

**Major Enhancements:**
- ✅ API key support for handling multiple streams
- ✅ Service health checking before connections
- ✅ Intelligent reconnection with jitter to avoid thundering herd
- ✅ Connection state tracking and statistics
- ✅ Enhanced error handling for different error types
- ✅ Periodic monitoring and reporting
- ✅ Graceful shutdown handling
- ✅ Promise-based concurrent connections

## Migration Checklist

### Pre-Migration
- [ ] Review current EulerStream usage patterns
- [ ] Identify all TikTok Live Connector instances
- [ ] Test our service with a single connection
- [ ] Get API key if using multiple streams or production

### During Migration
- [ ] Update `signProvider` URL in all instances
- [ ] Add API key authentication if needed
- [ ] Test each connection individually
- [ ] Verify all events are still received correctly
- [ ] Check error handling works as expected

### Post-Migration
- [ ] Monitor connections through our dashboard
- [ ] Verify performance meets requirements
- [ ] Update documentation and deployment scripts
- [ ] Set up monitoring alerts if needed
- [ ] Remove EulerStream dependencies

## Performance Comparison

| Metric | EulerStream | Our Service |
|--------|-------------|-------------|
| **Cost** | Paid subscription | Free tier + optional API keys |
| **Rate Limits** | Plan-based | 1000/hour free, unlimited with API key |
| **Latency** | Variable | Optimized <2s average |
| **Reliability** | Third-party | Self-hosted on Vercel + Supabase |
| **Monitoring** | Limited | Full dashboard with real-time metrics |
| **Support** | External | Direct access to logs and health checks |
| **Scalability** | Plan limits | Scales with usage |

## Common Migration Issues

### Issue 1: Rate Limiting
**Problem**: Free tier rate limits hit with multiple streams
**Solution**: Get API key for unlimited access

### Issue 2: Connection Timeouts
**Problem**: Longer response times than EulerStream
**Solution**: Increase `signProviderTimeout` to 10-15 seconds

### Issue 3: Authentication Errors
**Problem**: API key not working
**Solution**: Verify key format and use proper headers

### Issue 4: Service Unavailability
**Problem**: Service temporarily unavailable
**Solution**: Implement health checks and retry logic

## Next Steps

After completing your migration:

1. **Monitor Performance**: Use our dashboard to track usage and performance
2. **Optimize Configuration**: Adjust timeouts and retry logic based on your needs
3. **Set Up Alerts**: Monitor for connection failures or rate limits
4. **Scale Up**: Get API keys for production workloads
5. **Contribute**: Share feedback to help improve the service

For additional help, check the [Troubleshooting Guide](./troubleshooting-guide.md) or test your integration with our [Testing Utilities](./testing-utilities.md).