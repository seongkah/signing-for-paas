import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, updateUsageQuota } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { usageLogOps } from '@/lib/database-operations'
import { ErrorType } from '@/types'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let authContext: any = null
  let roomUrl = ''

  try {
    // Parse request body
    const body = await request.json()
    roomUrl = body.roomUrl

    if (!roomUrl || typeof roomUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'roomUrl is required and must be a string',
            code: 'MISSING_ROOM_URL',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if (!authResult.success || !authResult.context) {
      const responseTime = Date.now() - startTime
      
      // Log failed request
      await usageLogOps.logRequest({
        roomUrl,
        success: false,
        responseTimeMs: responseTime,
        errorMessage: authResult.error?.message || 'Authentication failed'
      })

      return NextResponse.json(
        {
          success: false,
          error: authResult.error
        },
        { status: 401 }
      )
    }

    authContext = authResult.context
    const supabase = createServerSupabaseClient()

    // Check rate limits for all users (different limits for different tiers)
    const rateLimitResult = await checkRateLimit(authContext, supabase)
    
    if (!rateLimitResult.allowed) {
      const responseTime = Date.now() - startTime
      
      // Log rate limited request
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
          error: rateLimitResult.error,
          rateLimit: {
            remaining: rateLimitResult.remaining || 0,
            resetTime: rateLimitResult.resetTime,
            limits: rateLimitResult.limits
          }
        },
        { status: 429 }
      )
    }

    // TODO: Implement actual signature generation logic in later tasks
    // For now, return a placeholder response
    const responseTime = Date.now() - startTime
    
    // Log successful request
    await usageLogOps.logRequest({
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey?.id,
      roomUrl,
      success: true,
      responseTimeMs: responseTime
    })

    // Update usage quota for all users (tracking purposes)
    await updateUsageQuota(authContext.user.id, supabase)

    return NextResponse.json({
      success: true,
      message: 'Signature generation endpoint - implementation pending',
      data: {
        roomUrl,
        timestamp: new Date().toISOString(),
        user: {
          id: authContext.user.id,
          tier: authContext.user.tier
        },
        authMethod: authContext.authMethod
      },
      responseTimeMs: responseTime,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        limits: rateLimitResult.limits
      }
    })

  } catch (error) {
    console.error('Signature generation error:', error)
    const responseTime = Date.now() - startTime
    
    // Log error
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
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error during signature generation',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'TikTok Signature Generation API',
    endpoints: {
      signature: 'POST /api/signature',
      health: 'GET /api/health'
    }
  })
}