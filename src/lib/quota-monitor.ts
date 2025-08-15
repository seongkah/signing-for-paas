import { createServiceSupabaseClient } from './supabase-server'
import { quotaOps, analyticsOps } from './database-operations'
import { RATE_LIMITS } from './auth-middleware'

export interface QuotaAlert {
  userId: string
  type: 'approaching_limit' | 'limit_exceeded' | 'unusual_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  data: any
  timestamp: Date
}

export interface SystemQuotaStatus {
  totalUsers: number
  activeUsers: number
  freeUsers: number
  apiKeyUsers: number
  totalRequests: number
  quotaUtilization: {
    free: {
      averageUsage: number
      peakUsage: number
      usersNearLimit: number
    }
    apiKey: {
      totalRequests: number
      averagePerUser: number
    }
  }
  alerts: QuotaAlert[]
}

/**
 * Monitor quota usage and generate alerts
 */
export class QuotaMonitor {
  private supabase = createServiceSupabaseClient()

  /**
   * Check for users approaching their quotas and generate alerts
   */
  async checkQuotaAlerts(): Promise<QuotaAlert[]> {
    const alerts: QuotaAlert[] = []
    
    try {
      // Get all free tier users
      const { data: freeUsers, error: usersError } = await this.supabase
        .from('users')
        .select('id, email')
        .eq('tier', 'free')
        .eq('is_active', true)

      if (usersError || !freeUsers) {
        console.error('Failed to fetch free users for quota monitoring:', usersError)
        return alerts
      }

      // Check each user's quota status
      for (const user of freeUsers) {
        const quotaStatus = await quotaOps.getUserQuotaUsage(user.id)
        
        if (quotaStatus) {
          const usagePercentage = (quotaStatus.requestCount / quotaStatus.dailyLimit) * 100

          // Alert for users approaching limit (90% threshold)
          if (usagePercentage >= 90 && usagePercentage < 100) {
            alerts.push({
              userId: user.id,
              type: 'approaching_limit',
              severity: 'high',
              message: `User ${user.email} has used ${usagePercentage.toFixed(1)}% of daily quota (${quotaStatus.requestCount}/${quotaStatus.dailyLimit})`,
              data: {
                email: user.email,
                usagePercentage,
                requestCount: quotaStatus.requestCount,
                dailyLimit: quotaStatus.dailyLimit,
                remaining: quotaStatus.remaining
              },
              timestamp: new Date()
            })
          }

          // Alert for users who exceeded limit
          if (usagePercentage >= 100) {
            alerts.push({
              userId: user.id,
              type: 'limit_exceeded',
              severity: 'critical',
              message: `User ${user.email} has exceeded daily quota (${quotaStatus.requestCount}/${quotaStatus.dailyLimit})`,
              data: {
                email: user.email,
                usagePercentage,
                requestCount: quotaStatus.requestCount,
                dailyLimit: quotaStatus.dailyLimit,
                remaining: quotaStatus.remaining
              },
              timestamp: new Date()
            })
          }
        }

        // Check for unusual activity patterns
        const analytics = await analyticsOps.getUserAnalytics(user.id, 1) // Last 24 hours
        if (analytics && analytics.totalRequests > 0) {
          // Alert for unusual burst activity
          if (analytics.totalRequests > RATE_LIMITS.FREE_TIER.DAILY_LIMIT * 0.8 && analytics.hourlyDistribution) {
            const peakHour = analytics.hourlyDistribution.reduce((max, hour) => 
              hour.count > max.count ? hour : max
            )
            
            if (peakHour.count > RATE_LIMITS.FREE_TIER.HOURLY_LIMIT * 0.9) {
              alerts.push({
                userId: user.id,
                type: 'unusual_activity',
                severity: 'medium',
                message: `User ${user.email} showed unusual burst activity: ${peakHour.count} requests in hour ${peakHour.hour}`,
                data: {
                  email: user.email,
                  peakHour: peakHour.hour,
                  peakCount: peakHour.count,
                  totalRequests: analytics.totalRequests,
                  hourlyLimit: RATE_LIMITS.FREE_TIER.HOURLY_LIMIT
                },
                timestamp: new Date()
              })
            }
          }
        }
      }

      return alerts
    } catch (error) {
      console.error('Failed to check quota alerts:', error)
      return alerts
    }
  }

  /**
   * Get system-wide quota status
   */
  async getSystemQuotaStatus(): Promise<SystemQuotaStatus | null> {
    try {
      // Get user counts by tier
      const { data: userStats, error: userStatsError } = await this.supabase
        .from('users')
        .select('tier, is_active')

      if (userStatsError) {
        console.error('Failed to get user stats:', userStatsError)
        return null
      }

      const totalUsers = userStats?.length || 0
      const freeUsers = userStats?.filter(u => u.tier === 'free' && u.is_active).length || 0
      const apiKeyUsers = userStats?.filter(u => u.tier === 'api_key' && u.is_active).length || 0

      // Get today's usage statistics
      const today = new Date().toISOString().split('T')[0]
      const { data: todayUsage, error: usageError } = await this.supabase
        .from('quota_usage')
        .select('user_id, request_count, users!inner(tier)')
        .eq('date', today)

      if (usageError) {
        console.error('Failed to get today usage:', usageError)
        return null
      }

      // Get active users (users who made requests today)
      const activeUserIds = new Set(todayUsage?.map(u => u.user_id) || [])
      const activeUsers = activeUserIds.size

      // Calculate free tier quota utilization
      const freeUsage = todayUsage?.filter(u => (u.users as any)?.tier === 'free') || []
      const freeUsageCounts = freeUsage.map(u => u.request_count)
      const averageFreeUsage = freeUsageCounts.length > 0 
        ? freeUsageCounts.reduce((sum, count) => sum + count, 0) / freeUsageCounts.length 
        : 0
      const peakFreeUsage = freeUsageCounts.length > 0 ? Math.max(...freeUsageCounts) : 0
      const usersNearLimit = freeUsage.filter(u => u.request_count >= RATE_LIMITS.FREE_TIER.DAILY_LIMIT * 0.8).length

      // Calculate API key usage
      const apiKeyUsage = todayUsage?.filter(u => (u.users as any)?.tier === 'api_key') || []
      const totalApiKeyRequests = apiKeyUsage.reduce((sum, u) => sum + u.request_count, 0)
      const averageApiKeyUsage = apiKeyUsers > 0 ? totalApiKeyRequests / apiKeyUsers : 0

      // Get total requests
      const totalRequests = todayUsage?.reduce((sum, u) => sum + u.request_count, 0) || 0

      // Generate alerts
      const alerts = await this.checkQuotaAlerts()

      return {
        totalUsers,
        activeUsers,
        freeUsers,
        apiKeyUsers,
        totalRequests,
        quotaUtilization: {
          free: {
            averageUsage: averageFreeUsage,
            peakUsage: peakFreeUsage,
            usersNearLimit
          },
          apiKey: {
            totalRequests: totalApiKeyRequests,
            averagePerUser: averageApiKeyUsage
          }
        },
        alerts
      }
    } catch (error) {
      console.error('Failed to get system quota status:', error)
      return null
    }
  }

  /**
   * Get quota recommendations for a user
   */
  async getUserQuotaRecommendations(userId: string): Promise<Array<{
    type: 'optimization' | 'upgrade' | 'warning' | 'info'
    title: string
    description: string
    action?: string
    priority: 'low' | 'medium' | 'high'
  }>> {
    const recommendations: Array<{
      type: 'optimization' | 'upgrade' | 'warning' | 'info'
      title: string
      description: string
      action?: string
      priority: 'low' | 'medium' | 'high'
    }> = []

    try {
      // Get user info
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('tier, email')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return recommendations
      }

      // Get user analytics for the past week
      const analytics = await analyticsOps.getUserAnalytics(userId, 7)
      const quotaStatus = await quotaOps.getUserQuotaUsage(userId)

      if (!analytics || !quotaStatus) {
        return recommendations
      }

      if (user.tier === 'free') {
        const dailyAverage = analytics.totalRequests / 7
        const usagePercentage = (quotaStatus.requestCount / quotaStatus.dailyLimit) * 100

        // High usage recommendations
        if (dailyAverage > RATE_LIMITS.FREE_TIER.DAILY_LIMIT * 0.7) {
          recommendations.push({
            type: 'upgrade',
            title: 'Consider API Key Upgrade',
            description: `Your average daily usage (${dailyAverage.toFixed(1)} requests) is approaching the free tier limit. An API key provides unlimited access.`,
            action: 'upgrade_to_api_key',
            priority: 'high'
          })
        }

        // Usage pattern optimization
        if (analytics.hourlyDistribution) {
          const peakHour = analytics.hourlyDistribution.reduce((max, hour) => 
            hour.count > max.count ? hour : max
          )
          
          if (peakHour.count > RATE_LIMITS.FREE_TIER.HOURLY_LIMIT * 0.8) {
            recommendations.push({
              type: 'optimization',
              title: 'Optimize Request Timing',
              description: `You have high usage during hour ${peakHour.hour} (${peakHour.count} requests). Consider spreading requests throughout the day.`,
              action: 'optimize_timing',
              priority: 'medium'
            })
          }
        }

        // Error rate recommendations
        if (analytics.successRate < 90) {
          recommendations.push({
            type: 'optimization',
            title: 'Improve Request Success Rate',
            description: `Your success rate is ${analytics.successRate.toFixed(1)}%. Review error patterns to optimize your requests and save quota.`,
            action: 'review_errors',
            priority: 'medium'
          })
        }

        // Current usage warning
        if (usagePercentage > 80) {
          recommendations.push({
            type: 'warning',
            title: 'High Daily Usage',
            description: `You've used ${usagePercentage.toFixed(1)}% of today's quota. Monitor usage to avoid hitting limits.`,
            priority: 'high'
          })
        }
      } else {
        // API key user recommendations
        recommendations.push({
          type: 'info',
          title: 'Unlimited Access Active',
          description: 'You have unlimited access with your API key. Monitor usage for cost optimization insights.',
          priority: 'low'
        })

        if (analytics.averageResponseTime > 2000) {
          recommendations.push({
            type: 'optimization',
            title: 'Optimize Request Performance',
            description: `Average response time is ${analytics.averageResponseTime.toFixed(0)}ms. Consider request optimization techniques.`,
            action: 'optimize_performance',
            priority: 'medium'
          })
        }
      }

      return recommendations
    } catch (error) {
      console.error('Failed to get user quota recommendations:', error)
      return recommendations
    }
  }
}

// Export singleton instance
export const quotaMonitor = new QuotaMonitor()