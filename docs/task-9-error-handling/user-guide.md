# Error Handling System - User Guide

## Overview

This guide explains how to use the comprehensive error handling and logging system from both administrator and developer perspectives.

## 👨‍💼 Administrator Guide

### Accessing the Error Monitoring Dashboard

1. **Login as Administrator**
   - Navigate to the admin dashboard
   - Ensure your email is configured in the admin settings

2. **Error Log Viewer**
   - View real-time error logs
   - Filter by severity, type, endpoint, or date range
   - Search through error messages
   - Export error data for analysis

3. **Alert Management**
   - Monitor active alerts requiring attention
   - Acknowledge alerts to mark them as resolved
   - Configure alert rules and thresholds

### Managing Error Logs

#### Viewing Error Logs

The error log viewer provides several filtering options:

- **Severity Filter**: LOW, MEDIUM, HIGH, CRITICAL
- **Error Type Filter**: Authentication, Validation, Signature Generation, etc.
- **Date Range**: Last hour, 24 hours, 7 days, 30 days
- **Search**: Full-text search across error messages
- **User Filter**: Filter by specific user ID
- **Endpoint Filter**: Filter by API endpoint

#### Understanding Error Information

Each error log entry contains:

- **Timestamp**: When the error occurred
- **Severity Level**: Criticality of the error
- **Error Type**: Category of the error
- **Message**: Human-readable error description
- **Code**: Unique error identifier
- **Endpoint**: API endpoint where error occurred
- **User Information**: Associated user (if applicable)
- **Request ID**: Unique request identifier for tracing
- **Details**: Additional context and stack traces

#### Error Log Actions

- **View Details**: Click to expand full error information
- **Filter**: Use the filter controls to narrow down results
- **Refresh**: Update the log display with latest entries
- **Clear Old Logs**: Remove logs older than specified days (default: 30 days)

### Alert Management

#### Understanding Alerts

The system monitors for several alert conditions:

1. **High Error Rate**: When error rate exceeds 10% in 15 minutes
2. **Critical Errors**: Any critical system error
3. **Signature Failures**: Multiple signature generation failures
4. **Database Issues**: Database connection or query problems
5. **Consecutive Failures**: Multiple consecutive API failures
6. **Slow Response Times**: Average response time exceeds thresholds

#### Managing Active Alerts

- **View Active Alerts**: See all unacknowledged alerts
- **Acknowledge Alerts**: Mark alerts as reviewed and handled
- **Alert Details**: View specific alert information and context
- **Manual Check**: Trigger immediate alert rule evaluation

#### Alert Rule Configuration

- **Enable/Disable Rules**: Turn alert rules on or off
- **View Rule Details**: See alert conditions and thresholds
- **Rule Status**: Monitor which rules are active

### Maintenance Tasks

#### Regular Maintenance

1. **Daily**: Review critical and high-severity errors
2. **Weekly**: Acknowledge resolved alerts and review error trends
3. **Monthly**: Clear old error logs and analyze error patterns
4. **Quarterly**: Review and adjust alert rule thresholds

#### Performance Optimization

- **Archive Old Logs**: Regularly remove logs older than retention period
- **Monitor Database Size**: Keep track of error log table growth
- **Review Alert Frequency**: Adjust thresholds if alerts are too frequent/infrequent

## 👨‍💻 Developer Guide

### Integrating Error Handling in API Routes

#### Basic Integration

```typescript
import { withErrorHandling, ApiContext } from '@/lib/api-wrapper';
import { createValidationError, createAuthenticationError } from '@/lib/error-handler';

async function myApiHandler(request: NextRequest, context: ApiContext) {
  try {
    // Your API logic here
    const { email, password } = await request.json();
    
    // Validation
    if (!email) {
      throw createValidationError('Email is required', { field: 'email' });
    }
    
    // Business logic
    const result = await processRequest(email, password);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    // Error will be automatically handled by withErrorHandling wrapper
    throw error;
  }
}

// Wrap your handler with error handling middleware
export const POST = withErrorHandling(myApiHandler, '/api/my-endpoint');
```

#### Advanced Error Handling

```typescript
import { errorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';

async function complexApiHandler(request: NextRequest, context: ApiContext) {
  try {
    // Complex business logic
    const result = await performComplexOperation();
    
    // Manual error logging for specific scenarios
    if (result.warnings.length > 0) {
      await errorHandler.logError({
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'External service returned warnings',
        code: 'EXT_SERVICE_WARN',
        timestamp: new Date(),
        endpoint: context.endpoint,
        userId: context.userId,
        details: { warnings: result.warnings }
      });
    }
    
    return NextResponse.json({ success: true, data: result });
    
  } catch (error) {
    // Add additional context before re-throwing
    if (error instanceof DatabaseError) {
      throw createDatabaseError('Database operation failed', {
        operation: 'user_lookup',
        table: 'users',
        originalError: error.message
      });
    }
    
    throw error;
  }
}
```

### Error Types and When to Use Them

#### Validation Errors
Use for input validation failures:

```typescript
import { createValidationError } from '@/lib/error-handler';

// Missing required fields
if (!email) {
  throw createValidationError('Email is required', { field: 'email' });
}

// Invalid format
if (!isValidEmail(email)) {
  throw createValidationError('Invalid email format', { email, format: 'RFC5322' });
}

// Out of range values
if (age < 0 || age > 150) {
  throw createValidationError('Age must be between 0 and 150', { age, min: 0, max: 150 });
}
```

#### Authentication Errors
Use for authentication failures:

```typescript
import { createAuthenticationError } from '@/lib/error-handler';

// Missing credentials
if (!authHeader) {
  throw createAuthenticationError('Authentication required');
}

// Invalid token
if (!isValidToken(token)) {
  throw createAuthenticationError('Invalid or expired token');
}

// User not found
if (!user) {
  throw createAuthenticationError('Invalid credentials');
}
```

#### Rate Limit Errors
Use for rate limiting:

```typescript
import { createRateLimitError } from '@/lib/error-handler';

if (requestCount > limit) {
  throw createRateLimitError(`Rate limit exceeded: ${requestCount}/${limit} requests`);
}
```

#### Signature Generation Errors
Use for TikTok signature-related failures:

```typescript
import { createSignatureError } from '@/lib/error-handler';

try {
  const signature = await generateSignature(url);
} catch (error) {
  throw createSignatureError('Failed to generate TikTok signature', {
    url,
    originalError: error.message,
    retryable: true
  });
}
```

### Best Practices for Developers

#### 1. Use Specific Error Types
Choose the most appropriate error type for better classification and monitoring.

#### 2. Provide Meaningful Context
Include relevant details that help with debugging:

```typescript
throw createValidationError('Invalid user data', {
  field: 'email',
  value: email,
  expectedFormat: 'valid email address',
  validationRule: 'RFC5322'
});
```

#### 3. Don't Log Sensitive Information
Avoid logging passwords, tokens, or personal data:

```typescript
// ❌ Bad - logs sensitive data
throw createAuthenticationError('Login failed', { password, token });

// ✅ Good - logs safe context
throw createAuthenticationError('Login failed', { 
  email: email.substring(0, 3) + '***',
  attemptCount: attempts 
});
```

#### 4. Use Request Context
The API wrapper automatically provides context, but you can enhance it:

```typescript
async function myHandler(request: NextRequest, context: ApiContext) {
  // Context is automatically populated with:
  // - requestId: unique identifier
  // - endpoint: API endpoint path
  // - userAgent: client user agent
  // - ipAddress: client IP
  
  // You can add more context:
  context.userId = extractUserId(request);
  context.apiKeyId = extractApiKeyId(request);
  
  // Errors will automatically include this context
}
```

#### 5. Handle Async Errors Properly
Ensure async errors are properly caught:

```typescript
async function myHandler(request: NextRequest, context: ApiContext) {
  try {
    // Multiple async operations
    const [user, permissions, data] = await Promise.all([
      fetchUser(userId),
      fetchPermissions(userId),
      fetchData(dataId)
    ]);
    
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    // All async errors will be caught and handled
    throw error;
  }
}
```

### Testing Error Handling

#### Unit Testing
Test your error handling logic:

```typescript
// Test validation errors
it('should throw validation error for missing email', async () => {
  const request = new NextRequest('http://localhost/api/test', {
    method: 'POST',
    body: JSON.stringify({ password: 'test' })
  });
  
  const context = { requestId: 'test', endpoint: '/api/test' };
  
  await expect(myHandler(request, context))
    .rejects
    .toThrow('Email is required');
});
```

#### Integration Testing
Use the provided test script:

```bash
npx ts-node src/scripts/test-error-handling.ts
```

#### Manual Testing
Test error scenarios in development:

```typescript
// Temporarily add test errors
if (process.env.NODE_ENV === 'development' && request.headers.get('x-test-error')) {
  throw createValidationError('Test error for development');
}
```

### Monitoring and Debugging

#### Request Tracing
Every request gets a unique ID for tracing:

```typescript
// The request ID is automatically added to all logs
// You can use it to trace a request through multiple services
console.log(`Processing request ${context.requestId}`);
```

#### Performance Monitoring
The system automatically tracks response times:

```typescript
// Response times are automatically logged
// Slow operations (>5 seconds) are flagged
// You can add custom performance markers:
const startTime = Date.now();
await slowOperation();
const duration = Date.now() - startTime;

if (duration > 1000) {
  console.warn(`Slow operation detected: ${duration}ms`);
}
```

#### Error Statistics
Access error statistics programmatically:

```typescript
import { errorHandler } from '@/lib/error-handler';

// Get error statistics for the last 24 hours
const stats = await errorHandler.getErrorStats('24h');

console.log('Error statistics:', {
  total: stats.total,
  byType: stats.byType,
  bySeverity: stats.bySeverity
});
```

## 🔧 Configuration

### Environment Setup

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Admin Configuration

Add admin emails to the database:

```sql
UPDATE app_settings 
SET value = '["admin@example.com", "ops@example.com"]'::jsonb
WHERE key = 'admin_emails';
```

### Alert Configuration

Customize alert settings:

```sql
UPDATE app_settings 
SET value = '{
  "critical_threshold": 3,
  "high_threshold": 10,
  "alert_cooldown_minutes": 15,
  "enable_email_alerts": true,
  "enable_slack_alerts": false
}'::jsonb
WHERE key = 'error_alert_settings';
```

## 🚨 Emergency Procedures

### High Error Rate Response

1. **Immediate Actions**:
   - Check the error dashboard for patterns
   - Identify affected endpoints or users
   - Verify system health and external dependencies

2. **Investigation**:
   - Review recent deployments or changes
   - Check external service status
   - Analyze error details and stack traces

3. **Resolution**:
   - Apply hotfixes if needed
   - Scale resources if performance-related
   - Communicate with affected users

### Critical Error Response

1. **Alert Acknowledgment**: Acknowledge the alert to stop notifications
2. **Impact Assessment**: Determine scope and severity
3. **Immediate Mitigation**: Apply temporary fixes or rollbacks
4. **Root Cause Analysis**: Investigate underlying causes
5. **Permanent Fix**: Implement and test proper solution
6. **Post-Incident Review**: Document lessons learned

### System Recovery

If the error handling system itself fails:

1. Check database connectivity
2. Verify Supabase configuration
3. Review application logs
4. Restart services if necessary
5. Monitor for recovery

## 📞 Support

For issues with the error handling system:

1. Check the troubleshooting section in the main README
2. Review system logs and error messages
3. Use the test script to verify functionality
4. Contact the development team with specific error details