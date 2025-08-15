import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, updateUsageQuota } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { usageLogOps } from '@/lib/database-operations'
import { ErrorType } from '@/types'
import { 
  parseCompatibleRequest, 
  formatCompatibleResponse, 
  formatCompatibleError,
  isValidTikTokUrl,
  createMockSignatureResult,
  detectRequestFormat
} from '@/lib/compatibility-middleware'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let authContext: any = null
  let compatContext: any = null

  try {
    // Parse request using compatibility middleware
    compatContext = await parseCompatibleRequest(request)
    const { roomUrl, format } = compatContext

    // Validate TikTok URL format
    if (!isValidTikTokUrl(roomUrl)) {
      const responseTime = Date.now() - startTime
      const errorResponse = formatCompatibleError(
        'Invalid TikTok URL format',
        'URL must be a valid TikTok live stream URL',
        format,
        responseTime
      )
      
      return NextResponse.json(errorResponse, { status: 400 })
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

      const errorResponse = formatCompatibleError(
        'Authentication failed',
        authResult.error?.message || 'Invalid or missing authentication',
        format,
        responseTime
      )

      return NextResponse.json(errorResponse, { status: 401 })
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

      const errorResponse = formatCompatibleError(
        'Rate limit exceeded',
        rateLimitResult.error?.message || 'Too many requests',
        format,
        responseTime
      )

      return NextResponse.json(errorResponse, { status: 429 })
    }

    // Generate signature using mock implementation
    // TODO: Replace with actual SignatureGenerator integration in later tasks
    const responseTime = Date.now() - startTime
    const signatureResult = createMockSignatureResult(roomUrl, responseTime)
    
    // Log successful request
    await usageLogOps.logRequest({
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey?.id,
      roomUrl,
      success: signatureResult.success,
      responseTimeMs: responseTime
    })

    // Update usage quota for all users (tracking purposes)
    await updateUsageQuota(authContext.user.id, supabase)

    // Format response according to detected format
    const response = formatCompatibleResponse(
      { ...signatureResult.data, roomUrl },
      format,
      responseTime
    )

    // Add additional metadata for modern format
    if (format === 'modern') {
      const modernResponse = {
        ...response,
        user: {
          id: authContext.user.id,
          tier: authContext.user.tier
        },
        authMethod: authContext.authMethod,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
          limits: rateLimitResult.limits
        }
      }
      return NextResponse.json(modernResponse)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Signature generation error:', error)
    const responseTime = Date.now() - startTime
    const format = compatContext?.format || detectRequestFormat(request)
    const roomUrl = compatContext?.roomUrl || ''
    
    // Log error
    await usageLogOps.logRequest({
      userId: authContext?.user?.id,
      apiKeyId: authContext?.apiKey?.id,
      roomUrl,
      success: false,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })

    const errorResponse = formatCompatibleError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error occurred',
      format,
      responseTime
    )

    return NextResponse.json(errorResponse, { status: 500 })
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