import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ErrorType } from '@/types'
import { createHash, randomBytes } from 'crypto'

// Generate API key
function generateApiKey(): { key: string; hash: string } {
  const key = `sk_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(key).digest('hex')
  return { key, hash }
}

// GET - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
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
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch API keys',
            code: 'FETCH_KEYS_FAILED',
            timestamp: new Date()
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        apiKeys: apiKeys.map(key => ({
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
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching API keys',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  console.log('🔑 API Key creation request received')
  console.log('   Headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const body = await request.json()
    console.log('   Request body:', body)
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('❌ Validation failed: missing or invalid name')
      console.log('   Received name:', name, typeof name)
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'API key name is required',
            code: 'MISSING_NAME',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get current user
    console.log('🔍 Getting current user from session...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('   Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message || 'No user session')
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
    }

    // Check if user already has too many API keys (limit to 5)
    const { count, error: countError } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (countError) {
      console.error('Failed to count API keys:', countError)
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to validate API key limit',
            code: 'VALIDATION_FAILED',
            timestamp: new Date()
          }
        },
        { status: 500 }
      )
    }

    if (count && count >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'Maximum number of API keys reached (5)',
            code: 'KEY_LIMIT_EXCEEDED',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
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
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to create API key',
            code: 'KEY_CREATION_FAILED',
            timestamp: new Date()
          }
        },
        { status: 500 }
      )
    }

    // Update user tier to 'api_key' if they now have API keys
    const { error: tierUpdateError } = await supabase
      .from('users')
      .update({ tier: 'api_key' })
      .eq('id', user.id)

    if (tierUpdateError) {
      console.error('Failed to update user tier:', tierUpdateError)
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
    console.error('Create API key error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while creating API key',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}