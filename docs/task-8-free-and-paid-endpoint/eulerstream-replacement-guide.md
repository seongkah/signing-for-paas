# EulerStream Replacement Guide

## Overview

This guide provides comprehensive instructions for migrating from EulerStream to our TikTok signing service as a drop-in replacement for TikTok Live Connector projects.

## Quick Migration

### Before (EulerStream)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'eulerstream'  // Paid service
});
```

### After (Our Service)
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'  // Free service
});
```

## API Endpoints

### Primary Endpoint: `/api/eulerstream`
- **Method**: POST
- **Content-Type**: application/json
- **Format**: EulerStream-compatible
- **Authentication**: Optional (recommended for production)

**Request Format:**
```json
{
  "url": "https://www.tiktok.com/@username/live"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "signature": "generated_signature",
    "signed_url": "https://www.tiktok.com/@username/live?signature=...",
    "X-Bogus": "x_bogus_value",
    "x-tt-params": "params_value",
    "navigator": {
      "deviceScaleFactor": 1,
      "user_agent": "Mozilla/5.0...",
      "browser_language": "en-US",
      "browser_platform": "Win32",
      "browser_name": "Chrome",
      "browser_version": "120.0.0.0"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "response_time_ms": 150
}
```

### Alternative Endpoints

#### `/api/signature` - Modern API
- Enhanced features and monitoring
- Supports both JSON and plain text
- Recommended for new integrations

#### `/api/sign` - Legacy Compatibility
- Compatible with original local server format
- Supports both JSON and plain text
- Useful for existing local server migrations

## Authentication Options

### Free Tier (No Authentication)
- Rate limited based on IP address
- Perfect for testing and small projects
- No setup required

### API Key Authentication (Unlimited)
- Get API key from dashboard: `https://your-app.vercel.app/dashboard`
- Add to request headers:
```javascript
const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
});
```

## Compatibility Features

### Request Format Support
- ✅ JSON with `url` field (EulerStream format)
- ✅ JSON with `roomUrl` field (modern format)
- ✅ Plain text body (legacy format)
- ✅ Multiple URL parameter names (`url`, `roomUrl`, `room_url`)

### Response Format Compatibility
- ✅ EulerStream-compatible response structure
- ✅ Legacy local server format support
- ✅ Modern enhanced format with additional metadata
- ✅ Consistent error handling across all formats

### TikTok Live Connector Integration
- ✅ Drop-in replacement for EulerStream
- ✅ No code changes required (just URL update)
- ✅ Compatible with all TikTok Live Connector versions
- ✅ Maintains same signature generation capabilities

## Testing Your Integration

### 1. Basic Connectivity Test
```bash
curl -X POST https://your-app.vercel.app/api/eulerstream \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@testuser/live"}'
```

### 2. TikTok Live Connector Test
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@testuser', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'
});

connection.connect().then(state => {
    console.log('✅ Connected successfully:', state);
}).catch(err => {
    console.error('❌ Connection failed:', err);
});
```

### 3. Automated Compatibility Testing
```bash
curl -X POST https://your-app.vercel.app/api/test/compatibility \
  -H "Content-Type: application/json" \
  -d '{"testSuite": "full_compatibility", "testUrl": "https://www.tiktok.com/@testuser/live"}'
```

## Migration Checklist

- [ ] Update TikTok Live Connector configuration
- [ ] Replace EulerStream URL with our service endpoint
- [ ] Test connection with a known TikTok live stream
- [ ] Verify chat messages and gifts are received correctly
- [ ] Optional: Set up API key authentication for production
- [ ] Monitor usage through our dashboard
- [ ] Update error handling if needed

## Error Handling

### Common Errors and Solutions

#### Invalid TikTok URL Format
```json
{
  "success": false,
  "error": "Invalid TikTok URL format",
  "message": "URL must be a valid TikTok live stream URL"
}
```
**Solution**: Ensure URL follows format: `https://www.tiktok.com/@username/live`

#### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests"
}
```
**Solution**: Get an API key for unlimited access or wait for rate limit reset

#### Authentication Failed
```json
{
  "success": false,
  "error": "Authentication failed",
  "message": "Invalid or missing authentication"
}
```
**Solution**: Check your API key or generate a new one from the dashboard

## Performance Comparison

| Feature | EulerStream | Our Service |
|---------|-------------|-------------|
| Cost | Paid subscription | Free tier + optional API keys |
| Rate Limits | Based on plan | Generous free tier, unlimited with API key |
| Reliability | Third-party dependency | Self-hosted on reliable infrastructure |
| Monitoring | Limited | Full dashboard with real-time metrics |
| Support | External support | Direct access to logs and diagnostics |
| Latency | Variable | Optimized for low latency |

## Advanced Configuration

### Custom Headers
```javascript
const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
        'User-Agent': 'MyApp/1.0.0'
    }
});
```

### Timeout Configuration
```javascript
const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderTimeout: 10000  // 10 seconds
});
```

### Error Handling
```javascript
connection.on('error', (err) => {
    if (err.message.includes('signature')) {
        console.log('Signature generation failed, retrying...');
        // Implement retry logic
    }
});
```

## Monitoring and Analytics

### Dashboard Access
Visit `https://your-app.vercel.app/dashboard` to:
- Monitor real-time usage
- View response times and success rates
- Generate and manage API keys
- Check quota usage
- View error logs

### Health Check
```bash
curl https://your-app.vercel.app/api/health
```

### Integration Testing
```bash
curl https://your-app.vercel.app/api/test/tiktok-connector
```

## Troubleshooting

### Connection Issues
1. Check service health: `GET /api/health`
2. Verify URL format is correct
3. Test with integration tester: `POST /api/test/compatibility`
4. Check dashboard for error logs

### Performance Issues
1. Monitor response times in dashboard
2. Consider using API key for priority processing
3. Check network connectivity
4. Review rate limiting status

### TikTok Live Connector Issues
1. Ensure TikTok Live Connector is up to date
2. Verify the target user is actually live
3. Check TikTok Live Connector logs for detailed errors
4. Test with a different TikTok user

## Support

- **Service Status**: `https://your-app.vercel.app/api/health`
- **Dashboard**: `https://your-app.vercel.app/dashboard`
- **Integration Guide**: `https://your-app.vercel.app/api/integration-guide`
- **Compatibility Testing**: `https://your-app.vercel.app/api/test/compatibility`

## Migration Examples

### Simple Migration
```diff
const connection = new TikTokLiveConnector('@username', {
-   signProvider: 'eulerstream'
+   signProvider: 'https://your-app.vercel.app/api/eulerstream'
});
```

### With Authentication
```diff
const connection = new TikTokLiveConnector('@username', {
-   signProvider: 'eulerstream'
+   signProvider: 'https://your-app.vercel.app/api/eulerstream',
+   signProviderHeaders: {
+       'Authorization': 'Bearer YOUR_API_KEY',
+       'Content-Type': 'application/json'
+   }
});
```

### Complete Example
```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
});

connection.connect().then(state => {
    console.log('Connected to TikTok Live:', state);
}).catch(err => {
    console.error('Connection failed:', err);
});

connection.on('chat', data => {
    console.log(`${data.uniqueId}: ${data.comment}`);
});

connection.on('gift', data => {
    console.log(`${data.uniqueId} sent ${data.giftName} x${data.repeatCount}`);
});

connection.on('disconnect', () => {
    console.log('Disconnected from TikTok Live');
});
```

This completes your migration from EulerStream to our signing service!