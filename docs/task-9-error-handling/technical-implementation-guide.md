# Error Handling System - Technical Implementation Guide

## Architecture Overview

The comprehensive error handling and logging system is built with a modular architecture that provides centralized error management, intelligent alerting, and comprehensive monitoring capabilities.

## 🏗️ System Components

### 1. Error Handler (`src/lib/error-handler.ts`)

The core singleton class that manages all error handling operations.

#### Key Features:
- **Centralized Error Classification**: Automatically categorizes errors by type and severity
- **Database Logging**: Persists all errors with full context to Supabase
- **Alert Triggering**: Automatically triggers alerts for critical errors
- **Statistics Generation**: Provides error analytics and trends
- **Response Standardization**: Creates consistent error responses

#### Implementation Details:

```typescript
export class ErrorHandler {
  private static instance: ErrorHandler;
  private supabase: any;

  // Singleton pattern ensures consistent error handling across the application
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Main error handling method with automatic classification
  async handleError(error: any, context: ErrorContext): Promise<NextResponse> {
    // 1. Classify error type and severity
    // 2. Log to database with full context
    // 3. Trigger alerts if necessary
    // 4. Return standardized response
  }
}
```

#### Error Classification Logic:

The system uses pattern matching to classify errors:

```typescript
// Validation errors
if (error.name === 'ValidationError' || error.message?.includes('validation')) {
  return {
    type: ErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    statusCode: 400
  };
}

// Authentication errors
if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
  return {
    type: ErrorType.AUTHENTICATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401
  };
}
```

### 2. API Wrapper (`src/lib/api-wrapper.ts`)

Middleware that automatically wraps API routes with error handling capabilities.

#### Features:
- **Automatic Error Catching**: Catches all unhandled errors in API routes
- **Request Context Extraction**: Automatically extracts user, IP, user-agent, etc.
- **Performance Monitoring**: Tracks response times and identifies slow operations
- **Request ID Generation**: Creates unique identifiers for request tracing
- **CORS Handling**: Manages CORS headers for Edge Functions

#### Implementation:

```typescript
export function withErrorHandling(
  handler: ApiHandler,
  endpoint: string
) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    const context: ApiContext = {
      requestId,
      endpoint,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: extractIpAddress(request)
    };

    try {
      // Execute the wrapped handler
      const response = await handler(request, context);
      
      // Log successful response with timing
      logSuccessfulRequest(context, Date.now() - startTime);
      
      return response;
    } catch (error) {
      // Delegate to centralized error handler
      return await errorHandler.handleError(error, context);
    }
  };
}
```

### 3. Alerting System (`src/lib/alerting-system.ts`)

Intelligent monitoring system that evaluates error patterns and triggers alerts.

#### Alert Rule Engine:

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

interface AlertCondition {
  type: 'error_rate' | 'error_count' | 'response_time' | 'consecutive_failures';
  threshold: number;
  timeWindowMinutes: number;
  errorTypes?: ErrorType[];
  endpoints?: string[];
}
```

#### Rule Evaluation:

The system periodically evaluates alert rules:

```typescript
async checkAlerts(): Promise<void> {
  for (const rule of this.alertRules) {
    if (!rule.enabled || this.isInCooldown(rule)) continue;
    
    const shouldTrigger = await this.evaluateRule(rule);
    if (shouldTrigger) {
      await this.triggerAlert(rule);
      rule.lastTriggered = new Date();
    }
  }
}
```

#### Alert Conditions:

1. **Error Rate Monitoring**:
```typescript
private async checkErrorRate(condition: AlertCondition, timeWindow: Date): Promise<boolean> {
  const totalRequests = await this.getTotalRequests(timeWindow);
  const errorRequests = await this.getErrorRequests(timeWindow);
  const errorRate = errorRequests / totalRequests;
  return errorRate >= condition.threshold;
}
```

2. **Consecutive Failure Detection**:
```typescript
private async checkConsecutiveFailures(condition: AlertCondition): Promise<boolean> {
  const recentLogs = await this.getRecentLogs(condition.threshold);
  return recentLogs.every(log => !log.success);
}
```

### 4. Database Schema

#### Error Logs Table:
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message TEXT NOT NULL,
  code TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT,
  request_id TEXT,
  stack_trace TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Indexes for Performance:
```sql
-- Time-based queries (most common)
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

-- Filtering by type and severity
CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);

-- User and endpoint analysis
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_endpoint ON error_logs(endpoint);

-- Composite index for common queries
CREATE INDEX idx_error_logs_severity_created_at ON error_logs(severity, created_at DESC);
```

#### Row Level Security:
```sql
-- Only admins can view error logs
CREATE POLICY "Admin can view all error logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email IN (
        SELECT jsonb_array_elements_text(value) 
        FROM app_settings 
        WHERE key = 'admin_emails'
      )
    )
  );
```

## 🔧 Integration Patterns

### 1. API Route Integration

#### Standard Pattern:
```typescript
// Before: Manual error handling
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // ... business logic
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// After: Centralized error handling
async function handleRequest(request: NextRequest, context: ApiContext) {
  const data = await request.json();
  
  if (!data.email) {
    throw createValidationError('Email is required');
  }
  
  // ... business logic
  return NextResponse.json({ success: true });
}

export const POST = withErrorHandling(handleRequest, '/api/example');
```

#### Advanced Pattern with Custom Context:
```typescript
async function handleComplexRequest(request: NextRequest, context: ApiContext) {
  // Extract additional context
  const authResult = await authenticateRequest(request);
  context.userId = authResult.userId;
  context.apiKeyId = authResult.apiKeyId;
  
  try {
    // Business logic that might fail
    const result = await complexOperation();
    
    // Manual logging for business events
    if (result.requiresAttention) {
      await errorHandler.logError({
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'External service returned warning',
        code: 'EXT_WARN_001',
        timestamp: new Date(),
        ...context,
        details: result.warnings
      });
    }
    
    return NextResponse.json({ success: true, data: result });
    
  } catch (error) {
    // Add business context before re-throwing
    if (error instanceof BusinessLogicError) {
      throw createValidationError(error.message, {
        businessRule: error.rule,
        violatedConstraint: error.constraint
      });
    }
    
    throw error; // Will be handled by wrapper
  }
}
```

### 2. Edge Function Integration

```typescript
import { withEdgeFunctionErrorHandling } from '@/lib/api-wrapper';

const handler = withEdgeFunctionErrorHandling(async (request: Request) => {
  // Your Edge Function logic
  const data = await request.json();
  
  if (!data.url) {
    throw new Error('validation: URL is required');
  }
  
  const result = await processUrl(data.url);
  
  return new Response(JSON.stringify({
    success: true,
    data: result
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Deploy to Supabase Edge Functions
Deno.serve(handler);
```

### 3. Client-Side Error Handling

```typescript
// React component error handling
import { useEffect, useState } from 'react';

function MyComponent() {
  const [error, setError] = useState<string | null>(null);
  
  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        // Handle standardized error response
        setError(result.error.message);
        
        // Log client-side context if needed
        console.error('API Error:', {
          type: result.error.type,
          code: result.error.code,
          requestId: result.error.requestId
        });
      }
      
    } catch (error) {
      setError('Network error occurred');
    }
  };
  
  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={handleApiCall}>Make API Call</button>
    </div>
  );
}
```

## 🎯 Performance Considerations

### 1. Database Optimization

#### Query Optimization:
```typescript
// Efficient error log queries with proper indexing
const getRecentErrors = async (timeWindow: string, limit: number = 100) => {
  const { data, error } = await supabase
    .from('error_logs')
    .select('id, type, severity, message, created_at, endpoint')
    .gte('created_at', getTimeFilter(timeWindow))
    .order('created_at', { ascending: false })
    .limit(limit);
    
  return data;
};
```

#### Batch Operations:
```typescript
// Batch insert for high-volume logging
const logMultipleErrors = async (errors: ErrorDetails[]) => {
  const { error } = await supabase
    .from('error_logs')
    .insert(errors);
    
  if (error) {
    console.error('Batch error logging failed:', error);
  }
};
```

### 2. Memory Management

#### Singleton Pattern Benefits:
- Single database connection pool
- Shared configuration cache
- Reduced memory footprint

#### Alert Rule Caching:
```typescript
class AlertingSystem {
  private ruleCache: Map<string, AlertRule> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  
  private async getCachedRules(): Promise<AlertRule[]> {
    if (this.shouldRefreshCache()) {
      await this.refreshRuleCache();
    }
    return Array.from(this.ruleCache.values());
  }
}
```

### 3. Async Processing

#### Non-blocking Error Logging:
```typescript
// Don't block request processing for error logging
const logErrorAsync = async (errorDetails: ErrorDetails) => {
  // Fire and forget - don't await
  setImmediate(async () => {
    try {
      await errorHandler.logError(errorDetails);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  });
};
```

#### Background Alert Processing:
```typescript
// Process alerts in background intervals
setInterval(async () => {
  try {
    await alertingSystem.checkAlerts();
  } catch (error) {
    console.error('Alert processing failed:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

## 🔒 Security Considerations

### 1. Data Sanitization

```typescript
// Sanitize sensitive data before logging
const sanitizeErrorDetails = (details: any): any => {
  if (!details) return details;
  
  const sanitized = { ...details };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Truncate long strings
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
      sanitized[key] = sanitized[key].substring(0, 1000) + '... [TRUNCATED]';
    }
  });
  
  return sanitized;
};
```

### 2. Access Control

#### Admin-only Access:
```typescript
// Verify admin access before error operations
const verifyAdminAccess = async (userId: string): Promise<boolean> => {
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();
    
  if (!user) return false;
  
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_emails')
    .single();
    
  const adminEmails = settings?.value || [];
  return adminEmails.includes(user.email);
};
```

### 3. Rate Limiting

```typescript
// Prevent error log spam
class ErrorRateLimiter {
  private errorCounts: Map<string, number> = new Map();
  private resetInterval: number = 60 * 1000; // 1 minute
  
  canLogError(errorKey: string, maxPerMinute: number = 10): boolean {
    const count = this.errorCounts.get(errorKey) || 0;
    
    if (count >= maxPerMinute) {
      return false;
    }
    
    this.errorCounts.set(errorKey, count + 1);
    
    // Reset counter after interval
    setTimeout(() => {
      this.errorCounts.delete(errorKey);
    }, this.resetInterval);
    
    return true;
  }
}
```

## 🧪 Testing Strategies

### 1. Unit Testing

```typescript
// Test error classification
describe('ErrorHandler', () => {
  it('should classify validation errors correctly', async () => {
    const error = createValidationError('Test validation error');
    const response = await errorHandler.handleError(error);
    
    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error.type).toBe('VALIDATION_ERROR');
  });
});
```

### 2. Integration Testing

```typescript
// Test full error handling flow
describe('API Error Handling', () => {
  it('should handle and log API errors', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    
    // Verify error was logged to database
    const { data: logs } = await supabase
      .from('error_logs')
      .select('*')
      .eq('endpoint', '/api/test')
      .order('created_at', { ascending: false })
      .limit(1);
      
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('VALIDATION_ERROR');
  });
});
```

### 3. Load Testing

```typescript
// Test error handling under load
const loadTestErrorHandling = async () => {
  const promises = Array.from({ length: 100 }, (_, i) => 
    fetch('/api/test-error', {
      method: 'POST',
      body: JSON.stringify({ testId: i })
    })
  );
  
  const responses = await Promise.all(promises);
  
  // Verify all errors were handled correctly
  responses.forEach(response => {
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
  
  // Verify database can handle the load
  const { count } = await supabase
    .from('error_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 60000).toISOString());
    
  expect(count).toBe(100);
};
```

## 📊 Monitoring and Observability

### 1. Metrics Collection

```typescript
// Custom metrics for error handling system
class ErrorMetrics {
  private metrics = {
    totalErrors: 0,
    errorsByType: new Map<string, number>(),
    errorsBySeverity: new Map<string, number>(),
    averageResponseTime: 0,
    alertsTriggered: 0
  };
  
  recordError(type: string, severity: string, responseTime: number) {
    this.metrics.totalErrors++;
    this.metrics.errorsByType.set(type, (this.metrics.errorsByType.get(type) || 0) + 1);
    this.metrics.errorsBySeverity.set(severity, (this.metrics.errorsBySeverity.get(severity) || 0) + 1);
    
    // Update average response time
    this.updateAverageResponseTime(responseTime);
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      errorsBySeverity: Object.fromEntries(this.metrics.errorsBySeverity)
    };
  }
}
```

### 2. Health Checks

```typescript
// System health monitoring
export const checkErrorSystemHealth = async (): Promise<HealthStatus> => {
  const checks = await Promise.allSettled([
    checkDatabaseConnection(),
    checkErrorLogTable(),
    checkAlertingSystem(),
    checkRecentErrorRate()
  ]);
  
  const results = checks.map((check, index) => ({
    name: ['database', 'error_logs', 'alerting', 'error_rate'][index],
    status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    details: check.status === 'fulfilled' ? check.value : check.reason
  }));
  
  const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy';
  
  return {
    status: overallHealth,
    checks: results,
    timestamp: new Date().toISOString()
  };
};
```

### 3. Performance Monitoring

```typescript
// Monitor error handling performance
class PerformanceMonitor {
  private responseTimeHistory: number[] = [];
  private maxHistorySize = 1000;
  
  recordResponseTime(time: number) {
    this.responseTimeHistory.push(time);
    
    if (this.responseTimeHistory.length > this.maxHistorySize) {
      this.responseTimeHistory.shift();
    }
    
    // Alert on consistently slow error handling
    if (this.getAverageResponseTime() > 1000) { // 1 second
      console.warn('Error handling is slow:', this.getAverageResponseTime(), 'ms');
    }
  }
  
  getAverageResponseTime(): number {
    if (this.responseTimeHistory.length === 0) return 0;
    
    const sum = this.responseTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.responseTimeHistory.length;
  }
}
```

## 🚀 Deployment Considerations

### 1. Environment Configuration

```typescript
// Environment-specific error handling
const getErrorHandlerConfig = () => {
  const env = process.env.NODE_ENV;
  
  return {
    logLevel: env === 'production' ? 'error' : 'debug',
    enableStackTraces: env !== 'production',
    alertCooldown: env === 'production' ? 30 : 5, // minutes
    maxLogRetention: env === 'production' ? 90 : 7, // days
    enableExternalNotifications: env === 'production'
  };
};
```

### 2. Database Migrations

```sql
-- Migration for error handling tables
-- Run this during deployment

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS error_logs (
  -- table definition
);

-- Add indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_created_at 
ON error_logs(created_at DESC);

-- Update RLS policies
DROP POLICY IF EXISTS "Admin can view all error logs" ON error_logs;
CREATE POLICY "Admin can view all error logs" ON error_logs
  FOR SELECT USING (
    -- policy definition
  );
```

### 3. Monitoring Setup

```typescript
// Post-deployment verification
const verifyErrorHandlingDeployment = async () => {
  const checks = [
    'Database tables exist',
    'Indexes are created',
    'RLS policies are active',
    'Error handler is initialized',
    'Alerting system is running',
    'Admin access is configured'
  ];
  
  for (const check of checks) {
    try {
      await performCheck(check);
      console.log(`✅ ${check}`);
    } catch (error) {
      console.error(`❌ ${check}:`, error);
    }
  }
};
```

This technical implementation guide provides the foundation for understanding, maintaining, and extending the comprehensive error handling and logging system.