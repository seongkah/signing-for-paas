import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from './supabase-server'

/**
 * IP-based rate limiting for anonymous users (free tier)
 * Implements daily limits per IP address
 */

export interface IPRateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  currentUsage: number
  dailyLimit: number
  error?: {
    type: string
    message: string
    code: string
  }
}

// Free tier limits per IP address
export const IP_RATE_LIMITS = {
  DAILY_LIMIT: 100,
  HOURLY_LIMIT: 20, 
  BURST_LIMIT: 5, // requests per minute
  WINDOW_SIZE: 60 * 1000 // 1 minute
} as const

/**
 * Extract real IP address from NextRequest
 * Handles Vercel's proxy headers correctly
 */
export function extractIPAddress(request: NextRequest): string {
  // Vercel provides the real IP in x-forwarded-for header
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    // x-forwarded-for can be comma-separated list, take first one
    return xForwardedFor.split(',')[0].trim()
  }

  // Fallback headers
  const xRealIP = request.headers.get('x-real-ip')
  if (xRealIP) {
    return xRealIP.trim()
  }

  // Vercel geo data
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) {
    return vercelIP.split(',')[0].trim()
  }

  // Last resort - direct IP (may not work in production)
  return request.ip || '127.0.0.1'
}

/**
 * Check if IP address has exceeded daily rate limit
 */
export async function checkIPRateLimit(ipAddress: string): Promise<IPRateLimitResult> {
  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Get current usage for this IP today
    const { data: usageData, error } = await supabase
      .from('ip_usage_tracking')
      .select('request_count')
      .eq('ip_address', ipAddress)
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Failed to check IP rate limit:', error)
      return {
        allowed: false,
        remaining: 0,
        resetTime: getTomorrowMidnight(),
        currentUsage: 0,
        dailyLimit: IP_RATE_LIMITS.DAILY_LIMIT,
        error: {
          type: 'DATABASE_ERROR',
          message: 'Failed to check rate limit',
          code: 'RATE_LIMIT_CHECK_FAILED'
        }
      }
    }

    const currentUsage = usageData?.request_count || 0
    const remaining = Math.max(0, IP_RATE_LIMITS.DAILY_LIMIT - currentUsage)
    const allowed = currentUsage < IP_RATE_LIMITS.DAILY_LIMIT

    return {
      allowed,
      remaining,
      resetTime: getTomorrowMidnight(),
      currentUsage,
      dailyLimit: IP_RATE_LIMITS.DAILY_LIMIT
    }

  } catch (error) {
    console.error('IP rate limit check error:', error)
    return {
      allowed: false,
      remaining: 0,
      resetTime: getTomorrowMidnight(),
      currentUsage: 0,
      dailyLimit: IP_RATE_LIMITS.DAILY_LIMIT,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Internal server error during rate limit check',
        code: 'INTERNAL_ERROR'
      }
    }
  }
}

/**
 * Increment IP usage count after successful request
 */
export async function incrementIPUsage(ipAddress: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]

    // Use RPC function for atomic increment
    const { data, error } = await supabase.rpc('increment_ip_usage', {
      p_ip_address: ipAddress,
      p_date: today,
      p_increment: 1
    })

    if (error) {
      console.error('Failed to increment IP usage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('IP usage increment error:', error)
    return false
  }
}

/**
 * Log IP-based request for analytics and debugging
 */
export async function logIPRequest(params: {
  ipAddress: string
  roomUrl: string
  success: boolean
  responseTimeMs: number
  errorMessage?: string
}): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { error } = await supabase
      .from('ip_usage_logs')
      .insert({
        ip_address: params.ipAddress,
        room_url: params.roomUrl,
        success: params.success,
        response_time_ms: params.responseTimeMs,
        error_message: params.errorMessage,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log IP request:', error)
    }
  } catch (error) {
    console.error('IP request logging error:', error)
  }
}

/**
 * Check burst rate limiting (requests per minute)
 */
export async function checkIPBurstLimit(ipAddress: string): Promise<{
  allowed: boolean
  remaining: number
  resetTime: Date
}> {
  try {
    const supabase = createServerSupabaseClient()
    const oneMinuteAgo = new Date(Date.now() - IP_RATE_LIMITS.WINDOW_SIZE)

    // Count requests in the last minute
    const { count, error } = await supabase
      .from('ip_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', oneMinuteAgo.toISOString())

    if (error) {
      console.error('Failed to check burst limit:', error)
      return {
        allowed: true, // Allow on error to avoid blocking legitimate users
        remaining: IP_RATE_LIMITS.BURST_LIMIT,
        resetTime: new Date(Date.now() + IP_RATE_LIMITS.WINDOW_SIZE)
      }
    }

    const currentUsage = count || 0
    const remaining = Math.max(0, IP_RATE_LIMITS.BURST_LIMIT - currentUsage)
    const allowed = currentUsage < IP_RATE_LIMITS.BURST_LIMIT

    return {
      allowed,
      remaining,
      resetTime: new Date(Date.now() + IP_RATE_LIMITS.WINDOW_SIZE)
    }
  } catch (error) {
    console.error('Burst limit check error:', error)
    return {
      allowed: true,
      remaining: IP_RATE_LIMITS.BURST_LIMIT,
      resetTime: new Date(Date.now() + IP_RATE_LIMITS.WINDOW_SIZE)
    }
  }
}

/**
 * Get tomorrow at midnight (rate limit reset time)
 */
function getTomorrowMidnight(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow
}

/**
 * Create upgrade prompt response for rate-limited users
 */
export function createUpgradePrompt(rateLimitResult: IPRateLimitResult) {
  return {
    success: false,
    error: 'Daily rate limit exceeded',
    message: `You've reached your free tier limit of ${rateLimitResult.dailyLimit} requests per day`,
    tier: 'free',
    rateLimit: {
      daily: {
        used: rateLimitResult.currentUsage,
        limit: rateLimitResult.dailyLimit,
        remaining: rateLimitResult.remaining
      },
      resetTime: rateLimitResult.resetTime.toISOString()
    },
    upgrade: {
      title: 'Get Unlimited Access',
      message: 'Upgrade to unlimited requests with an API key',
      benefits: [
        'Unlimited daily requests',
        'Higher burst limits (100/min vs 5/min)',
        'Priority processing',
        'Usage analytics',
        'Better support'
      ],
      action: {
        text: 'Get API Key',
        url: 'https://signing-for-paas.vercel.app/dashboard'
      }
    }
  }
}

/**
 * Validate IP address format
 */
export function isValidIPAddress(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1') {
    return false
  }
  
  // Basic IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  // Basic IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip)
}