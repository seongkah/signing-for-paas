# Service Monitoring API Reference

## Overview

This document provides detailed API reference for the service monitoring and health check systems. All endpoints require appropriate authentication unless otherwise specified.

## Table of Contents

1. [Authentication](#authentication)
2. [Health Check APIs](#health-check-apis)
3. [Performance Monitoring APIs](#performance-monitoring-apis)
4. [Uptime Monitoring APIs](#uptime-monitoring-apis)
5. [Alerting APIs](#alerting-apis)
6. [Monitoring Control APIs](#monitoring-control-apis)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Examples](#examples)

## Authentication

Most monitoring APIs require authentication. Use one of the following methods:

### API Key Authentication
```http
Authorization: Bearer your_api_key
```

### Session Authentication
```http
Cookie: session_token=your_session_token
```

### Service Role Authentication (Internal)
```http
Authorization: Bearer your_service_role_key
```

## Health Check APIs

### GET /api/health

Basic health check endpoint that provides system status information.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| detailed | boolean | No | Return detailed health information |
| component | string | No | Check specific component health |

#### Response

**Basic Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "tiktok-signing-paas",
  "version": "1.0.0",
  "checks": {
    "database": "operational",
    "authentication": "operational",
    "signature_generation": "operational",
    "edge_functions": "operational",
    "api_endpoints": "operational"
  },
  "uptime_percentage": 99.95,
  "average_response_time": 245,
  "compatibility": {
    "eulerstream_replacement": "operational",
    "tiktok_live_connector": "compatible",
    "supported_formats": ["JSON", "plain text"],
    "endpoints": {
      "/api/signature": "operational",
      "/api/eulerstream": "operational",
      "/api/sign": "operational"
    }
  }
}
```

**Detailed Response (detailed=true):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "tiktok-signing-paas",
  "version": "1.0.0",
  "detailed": true,
  "components": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "metadata": {
        "writeTestPassed": true,
        "connectionPool": "active"
      }
    },
    {
      "name": "authentication",
      "status": "healthy",
      "responseTime": 23,
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "metadata": {
        "sessionCheck": true,
        "userLookup": true
      }
    }
  ],
  "uptime": {
    "percentage": 99.95,
    "totalChecks": 720,
    "successfulChecks": 719,
    "downtimeMinutes": 2.5
  },
  "performance": {
    "averageResponseTime": 245,
    "p95ResponseTime": 450,
    "throughput": 150,
    "errorRate": 0.05
  },
  "quotas": {
    "supabaseEdgeFunctions": {
      "used": 15000,
      "limit": 2000000,
      "percentage": 0.75,
      "status": "healthy"
    }
  }
}
```

**Component-Specific Response (component=database):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "component": {
    "name": "database",
    "status": "healthy",
    "responseTime": 45,
    "lastCheck": "2024-01-01T00:00:00.000Z",
    "metadata": {
      "writeTestPassed": true,
      "connectionPool": "active"
    }
  },
  "availability": 99.98
}
```

#### Status Codes

- `200 OK`: System is healthy or degraded
- `503 Service Unavailable`: System is unhealthy
- `404 Not Found`: Component not found (when using component parameter)
- `500 Internal Server Error`: Health check failed

## Performance Monitoring APIs

### GET /api/admin/performance

Retrieve detailed performance metrics and analytics.

#### Authentication Required
Yes - Admin level access required.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hours | number | No | Time window in hours (default: 24) |
| endpoint | string | No | Filter by specific endpoint |

#### Response

```json
{
  "success": true,
  "data": {
    "timeWindow": {
      "hours": 24,
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-02T00:00:00.000Z"
    },
    "metrics": {
      "requests": {
        "total": 1500,
        "successful": 1485,
        "failed": 15,
        "successRate": 99.0,
        "throughput": 62.5
      },
      "responseTime": {
        "average": 245,
        "median": 180,
        "p95": 450,
        "p99": 800,
        "min": 45,
        "max": 1200
      },
      "errors": {
        "total": 15,
        "rate": 1.0,
        "types": {
          "SIGNATURE_GENERATION_ERROR": 8,
          "DATABASE_ERROR": 4,
          "VALIDATION_ERROR": 3
        }
      }
    },
    "trends": {
      "hourly": [
        {
          "hour": 0,
          "timestamp": "2024-01-01T00:00:00.000Z",
          "requests": 45,
          "successfulRequests": 44,
          "averageResponseTime": 230,
          "successRate": 97.8
        }
      ],
      "responseTimeDistribution": [
        {
          "label": "0-100ms",
          "count": 450,
          "percentage": 30.0
        },
        {
          "label": "100-500ms",
          "count": 900,
          "percentage": 60.0
        }
      ]
    },
    "endpoints": [
      {
        "path": "/api/signature",
        "requests": 900,
        "averageResponseTime": 270,
        "successRate": 98.9,
        "errors": 10
      }
    ],
    "alerts": [
      {
        "type": "performance",
        "severity": "medium",
        "message": "Average response time is 245ms (threshold: 200ms)",
        "metric": "response_time",
        "value": 245,
        "threshold": 200
      }
    ],
    "recommendations": [
      {
        "type": "optimization",
        "priority": "medium",
        "title": "Optimize database queries",
        "description": "Database response time is elevated. Consider query optimization.",
        "action": "review_database_performance"
      }
    ]
  }
}
```

#### Status Codes

- `200 OK`: Success
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

## Uptime Monitoring APIs

### GET /api/admin/uptime

Retrieve uptime and availability metrics.

#### Authentication Required
Yes - Admin level access required.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hours | number | No | Time window in hours (default: 24) |
| component | string | No | Filter by specific component |

#### Response

```json
{
  "success": true,
  "data": {
    "timeWindow": {
      "hours": 24,
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-02T00:00:00.000Z"
    },
    "overall": {
      "percentage": 99.95,
      "totalChecks": 720,
      "upChecks": 719,
      "meanTimeToRecovery": 2.5,
      "longestDowntime": 5.0
    },
    "components": {
      "database": {
        "availability": 99.98,
        "totalChecks": 720,
        "upChecks": 719,
        "incidents": 1
      },
      "authentication": {
        "availability": 100.0,
        "totalChecks": 720,
        "upChecks": 720,
        "incidents": 0
      }
    },
    "incidents": [
      {
        "start": "2024-01-01T14:30:00.000Z",
        "end": "2024-01-01T14:35:00.000Z",
        "duration": 5.0,
        "affectedComponents": ["database"],
        "severity": "degraded"
      }
    ],
    "summary": {
      "totalChecks": 720,
      "uptime": 99.95,
      "meanTimeToRecovery": 2.5,
      "longestDowntime": 5.0
    }
  }
}
```

#### Component-Specific Response

When using the `component` parameter:

```json
{
  "success": true,
  "data": {
    "component": {
      "name": "database",
      "availability": 99.98,
      "history": [
        {
          "timestamp": "2024-01-01T00:00:00.000Z",
          "status": "up",
          "responseTime": 45
        }
      ]
    }
  }
}
```

#### Status Codes

- `200 OK`: Success
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

## Alerting APIs

### GET /api/admin/alerting

Get alerting system status and active alerts.

#### Authentication Required
Yes - Admin level access required.

#### Response

```json
{
  "success": true,
  "data": {
    "activeAlerts": [
      {
        "id": "alert_123",
        "ruleId": "high-error-rate",
        "message": "Error rate exceeded 10.0% in the last 15 minutes",
        "severity": "HIGH",
        "triggeredAt": "2024-01-01T14:30:00.000Z",
        "acknowledged": false
      }
    ],
    "alertRules": [
      {
        "id": "high-error-rate",
        "name": "High Error Rate",
        "condition": {
          "type": "error_rate",
          "threshold": 0.1,
          "timeWindowMinutes": 15
        },
        "severity": "HIGH",
        "enabled": true,
        "cooldownMinutes": 30
      }
    ],
    "summary": {
      "totalActiveAlerts": 1,
      "criticalAlerts": 0,
      "highAlerts": 1,
      "enabledRules": 10,
      "totalRules": 10
    }
  }
}
```

### POST /api/admin/alerting

Manage alerts and trigger checks.

#### Authentication Required
Yes - Admin level access required.

#### Request Body

**Trigger Alert Check:**
```json
{
  "action": "check"
}
```

**Acknowledge Alert:**
```json
{
  "action": "acknowledge",
  "alertId": "alert_123",
  "userId": "user_456"
}
```

#### Response

**Check Action:**
```json
{
  "success": true,
  "message": "Alert check completed"
}
```

**Acknowledge Action:**
```json
{
  "success": true,
  "message": "Alert acknowledged successfully"
}
```

### PUT /api/admin/alerting

Update alert rule configuration.

#### Authentication Required
Yes - Admin level access required.

#### Request Body

```json
{
  "ruleId": "high-error-rate",
  "updates": {
    "enabled": false,
    "threshold": 0.15,
    "cooldownMinutes": 45
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Alert rule updated successfully"
}
```

#### Status Codes

- `200 OK`: Success
- `400 Bad Request`: Invalid action or parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Alert or rule not found
- `500 Internal Server Error`: Server error

## Monitoring Control APIs

### GET /api/admin/monitoring

Get monitoring system status and configuration.

#### Authentication Required
Yes - Admin level access required.

#### Response

```json
{
  "success": true,
  "data": {
    "scheduler": {
      "isRunning": true,
      "healthCheckInterval": true,
      "alertCheckInterval": true,
      "quotaCheckInterval": true
    },
    "endpoints": {
      "health": "/api/health",
      "detailedHealth": "/api/health?detailed=true",
      "systemHealth": "/api/admin/system-health",
      "performance": "/api/admin/performance",
      "uptime": "/api/admin/uptime",
      "alerting": "/api/admin/alerting"
    },
    "capabilities": {
      "healthMonitoring": true,
      "performanceTracking": true,
      "uptimeMonitoring": true,
      "alerting": true,
      "quotaMonitoring": true,
      "componentTracking": true
    },
    "configuration": {
      "healthCheckInterval": "2 minutes",
      "alertCheckInterval": "5 minutes",
      "quotaCheckInterval": "15 minutes",
      "uptimeHistoryRetention": "24 hours",
      "performanceMetricsRetention": "24 hours"
    }
  }
}
```

### POST /api/admin/monitoring

Control monitoring system operations.

#### Authentication Required
Yes - Admin level access required.

#### Request Body

**Start Scheduler:**
```json
{
  "action": "start"
}
```

**Stop Scheduler:**
```json
{
  "action": "stop"
}
```

**Trigger Manual Health Check:**
```json
{
  "action": "triggerHealthCheck"
}
```

**Trigger Manual Alert Check:**
```json
{
  "action": "triggerAlertCheck"
}
```

**Trigger Manual Quota Check:**
```json
{
  "action": "triggerQuotaCheck"
}
```

**Get Status:**
```json
{
  "action": "status"
}
```

#### Response

**Start/Stop Actions:**
```json
{
  "success": true,
  "message": "Health monitoring scheduler started"
}
```

**Trigger Health Check:**
```json
{
  "success": true,
  "message": "Manual health check completed",
  "data": {
    "overall": "healthy",
    "components": [...],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Trigger Quota Check:**
```json
{
  "success": true,
  "message": "Manual quota check completed",
  "data": {
    "alertsGenerated": 2,
    "alerts": [...]
  }
}
```

**Status Action:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "healthCheckInterval": true,
    "alertCheckInterval": true,
    "quotaCheckInterval": true
  }
}
```

#### Status Codes

- `200 OK`: Success
- `400 Bad Request`: Invalid action
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

## Error Handling

### Standard Error Response

All APIs return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid parameter value",
    "code": "INVALID_PARAMETER",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "details": {
      "parameter": "hours",
      "value": "invalid",
      "expected": "number"
    }
  }
}
```

### Error Types

| Type | Description |
|------|-------------|
| AUTHENTICATION_ERROR | Authentication required or failed |
| AUTHORIZATION_ERROR | Insufficient permissions |
| VALIDATION_ERROR | Invalid request parameters |
| RATE_LIMIT_ERROR | Rate limit exceeded |
| INTERNAL_SERVER_ERROR | Server-side error |
| SERVICE_UNAVAILABLE | Service temporarily unavailable |

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service down |

## Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/health | 60 requests | 1 minute |
| /api/admin/* | 30 requests | 1 minute |
| All others | 100 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_ERROR",
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "details": {
      "limit": 60,
      "window": "1 minute",
      "resetTime": "2024-01-01T00:01:00.000Z"
    }
  }
}
```

## Examples

### Basic Health Check

```bash
curl -X GET "https://api.example.com/api/health" \
  -H "Accept: application/json"
```

### Detailed Health Check with Authentication

```bash
curl -X GET "https://api.example.com/api/health?detailed=true" \
  -H "Authorization: Bearer your_api_key" \
  -H "Accept: application/json"
```

### Get Performance Metrics

```bash
curl -X GET "https://api.example.com/api/admin/performance?hours=12" \
  -H "Authorization: Bearer your_api_key" \
  -H "Accept: application/json"
```

### Trigger Manual Health Check

```bash
curl -X POST "https://api.example.com/api/admin/monitoring" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"action": "triggerHealthCheck"}'
```

### Acknowledge Alert

```bash
curl -X POST "https://api.example.com/api/admin/alerting" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "acknowledge",
    "alertId": "alert_123",
    "userId": "user_456"
  }'
```

### Get Uptime Data for Specific Component

```bash
curl -X GET "https://api.example.com/api/admin/uptime?component=database&hours=6" \
  -H "Authorization: Bearer your_api_key" \
  -H "Accept: application/json"
```

### Update Alert Rule

```bash
curl -X PUT "https://api.example.com/api/admin/alerting" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "high-error-rate",
    "updates": {
      "threshold": 0.15,
      "enabled": true
    }
  }'
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Health check
const healthResponse = await fetch('/api/health?detailed=true');
const healthData = await healthResponse.json();

// Performance metrics
const performanceResponse = await fetch('/api/admin/performance', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
const performanceData = await performanceResponse.json();

// Trigger health check
const triggerResponse = await fetch('/api/admin/monitoring', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ action: 'triggerHealthCheck' })
});
```

### Python

```python
import requests

# Health check
response = requests.get('https://api.example.com/api/health?detailed=true')
health_data = response.json()

# Performance metrics
headers = {'Authorization': f'Bearer {api_key}'}
response = requests.get('https://api.example.com/api/admin/performance', headers=headers)
performance_data = response.json()

# Trigger health check
payload = {'action': 'triggerHealthCheck'}
response = requests.post('https://api.example.com/api/admin/monitoring', 
                        json=payload, headers=headers)
```

### cURL Scripts

```bash
#!/bin/bash

API_KEY="your_api_key"
BASE_URL="https://api.example.com"

# Function to check system health
check_health() {
  curl -s -X GET "$BASE_URL/api/health?detailed=true" \
    -H "Authorization: Bearer $API_KEY" | jq '.'
}

# Function to get performance metrics
get_performance() {
  curl -s -X GET "$BASE_URL/api/admin/performance?hours=24" \
    -H "Authorization: Bearer $API_KEY" | jq '.data.metrics'
}

# Function to trigger manual health check
trigger_health_check() {
  curl -s -X POST "$BASE_URL/api/admin/monitoring" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"action": "triggerHealthCheck"}' | jq '.'
}

# Run functions
echo "=== System Health ==="
check_health

echo "=== Performance Metrics ==="
get_performance

echo "=== Manual Health Check ==="
trigger_health_check
```

This API reference provides comprehensive documentation for all monitoring endpoints, including request/response formats, authentication requirements, error handling, and practical examples for integration.