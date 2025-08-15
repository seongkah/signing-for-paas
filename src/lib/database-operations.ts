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