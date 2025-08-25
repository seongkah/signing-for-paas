import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, updateUsageQuota } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { usageLogOps } from '@/lib/database-operations'
import { ErrorType } from '@/types'
import { logSignatureRequest } from '@/lib/signature-logging'
import {
  extractIPAddress,
  checkIPRateLimit,
  checkIPBurstLimit,
  incrementIPUsage,
  logIPRequest,
  createUpgradePrompt
} from '@/lib/ip-rate-limiting'

/**
 * EulerStream-compatible API endpoint
 * This endpoint provides the same interface that TikTok Live Connector expects from EulerStream
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let authContext: any = null
  let roomUrl = ''
  let userIP = 'unknown'

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

    // Extract user IP address for rate limiting
    userIP = extractIPAddress(request)

    // Authenticate request (optional - determines tier)
    const authResult = await authenticateRequest(request)
    
    if (authResult.success && authResult.context) {
      // TIER 2: API KEY USER (Unlimited)
      authContext = authResult.context
      const supabase = createServerSupabaseClient()

      // Check rate limits for authenticated users (should be unlimited)
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
    } else {
      // TIER 1: ANONYMOUS USER (IP-based limits)
      
      // Check IP-based daily rate limit
      const ipRateLimitResult = await checkIPRateLimit(userIP)
      
      if (!ipRateLimitResult.allowed) {
        await logIPRequest({
          ipAddress: userIP,
          roomUrl,
          success: false,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Daily IP rate limit exceeded'
        })

        // Return EulerStream-compatible rate limit response
        return NextResponse.json({
          success: false,
          error: 'Daily rate limit exceeded',
          message: `You've reached your free tier limit of ${ipRateLimitResult.dailyLimit} requests per day`,
          resetTime: ipRateLimitResult.resetTime.toISOString(),
          upgrade: {
            message: 'Get unlimited access with an API key',
            action: 'Visit https://signing-for-paas.vercel.app/dashboard'
          }
        }, { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': ipRateLimitResult.dailyLimit.toString(),
            'X-RateLimit-Remaining': ipRateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.floor(ipRateLimitResult.resetTime.getTime() / 1000).toString(),
            'X-RateLimit-Tier': 'free'
          }
        })
      }

      // Check burst rate limit
      const burstLimitResult = await checkIPBurstLimit(userIP)
      
      if (!burstLimitResult.allowed) {
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
          resetTime: burstLimitResult.resetTime.toISOString()
        }, { status: 429 })
      }
    }

    // VERCEL-COMPATIBLE SIGNATURE GENERATION
    // Use VercelSignatureGenerator for serverless deployment compatibility
    const VercelSignatureGenerator = require('../../../VercelSignatureGenerator');
    const sigGenerator = new VercelSignatureGenerator('INFO');
    
    const signatureResult = sigGenerator.generateSignature(roomUrl);
    const responseTime = Date.now() - startTime
    
    // Check if signature generation succeeded
    if (!signatureResult.success) {
      // Log failed signature generation
      if (authContext) {
        await usageLogOps.logRequest({
          userId: authContext.user.id,
          apiKeyId: authContext.apiKey?.id,
          roomUrl,
          success: false,
          responseTimeMs: responseTime,
          errorMessage: signatureResult.error + ': ' + signatureResult.details
        })
      } else {
        await logIPRequest({
          ipAddress: userIP,
          roomUrl,
          success: false,
          responseTimeMs: responseTime,
          errorMessage: signatureResult.error + ': ' + signatureResult.details
        })
      }

      // Log to signature_logs table
      await logSignatureRequest({
        request,
        endpoint: '/api/eulerstream',
        roomUrl,
        requestFormat: 'eulerstream',
        authContext,
        success: false,
        responseTimeMs: responseTime,
        errorType: 'SIGNATURE_GENERATION_FAILED',
        errorMessage: signatureResult.error + ': ' + signatureResult.details
      })

      return NextResponse.json({
        success: false,
        error: 'Signature generation failed',
        message: signatureResult.error,
        details: signatureResult.details
      }, { status: 500 })
    }
    
    // Log request based on tier
    if (authContext) {
      // TIER 2: API KEY USER
      await usageLogOps.logRequest({
        userId: authContext.user.id,
        apiKeyId: authContext.apiKey?.id,
        roomUrl,
        success: true,
        responseTimeMs: responseTime
      })

      // Update usage quota
      const supabase = createServerSupabaseClient()
      await updateUsageQuota(authContext.user.id, supabase)
    } else {
      // TIER 1: ANONYMOUS USER
      await logIPRequest({
        ipAddress: userIP,
        roomUrl,
        success: true,
        responseTimeMs: responseTime
      })

      // Increment IP usage count
      await incrementIPUsage(userIP)
    }

    // Extract real signature data
    const realSignatureData = signatureResult.data;
    
    // COMPREHENSIVE LOGGING: Log to signature_logs table for all requests
    await logSignatureRequest({
      request,
      endpoint: '/api/eulerstream',
      roomUrl,
      requestFormat: 'eulerstream',
      authContext,
      success: true,
      responseTimeMs: responseTime,
      signatureType: 'real', // Updated: Now using REAL signature generation
      signatureLength: realSignatureData?.signature?.length || 0
    })

    // EulerStream-compatible response format with REAL signature data
    return NextResponse.json({
      success: true,
      data: {
        signature: realSignatureData.signature || 'signature_not_generated',
        signed_url: realSignatureData.signed_url || `${roomUrl}?signature=${realSignatureData.signature || ''}`,
        'X-Bogus': realSignatureData['X-Bogus'] || realSignatureData.xBogus || 'x_bogus_not_generated',
        'x-tt-params': realSignatureData['x-tt-params'] || realSignatureData.xTtParams || 'params_not_generated',
        navigator: realSignatureData.navigator || {
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
    
    // Log error based on tier
    if (authContext) {
      await usageLogOps.logRequest({
        userId: authContext.user.id,
        apiKeyId: authContext.apiKey?.id,
        roomUrl,
        success: false,
        responseTimeMs: responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    } else {
      await logIPRequest({
        ipAddress: userIP,
        roomUrl,
        success: false,
        responseTimeMs: responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // COMPREHENSIVE ERROR LOGGING: Log failed requests to signature_logs table
    try {
      await logSignatureRequest({
        request,
        endpoint: '/api/eulerstream',
        roomUrl,
        requestFormat: 'eulerstream',
        authContext,
        success: false,
        responseTimeMs: responseTime,
        errorType: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } catch (logError) {
      console.error('Failed to log error to signature_logs:', logError);
    }

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