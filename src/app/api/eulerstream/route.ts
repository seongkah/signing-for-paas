import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, updateUsageQuota } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { usageLogOps } from '@/lib/database-operations'
import { ErrorType } from '@/types'

/**
 * EulerStream-compatible API endpoint
 * This endpoint provides the same interface that TikTok Live Connector expects from EulerStream
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let authContext: any = null
  let roomUrl = ''

  try {
    // Parse request body - EulerStream expects JSON with specific format
    const body = await request.json()
    
    // EulerStream typically expects 'url' or 'roomUrl' field
    roomUrl = body.url || body.roomUrl || body.room_url

    if (!roomUrl || typeof roomUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid URL parameter',
          message: 'Request must include a valid TikTok URL in the "url" field'
        },
        { status: 400 }
      )
    }

    // Authenticate request (optional for EulerStream compatibility)
    // Some users might call this endpoint without authentication for testing
    const authResult = await authenticateRequest(request)
    
    if (authResult.success && authResult.context) {
      authContext = authResult.context
      const supabase = createServerSupabaseClient()

      // Check rate limits for authenticated users
      const rateLimitResult = await checkRateLimit(authContext, supabase)
      
      if (!rateLimitResult.allowed) {
        const responseTime = Date.now() - startTime
        
        await usageLogOps.logRequest({
          userId: authContext.user.id,
          apiKeyId: authContext.apiKey?.id,
          roomUrl,
          success: false,
          responseTimeMs: responseTime,
          errorMessage: rateLimitResult.error?.message || 'Rate limit exceeded'
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: rateLimitResult.error?.message || 'Too many requests',
            rateLimit: {
              remaining: rateLimitResult.remaining || 0,
              resetTime: rateLimitResult.resetTime
            }
          },
          { status: 429 }
        )
      }
    }

    // TODO: Implement actual signature generation logic
    // For now, return EulerStream-compatible response format
    const responseTime = Date.now() - startTime
    
    // Log request
    await usageLogOps.logRequest({
      userId: authContext?.user?.id,
      apiKeyId: authContext?.apiKey?.id,
      roomUrl,
      success: true,
      responseTimeMs: responseTime
    })

    // Update usage quota if authenticated
    if (authContext) {
      const supabase = createServerSupabaseClient()
      await updateUsageQuota(authContext.user.id, supabase)
    }

    // EulerStream-compatible response format
    return NextResponse.json({
      success: true,
      data: {
        signature: 'placeholder_signature',
        signed_url: `${roomUrl}?signature=placeholder`,
        'X-Bogus': 'placeholder_x_bogus',
        'x-tt-params': 'placeholder_params',
        navigator: {
          deviceScaleFactor: 1,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          browser_language: 'en-US',
          browser_platform: 'Win32',
          browser_name: 'Chrome',
          browser_version: '120.0.0.0'
        }
      },
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    })

  } catch (error) {
    console.error('EulerStream compatibility endpoint error:', error)
    const responseTime = Date.now() - startTime
    
    await usageLogOps.logRequest({
      userId: authContext?.user?.id,
      apiKeyId: authContext?.apiKey?.id,
      roomUrl,
      success: false,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to generate signature'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'EulerStream Compatibility Layer',
    version: '1.0.0',
    description: 'Drop-in replacement for EulerStream in TikTok Live Connector',
    endpoints: {
      signature: 'POST /api/eulerstream',
      health: 'GET /api/health'
    },
    usage: {
      example: {
        method: 'POST',
        url: '/api/eulerstream',
        body: {
          url: 'https://www.tiktok.com/@username/live'
        }
      }
    }
  })
}