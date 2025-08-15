import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, updateUsageQuota } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { usageLogOps } from '@/lib/database-operations'
import { ErrorType } from '@/types'

/**
 * Legacy compatibility endpoint for TikTok Live Connector
 * Supports both JSON and plain text requests for maximum compatibility
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let authContext: any = null
  let roomUrl = ''

  try {
    const contentType = request.headers.get('content-type') || ''
    
    // Handle both JSON and plain text requests
    if (contentType.includes('application/json')) {
      const body = await request.json()
      roomUrl = body.url || body.roomUrl || body.room_url
    } else if (contentType.includes('text/plain')) {
      // Handle plain text requests (like the original local server)
      roomUrl = await request.text()
    } else {
      // Try to parse as JSON by default
      try {
        const body = await request.json()
        roomUrl = body.url || body.roomUrl || body.room_url
      } catch {
        // If JSON parsing fails, try as text
        roomUrl = await request.text()
      }
    }

    if (!roomUrl || typeof roomUrl !== 'string' || roomUrl.trim() === '') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid request body',
          details: 'Request must contain a valid TikTok URL'
        },
        { status: 400 }
      )
    }

    roomUrl = roomUrl.trim()

    // Validate TikTok URL format
    if (!isValidTikTokUrl(roomUrl)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid TikTok URL format',
          details: 'URL must be a valid TikTok live stream URL'
        },
        { status: 400 }
      )
    }

    // Optional authentication for compatibility
    const authResult = await authenticateRequest(request)
    
    if (authResult.success && authResult.context) {
      authContext = authResult.context
      const supabase = createServerSupabaseClient()

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
            status: 'error',
            error: 'Rate limit exceeded',
            details: rateLimitResult.error?.message || 'Too many requests'
          },
          { status: 429 }
        )
      }
    }

    // TODO: Implement actual signature generation logic
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

    // Return format compatible with original local server
    return NextResponse.json({
      status: 'ok',
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
      response_time_ms: responseTime
    })

  } catch (error) {
    console.error('Legacy sign endpoint error:', error)
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
        status: 'error',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Legacy Sign Endpoint',
    description: 'Compatible with original local server format',
    supported_formats: ['application/json', 'text/plain'],
    example_json: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url: 'https://www.tiktok.com/@username/live' }
    },
    example_text: {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'https://www.tiktok.com/@username/live'
    }
  })
}

function isValidTikTokUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('tiktok.com')
  } catch {
    return false
  }
}