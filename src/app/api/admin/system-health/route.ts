import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ErrorType } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request)
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error
        },
        { status: 401 }
      )
    }

    const { user } = authResult.context
    const supabase = createServerSupabaseClient()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'User not found in context',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
    }

    // Get system health metrics
    const healthData = await getSystemHealthMetrics(supabase)

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        health: healthData,
        status: determineOverallStatus(healthData)
      }
    })

  } catch (error) {
    console.error('System health API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching system health',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

async function getSystemHealthMetrics(supabase: any) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Database connectivity test
    const dbHealthStart = Date.now()
    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    const dbResponseTime = Date.now() - dbHealthStart

    // Recent request metrics
    const { data: recentRequests, error: requestsError } = await supabase
      .from('usage_logs')
      .select('success, response_time_ms, created_at')
      .gte('created_at', oneHourAgo.toISOString())

    // Daily metrics
    const { data: dailyRequests, error: dailyError } = await supabase
      .from('usage_logs')
      .select('success, response_time_ms')
      .gte('created_at', oneDayAgo.toISOString())

    // User activity
    const { data: activeUsers, error: usersError } = await supabase
      .from('usage_logs')
      .select('user_id')
      .gte('created_at', oneDayAgo.toISOString())

    // Error rates
    const { data: recentErrors, error: errorsError } = await supabase
      .from('usage_logs')
      .select('error_message')
      .eq('success', false)
      .gte('created_at', oneHourAgo.toISOString())

    const totalRecentRequests = recentRequests?.length || 0
    const successfulRecentRequests = recentRequests?.filter((r: any) => r.success).length || 0
    const recentSuccessRate = totalRecentRequests > 0 ? (successfulRecentRequests / totalRecentRequests) * 100 : 0

    const totalDailyRequests = dailyRequests?.length || 0
    const successfulDailyRequests = dailyRequests?.filter((r: any) => r.success).length || 0
    const dailySuccessRate = totalDailyRequests > 0 ? (successfulDailyRequests / totalDailyRequests) * 100 : 0

    const avgResponseTime = dailyRequests && dailyRequests.length > 0
      ? dailyRequests.reduce((sum: number, r: any) => sum + r.response_time_ms, 0) / dailyRequests.length
      : 0

    const uniqueActiveUsers = activeUsers ? new Set(activeUsers.map((u: any) => u.user_id)).size : 0

    return {
      database: {
        connected: !dbError,
        responseTime: dbResponseTime,
        status: !dbError && dbResponseTime < 1000 ? 'healthy' : 'degraded'
      },
      requests: {
        lastHour: {
          total: totalRecentRequests,
          successful: successfulRecentRequests,
          successRate: recentSuccessRate,
          errors: recentErrors?.length || 0
        },
        last24Hours: {
          total: totalDailyRequests,
          successful: successfulDailyRequests,
          successRate: dailySuccessRate,
          averageResponseTime: avgResponseTime
        }
      },
      users: {
        activeInLast24Hours: uniqueActiveUsers
      },
      performance: {
        averageResponseTime: avgResponseTime,
        status: avgResponseTime < 2000 ? 'good' : avgResponseTime < 5000 ? 'degraded' : 'poor'
      },
      errors: {
        recentCount: recentErrors?.length || 0,
        status: (recentErrors?.length || 0) === 0 ? 'good' : (recentErrors?.length || 0) < 10 ? 'warning' : 'critical'
      }
    }
  } catch (error) {
    console.error('Failed to get system health metrics:', error)
    return {
      database: {
        connected: false,
        responseTime: 0,
        status: 'unhealthy'
      },
      requests: {
        lastHour: { total: 0, successful: 0, successRate: 0, errors: 0 },
        last24Hours: { total: 0, successful: 0, successRate: 0, averageResponseTime: 0 }
      },
      users: {
        activeInLast24Hours: 0
      },
      performance: {
        averageResponseTime: 0,
        status: 'unknown'
      },
      errors: {
        recentCount: 0,
        status: 'unknown'
      }
    }
  }
}

function determineOverallStatus(healthData: any): 'healthy' | 'degraded' | 'unhealthy' {
  if (!healthData.database.connected) {
    return 'unhealthy'
  }

  if (healthData.database.status === 'degraded' ||
      healthData.performance.status === 'poor' ||
      healthData.errors.status === 'critical') {
    return 'unhealthy'
  }

  if (healthData.performance.status === 'degraded' ||
      healthData.errors.status === 'warning' ||
      healthData.requests.last24Hours.successRate < 90) {
    return 'degraded'
  }

  return 'healthy'
}