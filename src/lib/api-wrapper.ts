import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from './error-handler';
import { v4 as uuidv4 } from 'uuid';

export interface ApiContext {
  userId?: string;
  apiKeyId?: string;
  requestId: string;
  endpoint: string;
  userAgent?: string;
  ipAddress?: string;
}

export type ApiHandler = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse>;

// Wrapper function to handle errors and logging for API endpoints
export function withErrorHandling(
  handler: ApiHandler,
  endpoint: string
) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    // Extract context information
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const context: ApiContext = {
      requestId,
      endpoint,
      userAgent,
      ipAddress
    };

    try {
      // Log request start
      console.log(`[${requestId}] ${request.method} ${endpoint} - Start`, {
        userAgent,
        ipAddress,
        timestamp: new Date().toISOString()
      });

      // Execute the handler
      const response = await handler(request, context);
      
      // Log successful response
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ${request.method} ${endpoint} - Success (${duration}ms)`, {
        status: response.status,
        duration
      });

      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);
      
      return response;

    } catch (error) {
      // Log error and return standardized error response
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ${request.method} ${endpoint} - Error (${duration}ms):`, error);

      // Handle the error using centralized error handler
      const errorResponse = await errorHandler.handleError(error, {
        ...context,
        endpoint: `${request.method} ${endpoint}`
      });

      // Add request ID to error response headers
      errorResponse.headers.set('x-request-id', requestId);
      
      return errorResponse;
    }
  };
}

// Wrapper for Edge Functions (Supabase)
export function withEdgeFunctionErrorHandling(
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    try {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response('ok', { 
          headers: {
            ...corsHeaders,
            'x-request-id': requestId
          }
        });
      }

      // Extract context
      const userAgent = request.headers.get('user-agent') || undefined;
      const endpoint = new URL(request.url).pathname;

      console.log(`[${requestId}] ${request.method} ${endpoint} - Edge Function Start`, {
        userAgent,
        timestamp: new Date().toISOString()
      });

      // Execute handler
      const response = await handler(request);
      
      // Log success
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ${request.method} ${endpoint} - Edge Function Success (${duration}ms)`);

      // Add CORS and request ID headers
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
      headers.set('x-request-id', requestId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] Edge Function Error (${duration}ms):`, error);

      // Create error response
      const errorResponse = {
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Edge function error',
          code: 'EDGE_001',
          timestamp: new Date().toISOString(),
          requestId
        }
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-request-id': requestId
        }
      });
    }
  };
}

// Utility to extract user context from request
export async function extractUserContext(request: NextRequest): Promise<{
  userId?: string;
  apiKeyId?: string;
}> {
  try {
    // Try to get user from authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // This would integrate with your auth system
      // For now, return empty context
      return {};
    }

    // Try to get API key from headers
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      // This would validate the API key and return the associated user/key ID
      // For now, return empty context
      return {};
    }

    return {};
  } catch (error) {
    console.error('Error extracting user context:', error);
    return {};
  }
}

// Performance monitoring wrapper
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      console.log(`[${requestId}] ${operationName} - Start`);
      
      const result = await fn(...args);
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ${operationName} - Success (${duration}ms)`);
      
      // Log performance metrics if duration is concerning
      if (duration > 5000) { // 5 seconds
        console.warn(`[${requestId}] ${operationName} - Slow operation detected (${duration}ms)`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ${operationName} - Error (${duration}ms):`, error);
      throw error;
    }
  }) as T;
}