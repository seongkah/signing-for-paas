# API Reference for TikTok Live Connector Integration

## Overview

This document provides detailed API reference for all endpoints used in TikTok Live Connector integration with our signing service. All endpoints support both free tier and API key authentication.

## Base URL

```
https://your-app.vercel.app
```

## Authentication

### Free Tier (No Authentication)
- **Rate Limit**: 1000 requests/hour per IP
- **Usage**: Testing and small projects
- **Headers**: Only `Content-Type: application/json` required

### API Key Authentication
- **Rate Limit**: Unlimited
- **Usage**: Production applications
- **Headers**: 
  - `Authorization: Bearer YOUR_API_KEY`
  - `Content-Type: application/json`

## Core Endpoints

### 1. EulerStream Compatible Endpoint

**Endpoint**: `POST /api/eulerstream`  
**Purpose**: Drop-in replacement for EulerStream  
**Recommended for**: Migration from EulerStream

#### Request

```http
POST /api/eulerstream
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (optional)

{
  "url": "https://www.tiktok.com/@username/live"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | TikTok live stream URL |

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "signature": "generated_signature_string",
    "signed_url": "https://www.tiktok.com/@username/live?signature=...",
    "X-Bogus": "x_bogus_value",
    "x-tt-params": "encoded_params",
    "navigator": {
      "deviceScaleFactor": 1,
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "browser_language": "en-US",
      "browser_platform": "Win32",
      "browser_name": "Chrome",
      "browser_version": "120.0.0.0"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "response_time_ms": 156
}
```

#### Response (Error)

```json
{
  "success": false,
  "error": "Invalid TikTok URL format",
  "message": "URL must be a valid TikTok live stream URL",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "response_time_ms": 45
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `data` | object | Signature data (only present if success=true) |
| `data.signature` | string | Generated signature for TikTok API |
| `data.signed_url` | string | Complete URL with signature parameters |
| `data.X-Bogus` | string | X-Bogus header value |
| `data.x-tt-params` | string | Encoded parameters for TikTok API |
| `data.navigator` | object | Browser fingerprint data |
| `error` | string | Error type (only present if success=false) |
| `message` | string | Human-readable error message |
| `timestamp` | string | ISO 8601 timestamp |
| `response_time_ms` | number | Server processing time in milliseconds |

#### Example Usage with TikTok Live Connector

```javascript
const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
});
```

---

### 2. Modern Signature Endpoint

**Endpoint**: `POST /api/signature`  
**Purpose**: Enhanced modern API with additional metadata  
**Recommended for**: New integrations

#### Request

```http
POST /api/signature
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (optional)

{
  "roomUrl": "https://www.tiktok.com/@username/live",
  "options": {
    "includeMetadata": true,
    "format": "enhanced"
  }
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomUrl` | string | Yes | TikTok live stream URL |
| `url` | string | No | Alternative parameter name for URL |
| `options` | object | No | Additional options |
| `options.includeMetadata` | boolean | No | Include additional metadata (default: true) |
| `options.format` | string | No | Response format: "enhanced" or "simple" |

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "signature": "generated_signature_string",
    "signed_url": "https://www.tiktok.com/@username/live?signature=...",
    "X-Bogus": "x_bogus_value",
    "x-tt-params": "encoded_params",
    "navigator": {
      "deviceScaleFactor": 1,
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "browser_language": "en-US",
      "browser_platform": "Win32",
      "browser_name": "Chrome",
      "browser_version": "120.0.0.0"
    },
    "metadata": {
      "generation_method": "signtok",
      "cache_hit": false,
      "processing_time_ms": 142,
      "signature_version": "v2.1",
      "user_agent_randomized": true
    }
  },
  "request_id": "req_1234567890",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "response_time_ms": 156
}
```

---

### 3. Legacy Compatible Endpoint

**Endpoint**: `POST /api/sign`  
**Purpose**: Compatible with original local server format  
**Recommended for**: Migrating from local server

#### Request

```http
POST /api/sign
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (optional)

{
  "room_url": "https://www.tiktok.com/@username/live"
}
```

#### Response (Success)

```json
{
  "status": "ok",
  "signature": "generated_signature_string",
  "signed_url": "https://www.tiktok.com/@username/live?signature=...",
  "X-Bogus": "x_bogus_value",
  "x-tt-params": "encoded_params",
  "response_time_ms": 134
}
```

---

## Testing and Monitoring Endpoints

### 4. Service Health Check

**Endpoint**: `GET /api/health`  
**Purpose**: Check service status and health

#### Request

```http
GET /api/health
```

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "signature_generator_ready": true,
  "database_connected": true,
  "quota_status": {
    "edge_functions": {
      "used": 1250,
      "limit": 2000000,
      "percentage": 0.06
    },
    "database_storage": {
      "used": 45,
      "limit": 500,
      "percentage": 9.0
    },
    "bandwidth": {
      "used": 1.2,
      "limit": 100,
      "percentage": 1.2
    }
  },
  "response_time_ms": 23,
  "version": "1.0.0"
}
```

#### Health Status Values

| Status | Description |
|--------|-------------|
| `healthy` | All systems operational |
| `degraded` | Some issues but service functional |
| `unhealthy` | Service experiencing significant issues |

---

### 5. Compatibility Testing

**Endpoint**: `POST /api/test/compatibility`  
**Purpose**: Test TikTok Live Connector compatibility

#### Request

```http
POST /api/test/compatibility
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (optional)

{
  "testSuite": "full_compatibility",
  "testUrl": "https://www.tiktok.com/@testuser/live",
  "options": {
    "includePerformance": true,
    "testTimeout": 10000
  }
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `testSuite` | string | Yes | Test suite to run |
| `testUrl` | string | No | URL to test with (default: test URL) |
| `options` | object | No | Test options |

#### Test Suite Options

| Suite | Description |
|-------|-------------|
| `basic` | Basic functionality tests |
| `eulerstream_compatibility` | EulerStream format compatibility |
| `tiktok_live_connector` | TikTok Live Connector integration |
| `full_compatibility` | Complete test suite |
| `performance` | Performance and load testing |

#### Response

```json
{
  "success": true,
  "testSuite": "full_compatibility",
  "results": {
    "eulerstream_format": {
      "passed": true,
      "response_time_ms": 156,
      "signature_valid": true,
      "format_correct": true
    },
    "tiktok_live_connector": {
      "passed": true,
      "response_time_ms": 142,
      "connection_successful": true,
      "events_received": true
    },
    "error_handling": {
      "passed": true,
      "invalid_url_handled": true,
      "rate_limit_handled": true,
      "auth_error_handled": true
    },
    "performance": {
      "passed": true,
      "avg_response_time_ms": 149,
      "max_response_time_ms": 234,
      "success_rate": 100
    }
  },
  "overall_score": "100%",
  "recommendations": [],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 6. TikTok Live Connector Integration Test

**Endpoint**: `POST /api/test/tiktok-connector`  
**Purpose**: Test live TikTok Live Connector integration

#### Request

```http
POST /api/test/tiktok-connector
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (optional)

{
  "username": "testuser",
  "timeout": 10000,
  "testEvents": ["chat", "gift", "like", "follow"],
  "options": {
    "enableExtendedGiftInfo": true,
    "enableWebsocketUpgrade": true
  }
}
```

#### Response

```json
{
  "success": true,
  "connection": {
    "established": true,
    "response_time_ms": 1456,
    "state": {
      "roomId": "123456789",
      "title": "Test Stream",
      "viewerCount": 42
    }
  },
  "events": {
    "total_received": 15,
    "chat_messages": 8,
    "gifts": 3,
    "likes": 4,
    "follows": 0
  },
  "performance": {
    "connection_time_ms": 1456,
    "first_event_time_ms": 2134,
    "avg_event_interval_ms": 850
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## User Management Endpoints

### 7. User Profile

**Endpoint**: `GET /api/user/profile`  
**Purpose**: Get current user profile information  
**Authentication**: Required

#### Request

```http
GET /api/user/profile
Authorization: Bearer YOUR_API_KEY
```

#### Response

```json
{
  "success": true,
  "user": {
    "id": "user_123456",
    "email": "user@example.com",
    "tier": "api_key",
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-01T12:00:00.000Z"
  },
  "usage": {
    "total_requests": 15420,
    "requests_today": 234,
    "requests_this_month": 8765
  },
  "api_keys": {
    "total": 2,
    "active": 2
  }
}
```

---

### 8. User Usage Statistics

**Endpoint**: `GET /api/user/usage`  
**Purpose**: Get detailed usage statistics  
**Authentication**: Required

#### Request

```http
GET /api/user/usage
Authorization: Bearer YOUR_API_KEY
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Time period: "day", "week", "month", "year" |
| `start_date` | string | Start date (ISO 8601) |
| `end_date` | string | End date (ISO 8601) |

#### Response

```json
{
  "success": true,
  "period": "month",
  "usage": {
    "total_requests": 8765,
    "successful_requests": 8642,
    "failed_requests": 123,
    "success_rate": 98.6,
    "avg_response_time_ms": 167
  },
  "daily_breakdown": [
    {
      "date": "2024-01-01",
      "requests": 234,
      "success_rate": 99.1,
      "avg_response_time_ms": 156
    }
  ],
  "top_endpoints": [
    {
      "endpoint": "/api/eulerstream",
      "requests": 7890,
      "percentage": 90.0
    },
    {
      "endpoint": "/api/signature",
      "requests": 875,
      "percentage": 10.0
    }
  ]
}
```

---

### 9. API Key Management

**Endpoint**: `GET /api/api-keys`  
**Purpose**: List user's API keys  
**Authentication**: Required

#### Request

```http
GET /api/api-keys
Authorization: Bearer YOUR_API_KEY
```

#### Response

```json
{
  "success": true,
  "api_keys": [
    {
      "id": "key_123456",
      "name": "Production Key",
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_used": "2024-01-01T12:00:00.000Z",
      "is_active": true,
      "usage": {
        "total_requests": 5420,
        "requests_today": 156
      }
    },
    {
      "id": "key_789012",
      "name": "Development Key",
      "created_at": "2024-01-01T06:00:00.000Z",
      "last_used": "2024-01-01T11:30:00.000Z",
      "is_active": true,
      "usage": {
        "total_requests": 1234,
        "requests_today": 78
      }
    }
  ]
}
```

#### Create New API Key

**Endpoint**: `POST /api/api-keys`

```http
POST /api/api-keys
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "name": "New API Key",
  "description": "Key for production use"
}
```

#### Response

```json
{
  "success": true,
  "api_key": {
    "id": "key_345678",
    "name": "New API Key",
    "key": "sk_live_1234567890abcdef...",
    "created_at": "2024-01-01T00:00:00.000Z",
    "is_active": true
  },
  "warning": "This key will only be shown once. Please save it securely."
}
```

---

## Error Codes and Responses

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please try again later or use an API key.",
  "details": {
    "limit": 1000,
    "window": "1 hour",
    "reset_time": "2024-01-01T01:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:30:00.000Z",
  "request_id": "req_1234567890"
}
```

### Common Error Types

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_URL` | Invalid TikTok URL format | Use valid TikTok live stream URL |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Get API key or wait for reset |
| `AUTHENTICATION_FAILED` | Invalid API key | Check API key format |
| `SIGNATURE_GENERATION_FAILED` | Unable to generate signature | Check service health, retry |
| `SERVICE_UNAVAILABLE` | Service temporarily down | Check health endpoint, retry later |
| `INVALID_REQUEST` | Malformed request | Check request format and parameters |

---

## Rate Limiting

### Free Tier Limits

- **Requests**: 1000 per hour per IP address
- **Burst**: Up to 10 requests per minute
- **Reset**: Every hour at :00 minutes

### Rate Limit Headers

All responses include rate limiting headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1704067200
X-RateLimit-Window: 3600
```

### Rate Limit Response

When rate limited:

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "reset_time": "2024-01-01T01:00:00.000Z",
    "retry_after": 1800
  }
}
```

---

## SDK Examples

### JavaScript/Node.js

```javascript
const TikTokSigningClient = {
    baseUrl: 'https://your-app.vercel.app',
    apiKey: null,

    setApiKey(key) {
        this.apiKey = key;
    },

    async generateSignature(url) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(`${this.baseUrl}/api/eulerstream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ url })
        });

        return await response.json();
    },

    async checkHealth() {
        const response = await fetch(`${this.baseUrl}/api/health`);
        return await response.json();
    },

    async testCompatibility(testSuite = 'basic') {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(`${this.baseUrl}/api/test/compatibility`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ testSuite })
        });

        return await response.json();
    }
};

// Usage
TikTokSigningClient.setApiKey('your-api-key');
const result = await TikTokSigningClient.generateSignature('https://www.tiktok.com/@user/live');
```

### Python

```python
import requests
import json

class TikTokSigningClient:
    def __init__(self, base_url='https://your-app.vercel.app', api_key=None):
        self.base_url = base_url
        self.api_key = api_key
    
    def _get_headers(self):
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        return headers
    
    def generate_signature(self, url):
        response = requests.post(
            f'{self.base_url}/api/eulerstream',
            headers=self._get_headers(),
            json={'url': url}
        )
        return response.json()
    
    def check_health(self):
        response = requests.get(f'{self.base_url}/api/health')
        return response.json()
    
    def test_compatibility(self, test_suite='basic'):
        response = requests.post(
            f'{self.base_url}/api/test/compatibility',
            headers=self._get_headers(),
            json={'testSuite': test_suite}
        )
        return response.json()

# Usage
client = TikTokSigningClient(api_key='your-api-key')
result = client.generate_signature('https://www.tiktok.com/@user/live')
```

This API reference provides comprehensive documentation for integrating with our TikTok signing service, covering all endpoints, parameters, responses, and usage examples.