import { NextRequest, NextResponse } from 'next/server'
import { ErrorType } from '@/types'
import { createHash, randomBytes } from 'crypto'

// Safe Supabase imports with error handling
let createServerClient: any = null
let Database: any = null

try {
  const supabaseSSR = require('@supabase/ssr')
  createServerClient = supabaseSSR.createServerClient
} catch (importError) {
  console.error('Failed to import Supabase SSR:', importError)
}

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
    return null
  }
  
  try {
    const cookies = cookieHeader.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      
      // Look for Supabase session cookies
      if ((name.includes('supabase') && (name.includes('auth') || name.includes('token'))) ||
          name.startsWith('sb-') ||
          name.includes('sb-wfxyvtmvftygvddxspxw-auth-token') ||
          (name.includes('auth-token') && name.includes('sb-')) ||
          (name.includes('auth') && value && value.length > 20)) {
          
        let userId = 'authenticated-user'
        
        try {
          // Handle URL-encoded JSON format
          if (value && value.includes('%22')) {
            const decoded = decodeURIComponent(value)
            const sessionData = JSON.parse(decoded)
            
            if (sessionData.user?.id) {
              userId = sessionData.user.id
            } else if (sessionData.access_token) {
              // Parse JWT from access_token
              const parts = sessionData.access_token.split('.')
              if (parts.length >= 2) {
                const payload = JSON.parse(atob(parts[1]))
                if (payload.sub) {
                  userId = payload.sub
                }
              }
            }
          } else if (value && value.includes('.')) {
            // Direct JWT parsing
            const parts = value.split('.')
            if (parts.length >= 2) {
              const payload = JSON.parse(atob(parts[1]))
              if (payload.sub) {
                userId = payload.sub
              }
            }
          }
        } catch (parseError) {
          // Use default userId if parsing fails
        }
        
        return { hasSession: true, userId: userId }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing cookies:', error)
    return null
  }
}

// Generate API key
function generateApiKey(): { key: string; hash: string } {
  const key = `sk_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(key).digest('hex')
  return { key, hash }
}

// GET - List user's API keys
export async function GET(request: NextRequest) {
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
  try {
    // Parse request body
    let body: any = null
    try {
      body = await request.json()
    } catch (bodyError) {
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
    
    // Check authentication using cookie header parsing
    let user: any = null
    let isAuthenticated = false
    
    try {
      const cookieHeader = request.headers.get('cookie')
      const sessionInfo = parseSessionFromCookies(cookieHeader)
      if (sessionInfo?.hasSession) {
        isAuthenticated = true
        user = { id: sessionInfo.userId, email: 'authenticated-user@example.com' }
      } else {
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
    
    // Create Supabase client for database operations
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
    
    // Generate new API key
    const { key, hash } = generateApiKey()
    
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
      console.error('Failed to create API key:', insertError)
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

    // Update user tier to 'api_key'
    const { error: tierUpdateError } = await supabase
      .from('users')
      .update({ tier: 'api_key' })
      .eq('id', user.id)

    if (tierUpdateError) {
      console.error('Failed to update user tier:', tierUpdateError)
      // Don't fail the request for this
    }

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
    console.error('Fatal error in API key creation:', error)
    
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