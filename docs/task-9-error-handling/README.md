# Task 9: Comprehensive Error Handling and Logging System

## Overview

This documentation covers the comprehensive error handling and logging system implemented for the TikTok Signing PaaS platform. The system provides enterprise-grade error management, monitoring, and alerting capabilities.

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Error Classification](#error-classification)
3. [Logging System](#logging-system)
4. [Alerting System](#alerting-system)
5. [Monitoring Dashboard](#monitoring-dashboard)
6. [API Integration](#api-integration)
7. [Database Schema](#database-schema)
8. [Configuration](#configuration)
9. [Usage Examples](#usage-examples)
10. [Troubleshooting](#troubleshooting)

## System Architecture

The error handling system consists of several interconnected components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Wrapper   │───▶│  Error Handler  │───▶│   Database      │
│   Middleware    │    │   (Singleton)   │    │   Logging       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Request       │    │   Alerting      │    │   Monitoring    │
│   Context       │    │   System        │    │   Dashboard     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

- **Error Handler**: Centralized error classification and response generation
- **API Wrapper**: Middleware for automatic error handling in API routes
- **Alerting System**: Intelligent monitoring and notification system
- **Monitoring Dashboard**: Real-time error visualization and management
- **Database Layer**: Persistent error storage and analytics

## Error Classification

### Error Types

The system classifies errors into the following types:

| Error Type | Description | HTTP Status | Severity |
|------------|-------------|-------------|----------|
| `AUTHENTICATION_ERROR` | Authentication failures | 401 | MEDIUM |
| `AUTHORIZATION_ERROR` | Permission denied | 403 | MEDIUM |
| `VALIDATION_ERROR` | Input validation failures | 400 | LOW |
| `RATE_LIMIT_ERROR` | Rate limiting exceeded | 429 | HIGH |
| `SIGNATURE_GENERATION_ERROR` | TikTok signature failures | 500 | HIGH |
| `EXTERNAL_SERVICE_ERROR` | Third-party service issues | 502 | HIGH |
| `DATABASE_ERROR` | Database operation failures | 500 | HIGH |
| `INTERNAL_SERVER_ERROR` | Unexpected system errors | 500 | CRITICAL |
| `QUOTA_EXCEEDED_ERROR` | Usage quota exceeded | 429 | HIGH |
| `NETWORK_ERROR` | Network connectivity issues | 503 | HIGH |

### Severity Levels

- **LOW**: Minor issues that don't affect core functionality
- **MEDIUM**: Issues that may impact user experience
- **HIGH**: Significant problems requiring attention
- **CRITICAL**: System-threatening issues requiring immediate action

## Logging System

### Features

- **Structured Logging**: Consistent log format with metadata
- **Database Persistence**: All errors stored in Supabase
- **Context Tracking**: Full request context including user, endpoint, timing
- **Performance Monitoring**: Response time tracking
- **Statistics**: Error analytics and trending

### Log Structure

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

## Alerting System

### Alert Rules

The system includes pre-configured alert rules:

1. **High Error Rate**: >10% error rate in 15 minutes
2. **Critical Errors**: Any critical error occurrence
3. **Signature Failures**: 5+ signature errors in 10 minutes
4. **Database Errors**: 3+ database errors in 5 minutes
5. **Consecutive Failures**: 10+ consecutive API failures
6. **Slow Response Time**: Average >5 seconds in 10 minutes

### Alert Configuration

```typescript
interface AlertRule {
  id: string;
  name: string;
  condition: {
    type: 'error_rate' | 'error_count' | 'response_time' | 'consecutive_failures';
    threshold: number;
    timeWindowMinutes: number;
    errorTypes?: ErrorType[];
    endpoints?: string[];
  };
  severity: ErrorSeverity;
  enabled: boolean;
  cooldownMinutes: number;
}
```

## Monitoring Dashboard

### Error Log Viewer

- **Real-time Updates**: Live error log display
- **Advanced Filtering**: By severity, type, endpoint, user, date range
- **Search Functionality**: Full-text search across error messages
- **Pagination**: Efficient handling of large datasets
- **Export Capabilities**: Download error logs for analysis

### Alerting Dashboard

- **Active Alerts**: Display of unacknowledged alerts
- **Alert Management**: Acknowledge and manage alerts
- **Rule Configuration**: Enable/disable alert rules
- **Statistics**: Alert frequency and patterns

### Key Metrics

- Total errors in time period
- Error rate trends
- Most common error types
- Affected endpoints
- User impact analysis

## API Integration

### Using the Error Handler

```typescript
import { withErrorHandling, ApiContext } from '@/lib/api-wrapper';
import { createValidationError } from '@/lib/error-handler';

async function myApiHandler(request: NextRequest, context: ApiContext) {
  const { email } = await request.json();
  
  if (!email) {
    throw createValidationError('Email is required');
  }
  
  // Your API logic here
  return NextResponse.json({ success: true });
}

export const POST = withErrorHandling(myApiHandler, '/api/my-endpoint');
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Email is required",
    "code": "VALIDATION_001",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123456"
  }
}
```

## Database Schema

### Tables

#### error_logs
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message TEXT NOT NULL,
  code TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES users(id),
  api_key_id UUID REFERENCES api_keys(id),
  endpoint TEXT,
  request_id TEXT,
  stack_trace TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### error_alerts
```sql
CREATE TABLE error_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  endpoint TEXT,
  user_id UUID REFERENCES users(id),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### app_settings
```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Configuration

### Environment Variables

```env
# Required for error logging
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Admin Configuration

Admin emails are configured in the `app_settings` table:

```sql
INSERT INTO app_settings (key, value, description) 
VALUES (
  'admin_emails', 
  '["admin@example.com", "ops@example.com"]'::jsonb, 
  'List of admin email addresses'
);
```

### Alert Settings

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

## Usage Examples

### Basic Error Handling

```typescript
// In your API route
import { withErrorHandling } from '@/lib/api-wrapper';
import { createValidationError, createAuthenticationError } from '@/lib/error-handler';

async function handleRequest(request: NextRequest, context: ApiContext) {
  // Validation
  const { data } = await request.json();
  if (!data.email) {
    throw createValidationError('Email is required', { field: 'email' });
  }
  
  // Authentication check
  if (!context.userId) {
    throw createAuthenticationError('User not authenticated');
  }
  
  // Your business logic
  return NextResponse.json({ success: true, data: result });
}

export const POST = withErrorHandling(handleRequest, '/api/example');
```

### Manual Error Logging

```typescript
import { errorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';

// Log a custom error
await errorHandler.logError({
  type: ErrorType.EXTERNAL_SERVICE_ERROR,
  severity: ErrorSeverity.HIGH,
  message: 'TikTok API rate limit exceeded',
  code: 'TIKTOK_RATE_LIMIT',
  timestamp: new Date(),
  endpoint: '/api/signature',
  userId: 'user-123',
  details: { rateLimitReset: '2024-01-15T11:00:00Z' }
});
```

### Checking Alert Status

```typescript
import { alertingSystem } from '@/lib/alerting-system';

// Get active alerts
const activeAlerts = await alertingSystem.getActiveAlerts();

// Acknowledge an alert
await alertingSystem.acknowledgeAlert('alert-id', 'admin-user-id');

// Trigger manual alert check
await alertingSystem.checkAlerts();
```

## API Endpoints

### Error Management

- `GET /api/admin/error-logs` - Fetch error logs with filtering
- `DELETE /api/admin/error-logs` - Clear old error logs
- `GET /api/admin/error-alerts` - Fetch error alerts
- `PUT /api/admin/error-alerts` - Acknowledge alerts
- `GET /api/admin/alerting` - Get alerting system status
- `POST /api/admin/alerting` - Trigger alert checks or acknowledge alerts
- `PUT /api/admin/alerting` - Update alert rule configuration

### Query Parameters

#### Error Logs
- `page`: Page number (default: 1)
- `limit`: Items per page (max: 100, default: 50)
- `severity`: Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `type`: Filter by error type
- `endpoint`: Filter by endpoint
- `userId`: Filter by user ID
- `startDate`: Filter from date (ISO string)
- `endDate`: Filter to date (ISO string)
- `search`: Full-text search

## Troubleshooting

### Common Issues

#### 1. Errors Not Being Logged

**Symptoms**: Errors occur but don't appear in the dashboard

**Solutions**:
- Check Supabase connection and service role key
- Verify RLS policies allow error logging
- Check console for database connection errors
- Ensure error handler is properly imported and used

#### 2. Alerts Not Triggering

**Symptoms**: Critical errors occur but no alerts are generated

**Solutions**:
- Verify alerting system is initialized
- Check alert rule configuration
- Ensure cooldown periods haven't been exceeded
- Check database permissions for alert tables

#### 3. Dashboard Not Loading Data

**Symptoms**: Monitoring dashboard shows no data or loading errors

**Solutions**:
- Verify API endpoints are accessible
- Check authentication and admin permissions
- Ensure proper CORS configuration
- Check browser console for JavaScript errors

#### 4. Performance Issues

**Symptoms**: Slow error log queries or dashboard loading

**Solutions**:
- Check database indexes on error_logs table
- Implement pagination for large datasets
- Consider archiving old error logs
- Optimize query filters and date ranges

### Debug Mode

Enable debug logging by setting:

```typescript
// In your error handler initialization
console.log('Error handler debug mode enabled');
```

### Health Checks

Monitor system health with:

```bash
# Check error log table size
SELECT COUNT(*) FROM error_logs;

# Check recent error trends
SELECT severity, COUNT(*) 
FROM error_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY severity;

# Check alert system status
SELECT acknowledged, COUNT(*) 
FROM error_alerts 
GROUP BY acknowledged;
```

## Best Practices

1. **Use Appropriate Error Types**: Choose the most specific error type for better classification
2. **Include Context**: Always provide relevant context in error details
3. **Monitor Regularly**: Check the dashboard regularly for error trends
4. **Acknowledge Alerts**: Promptly acknowledge and resolve alerts
5. **Archive Old Logs**: Regularly clean up old error logs to maintain performance
6. **Test Error Scenarios**: Use the test script to verify error handling works correctly
7. **Configure Notifications**: Set up external notifications for critical alerts

## Testing

Use the provided test script to verify the system:

```bash
npx ts-node src/scripts/test-error-handling.ts
```

This will test all major components and provide a comprehensive system check.