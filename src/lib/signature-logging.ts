import { NextRequest } from 'next/server'
import { createServiceSupabaseClient } from './supabase-server'
import { AuthContext } from './auth-middleware'
import { extractIPAddress } from './ip-rate-limiting'

/**
 * Comprehensive signature logging for all requests
 * Tracks every signature request regardless of tier or authentication method
 */

export interface SignatureLogParams {
  // Request context
  request: NextRequest
  endpoint: string  // '/api/signature', '/api/eulerstream', '/api/sign'
  roomUrl: string
  requestFormat: 'modern' | 'eulerstream' | 'legacy'
  
  // Authentication context (if any)
  authContext?: AuthContext | null
  
  // Response details
  success: boolean
  responseTimeMs: number
  errorType?: string
  errorMessage?: string
  
  // Rate limiting context
  rateLimitHit?: boolean
  dailyUsageCount?: number
  dailyLimit?: number
  
  // Signature details (when successful)
  signatureType?: 'mock' | 'real' | 'cached'
  signatureLength?: number
}

/**
 * Log signature request with comprehensive details
 */
export async function logSignatureRequest(params: SignatureLogParams): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient()
    
    // Extract client information
    const ipAddress = extractIPAddress(params.request)
    const userAgent = params.request.headers.get('user-agent')
    const countryCode = params.request.headers.get('x-vercel-ip-country') || null
    const region = params.request.headers.get('x-vercel-ip-region') || null
    
    // Determine tier and authentication method
    let tier: string
    let authMethod: string
    let userId: string | null = null
    let apiKeyId: string | null = null
    
    if (params.authContext?.isAuthenticated) {
      tier = params.authContext.user?.tier || 'unknown'
      authMethod = params.authContext.authMethod || 'unknown'
      userId = params.authContext.user?.id || null
      apiKeyId = params.authContext.apiKey?.id || null
    } else {
      tier = 'free'
      authMethod = 'ip_based'
    }
    
    // Generate request ID for correlation
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const logData = {
      request_id: requestId,
      endpoint: params.endpoint,
      
      // Client information
      ip_address: ipAddress,
      user_agent: userAgent,
      country_code: countryCode,
      region: region,
      
      // Authentication & tier information
      tier: tier,
      authentication_method: authMethod,
      user_id: userId,
      api_key_id: apiKeyId,
      
      // Request details
      room_url: params.roomUrl,
      request_format: params.requestFormat,
      
      // Response details
      success: params.success,
      response_time_ms: params.responseTimeMs,
      error_type: params.errorType || null,
      error_message: params.errorMessage || null,
      
      // Rate limiting context
      rate_limit_hit: params.rateLimitHit || false,
      daily_usage_count: params.dailyUsageCount || null,
      daily_limit: params.dailyLimit || null,
      
      // Signature details
      signature_type: params.signatureType || null,
      signature_length: params.signatureLength || null,
      
      created_at: new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('signature_logs')
      .insert(logData)
    
    if (error) {
      console.error('Failed to log signature request:', error)
      // Don't throw - logging failures shouldn't break the main request
    } else {
      console.log(`✅ Signature request logged: ${requestId} [${tier}] ${params.endpoint}`)
    }
    
  } catch (error) {
    console.error('Signature logging error:', error)
    // Don't throw - logging failures shouldn't break the main request
  }
}

/**
 * Get signature logs analytics
 */
export async function getSignatureAnalytics(options: {
  startDate?: Date
  endDate?: Date
  tier?: string
  endpoint?: string
  limit?: number
} = {}): Promise<{
  totalRequests: number
  successRate: number
  avgResponseTime: number
  tierBreakdown: Record<string, number>
  endpointBreakdown: Record<string, number>
  hourlyDistribution: Array<{ hour: number; count: number }>
}> {
  try {
    const supabase = createServiceSupabaseClient()
    
    let query = supabase
      .from('signature_logs')
      .select('*')
    
    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString())
    }
    
    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString())
    }
    
    if (options.tier) {
      query = query.eq('tier', options.tier)
    }
    
    if (options.endpoint) {
      query = query.eq('endpoint', options.endpoint)
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data: logs, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch signature analytics: ${error.message}`)
    }
    
    if (!logs || logs.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgResponseTime: 0,
        tierBreakdown: {},
        endpointBreakdown: {},
        hourlyDistribution: []
      }
    }
    
    // Calculate analytics
    const totalRequests = logs.length
    const successfulRequests = logs.filter(log => log.success).length
    const successRate = (successfulRequests / totalRequests) * 100
    
    const totalResponseTime = logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0)
    const avgResponseTime = totalResponseTime / totalRequests
    
    // Tier breakdown
    const tierBreakdown = logs.reduce((acc, log) => {
      acc[log.tier] = (acc[log.tier] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Endpoint breakdown
    const endpointBreakdown = logs.reduce((acc, log) => {
      acc[log.endpoint] = (acc[log.endpoint] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Hourly distribution
    const hourlyBreakdown = logs.reduce((acc, log) => {
      const hour = new Date(log.created_at).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyBreakdown[hour] || 0
    }))
    
    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      tierBreakdown,
      endpointBreakdown,
      hourlyDistribution
    }
    
  } catch (error) {
    console.error('Get signature analytics error:', error)
    throw error
  }
}

/**
 * Get recent signature logs for debugging
 */
export async function getRecentSignatureLogs(limit: number = 50): Promise<any[]> {
  try {
    const supabase = createServiceSupabaseClient()
    
    const { data: logs, error } = await supabase
      .from('signature_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      throw new Error(`Failed to fetch recent logs: ${error.message}`)
    }
    
    return logs || []
    
  } catch (error) {
    console.error('Get recent signature logs error:', error)
    throw error
  }
}