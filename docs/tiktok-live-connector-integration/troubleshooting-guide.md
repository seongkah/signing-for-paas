# Troubleshooting Guide for TikTok Live Connector Integration

## Overview

This comprehensive troubleshooting guide helps you diagnose and resolve common issues when integrating TikTok Live Connector with our signing service. Issues are organized by category with step-by-step solutions.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

- [ ] Service health check: `GET https://your-app.vercel.app/api/health`
- [ ] Test signature generation: `POST https://your-app.vercel.app/api/eulerstream`
- [ ] Verify TikTok username format (no @ symbol in code)
- [ ] Check API key format if using authentication
- [ ] Confirm TikTok Live Connector version is up to date
- [ ] Verify the target user is actually live streaming

## Connection Issues

### Issue 1: "Connection failed" or "Unable to connect"

**Symptoms:**
```
Error: Connection failed
Error: Unable to connect to TikTok Live
```

**Possible Causes:**
1. Service is down or unhealthy
2. Invalid TikTok username
3. User is not live streaming
4. Network connectivity issues
5. Signature generation failure

**Solutions:**

#### Step 1: Check Service Health
```bash
curl https://your-app.vercel.app/api/health
```

Expected healthy response:
```json
{
  "status": "healthy",
  "signature_generator_ready": true,
  "database_connected": true
}
```

If unhealthy, wait a few minutes and retry, or check our status page.

#### Step 2: Verify Username Format
```javascript
// ❌ Wrong - includes @ symbol
const connection = new TikTokLiveConnector('@username', config);

// ✅ Correct - no @ symbol
const connection = new TikTokLiveConnector('username', config);
```

#### Step 3: Test with Known Live User
```javascript
// Test with a user you know is currently live
const connection = new TikTokLiveConnector('known_live_user', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'
});
```

#### Step 4: Add Connection Timeout
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderTimeout: 15000, // 15 seconds
    requestOptions: {
        timeout: 10000 // 10 seconds
    }
});
```

#### Step 5: Implement Retry Logic
```javascript
async function connectWithRetry(username, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const connection = new TikTokLiveConnector(username, {
                signProvider: 'https://your-app.vercel.app/api/eulerstream'
            });
            
            const state = await connection.connect();
            console.log(`✅ Connected on attempt ${i + 1}`);
            return { connection, state };
            
        } catch (error) {
            console.log(`❌ Attempt ${i + 1} failed: ${error.message}`);
            
            if (i === maxRetries - 1) throw error;
            
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, i), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

---

### Issue 2: "Signature generation failed"

**Symptoms:**
```
Error: Signature generation failed
Error: Invalid signature response
```

**Possible Causes:**
1. Service overloaded or rate limited
2. Invalid TikTok URL format
3. API key authentication issues
4. Network timeout

**Solutions:**

#### Step 1: Test Signature Generation Directly
```bash
curl -X POST https://your-app.vercel.app/api/eulerstream \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@testuser/live"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "signature": "...",
    "signed_url": "...",
    "X-Bogus": "...",
    "x-tt-params": "..."
  }
}
```

#### Step 2: Check for Rate Limiting
If you see rate limiting errors:
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

**Solution**: Get an API key for unlimited access:
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
});
```

#### Step 3: Increase Timeout
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderTimeout: 20000 // 20 seconds
});
```

---

## Authentication Issues

### Issue 3: "Authentication failed" or "Invalid API key"

**Symptoms:**
```
Error: Authentication failed
Error: Invalid or missing authentication
HTTP 401 Unauthorized
```

**Solutions:**

#### Step 1: Verify API Key Format
```javascript
// ✅ Correct format
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY_HERE',
        'Content-Type': 'application/json'
    }
});

// ❌ Common mistakes:
// Missing 'Bearer ' prefix
// Wrong header name ('X-API-Key' instead of 'Authorization')
// Missing Content-Type header
```

#### Step 2: Test API Key Directly
```bash
curl -X POST https://your-app.vercel.app/api/eulerstream \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@testuser/live"}'
```

#### Step 3: Generate New API Key
1. Visit `https://your-app.vercel.app/dashboard`
2. Login with your email
3. Go to API Keys section
4. Generate a new key
5. Copy the key immediately (it won't be shown again)

#### Step 4: Check API Key Status
```bash
curl -X GET https://your-app.vercel.app/api/user/profile \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Rate Limiting Issues

### Issue 4: "Rate limit exceeded" or "Too many requests"

**Symptoms:**
```
Error: Rate limit exceeded
HTTP 429 Too Many Requests
```

**Understanding Rate Limits:**
- **Free Tier**: 1000 requests per hour per IP address
- **API Key**: Unlimited requests

**Solutions:**

#### Step 1: Get API Key (Recommended)
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
});
```

#### Step 2: Implement Rate Limiting on Your Side
```javascript
class RateLimitedConnector {
    constructor() {
        this.lastRequest = 0;
        this.minInterval = 1000; // 1 second between requests
    }

    async connect(username) {
        // Ensure minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        
        if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequest = Date.now();

        const connection = new TikTokLiveConnector(username, {
            signProvider: 'https://your-app.vercel.app/api/eulerstream'
        });

        return await connection.connect();
    }
}
```

#### Step 3: Use Connection Pooling
```javascript
class ConnectionPool {
    constructor(maxConnections = 5) {
        this.connections = new Map();
        this.maxConnections = maxConnections;
    }

    async getConnection(username) {
        if (this.connections.has(username)) {
            return this.connections.get(username);
        }

        if (this.connections.size >= this.maxConnections) {
            // Remove oldest connection
            const firstKey = this.connections.keys().next().value;
            const oldConnection = this.connections.get(firstKey);
            oldConnection.disconnect();
            this.connections.delete(firstKey);
        }

        const connection = new TikTokLiveConnector(username, {
            signProvider: 'https://your-app.vercel.app/api/eulerstream'
        });

        await connection.connect();
        this.connections.set(username, connection);
        return connection;
    }
}
```

---

## Performance Issues

### Issue 5: Slow response times or timeouts

**Symptoms:**
```
Error: Request timeout
Slow connection establishment (>10 seconds)
```

**Solutions:**

#### Step 1: Check Service Performance
```bash
curl -w "Response time: %{time_total}s\n" \
  -X POST https://your-app.vercel.app/api/eulerstream \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@testuser/live"}'
```

#### Step 2: Optimize Configuration
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderTimeout: 15000, // Increase timeout
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY', // Use API key for priority
        'Content-Type': 'application/json'
    },
    requestOptions: {
        timeout: 10000,
        // Use keep-alive for better performance
        agent: new (require('https').Agent)({ keepAlive: true })
    }
});
```

#### Step 3: Implement Caching
```javascript
class CachedConnector {
    constructor() {
        this.signatureCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async getSignature(url) {
        const cacheKey = url;
        const cached = this.signatureCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('Using cached signature');
            return cached.signature;
        }

        // Fetch new signature
        const response = await fetch('https://your-app.vercel.app/api/eulerstream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        
        if (data.success) {
            this.signatureCache.set(cacheKey, {
                signature: data.data,
                timestamp: Date.now()
            });
        }

        return data.data;
    }
}
```

---

## Event Handling Issues

### Issue 6: Not receiving chat messages, gifts, or other events

**Symptoms:**
```
Connected successfully but no events received
Chat messages not appearing
Gift events missing
```

**Solutions:**

#### Step 1: Verify Event Listeners
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    enableExtendedGiftInfo: true, // Enable detailed gift info
    enableWebsocketUpgrade: true  // Enable WebSocket for better performance
});

// Set up all event listeners BEFORE connecting
connection.on('connected', state => {
    console.log('✅ Connected:', state);
});

connection.on('chat', data => {
    console.log(`💬 ${data.uniqueId}: ${data.comment}`);
});

connection.on('gift', data => {
    console.log(`🎁 ${data.uniqueId} sent ${data.giftName}`);
});

connection.on('like', data => {
    console.log(`👍 ${data.uniqueId} liked`);
});

connection.on('follow', data => {
    console.log(`➕ ${data.uniqueId} followed`);
});

connection.on('error', err => {
    console.error('🚨 Error:', err);
});

// Connect after setting up listeners
await connection.connect();
```

#### Step 2: Check Stream Activity
```javascript
connection.on('roomUser', data => {
    console.log(`👥 Viewers: ${data.viewerCount}`);
    
    if (data.viewerCount === 0) {
        console.log('⚠️ No viewers - stream might not be active');
    }
});

connection.on('streamEnd', () => {
    console.log('📺 Stream ended');
});
```

#### Step 3: Test with Active Stream
```javascript
// Test with a user you know has an active chat
const testUsers = ['popular_user1', 'popular_user2', 'popular_user3'];

for (const user of testUsers) {
    try {
        const connection = new TikTokLiveConnector(user, {
            signProvider: 'https://your-app.vercel.app/api/eulerstream'
        });
        
        connection.on('chat', data => {
            console.log(`✅ Chat working with ${user}: ${data.comment}`);
            connection.disconnect();
            return; // Exit after first message
        });
        
        await connection.connect();
        
        // Wait for events
        await new Promise(resolve => setTimeout(resolve, 10000));
        connection.disconnect();
        
    } catch (error) {
        console.log(`❌ ${user} failed: ${error.message}`);
    }
}
```

---

## Service-Specific Issues

### Issue 7: "Service temporarily unavailable"

**Symptoms:**
```
HTTP 503 Service Unavailable
Error: Service temporarily unavailable
```

**Solutions:**

#### Step 1: Check Service Status
```bash
curl https://your-app.vercel.app/api/health
```

#### Step 2: Implement Fallback Logic
```javascript
class ResilientConnector {
    constructor(username) {
        this.username = username;
        this.endpoints = [
            'https://your-app.vercel.app/api/eulerstream',
            'https://your-app.vercel.app/api/signature',
            'https://your-app.vercel.app/api/sign'
        ];
    }

    async connect() {
        for (const endpoint of this.endpoints) {
            try {
                console.log(`Trying endpoint: ${endpoint}`);
                
                const connection = new TikTokLiveConnector(this.username, {
                    signProvider: endpoint
                });
                
                const state = await connection.connect();
                console.log(`✅ Connected using ${endpoint}`);
                return { connection, state };
                
            } catch (error) {
                console.log(`❌ ${endpoint} failed: ${error.message}`);
                continue;
            }
        }
        
        throw new Error('All endpoints failed');
    }
}
```

#### Step 3: Monitor Service Health
```javascript
async function monitorServiceHealth(interval = 60000) {
    setInterval(async () => {
        try {
            const response = await fetch('https://your-app.vercel.app/api/health');
            const health = await response.json();
            
            if (health.status !== 'healthy') {
                console.warn('⚠️ Service health degraded:', health);
            } else {
                console.log('✅ Service healthy');
            }
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
        }
    }, interval);
}

// Start monitoring
monitorServiceHealth();
```

---

## Migration-Specific Issues

### Issue 8: "EulerStream compatibility issues"

**Symptoms:**
```
Different response format than expected
Missing fields in response
TikTok Live Connector not recognizing response
```

**Solutions:**

#### Step 1: Test Compatibility
```bash
curl -X POST https://your-app.vercel.app/api/test/compatibility \
  -H "Content-Type: application/json" \
  -d '{"testSuite": "eulerstream_compatibility"}'
```

#### Step 2: Use EulerStream-Compatible Endpoint
```javascript
// Use the EulerStream-compatible endpoint
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream' // Not /api/signature
});
```

#### Step 3: Verify Response Format
```javascript
// Test the response format manually
async function testResponseFormat() {
    const response = await fetch('https://your-app.vercel.app/api/eulerstream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.tiktok.com/@testuser/live' })
    });
    
    const data = await response.json();
    console.log('Response format:', JSON.stringify(data, null, 2));
    
    // Check required fields
    const requiredFields = ['success', 'data'];
    const dataFields = ['signature', 'signed_url', 'X-Bogus', 'x-tt-params'];
    
    requiredFields.forEach(field => {
        if (!data.hasOwnProperty(field)) {
            console.error(`❌ Missing required field: ${field}`);
        } else {
            console.log(`✅ Found required field: ${field}`);
        }
    });
    
    if (data.success && data.data) {
        dataFields.forEach(field => {
            if (!data.data.hasOwnProperty(field)) {
                console.error(`❌ Missing data field: ${field}`);
            } else {
                console.log(`✅ Found data field: ${field}`);
            }
        });
    }
}

testResponseFormat();
```

---

## Debugging Tools

### Debug Mode Connection
```javascript
const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestOptions: {
        // Enable detailed logging
        verbose: true
    }
});

// Log all events for debugging
const events = ['connected', 'disconnected', 'error', 'chat', 'gift', 'like', 'follow', 'roomUser', 'streamEnd'];
events.forEach(event => {
    connection.on(event, data => {
        console.log(`[${new Date().toISOString()}] ${event}:`, data);
    });
});
```

### Network Debugging
```javascript
// Test network connectivity
async function debugNetwork() {
    const tests = [
        { name: 'DNS Resolution', url: 'https://your-app.vercel.app' },
        { name: 'Health Check', url: 'https://your-app.vercel.app/api/health' },
        { name: 'Signature API', url: 'https://your-app.vercel.app/api/eulerstream' }
    ];
    
    for (const test of tests) {
        try {
            const start = Date.now();
            const response = await fetch(test.url, {
                method: test.url.includes('/api/') ? 'POST' : 'GET',
                headers: { 'Content-Type': 'application/json' },
                body: test.url.includes('eulerstream') ? 
                    JSON.stringify({ url: 'https://www.tiktok.com/@test/live' }) : 
                    undefined
            });
            const duration = Date.now() - start;
            
            console.log(`✅ ${test.name}: ${response.status} (${duration}ms)`);
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
        }
    }
}

debugNetwork();
```

### Service Monitoring Script
```javascript
// monitor-service.js
const { TikTokLiveConnector } = require('tiktok-live-connector');

class ServiceMonitor {
    constructor(serviceUrl, apiKey = null) {
        this.serviceUrl = serviceUrl;
        this.apiKey = apiKey;
        this.stats = {
            totalAttempts: 0,
            successful: 0,
            failed: 0,
            errors: {}
        };
    }

    async startMonitoring(interval = 30000) {
        console.log(`🔍 Starting service monitoring (${interval/1000}s intervals)`);
        
        setInterval(async () => {
            await this.performHealthCheck();
            this.printStats();
        }, interval);
        
        // Initial check
        await this.performHealthCheck();
    }

    async performHealthCheck() {
        this.stats.totalAttempts++;
        
        try {
            // Test service health
            const healthResponse = await fetch(`${this.serviceUrl}/api/health`);
            const health = await healthResponse.json();
            
            if (health.status !== 'healthy') {
                throw new Error(`Service unhealthy: ${health.status}`);
            }
            
            // Test signature generation
            const headers = { 'Content-Type': 'application/json' };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            
            const sigResponse = await fetch(`${this.serviceUrl}/api/eulerstream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ url: 'https://www.tiktok.com/@test/live' })
            });
            
            const sigData = await sigResponse.json();
            
            if (!sigData.success) {
                throw new Error(`Signature generation failed: ${sigData.error}`);
            }
            
            this.stats.successful++;
            console.log(`✅ Health check passed (${new Date().toLocaleTimeString()})`);
            
        } catch (error) {
            this.stats.failed++;
            const errorKey = error.message.substring(0, 50);
            this.stats.errors[errorKey] = (this.stats.errors[errorKey] || 0) + 1;
            
            console.log(`❌ Health check failed: ${error.message}`);
        }
    }

    printStats() {
        const successRate = Math.round((this.stats.successful / this.stats.totalAttempts) * 100);
        
        console.log(`\n📊 Service Statistics:`);
        console.log(`   Total checks: ${this.stats.totalAttempts}`);
        console.log(`   Successful: ${this.stats.successful}`);
        console.log(`   Failed: ${this.stats.failed}`);
        console.log(`   Success rate: ${successRate}%`);
        
        if (Object.keys(this.stats.errors).length > 0) {
            console.log(`   Common errors:`);
            Object.entries(this.stats.errors).forEach(([error, count]) => {
                console.log(`     ${error}: ${count} times`);
            });
        }
        console.log('');
    }
}

// Usage
const monitor = new ServiceMonitor(
    process.env.SERVICE_URL || 'https://your-app.vercel.app',
    process.env.TIKTOK_API_KEY
);

monitor.startMonitoring(30000); // Check every 30 seconds
```

## Getting Help

### Self-Service Resources
1. **Service Health**: `https://your-app.vercel.app/api/health`
2. **Dashboard**: `https://your-app.vercel.app/dashboard`
3. **Compatibility Test**: `https://your-app.vercel.app/api/test/compatibility`
4. **Integration Guide**: `https://your-app.vercel.app/api/integration-guide`

### Diagnostic Information to Collect
When reporting issues, include:
- Service URL you're using
- TikTok Live Connector version
- Node.js version
- Error messages (full stack trace)
- Network connectivity test results
- Service health check response
- Whether you're using API key authentication
- Sample code that reproduces the issue

### Common Resolution Steps
1. **Check service health** first
2. **Verify configuration** (URLs, API keys, headers)
3. **Test with known working examples**
4. **Implement retry logic** for transient issues
5. **Monitor service status** for ongoing issues
6. **Use API keys** to avoid rate limiting
7. **Update TikTok Live Connector** to latest version

This troubleshooting guide covers the most common issues encountered during TikTok Live Connector integration. Most issues can be resolved by following the diagnostic steps and implementing the suggested solutions.