# Authentication and API Key Management Guide

This guide explains how to use the authentication and API key management system implemented in the TikTok Signing PaaS service.

## Table of Contents

1. [Overview](#overview)
2. [User Registration and Authentication](#user-registration-and-authentication)
3. [API Key Management](#api-key-management)
4. [Making Authenticated Requests](#making-authenticated-requests)
5. [Rate Limits and Tiers](#rate-limits-and-tiers)
6. [Error Handling](#error-handling)
7. [API Reference](#api-reference)

## Overview

The TikTok Signing PaaS service supports two authentication methods:

- **Session-based authentication**: For web applications and user interfaces
- **API key authentication**: For programmatic access and server-to-server communication

### User Tiers

- **Free Tier**: Limited to 100 requests per day
- **API Key Tier**: Unlimited requests (automatically upgraded when you create an API key)

## User Registration and Authentication

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-secure-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "tier": "free",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "message": "User registered successfully. Please check your email for verification."
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-secure-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "tier": "free",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T12:00:00.000Z"
    },
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_in": 3600
    }
  }
}
```

### 3. Get Current User Info

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### 4. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## API Key Management

### 1. Create an API Key

First, you need to be logged in with a session token:

```bash
curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "name": "My Production API Key"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "My Production API Key",
      "key": "sk_1234567890abcdef...", // Only shown once!
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isActive": true
    },
    "message": "API key created successfully. Save this key securely - it will not be shown again."
  }
}
```

⚠️ **Important**: The API key is only shown once during creation. Save it securely!

### 2. List Your API Keys

```bash
curl -X GET http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "uuid",
        "name": "My Production API Key",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastUsed": "2024-01-01T12:00:00.000Z",
        "isActive": true
      }
    ]
  }
}
```

### 3. Update API Key Name

```bash
curl -X PUT http://localhost:3000/api/api-keys/KEY_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Updated API Key Name"
  }'
```

### 4. Deactivate an API Key

```bash
curl -X DELETE http://localhost:3000/api/api-keys/KEY_ID \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Making Authenticated Requests

### Using Session Token (Web Applications)

```bash
curl -X POST http://localhost:3000/api/signature \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "roomUrl": "https://www.tiktok.com/@username/live"
  }'
```

### Using API Key (Programmatic Access)

```bash
curl -X POST http://localhost:3000/api/signature \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_your_api_key_here" \
  -d '{
    "roomUrl": "https://www.tiktok.com/@username/live"
  }'
```

### JavaScript Example

```javascript
// Using API Key
const response = await fetch('http://localhost:3000/api/signature', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_your_api_key_here'
  },
  body: JSON.stringify({
    roomUrl: 'https://www.tiktok.com/@username/live'
  })
});

const data = await response.json();
console.log(data);
```

### Python Example

```python
import requests

# Using API Key
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_your_api_key_here'
}

data = {
    'roomUrl': 'https://www.tiktok.com/@username/live'
}

response = requests.post(
    'http://localhost:3000/api/signature',
    headers=headers,
    json=data
)

result = response.json()
print(result)
```

## Rate Limits and Tiers

### Free Tier
- **Limit**: 100 requests per day
- **Reset**: Daily at midnight UTC
- **Authentication**: Session-based only

### API Key Tier
- **Limit**: Unlimited requests
- **Authentication**: API key or session-based
- **Automatic upgrade**: When you create your first API key

### Rate Limit Headers

When you make requests, check these response headers:

```bash
# For free tier users
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-02T00:00:00.000Z
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_ERROR",
    "message": "Daily rate limit exceeded. Limit resets at 2024-01-02T00:00:00.000Z",
    "code": "RATE_LIMIT_EXCEEDED",
    "timestamp": "2024-01-01T23:59:59.000Z"
  },
  "rateLimit": {
    "remaining": 0,
    "resetTime": "2024-01-02T00:00:00.000Z"
  }
}
```

## Error Handling

### Common Error Types

1. **Authentication Errors**
```json
{
  "success": false,
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Invalid API key",
    "code": "INVALID_API_KEY",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

2. **Validation Errors**
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "roomUrl is required and must be a string",
    "code": "MISSING_ROOM_URL",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

3. **Rate Limit Errors**
```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_ERROR",
    "message": "Daily rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/me` | Get current user | Yes |

### API Key Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/api-keys` | List user's API keys | Yes (Session) |
| POST | `/api/api-keys` | Create new API key | Yes (Session) |
| PUT | `/api/api-keys/{id}` | Update API key name | Yes (Session) |
| DELETE | `/api/api-keys/{id}` | Deactivate API key | Yes (Session) |

### User Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user/profile` | Get user profile | Yes |
| PUT | `/api/user/profile` | Update user profile | Yes |
| GET | `/api/user/usage` | Get usage statistics | Yes |

### Service Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/health` | Health check | No |
| POST | `/api/signature` | Generate signature | Yes |

## Best Practices

### Security
1. **Never expose API keys** in client-side code or public repositories
2. **Use environment variables** to store API keys in production
3. **Rotate API keys regularly** for enhanced security
4. **Use HTTPS** in production environments

### API Key Management
1. **Create separate API keys** for different environments (dev, staging, prod)
2. **Use descriptive names** for your API keys
3. **Monitor API key usage** through the usage statistics endpoint
4. **Deactivate unused API keys** to reduce security risk

### Error Handling
1. **Always check the `success` field** in responses
2. **Handle rate limits gracefully** with exponential backoff
3. **Log errors appropriately** for debugging
4. **Implement retry logic** for transient errors

### Rate Limiting
1. **Monitor your usage** to avoid hitting limits
2. **Implement caching** to reduce API calls
3. **Consider upgrading to API key tier** for unlimited access
4. **Handle rate limit errors gracefully** in your application

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your API key starts with `sk_`
   - Ensure you're using the correct API key
   - Verify the API key hasn't been deactivated

2. **"Not authenticated" error**
   - Check that you're including the Authorization header
   - Verify your session token hasn't expired
   - Ensure you're using the correct authentication method

3. **Rate limit exceeded**
   - Check your current tier and limits
   - Consider upgrading to API key tier
   - Implement proper rate limiting in your application

4. **"User not found" error**
   - Ensure you're registered and logged in
   - Check that your account is active
   - Verify you're using the correct credentials

### Getting Help

If you encounter issues not covered in this guide:

1. Check the API response for detailed error messages
2. Review the server logs for additional context
3. Ensure your request format matches the examples
4. Verify your authentication credentials are correct

## Example Integration

Here's a complete example of integrating the authentication system:

```javascript
class TikTokSigningClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'http://localhost:3000';
  }

  async generateSignature(roomUrl) {
    try {
      const response = await fetch(`${this.baseUrl}/api/signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ roomUrl })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API Error: ${data.error.message}`);
      }

      return data.data;
    } catch (error) {
      console.error('Failed to generate signature:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }
}

// Usage
const client = new TikTokSigningClient('sk_your_api_key_here');

// Generate signature
const signature = await client.generateSignature('https://www.tiktok.com/@username/live');
console.log('Signature:', signature);

// Get user profile
const profile = await client.getProfile();
console.log('Profile:', profile);
```

This completes the authentication and API key management guide. The system is now ready for production use with proper security, rate limiting, and user management features.