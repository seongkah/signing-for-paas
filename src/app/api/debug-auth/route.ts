import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createHash } from 'crypto'

/**
 * Debug endpoint to diagnose authentication issues
 * This will help us see exactly where the authentication flow is failing
 */
export async function POST(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    step: 'starting',
    headers: {},
    apiKey: null,
    hash: null,
    supabaseConnection: null,
    apiKeyQuery: null,
    userQuery: null,
    finalResult: null
  }

  try {
    debugInfo.step = 'parsing_headers'
    
    // Check headers
    const authHeader = request.headers.get('authorization')
    const apiKeyHeader = request.headers.get('x-api-key')
    
    debugInfo.headers = {
      authorization: authHeader ? `Bearer ${authHeader.substring(7, 15)}...` : null,
      xApiKey: apiKeyHeader ? `${apiKeyHeader.substring(0, 8)}...` : null
    }

    let apiKey: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7)
      debugInfo.step = 'found_auth_header'
    } else if (apiKeyHeader) {
      apiKey = apiKeyHeader
      debugInfo.step = 'found_api_key_header'
    }

    if (apiKey) {
      debugInfo.apiKey = {
        found: true,
        length: apiKey.length,
        firstChars: apiKey.substring(0, 8),
        startsWithSk: apiKey.startsWith('sk_')
      }

      // Generate hash
      debugInfo.step = 'generating_hash'
      const keyHash = createHash('sha256').update(apiKey).digest('hex')
      debugInfo.hash = {
        generated: true,
        firstChars: keyHash.substring(0, 16)
      }

      // Test Supabase connection
      debugInfo.step = 'testing_supabase_connection'
      try {
        const supabase = createServerSupabaseClient()
        debugInfo.supabaseConnection = { created: true }

        // Query api_keys table
        debugInfo.step = 'querying_api_keys'
        const { data: apiKeyData, error: keyError } = await supabase
          .from('api_keys')
          .select('id, user_id, name, is_active')
          .eq('key_hash', keyHash)
          .eq('is_active', true)
          .single()

        debugInfo.apiKeyQuery = {
          error: keyError?.message || null,
          errorCode: keyError?.code || null,
          dataFound: !!apiKeyData,
          data: apiKeyData ? {
            id: apiKeyData.id,
            userId: apiKeyData.user_id,
            name: apiKeyData.name,
            isActive: apiKeyData.is_active
          } : null
        }

        if (!keyError && apiKeyData) {
          // Query users table
          debugInfo.step = 'querying_users'
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, tier, is_active')
            .eq('id', apiKeyData.user_id)
            .single()

          debugInfo.userQuery = {
            error: userError?.message || null,
            errorCode: userError?.code || null,
            dataFound: !!userData,
            data: userData ? {
              id: userData.id,
              email: userData.email,
              tier: userData.tier,
              isActive: userData.is_active
            } : null
          }

          debugInfo.step = 'queries_complete'
        }

      } catch (supabaseError) {
        debugInfo.supabaseConnection = {
          created: false,
          error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
        }
      }
    } else {
      debugInfo.step = 'no_api_key_found'
    }

    // Test the actual authenticateRequest function
    debugInfo.step = 'testing_authenticate_request'
    const authResult = await authenticateRequest(request)
    debugInfo.finalResult = {
      success: authResult.success,
      error: authResult.error,
      context: authResult.context ? {
        userId: authResult.context.user?.id,
        userTier: authResult.context.user?.tier,
        authMethod: authResult.context.authMethod,
        apiKeyId: authResult.context.apiKey?.id
      } : null
    }

    debugInfo.step = 'complete'

    return NextResponse.json({
      success: true,
      message: 'Authentication debug completed',
      debug: debugInfo
    })

  } catch (error) {
    debugInfo.step = 'error_occurred'
    debugInfo.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }

    return NextResponse.json({
      success: false,
      message: 'Debug failed',
      debug: debugInfo,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'Debug Authentication',
    description: 'POST with Authorization header to debug authentication flow',
    usage: {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer your-api-key-here',
        'Content-Type': 'application/json'
      },
      body: {}
    }
  })
}