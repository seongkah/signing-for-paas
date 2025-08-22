import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, updateUsageQuota } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { usageLogOps } from '@/lib/database-operations'
import { withErrorHandling, ApiContext } from '@/lib/api-wrapper'
import { createValidationError, createAuthenticationError, createRateLimitError, createSignatureError } from '@/lib/error-handler'
import { 
  parseCompatibleRequest, 
  formatCompatibleResponse, 
  formatCompatibleError,
  isValidTikTokUrl,
  createMockSignatureResult,
  detectRequestFormat
} from '@/lib/compatibility-middleware'
import {
  extractIPAddress,
  checkIPRateLimit,
  checkIPBurstLimit,
  incrementIPUsage,
  logIPRequest,
  createUpgradePrompt,
  isValidIPAddress
} from '@/lib/ip-rate-limiting'

async function handleSignatureGeneration(request: NextRequest, context: ApiContext) {
  const startTime = Date.now()
  let authContext: any = null
  let compatContext: any = null
  let userIP: string = 'unknown'

  try {
    // Parse request using compatibility middleware
    compatContext = await parseCompatibleRequest(request)
    const { roomUrl, format } = compatContext

    // Update context with request details
    context.endpoint = `POST /api/signature (${format})`;

    // Validate TikTok URL format
    if (!isValidTikTokUrl(roomUrl)) {
      throw createValidationError('Invalid TikTok URL format', { roomUrl, format });
    }

    // Extract user IP address for rate limiting
    userIP = extractIPAddress(request)

    // Authenticate request (optional - determines tier)
    console.log('🔍 SIGNATURE: Testing authentication for API key')
    const authResult = await authenticateRequest(request)
    console.log('🔍 SIGNATURE: Auth result:', authResult.success, authResult.error?.message)
    
    if (authResult.success && authResult.context) {
      // TIER 2: API KEY USER (Unlimited)
      console.log('🔍 SIGNATURE: Using authenticated context - tier:', authResult.context.user?.tier)
      authContext = authResult.context
      context.userId = authContext.user.id;
      context.apiKeyId = authContext.apiKey?.id;

      const supabase = createServerSupabaseClient()

      // Check rate limits for authenticated users (should be unlimited)
      const rateLimitResult = await checkRateLimit(authContext, supabase)
      
      if (!rateLimitResult.allowed) {
        // Log rate limited request
        await usageLogOps.logRequest({
          userId: authContext.user.id,
          apiKeyId: authContext.apiKey?.id,
          roomUrl,
          success: false,
          responseTimeMs: Date.now() - startTime,
          errorMessage: rateLimitResult.error?.message || 'Rate limit exceeded'
        })

        throw createRateLimitError(rateLimitResult.error?.message || 'Too many requests');
      }
    } else {
      // TIER 1: ANONYMOUS USER (IP-based limits)
      
      // Check IP-based daily rate limit
      const ipRateLimitResult = await checkIPRateLimit(userIP)
      
      if (!ipRateLimitResult.allowed) {
        // Log rate limited IP request
        await logIPRequest({
          ipAddress: userIP,
          roomUrl,
          success: false,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Daily IP rate limit exceeded'
        })

        // Return upgrade prompt response
        const upgradeResponse = createUpgradePrompt(ipRateLimitResult)
        return NextResponse.json(upgradeResponse, { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': ipRateLimitResult.dailyLimit.toString(),
            'X-RateLimit-Remaining': ipRateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.floor(ipRateLimitResult.resetTime.getTime() / 1000).toString(),
            'X-RateLimit-Tier': 'free'
          }
        })
      }

      // Check IP-based burst rate limit (requests per minute)
      const burstLimitResult = await checkIPBurstLimit(userIP)
      
      if (!burstLimitResult.allowed) {
        // Log burst limited request
        await logIPRequest({
          ipAddress: userIP,
          roomUrl,
          success: false,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Burst rate limit exceeded'
        })

        return NextResponse.json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests per minute. Please slow down.',
          tier: 'free',
          rateLimit: {
            burst: {
              remaining: burstLimitResult.remaining,
              resetTime: burstLimitResult.resetTime.toISOString()
            }
          },
          upgrade: {
            message: 'API key users get 100 requests/minute vs 5 for free tier',
            action: 'Get unlimited access at https://signing-for-paas.vercel.app/dashboard'
          }
        }, { 
          status: 429,
          headers: {
            'X-RateLimit-Burst-Remaining': burstLimitResult.remaining.toString(),
            'X-RateLimit-Burst-Reset': Math.floor(burstLimitResult.resetTime.getTime() / 1000).toString()
          }
        })
      }
    }

    // Generate signature using mock implementation
    // TODO: Replace with actual SignatureGenerator integration in later tasks
    const responseTime = Date.now() - startTime
    const signatureResult = createMockSignatureResult(roomUrl, responseTime)
    
    if (!signatureResult.success) {
      throw createSignatureError('Failed to generate signature', { roomUrl, details: signatureResult });
    }

    // Log successful request based on tier
    if (authContext) {
      // TIER 2: API KEY USER - Log to user logs
      await usageLogOps.logRequest({
        userId: authContext.user.id,
        apiKeyId: authContext.apiKey?.id,
        roomUrl,
        success: signatureResult.success,
        responseTimeMs: responseTime
      })

      // Update user usage quota
      const supabase = createServerSupabaseClient()
      await updateUsageQuota(authContext.user.id, supabase)
    } else {
      // TIER 1: ANONYMOUS USER - Log to IP logs and increment usage
      await logIPRequest({
        ipAddress: userIP,
        roomUrl,
        success: signatureResult.success,
        responseTimeMs: responseTime
      })

      // Increment IP usage count
      await incrementIPUsage(userIP)
    }

    // Format response according to detected format
    const response = formatCompatibleResponse(
      { ...signatureResult.data, roomUrl },
      format,
      responseTime
    )

    // Prepare response headers with rate limit information
    const responseHeaders: Record<string, string> = {}
    
    if (authContext) {
      // TIER 2: API KEY USER
      responseHeaders['X-RateLimit-Tier'] = 'unlimited'
      responseHeaders['X-RateLimit-Limit'] = 'unlimited'
      responseHeaders['X-RateLimit-Remaining'] = 'unlimited'
    } else {
      // TIER 1: ANONYMOUS USER - Add current rate limit status
      const currentLimitStatus = await checkIPRateLimit(userIP)
      responseHeaders['X-RateLimit-Tier'] = 'free'
      responseHeaders['X-RateLimit-Limit'] = currentLimitStatus.dailyLimit.toString()
      responseHeaders['X-RateLimit-Remaining'] = currentLimitStatus.remaining.toString()
      responseHeaders['X-RateLimit-Reset'] = Math.floor(currentLimitStatus.resetTime.getTime() / 1000).toString()
    }

    // Add additional metadata for modern format
    if (format === 'modern') {
      const modernResponse = {
        ...response,
        ...(authContext && {
          user: {
            id: authContext.user.id,
            tier: authContext.user.tier
          },
          authMethod: authContext.authMethod
        }),
        tier: authContext?.user?.tier || 'free',
        rateLimit: authContext ? {
          tier: 'unlimited',
          remaining: 'unlimited'
        } : {
          tier: 'free',
          daily: {
            remaining: parseInt(responseHeaders['X-RateLimit-Remaining']),
            limit: parseInt(responseHeaders['X-RateLimit-Limit']),
            resetTime: new Date(parseInt(responseHeaders['X-RateLimit-Reset']) * 1000).toISOString()
          }
        }
      }
      return NextResponse.json(modernResponse, { headers: responseHeaders })
    }

    return NextResponse.json(response, { headers: responseHeaders })

  } catch (error) {
    const responseTime = Date.now() - startTime
    const format = compatContext?.format || detectRequestFormat(request)
    const roomUrl = compatContext?.roomUrl || ''
    
    // Log error based on tier
    try {
      if (authContext) {
        // TIER 2: API KEY USER
        await usageLogOps.logRequest({
          userId: authContext.user.id,
          apiKeyId: authContext.apiKey?.id,
          roomUrl,
          success: false,
          responseTimeMs: responseTime,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
      } else {
        // TIER 1: ANONYMOUS USER
        await logIPRequest({
          ipAddress: userIP,
          roomUrl,
          success: false,
          responseTimeMs: responseTime,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } catch (logError) {
      console.error('Failed to log error usage:', logError);
    }

    // For compatibility, we need to handle errors in the expected format
    // But still let the error handler process it for logging
    if (format && format !== 'modern') {
      const errorResponse = formatCompatibleError(
        'Signature generation failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
        format,
        responseTime
      )
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Re-throw for centralized error handling
    throw error;
  }
}

export const POST = withErrorHandling(handleSignatureGeneration, '/api/signature');

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