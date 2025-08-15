// Simple functions that create clients when needed
import { createServiceSupabaseClient } from './supabase-server'
import { User, ApiKey } from '@/types'

/**
 * User database operations
 */
export const userOps = {
  async getUserById(id: string): Promise<User | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      return {
        id: data.id,
        email: data.email,
        tier: data.tier,
        createdAt: new Date(data.created_at),
        lastLogin: data.last_login ? new Date(data.last_login) : undefined,
        isActive: data.is_active
      }
    } catch (error) {
      console.error('Failed to get user by ID:', error)
      return null
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !data) {
        return null
      }

      return {
        id: data.id,
        email: data.email,
        tier: data.tier,
        createdAt: new Date(data.created_at),
        lastLogin: data.last_login ? new Date(data.last_login) : undefined,
        isActive: data.is_active
      }
    } catch (error) {
      console.error('Failed to get user by email:', error)
      return null
    }
  },

  async createUser(userData: {
    id: string
    email: string
    tier?: 'free' | 'api_key'
    isActive?: boolean
  }): Promise<User | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userData.id,
          email: userData.email,
          tier: userData.tier || 'free',
          is_active: userData.isActive !== undefined ? userData.isActive : true
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('Failed to create user:', error)
        return null
      }

      return {
        id: data.id,
        email: data.email,
        tier: data.tier,
        createdAt: new Date(data.created_at),
        lastLogin: data.last_login ? new Date(data.last_login) : undefined,
        isActive: data.is_active
      }
    } catch (error) {
      console.error('Failed to create user:', error)
      return null
    }
  },

  async updateUser(id: string, updates: {
    email?: string
    tier?: 'free' | 'api_key'
    lastLogin?: Date
    isActive?: boolean
  }): Promise<User | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const updateData: any = {}
      
      if (updates.email) updateData.email = updates.email
      if (updates.tier) updateData.tier = updates.tier
      if (updates.lastLogin) updateData.last_login = updates.lastLogin.toISOString()
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('Failed to update user:', error)
        return null
      }

      return {
        id: data.id,
        email: data.email,
        tier: data.tier,
        createdAt: new Date(data.created_at),
        lastLogin: data.last_login ? new Date(data.last_login) : undefined,
        isActive: data.is_active
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      return null
    }
  },

  async getUserStats(id: string): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    apiKeysCount: number
    lastActivity?: Date
  } | null> {
    try {
      const supabase = createServiceSupabaseClient()
      
      // Get usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('usage_logs')
        .select('success, created_at')
        .eq('user_id', id)

      if (usageError) {
        console.error('Failed to get usage stats:', usageError)
        return null
      }

      // Get API keys count
      const { count: apiKeysCount, error: keysError } = await supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('is_active', true)

      if (keysError) {
        console.error('Failed to get API keys count:', keysError)
        return null
      }

      const totalRequests = usageData?.length || 0
      const successfulRequests = usageData?.filter(log => log.success).length || 0
      const failedRequests = totalRequests - successfulRequests
      
      const lastActivity = usageData && usageData.length > 0 
        ? new Date(Math.max(...usageData.map(log => new Date(log.created_at).getTime())))
        : undefined

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        apiKeysCount: apiKeysCount || 0,
        lastActivity
      }
    } catch (error) {
      console.error('Failed to get user stats:', error)
      return null
    }
  }
}

/**
 * API Key database operations
 */
export const apiKeyOps = {
  async getApiKeyByHash(keyHash: string): Promise<(ApiKey & { user: User }) | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const { data, error } = await supabase
        .from('api_keys')
        .select(`
          *,
          users!inner (*)
        `)
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      const user = Array.isArray(data.users) ? data.users[0] : data.users

      return {
        id: data.id,
        userId: data.user_id,
        keyHash: data.key_hash,
        name: data.name,
        createdAt: new Date(data.created_at),
        lastUsed: data.last_used ? new Date(data.last_used) : undefined,
        isActive: data.is_active,
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier,
          createdAt: new Date(user.created_at),
          lastLogin: user.last_login ? new Date(user.last_login) : undefined,
          isActive: user.is_active
        }
      }
    } catch (error) {
      console.error('Failed to get API key by hash:', error)
      return null
    }
  }
}

/**
 * Usage logging operations
 */
export const usageLogOps = {
  async logRequest(logData: {
    userId?: string
    apiKeyId?: string
    roomUrl: string
    success: boolean
    responseTimeMs: number
    errorMessage?: string
  }): Promise<boolean> {
    try {
      const supabase = createServiceSupabaseClient()
      const { error } = await supabase
        .from('usage_logs')
        .insert({
          user_id: logData.userId || null,
          api_key_id: logData.apiKeyId || null,
          room_url: logData.roomUrl,
          success: logData.success,
          response_time_ms: logData.responseTimeMs,
          error_message: logData.errorMessage || null
        })

      return !error
    } catch (error) {
      console.error('Failed to log request:', error)
      return false
    }
  },

  async getUserUsageLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Array<{
    id: string
    roomUrl: string
    success: boolean
    responseTimeMs: number
    errorMessage?: string
    createdAt: Date
    apiKeyName?: string
  }>> {
    try {
      const supabase = createServiceSupabaseClient()
      const { data, error } = await supabase
        .from('usage_logs')
        .select(`
          id,
          room_url,
          success,
          response_time_ms,
          error_message,
          created_at,
          api_keys (name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) {
        console.error('Failed to get user usage logs:', error)
        return []
      }

      return data.map(log => ({
        id: log.id,
        roomUrl: log.room_url,
        success: log.success,
        responseTimeMs: log.response_time_ms,
        errorMessage: log.error_message || undefined,
        createdAt: new Date(log.created_at),
        apiKeyName: (log.api_keys as any)?.name || undefined
      }))
    } catch (error) {
      console.error('Failed to get user usage logs:', error)
      return []
    }
  }
}

/**
 * Quota tracking and analytics operations
 */
export const quotaOps = {
  async getUserQuotaUsage(userId: string, date?: string): Promise<{
    requestCount: number
    dailyLimit: number
    remaining: number
    resetTime: Date
  } | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const targetDate = date || new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('quota_usage')
        .select('request_count')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Failed to get quota usage:', error)
        return null
      }

      const requestCount = data?.request_count || 0
      const dailyLimit = 100 // Free tier daily limit
      const remaining = Math.max(0, dailyLimit - requestCount)
      
      const resetTime = new Date()
      resetTime.setDate(resetTime.getDate() + 1)
      resetTime.setHours(0, 0, 0, 0)

      return {
        requestCount,
        dailyLimit,
        remaining,
        resetTime
      }
    } catch (error) {
      console.error('Failed to get quota usage:', error)
      return null
    }
  },

  async updateQuotaUsage(userId: string, increment: number = 1): Promise<boolean> {
    try {
      const supabase = createServiceSupabaseClient()
      const today = new Date().toISOString().split('T')[0]
      
      // Use upsert with increment logic
      const { error } = await supabase.rpc('increment_quota_usage', {
        p_user_id: userId,
        p_date: today,
        p_increment: increment
      })

      if (error) {
        console.error('Failed to update quota usage:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to update quota usage:', error)
      return false
    }
  },

  async getUserQuotaHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{
    date: string
    requestCount: number
    dailyLimit: number
  }>> {
    try {
      const supabase = createServiceSupabaseClient()
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)

      const { data, error } = await supabase
        .from('quota_usage')
        .select('date, request_count')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Failed to get quota history:', error)
        return []
      }

      const dailyLimit = 100 // Free tier daily limit
      return (data || []).map(item => ({
        date: item.date,
        requestCount: item.request_count,
        dailyLimit
      }))
    } catch (error) {
      console.error('Failed to get quota history:', error)
      return []
    }
  }
}

/**
 * Analytics and reporting operations
 */
export const analyticsOps = {
  async getUserAnalytics(userId: string, days: number = 30): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    successRate: number
    averageResponseTime: number
    peakResponseTime: number
    requestsPerDay: Array<{ date: string; count: number }>
    errorBreakdown: Array<{ error: string; count: number }>
    hourlyDistribution: Array<{ hour: number; count: number }>
  } | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)

      // Get usage logs for the period
      const { data: logs, error } = await supabase
        .from('usage_logs')
        .select('success, response_time_ms, error_message, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) {
        console.error('Failed to get user analytics:', error)
        return null
      }

      if (!logs || logs.length === 0) {
        return {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          successRate: 0,
          averageResponseTime: 0,
          peakResponseTime: 0,
          requestsPerDay: [],
          errorBreakdown: [],
          hourlyDistribution: []
        }
      }

      const totalRequests = logs.length
      const successfulRequests = logs.filter(log => log.success).length
      const failedRequests = totalRequests - successfulRequests
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

      const responseTimes = logs.map(log => log.response_time_ms)
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const peakResponseTime = Math.max(...responseTimes)

      // Requests per day
      const requestsPerDay = logs.reduce((acc, log) => {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const requestsPerDayArray = Object.entries(requestsPerDay).map(([date, count]) => ({
        date,
        count
      }))

      // Error breakdown
      const errorBreakdown = logs
        .filter(log => !log.success && log.error_message)
        .reduce((acc, log) => {
          const error = log.error_message!
          acc[error] = (acc[error] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const errorBreakdownArray = Object.entries(errorBreakdown).map(([error, count]) => ({
        error,
        count
      }))

      // Hourly distribution
      const hourlyDistribution = logs.reduce((acc, log) => {
        const hour = new Date(log.created_at).getHours()
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      const hourlyDistributionArray = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourlyDistribution[hour] || 0
      }))

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        averageResponseTime,
        peakResponseTime,
        requestsPerDay: requestsPerDayArray,
        errorBreakdown: errorBreakdownArray,
        hourlyDistribution: hourlyDistributionArray
      }
    } catch (error) {
      console.error('Failed to get user analytics:', error)
      return null
    }
  },

  async getSystemAnalytics(days: number = 30): Promise<{
    totalUsers: number
    activeUsers: number
    totalRequests: number
    successRate: number
    averageResponseTime: number
    topErrors: Array<{ error: string; count: number }>
    usageByTier: Array<{ tier: string; requests: number; users: number }>
  } | null> {
    try {
      const supabase = createServiceSupabaseClient()
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)

      // Get system-wide statistics
      const [usersResult, logsResult] = await Promise.all([
        supabase.from('users').select('id, tier, created_at'),
        supabase
          .from('usage_logs')
          .select('user_id, success, response_time_ms, error_message, users!inner(tier)')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ])

      if (usersResult.error || logsResult.error) {
        console.error('Failed to get system analytics:', usersResult.error || logsResult.error)
        return null
      }

      const users = usersResult.data || []
      const logs = logsResult.data || []

      const totalUsers = users.length
      const activeUserIds = new Set(logs.map(log => log.user_id).filter(Boolean))
      const activeUsers = activeUserIds.size

      const totalRequests = logs.length
      const successfulRequests = logs.filter(log => log.success).length
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

      const responseTimes = logs.map(log => log.response_time_ms)
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0

      // Top errors
      const errorCounts = logs
        .filter(log => !log.success && log.error_message)
        .reduce((acc, log) => {
          const error = log.error_message!
          acc[error] = (acc[error] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const topErrors = Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))

      // Usage by tier
      const tierStats = logs.reduce((acc, log) => {
        const tier = (log.users as any)?.tier || 'unknown'
        if (!acc[tier]) {
          acc[tier] = { requests: 0, userIds: new Set() }
        }
        acc[tier].requests++
        if (log.user_id) {
          acc[tier].userIds.add(log.user_id)
        }
        return acc
      }, {} as Record<string, { requests: number; userIds: Set<string> }>)

      const usageByTier = Object.entries(tierStats).map(([tier, stats]) => ({
        tier,
        requests: stats.requests,
        users: stats.userIds.size
      }))

      return {
        totalUsers,
        activeUsers,
        totalRequests,
        successRate,
        averageResponseTime,
        topErrors,
        usageByTier
      }
    } catch (error) {
      console.error('Failed to get system analytics:', error)
      return null
    }
  }
}