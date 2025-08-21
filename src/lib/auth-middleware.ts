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
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  FREE_TIER: {
    DAILY_LIMIT: 100,
    HOURLY_LIMIT: 20,
    BURST_LIMIT: 5, // Max requests per minute
    WINDOW_SIZE: 60 * 1000 // 1 minute in milliseconds
  },
  API_KEY: {
    DAILY_LIMIT: -1, // Unlimited
    HOURLY_LIMIT: -1, // Unlimited
    BURST_LIMIT: 100, // Higher burst limit for API keys
    WINDOW_SIZE: 60 * 1000
  }
} as const

/**
 * Enhanced rate limiting check with multiple tiers
 */
export async function checkRateLimit(
  context: AuthContext,
  supabase: any
): Promise<{
  allowed: boolean
  remaining?: number
  resetTime?: Date
  limits?: {
    daily: { used: number; limit: number; remaining: number }
    hourly: { used: number; limit: number; remaining: number }
    burst: { used: number; limit: number; remaining: number }
  }
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

    const limits = context.user.tier === 'api_key' ? RATE_LIMITS.API_KEY : RATE_LIMITS.FREE_TIER
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentHour = now.getHours()

    // Check daily limit
    let dailyUsed = 0
    if (limits.DAILY_LIMIT > 0) {
      const { data: dailyQuota, error: dailyError } = await supabase
        .from('quota_usage')
        .select('request_count')
        .eq('user_id', context.user.id)
        .eq('date', today)
        .single()

      if (dailyError && dailyError.code !== 'PGRST116') {
        console.error('Failed to check daily quota:', dailyError)
        return {
          allowed: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to check daily rate limit',
            code: 'DAILY_RATE_LIMIT_CHECK_FAILED',
            timestamp: new Date()
          }
        }
      }

      dailyUsed = dailyQuota?.request_count || 0
      if (dailyUsed >= limits.DAILY_LIMIT) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        return {
          allowed: false,
          remaining: 0,
          resetTime: tomorrow,
          limits: {
            daily: { used: dailyUsed, limit: limits.DAILY_LIMIT, remaining: 0 },
            hourly: { used: 0, limit: limits.HOURLY_LIMIT, remaining: limits.HOURLY_LIMIT },
            burst: { used: 0, limit: limits.BURST_LIMIT, remaining: limits.BURST_LIMIT }
          },
          error: {
            type: ErrorType.RATE_LIMIT_ERROR,
            message: `Daily rate limit of ${limits.DAILY_LIMIT} requests exceeded. Limit resets at ${tomorrow.toISOString()}`,
            code: 'DAILY_RATE_LIMIT_EXCEEDED',
            timestamp: new Date()
          }
        }
      }
    }

    // Check hourly limit
    let hourlyUsed = 0
    if (limits.HOURLY_LIMIT > 0) {
      const hourStart = new Date(now)
      hourStart.setMinutes(0, 0, 0)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hourStart.getHours() + 1)

      const { data: hourlyLogs, error: hourlyError } = await supabase
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', context.user.id)
        .gte('created_at', hourStart.toISOString())
        .lt('created_at', hourEnd.toISOString())

      if (hourlyError) {
        console.error('Failed to check hourly quota:', hourlyError)
        return {
          allowed: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to check hourly rate limit',
            code: 'HOURLY_RATE_LIMIT_CHECK_FAILED',
            timestamp: new Date()
          }
        }
      }

      hourlyUsed = hourlyLogs || 0
      if (hourlyUsed >= limits.HOURLY_LIMIT) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: hourEnd,
          limits: {
            daily: { used: dailyUsed, limit: limits.DAILY_LIMIT, remaining: Math.max(0, limits.DAILY_LIMIT - dailyUsed) },
            hourly: { used: hourlyUsed, limit: limits.HOURLY_LIMIT, remaining: 0 },
            burst: { used: 0, limit: limits.BURST_LIMIT, remaining: limits.BURST_LIMIT }
          },
          error: {
            type: ErrorType.RATE_LIMIT_ERROR,
            message: `Hourly rate limit of ${limits.HOURLY_LIMIT} requests exceeded. Limit resets at ${hourEnd.toISOString()}`,
            code: 'HOURLY_RATE_LIMIT_EXCEEDED',
            timestamp: new Date()
          }
        }
      }
    }

    // Check burst limit (requests per minute)
    let burstUsed = 0
    if (limits.BURST_LIMIT > 0) {
      const burstWindow = new Date(now.getTime() - limits.WINDOW_SIZE)

      const { data: burstLogs, error: burstError } = await supabase
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', context.user.id)
        .gte('created_at', burstWindow.toISOString())

      if (burstError) {
        console.error('Failed to check burst quota:', burstError)
        return {
          allowed: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to check burst rate limit',
            code: 'BURST_RATE_LIMIT_CHECK_FAILED',
            timestamp: new Date()
          }
        }
      }

      burstUsed = burstLogs || 0
      if (burstUsed >= limits.BURST_LIMIT) {
        const resetTime = new Date(now.getTime() + limits.WINDOW_SIZE)
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          limits: {
            daily: { used: dailyUsed, limit: limits.DAILY_LIMIT, remaining: Math.max(0, limits.DAILY_LIMIT - dailyUsed) },
            hourly: { used: hourlyUsed, limit: limits.HOURLY_LIMIT, remaining: Math.max(0, limits.HOURLY_LIMIT - hourlyUsed) },
            burst: { used: burstUsed, limit: limits.BURST_LIMIT, remaining: 0 }
          },
          error: {
            type: ErrorType.RATE_LIMIT_ERROR,
            message: `Burst rate limit of ${limits.BURST_LIMIT} requests per minute exceeded. Try again in ${Math.ceil(limits.WINDOW_SIZE / 1000)} seconds.`,
            code: 'BURST_RATE_LIMIT_EXCEEDED',
            timestamp: new Date()
          }
        }
      }
    }

    // All checks passed
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    return {
      allowed: true,
      remaining: limits.DAILY_LIMIT > 0 ? limits.DAILY_LIMIT - dailyUsed : -1,
      resetTime: tomorrow,
      limits: {
        daily: { 
          used: dailyUsed, 
          limit: limits.DAILY_LIMIT, 
          remaining: limits.DAILY_LIMIT > 0 ? Math.max(0, limits.DAILY_LIMIT - dailyUsed) : -1 
        },
        hourly: { 
          used: hourlyUsed, 
          limit: limits.HOURLY_LIMIT, 
          remaining: limits.HOURLY_LIMIT > 0 ? Math.max(0, limits.HOURLY_LIMIT - hourlyUsed) : -1 
        },
        burst: { 
          used: burstUsed, 
          limit: limits.BURST_LIMIT, 
          remaining: limits.BURST_LIMIT > 0 ? Math.max(0, limits.BURST_LIMIT - burstUsed) : -1 
        }
      }
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
 * Update usage quota for users
 */
export async function updateUsageQuota(
  userId: string,
  supabase: any,
  increment: number = 1
): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase.rpc('increment_quota_usage', {
      p_user_id: userId,
      p_date: today,
      p_increment: increment
    })

    if (error) {
      console.error('Failed to update usage quota:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Update usage quota error:', error)
    return false
  }
}

/**
 * Check if user is approaching rate limits and should be warned
 */
export async function checkQuotaWarnings(
  context: AuthContext,
  supabase: any
): Promise<{
  warnings: Array<{
    type: 'daily' | 'hourly' | 'burst'
    message: string
    percentage: number
  }>
}> {
  try {
    if (!context.user || context.user.tier === 'api_key') {
      return { warnings: [] }
    }

    const warnings: Array<{
      type: 'daily' | 'hourly' | 'burst'
      message: string
      percentage: number
    }> = []

    const rateLimitResult = await checkRateLimit(context, supabase)
    
    if (rateLimitResult.limits) {
      const { daily, hourly, burst } = rateLimitResult.limits

      // Check daily usage warning (80% threshold)
      if (daily.limit > 0) {
        const dailyPercentage = (daily.used / daily.limit) * 100
        if (dailyPercentage >= 80) {
          warnings.push({
            type: 'daily',
            message: `You've used ${dailyPercentage.toFixed(1)}% of your daily quota (${daily.used}/${daily.limit} requests)`,
            percentage: dailyPercentage
          })
        }
      }

      // Check hourly usage warning (75% threshold)
      if (hourly.limit > 0) {
        const hourlyPercentage = (hourly.used / hourly.limit) * 100
        if (hourlyPercentage >= 75) {
          warnings.push({
            type: 'hourly',
            message: `You've used ${hourlyPercentage.toFixed(1)}% of your hourly quota (${hourly.used}/${hourly.limit} requests)`,
            percentage: hourlyPercentage
          })
        }
      }

      // Check burst usage warning (60% threshold)
      if (burst.limit > 0) {
        const burstPercentage = (burst.used / burst.limit) * 100
        if (burstPercentage >= 60) {
          warnings.push({
            type: 'burst',
            message: `High request frequency detected (${burst.used}/${burst.limit} requests per minute)`,
            percentage: burstPercentage
          })
        }
      }
    }

    return { warnings }
  } catch (error) {
    console.error('Failed to check quota warnings:', error)
    return { warnings: [] }
  }
}