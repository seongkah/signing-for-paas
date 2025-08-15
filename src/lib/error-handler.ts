import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Error types and severity levels
export enum ErrorType {
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

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  code: string;
  timestamp: Date;
  userId?: string;
  apiKeyId?: string;
  endpoint?: string;
  requestId?: string;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code: string;
    timestamp: string;
    requestId?: string;
  };
}

// Centralized error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private supabase: any;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Log error to database and console
  async logError(errorDetails: ErrorDetails): Promise<void> {
    try {
      // Log to console with structured format
      console.error(`[${errorDetails.severity}] ${errorDetails.type}:`, {
        message: errorDetails.message,
        code: errorDetails.code,
        timestamp: errorDetails.timestamp,
        endpoint: errorDetails.endpoint,
        userId: errorDetails.userId,
        details: errorDetails.details
      });

      // Log to database
      const { error } = await this.supabase
        .from('error_logs')
        .insert({
          type: errorDetails.type,
          severity: errorDetails.severity,
          message: errorDetails.message,
          code: errorDetails.code,
          details: errorDetails.details,
          user_id: errorDetails.userId,
          api_key_id: errorDetails.apiKeyId,
          endpoint: errorDetails.endpoint,
          request_id: errorDetails.requestId,
          stack_trace: errorDetails.stackTrace,
          user_agent: errorDetails.userAgent,
          ip_address: errorDetails.ipAddress,
          created_at: errorDetails.timestamp
        });

      if (error) {
        console.error('Failed to log error to database:', error);
      }

      // Check if this is a critical error that needs alerting
      if (errorDetails.severity === ErrorSeverity.CRITICAL) {
        await this.triggerAlert(errorDetails);
      }

    } catch (logError) {
      console.error('Error in error logging system:', logError);
    }
  }

  // Create standardized error response
  createErrorResponse(
    type: ErrorType,
    message: string,
    code: string,
    statusCode: number = 500,
    requestId?: string
  ): NextResponse {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        type,
        message,
        code,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }

  // Handle different types of errors with appropriate responses
  async handleError(
    error: any,
    context: {
      endpoint?: string;
      userId?: string;
      apiKeyId?: string;
      requestId?: string;
      userAgent?: string;
      ipAddress?: string;
    } = {}
  ): Promise<NextResponse> {
    let errorDetails: ErrorDetails;
    let statusCode = 500;

    // Determine error type and create appropriate response
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      errorDetails = {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: error.message || 'Validation failed',
        code: 'VALIDATION_001',
        timestamp: new Date(),
        ...context
      };
      statusCode = 400;
    } else if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      errorDetails = {
        type: ErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Authentication failed',
        code: 'AUTH_001',
        timestamp: new Date(),
        ...context
      };
      statusCode = 401;
    } else if (error.message?.includes('forbidden') || error.message?.includes('permission')) {
      errorDetails = {
        type: ErrorType.AUTHORIZATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Access denied',
        code: 'AUTH_002',
        timestamp: new Date(),
        ...context
      };
      statusCode = 403;
    } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      errorDetails = {
        type: ErrorType.RATE_LIMIT_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Rate limit exceeded',
        code: 'RATE_001',
        timestamp: new Date(),
        ...context
      };
      statusCode = 429;
    } else if (error.message?.includes('signature') || error.message?.includes('signing')) {
      errorDetails = {
        type: ErrorType.SIGNATURE_GENERATION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Signature generation failed',
        code: 'SIG_001',
        timestamp: new Date(),
        details: error.details,
        ...context
      };
      statusCode = 500;
    } else if (error.message?.includes('database') || error.code?.startsWith('23')) {
      errorDetails = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Database operation failed',
        code: 'DB_001',
        timestamp: new Date(),
        details: error.details,
        ...context
      };
      statusCode = 500;
    } else {
      errorDetails = {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        severity: ErrorSeverity.CRITICAL,
        message: 'Internal server error',
        code: 'INT_001',
        timestamp: new Date(),
        details: error.message,
        stackTrace: error.stack,
        ...context
      };
      statusCode = 500;
    }

    // Log the error
    await this.logError(errorDetails);

    // Return appropriate response
    return this.createErrorResponse(
      errorDetails.type,
      errorDetails.message,
      errorDetails.code,
      statusCode,
      context.requestId
    );
  }

  // Trigger alert for critical errors
  private async triggerAlert(errorDetails: ErrorDetails): Promise<void> {
    try {
      // Log critical alert
      console.error('🚨 CRITICAL ERROR ALERT:', {
        type: errorDetails.type,
        message: errorDetails.message,
        endpoint: errorDetails.endpoint,
        timestamp: errorDetails.timestamp
      });

      // Store alert in database
      await this.supabase
        .from('error_alerts')
        .insert({
          error_type: errorDetails.type,
          severity: errorDetails.severity,
          message: errorDetails.message,
          endpoint: errorDetails.endpoint,
          user_id: errorDetails.userId,
          created_at: errorDetails.timestamp,
          acknowledged: false
        });

      // In a production environment, you would integrate with:
      // - Email notifications
      // - Slack/Discord webhooks
      // - SMS alerts
      // - PagerDuty or similar services

    } catch (alertError) {
      console.error('Failed to trigger alert:', alertError);
    }
  }

  // Get error statistics for monitoring
  async getErrorStats(timeRange: string = '24h'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const { data, error } = await this.supabase
        .from('error_logs')
        .select('type, severity, created_at')
        .gte('created_at', timeFilter);

      if (error) throw error;

      // Process statistics
      const stats = {
        total: data.length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byHour: {} as Record<number, number>
      };

      data.forEach((log: any) => {
        // Count by type
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
        
        // Count by severity
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
        
        // Count by hour
        const hour = new Date(log.created_at).getHours();
        stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return null;
    }
  }

  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }
}

// Utility functions for common error scenarios
export const createValidationError = (message: string, details?: any) => {
  return {
    name: 'ValidationError',
    message,
    details
  };
};

export const createAuthenticationError = (message: string = 'Authentication required') => {
  return {
    message: `authentication: ${message}`
  };
};

export const createAuthorizationError = (message: string = 'Access denied') => {
  return {
    message: `forbidden: ${message}`
  };
};

export const createRateLimitError = (message: string = 'Rate limit exceeded') => {
  return {
    message: `rate limit: ${message}`
  };
};

export const createSignatureError = (message: string, details?: any) => {
  return {
    message: `signature: ${message}`,
    details
  };
};

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();