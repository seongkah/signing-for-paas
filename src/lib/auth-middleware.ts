import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from './supabase-server'
import { createHash } from 'crypto'
import { ErrorType } from '@/types'

export interface AuthContext {
  user: {
    id: string
    email: string
    tier: 'free' | 'api_key'
    isActive: boolean
  } | null
  apiKey: {
    id: string
    userId: string
    name: string
  } | null
  isAuthenticated: boolean
  authMethod: 'session' | 'api_key' | null
}

export interface AuthError {
  type: ErrorType
  message: string
  code: string
  timestamp: Date
}

/**
 * Authenticate request using either session or API key
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean
  context?: AuthContext
  error?: AuthError
}> {
  try {
    const supabase = createServerSupabaseClient()

    // Check for API key in Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7)
      
      if (apiKey.startsWith('sk_')) {
        // This is an API key
        const keyHash = createHash('sha256').update(apiKey).digest('hex')
        
        const { data: apiKeyData, error: keyError } = await supabase
          .from('api_keys')
          .select(`
            id,
            user_id,
            name,
            users!inner (
              id,
              email,
              tier,
              is_active
            )
          `)
          .eq('key_hash', keyHash)
          .eq('is_active', true)
          .single()

        if (keyError || !apiKeyData) {
          return {
            success: false,
            error: {
              type: ErrorType.AUTHENTICATION_ERROR,
              message: 'Invalid API key',
              code: 'INVALID_API_KEY',
              timestamp: new Date()
            }
          }
        }

        const user = Array.isArray(apiKeyData.users) ? apiKeyData.users[0] : apiKeyData.users

        if (!user.is_active) {
          return {
            success: false,
            error: {
              type: ErrorType.AUTHORIZATION_ERROR,
              message: 'User account is inactive',
              code: 'INACTIVE_USER',
              timestamp: new Date()
            }
          }
        }

        // Update last_used timestamp for the API key
        await supabase
          .from('api_keys')
          .update({ last_used: new Date().toISOString() })
          .eq('id', apiKeyData.id)

        return {
          success: true,
          context: {
            user: {
              id: user.id,
              email: user.email,
              tier: user.tier,
              isActive: user.is_active
            },
            apiKey: {
              id: apiKeyData.id,
              userId: apiKeyData.user_id,
              name: apiKeyData.name
            },
            isAuthenticated: true,
            authMethod: 'api_key'
          }
        }
      }
    }

    // Check for session-based authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: {
          type: ErrorType.AUTHENTICATION_ERROR,
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
          timestamp: new Date()
        }
      }
    }

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch user data',
          code: 'USER_FETCH_FAILED',
          timestamp: new Date()
        }
      }
    }

    if (!userData.is_active) {
      return {
        success: false,
        error: {
          type: ErrorType.AUTHORIZATION_ERROR,
          message: 'User account is inactive',
          code: 'INACTIVE_USER',
          timestamp: new Date()
        }
      }
    }

    return {
      success: true,
      context: {
        user: {
          id: userData.id,
          email: userData.email,
          tier: userData.tier,
          isActive: userData.is_active
        },
        apiKey: null,
        isAuthenticated: true,
        authMethod: 'session'
      }
    }

  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'Internal server error during authentication',
        code: 'INTERNAL_ERROR',
        timestamp: new Date()
      }
    }
  }
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  return typeof apiKey === 'string' && 
         apiKey.startsWith('sk_') && 
         apiKey.length === 67 // sk_ + 64 hex characters
}

/**
 * Check if user has required permissions
 */
export function hasPermission(
  context: AuthContext,
  requiredTier?: 'free' | 'api_key'
): boolean {
  if (!context.isAuthenticated || !context.user) {
    return false
  }

  if (!requiredTier) {
    return true
  }

  // API key users have access to everything
  if (context.user.tier === 'api_key') {
    return true
  }

  // Free tier users can only access free tier endpoints
  return context.user.tier === requiredTier
}

/**
 * Rate limiting check based on user tier
 */
export async function checkRateLimit(
  context: AuthContext,
  supabase: any
): Promise<{
  allowed: boolean
  remaining?: number
  resetTime?: Date
  error?: AuthError
}> {
  try {
    if (!context.user) {
      return {
        allowed: false,
        error: {
          type: ErrorType.AUTHENTICATION_ERROR,
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
          timestamp: new Date()
        }
      }
    }

    // API key users have unlimited access
    if (context.user.tier === 'api_key') {
      return { allowed: true }
    }

    // Free tier users have daily limits
    const today = new Date().toISOString().split('T')[0]
    
    const { data: quotaData, error: quotaError } = await supabase
      .from('quota_usage')
      .select('request_count')
      .eq('user_id', context.user.id)
      .eq('date', today)
      .single()

    if (quotaError && quotaError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Failed to check quota:', quotaError)
      return {
        allowed: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Failed to check rate limit',
          code: 'RATE_LIMIT_CHECK_FAILED',
          timestamp: new Date()
        }
      }
    }

    const currentCount = quotaData?.request_count || 0
    const dailyLimit = 100 // Free tier daily limit

    if (currentCount >= dailyLimit) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      return {
        allowed: false,
        remaining: 0,
        resetTime: tomorrow,
        error: {
          type: ErrorType.RATE_LIMIT_ERROR,
          message: `Daily rate limit exceeded. Limit resets at ${tomorrow.toISOString()}`,
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date()
        }
      }
    }

    return {
      allowed: true,
      remaining: dailyLimit - currentCount,
      resetTime: (() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        return tomorrow
      })()
    }

  } catch (error) {
    console.error('Rate limit check error:', error)
    return {
      allowed: false,
      error: {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'Internal server error during rate limit check',
        code: 'INTERNAL_ERROR',
        timestamp: new Date()
      }
    }
  }
}

/**
 * Update usage quota for free tier users
 */
export async function updateUsageQuota(
  userId: string,
  supabase: any
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('quota_usage')
      .upsert({
        user_id: userId,
        date: today,
        request_count: 1
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Failed to update usage quota:', error)
    }
  } catch (error) {
    console.error('Update usage quota error:', error)
  }
}