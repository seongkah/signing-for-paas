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

async function handleSignatureGeneration(request: NextRequest, context: ApiContext) {
  const startTime = Date.now()
  let authContext: any = null
  let compatContext: any = null

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

    // Authenticate request (optional - supports both free and paid tiers)
    const authResult = await authenticateRequest(request)
    
    if (authResult.success && authResult.context) {
      authContext = authResult.context
      context.userId = authContext.user.id;
      context.apiKeyId = authContext.apiKey?.id;

      const supabase = createServerSupabaseClient()

      // Check rate limits for authenticated users
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
    }

    // Generate signature using mock implementation
    // TODO: Replace with actual SignatureGenerator integration in later tasks
    const responseTime = Date.now() - startTime
    const signatureResult = createMockSignatureResult(roomUrl, responseTime)
    
    if (!signatureResult.success) {
      throw createSignatureError('Failed to generate signature', { roomUrl, details: signatureResult });
    }

    // Log successful request
    await usageLogOps.logRequest({
      userId: authContext?.user?.id,
      apiKeyId: authContext?.apiKey?.id,
      roomUrl,
      success: signatureResult.success,
      responseTimeMs: responseTime
    })

    // Update usage quota for authenticated users only
    if (authContext) {
      const supabase = createServerSupabaseClient()
      await updateUsageQuota(authContext.user.id, supabase)
    }

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
        ...(authContext && {
          user: {
            id: authContext.user.id,
            tier: authContext.user.tier
          },
          authMethod: authContext.authMethod
        }),
        tier: authContext?.user?.tier || 'free'
      }
      return NextResponse.json(modernResponse)
    }

    return NextResponse.json(response)

  } catch (error) {
    const responseTime = Date.now() - startTime
    const format = compatContext?.format || detectRequestFormat(request)
    const roomUrl = compatContext?.roomUrl || ''
    
    // Log error
    try {
      await usageLogOps.logRequest({
        userId: authContext?.user?.id,
        apiKeyId: authContext?.apiKey?.id,
        roomUrl,
        success: false,
        responseTimeMs: responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
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