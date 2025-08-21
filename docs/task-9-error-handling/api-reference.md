# Error Handling System - API Reference

## Overview

This document provides comprehensive API reference for the error handling and logging system, including all endpoints, data structures, and integration methods.

## 🔗 API Endpoints

### Error Logs Management

#### GET /api/admin/error-logs

Retrieve error logs with filtering and pagination.

**Authentication**: Admin required

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (max: 100, default: 50)
- `severity` (string, optional): Filter by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `type` (string, optional): Filter by error type
- `endpoint` (string, optional): Filter by API endpoint
- `userId` (string, optional): Filter by user ID
- `startDate` (string, optional): Filter from date (ISO string)
- `endDate` (string, optional): Filter to date (ISO string)
- `search` (string, optional): Full-text search in messages and codes

**Response**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "type": "VALIDATION_ERROR",
        "severity": "LOW",
        "message": "Email is required",
        "code": "VALIDATION_001",
        "endpoint": "/api/auth/login",
        "user_id": "uuid",
        "api_key_id": "uuid",
        "request_id": "req-123",
        "details": {},
        "stack_trace": "Error: ...",
        "user_agent": "Mozilla/5.0...",
        "ip_address": "192.168.1.1",
        "created_at": "2024-01-15T10:30:00Z",
        "users": {
          "email": "user@example.com"
        },
        "api_keys": {
          "name": "Production API Key"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    },
    "summary": {
      "total": 150,
      "last24h": 25,
      "bySeverity": {
        "LOW": 50,
        "MEDIUM": 60,
        "HIGH": 30,
        "CRITICAL": 10
      },
      "byType": {
        "VALIDATION_ERROR": 80,
        "AUTHENTICATION_ERROR": 40,
        "SIGNATURE_GENERATION_ERROR": 20,
        "INTERNAL_SERVER_ERROR": 10
      }
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Admin access required",
    "code": "AUTH_002",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### DELETE /api/admin/error-logs

Clear old error logs.

**Authentication**: Admin required

**Query Parameters**:
- `olderThan` (number, optional): Delete logs older than N days (default: 30)

**Response**:
```json
{
  "success": true,
  "message": "Error logs older than 30 days have been cleared"
}
```

### Error Alerts Management

#### GET /api/admin/error-alerts

Retrieve error alerts with filtering.

**Authentication**: Admin required

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (max: 100, default: 50)
- `acknowledged` (boolean, optional): Filter by acknowledgment status
- `severity` (string, optional): Filter by severity

**Response**:
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "uuid",
        "error_type": "ALERT_HIGH_ERROR_RATE",
        "severity": "HIGH",
        "message": "Error rate exceeded 10.0% in the last 15 minutes",
        "endpoint": "/api/signature",
        "user_id": "uuid",
        "acknowledged": false,
        "acknowledged_by": null,
        "acknowledged_at": null,
        "created_at": "2024-01-15T10:30:00Z",
        "users": {
          "email": "user@example.com"
        },
        "acknowledged_by_user": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5,
      "totalPages": 1
    },
    "unacknowledgedCount": 3
  }
}
```

#### PUT /api/admin/error-alerts

Acknowledge error alerts.

**Authentication**: Admin required

**Request Body**:
```json
{
  "alertIds": ["uuid1", "uuid2"],
  "userId": "admin-user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "2 alert(s) acknowledged"
}
```

### Alerting System Management

#### GET /api/admin/alerting

Get alerting system status and configuration.

**Authentication**: Admin required

**Response**:
```json
{
  "success": true,
  "data": {
    "activeAlerts": [
      {
        "id": "uuid",
        "ruleId": "high-error-rate",
        "message": "Error rate exceeded threshold",
        "severity": "HIGH",
        "triggeredAt": "2024-01-15T10:30:00Z",
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
      "totalActiveAlerts": 2,
      "criticalAlerts": 0,
      "highAlerts": 2,
      "enabledRules": 6,
      "totalRules": 6
    }
  }
}
```

#### POST /api/admin/alerting

Perform alerting system actions.

**Authentication**: Admin required

**Request Body** (Manual Check):
```json
{
  "action": "check"
}
```

**Request Body** (Acknowledge Alert):
```json
{
  "action": "acknowledge",
  "alertId": "uuid",
  "userId": "admin-user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Alert check completed"
}
```

#### PUT /api/admin/alerting

Update alert rule configuration.

**Authentication**: Admin required

**Request Body**:
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

**Response**:
```json
{
  "success": true,
  "message": "Alert rule updated successfully"
}
```

## 📊 Data Structures

### ErrorDetails Interface

```typescript
interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code: string;
  timestamp: Date;
  userId?: string;
  apiKeyId?: string;
  endpoint?: string;
  requestId?: string;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
  details?: any;
}
```

### ErrorType Enum

```typescript
enum ErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SIGNATURE_GENERATION_ERROR = 'SIGNATURE_GENERATION_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  QUOTA_EXCEEDED_ERROR = 'QUOTA_EXCEEDED_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}
```

### ErrorSeverity Enum

```typescript
enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}
```

### ErrorResponse Interface

```typescript
interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code: string;
    timestamp: string;
    requestId?: string;
  };
}
```

### ApiContext Interface

```typescript
interface ApiContext {
  userId?: string;
  apiKeyId?: string;
  requestId: string;
  endpoint: string;
  userAgent?: string;
  ipAddress?: string;
}
```

### AlertRule Interface

```typescript
interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: ErrorSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}
```

### AlertCondition Interface

```typescript
interface AlertCondition {
  type: 'error_rate' | 'error_count' | 'response_time' | 'consecutive_failures';
  threshold: number;
  timeWindowMinutes: number;
  errorTypes?: ErrorType[];
  endpoints?: string[];
}
```

## 🛠️ SDK Methods

### Error Handler Methods

#### getInstance()

Get the singleton instance of the error handler.

```typescript
import { errorHandler } from '@/lib/error-handler';

const handler = errorHandler; // Already instantiated
```

#### handleError(error, context)

Handle an error with automatic classification and logging.

```typescript
const response = await errorHandler.handleError(error, {
  endpoint: '/api/example',
  userId: 'user-123',
  requestId: 'req-456'
});
```

**Parameters**:
- `error` (Error | any): The error to handle
- `context` (Partial<ApiContext>): Request context

**Returns**: `Promise<NextResponse>` - Standardized error response

#### logError(errorDetails)

Manually log an error with full details.

```typescript
await errorHandler.logError({
  type: ErrorType.VALIDATION_ERROR,
  severity: ErrorSeverity.LOW,
  message: 'Custom error message',
  code: 'CUSTOM_001',
  timestamp: new Date(),
  endpoint: '/api/custom',
  userId: 'user-123',
  details: { customField: 'value' }
});
```

**Parameters**:
- `errorDetails` (ErrorDetails): Complete error information

**Returns**: `Promise<void>`

#### createErrorResponse(type, message, code, statusCode, requestId)

Create a standardized error response.

```typescript
const response = errorHandler.createErrorResponse(
  ErrorType.VALIDATION_ERROR,
  'Invalid input',
  'VAL_001',
  400,
  'req-123'
);
```

**Parameters**:
- `type` (ErrorType): Error type
- `message` (string): Error message
- `code` (string): Error code
- `statusCode` (number): HTTP status code
- `requestId` (string, optional): Request identifier

**Returns**: `NextResponse` - Formatted error response

#### getErrorStats(timeRange)

Get error statistics for a time period.

```typescript
const stats = await errorHandler.getErrorStats('24h');
```

**Parameters**:
- `timeRange` (string): Time range ('1h', '24h', '7d', '30d')

**Returns**: `Promise<ErrorStats | null>` - Error statistics

### Utility Functions

#### createValidationError(message, details)

Create a validation error.

```typescript
import { createValidationError } from '@/lib/error-handler';

const error = createValidationError('Email is required', { field: 'email' });
throw error;
```

#### createAuthenticationError(message)

Create an authentication error.

```typescript
import { createAuthenticationError } from '@/lib/error-handler';

const error = createAuthenticationError('Invalid token');
throw error;
```

#### createAuthorizationError(message)

Create an authorization error.

```typescript
import { createAuthorizationError } from '@/lib/error-handler';

const error = createAuthorizationError('Access denied');
throw error;
```

#### createRateLimitError(message)

Create a rate limit error.

```typescript
import { createRateLimitError } from '@/lib/error-handler';

const error = createRateLimitError('Too many requests');
throw error;
```

#### createSignatureError(message, details)

Create a signature generation error.

```typescript
import { createSignatureError } from '@/lib/error-handler';

const error = createSignatureError('Signature generation failed', { url: 'https://...' });
throw error;
```

### API Wrapper Functions

#### withErrorHandling(handler, endpoint)

Wrap an API handler with automatic error handling.

```typescript
import { withErrorHandling } from '@/lib/api-wrapper';

async function myHandler(request: NextRequest, context: ApiContext) {
  // Your API logic
  return NextResponse.json({ success: true });
}

export const POST = withErrorHandling(myHandler, '/api/my-endpoint');
```

**Parameters**:
- `handler` (ApiHandler): The API handler function
- `endpoint` (string): The endpoint path

**Returns**: `(request: NextRequest, params?: any) => Promise<NextResponse>`

#### withEdgeFunctionErrorHandling(handler)

Wrap an Edge Function with error handling.

```typescript
import { withEdgeFunctionErrorHandling } from '@/lib/api-wrapper';

const handler = withEdgeFunctionErrorHandling(async (request: Request) => {
  // Your Edge Function logic
  return new Response(JSON.stringify({ success: true }));
});
```

**Parameters**:
- `handler` ((request: Request) => Promise<Response>): Edge Function handler

**Returns**: `(request: Request) => Promise<Response>`

#### withPerformanceMonitoring(fn, operationName)

Wrap a function with performance monitoring.

```typescript
import { withPerformanceMonitoring } from '@/lib/api-wrapper';

const monitoredFunction = withPerformanceMonitoring(
  async (data) => {
    // Your function logic
    return processData(data);
  },
  'data-processing'
);
```

### Alerting System Methods

#### getInstance()

Get the singleton instance of the alerting system.

```typescript
import { alertingSystem } from '@/lib/alerting-system';

const system = alertingSystem; // Already instantiated
```

#### initialize()

Initialize the alerting system with default rules.

```typescript
await alertingSystem.initialize();
```

**Returns**: `Promise<void>`

#### checkAlerts()

Manually trigger alert rule evaluation.

```typescript
await alertingSystem.checkAlerts();
```

**Returns**: `Promise<void>`

#### getActiveAlerts()

Get all unacknowledged alerts.

```typescript
const alerts = await alertingSystem.getActiveAlerts();
```

**Returns**: `Promise<AlertNotification[]>`

#### acknowledgeAlert(alertId, userId)

Acknowledge a specific alert.

```typescript
const success = await alertingSystem.acknowledgeAlert('alert-id', 'user-id');
```

**Parameters**:
- `alertId` (string): Alert identifier
- `userId` (string): User acknowledging the alert

**Returns**: `Promise<boolean>` - Success status

#### getAlertRules()

Get all configured alert rules.

```typescript
const rules = await alertingSystem.getAlertRules();
```

**Returns**: `Promise<AlertRule[]>`

#### updateAlertRule(ruleId, updates)

Update an alert rule configuration.

```typescript
const success = await alertingSystem.updateAlertRule('rule-id', {
  enabled: false,
  threshold: 0.15
});
```

**Parameters**:
- `ruleId` (string): Rule identifier
- `updates` (Partial<AlertRule>): Rule updates

**Returns**: `Promise<boolean>` - Success status

## 🔧 Configuration Options

### Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
ERROR_LOG_RETENTION_DAYS=90
ALERT_CHECK_INTERVAL_MINUTES=5
MAX_ERROR_DETAILS_SIZE=10000
ENABLE_STACK_TRACES=true
```

### Database Configuration

#### Admin Emails

```sql
INSERT INTO app_settings (key, value, description) 
VALUES (
  'admin_emails', 
  '["admin@example.com"]'::jsonb, 
  'List of admin email addresses'
);
```

#### Alert Settings

```sql
INSERT INTO app_settings (key, value, description) 
VALUES (
  'error_alert_settings', 
  '{
    "critical_threshold": 5,
    "high_threshold": 10,
    "alert_cooldown_minutes": 30,
    "enable_email_alerts": false,
    "enable_slack_alerts": false
  }'::jsonb, 
  'Error alerting configuration'
);
```

## 📝 Error Codes Reference

### Validation Errors (VALIDATION_xxx)
- `VALIDATION_001`: Missing required field
- `VALIDATION_002`: Invalid format
- `VALIDATION_003`: Value out of range
- `VALIDATION_004`: Invalid data type

### Authentication Errors (AUTH_xxx)
- `AUTH_001`: Authentication failed
- `AUTH_002`: Access denied
- `AUTH_003`: Token expired
- `AUTH_004`: Invalid credentials

### Rate Limit Errors (RATE_xxx)
- `RATE_001`: Rate limit exceeded
- `RATE_002`: Quota exceeded
- `RATE_003`: Concurrent request limit

### Signature Errors (SIG_xxx)
- `SIG_001`: Signature generation failed
- `SIG_002`: Invalid TikTok URL
- `SIG_003`: External service unavailable

### Database Errors (DB_xxx)
- `DB_001`: Database operation failed
- `DB_002`: Connection timeout
- `DB_003`: Constraint violation

### Internal Errors (INT_xxx)
- `INT_001`: Internal server error
- `INT_002`: Configuration error
- `INT_003`: Service unavailable

## 🚀 Usage Examples

### Basic API Integration

```typescript
import { withErrorHandling, ApiContext } from '@/lib/api-wrapper';
import { createValidationError } from '@/lib/error-handler';

async function handleUserRegistration(request: NextRequest, context: ApiContext) {
  const { email, password } = await request.json();
  
  if (!email) {
    throw createValidationError('Email is required', { field: 'email' });
  }
  
  if (!password || password.length < 8) {
    throw createValidationError('Password must be at least 8 characters', { 
      field: 'password',
      minLength: 8 
    });
  }
  
  // Registration logic...
  const user = await createUser({ email, password });
  
  return NextResponse.json({
    success: true,
    data: { userId: user.id }
  });
}

export const POST = withErrorHandling(handleUserRegistration, '/api/auth/register');
```

### Custom Error Logging

```typescript
import { errorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';

// In your business logic
try {
  const result = await externalApiCall();
} catch (error) {
  // Log custom error with business context
  await errorHandler.logError({
    type: ErrorType.EXTERNAL_SERVICE_ERROR,
    severity: ErrorSeverity.HIGH,
    message: 'External API call failed',
    code: 'EXT_API_001',
    timestamp: new Date(),
    endpoint: '/api/external-integration',
    userId: currentUserId,
    details: {
      externalService: 'TikTok API',
      operation: 'signature_generation',
      retryCount: 3,
      lastError: error.message
    }
  });
  
  // Handle the error appropriately
  throw createSignatureError('Unable to generate signature at this time');
}
```

### Alert Management

```typescript
import { alertingSystem } from '@/lib/alerting-system';

// Check system health and alerts
const healthCheck = async () => {
  // Get current alerts
  const activeAlerts = await alertingSystem.getActiveAlerts();
  
  if (activeAlerts.length > 0) {
    console.warn(`${activeAlerts.length} active alerts require attention`);
    
    // Acknowledge non-critical alerts automatically
    const nonCriticalAlerts = activeAlerts.filter(alert => 
      alert.severity !== 'CRITICAL'
    );
    
    for (const alert of nonCriticalAlerts) {
      await alertingSystem.acknowledgeAlert(alert.id, 'system-auto');
    }
  }
  
  // Trigger manual check
  await alertingSystem.checkAlerts();
};
```

This API reference provides comprehensive documentation for integrating with and using the error handling and logging system.