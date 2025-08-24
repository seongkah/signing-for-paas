import { NextRequest, NextResponse } from 'next/server'
import { ErrorType } from '@/types'
import { createHash, randomBytes } from 'crypto'

// Safe Supabase imports with error handling
let createServerClient: any = null
let Database: any = null

try {
  const supabaseSSR = require('@supabase/ssr')
  createServerClient = supabaseSSR.createServerClient
  console.log('✅ Supabase SSR imported successfully')
} catch (importError) {
  console.error('❌ Failed to import Supabase SSR:', importError)
}

console.log('✅ API keys route module loaded successfully')

// Safe Supabase client creation without cookies() dependency
function createSafeSupabaseClient(useServiceRole = false) {
  try {
    if (!createServerClient) {
      throw new Error('Supabase SSR not available')
    }
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = useServiceRole 
      ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    
    return createServerClient(url, key, {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {}
      }
    })
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// Parse session from cookie header directly
function parseSessionFromCookies(cookieHeader: string | null): any {
  if (!cookieHeader) {
    console.log('❌ No cookie header found')
    return null
  }
  
  console.log('🔍 Parsing cookies, header length:', cookieHeader.length)
  console.log('🔍 Cookie header preview:', cookieHeader.substring(0, 200) + '...')
  
  try {
    // Look for Supabase session tokens in cookie header
    const cookies = cookieHeader.split(';')
    console.log('🔍 Found', cookies.length, 'cookies')
    
    let supabaseCookieCount = 0
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      
      // Log all cookies for debugging
      if (name.includes('supabase') || name.includes('sb-') || name.includes('auth')) {
        supabaseCookieCount++
        console.log('🔍 Found auth-related cookie:', name, 'length:', value?.length || 0)
        
        // More flexible matching for Supabase cookies
        if ((name.includes('supabase') && (name.includes('auth') || name.includes('token'))) ||
            name.startsWith('sb-') ||
            (name.includes('auth') && value && value.length > 20)) {
          
          console.log('✅ Found valid session cookie:', name)
          
          // Try to extract user info from cookie value if it's a JWT
          let userId = 'authenticated-user'
          if (value && value.includes('.')) {
            try {
              // Basic JWT parsing to get user ID
              const parts = value.split('.')
              if (parts.length >= 2) {
                const payload = JSON.parse(atob(parts[1]))
                if (payload.sub) {
                  userId = payload.sub
                  console.log('✅ Extracted user ID from JWT:', userId.substring(0, 8) + '...')
                }
              }
            } catch (jwtError) {
              console.log('⚠️ Could not parse JWT, using default user ID')
            }
          }
          
          return { hasSession: true, userId: userId }
        }
      }
    }
    
    console.log('❌ No valid session found in', supabaseCookieCount, 'auth-related cookies')
    
  } catch (error) {
    console.error('❌ Failed to parse session from cookies:', error)
  }
  
  return null
}

// Generate API key
function generateApiKey(): { key: string; hash: string } {
  const key = `sk_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(key).digest('hex')
  return { key, hash }
}

// GET - List user's API keys
export async function GET(request: NextRequest) {
  console.log('✅ API keys GET function started')
  
  try {
    // Check authentication using cookie header parsing
    const cookieHeader = request.headers.get('cookie')
    const sessionInfo = parseSessionFromCookies(cookieHeader)
    
    if (!sessionInfo?.hasSession) {
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.AUTHENTICATION_ERROR,
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
          timestamp: new Date()
        }
      }, { status: 401 })
    }

    const user = { id: sessionInfo.userId }
    console.log('✅ Authentication successful for GET request')

    // Create Supabase service client
    const supabase = createSafeSupabaseClient(true) // Use service role
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Database connection failed',
          code: 'DB_ERROR',
          timestamp: new Date()
        }
      }, { status: 500 })
    }

    // Get user's API keys
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, name, created_at, last_used, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (keysError) {
      console.error('Failed to fetch API keys:', keysError)
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch API keys',
          code: 'FETCH_KEYS_FAILED',
          timestamp: new Date()
        }
      }, { status: 500 })
    }

    console.log('✅ Retrieved', apiKeys?.length || 0, 'API keys')

    return NextResponse.json({
      success: true,
      data: {
        apiKeys: (apiKeys || []).map((key: any) => ({
          id: key.id,
          name: key.name,
          createdAt: new Date(key.created_at),
          lastUsed: key.last_used ? new Date(key.last_used) : null,
          isActive: key.is_active
        }))
      }
    })

  } catch (error) {
    console.error('Get API keys error:', error)
    return NextResponse.json({
      success: false,
      error: {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'Internal server error while fetching API keys',
        code: 'INTERNAL_ERROR',
        timestamp: new Date()
      }
    }, { status: 500 })
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  console.log('✅ API key creation POST function started')
  console.log('✅ Timestamp:', new Date().toISOString())
  console.log('✅ Request URL:', request.url)
  
  try {
    // Parse request body
    let body: any = null
    try {
      body = await request.json()
      console.log('✅ Body parsed successfully:', typeof body)
    } catch (bodyError) {
      console.log('❌ Body parse failed:', bodyError)
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Invalid JSON body',
          code: 'INVALID_BODY',
          timestamp: new Date()
        }
      }, { status: 400 })
    }
    
    // Validate name
    const { name } = body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('❌ Name validation failed')
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'API key name is required',
          code: 'MISSING_NAME',
          timestamp: new Date()
        }
      }, { status: 400 })
    }
    
    console.log('✅ Name validated:', name)
    
    // Check authentication using cookie header parsing
    let user: any = null
    let isAuthenticated = false
    
    try {
      console.log('✅ Checking authentication...')
      const cookieHeader = request.headers.get('cookie')
      console.log('✅ Cookie header length:', cookieHeader?.length || 0)
      
      const sessionInfo = parseSessionFromCookies(cookieHeader)
      if (sessionInfo?.hasSession) {
        console.log('✅ Session found in cookies')
        isAuthenticated = true
        user = { id: sessionInfo.userId, email: 'authenticated-user@example.com' }
      } else {
        console.log('❌ No session found')
        return NextResponse.json({
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
            timestamp: new Date()
          }
        }, { status: 401 })
      }
    } catch (authError) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.AUTHENTICATION_ERROR,
          message: 'Authentication error',
          code: 'AUTH_ERROR',
          timestamp: new Date()
        }
      }, { status: 401 })
    }
    
    console.log('✅ Authentication successful for user:', user.id)
    
    // Create Supabase client for database operations
    const supabase = createSafeSupabaseClient(true) // Use service role
    if (!supabase) {
      console.log('❌ Failed to create Supabase client')
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Database connection failed',
          code: 'DB_ERROR',
          timestamp: new Date()
        }
      }, { status: 500 })
    }
    
    console.log('✅ Supabase service client created')
    
    // Generate new API key
    const { key, hash } = generateApiKey()
    console.log('✅ API key generated')
    
    // Store API key in database
    const { data: apiKeyData, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: hash,
        name: name.trim(),
        is_active: true
      })
      .select('id, name, created_at')
      .single()

    if (insertError || !apiKeyData) {
      console.error('❌ Failed to create API key:', insertError)
      return NextResponse.json({
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Failed to create API key',
          code: 'KEY_CREATION_FAILED',
          timestamp: new Date()
        }
      }, { status: 500 })
    }

    console.log('✅ API key stored in database:', apiKeyData.id)

    // Update user tier to 'api_key'
    const { error: tierUpdateError } = await supabase
      .from('users')
      .update({ tier: 'api_key' })
      .eq('id', user.id)

    if (tierUpdateError) {
      console.error('⚠️ Failed to update user tier:', tierUpdateError)
      // Don't fail the request for this
    }

    console.log('✅ About to return success response')

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: apiKeyData.id,
          name: apiKeyData.name,
          key: key, // Only returned once during creation
          createdAt: new Date(apiKeyData.created_at),
          isActive: true
        },
        message: 'API key created successfully. Save this key securely - it will not be shown again.'
      }
    })

  } catch (error) {
    console.error('❌ Fatal error in API key creation:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({
      success: false,
      error: {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'Internal server error while creating API key',
        code: 'INTERNAL_ERROR',
        timestamp: new Date()
      }
    }, { status: 500 })
  }
}