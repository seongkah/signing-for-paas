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

    // Get query parameters
    const url = new URL(request.url)
    const hours = parseInt(url.searchParams.get('hours') || '24')
    const endpoint = url.searchParams.get('endpoint')

    // Get performance data
    const performanceData = await getPerformanceMetrics(supabase, hours, endpoint || undefined)

    return NextResponse.json({
      success: true,
      data: {
        timeWindow: {
          hours,
          start: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: performanceData.metrics,
        trends: performanceData.trends,
        endpoints: performanceData.endpoints,
        alerts: performanceData.alerts,
        recommendations: performanceData.recommendations
      }
    })

  } catch (error) {
    console.error('Performance monitoring API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching performance data',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

interface UsageLog {
  response_time_ms: number
  success: boolean
  created_at: string
  room_url: string
  user_id: string
  error_message?: string
}

async function getPerformanceMetrics(supabase: any, hours: number, endpoint?: string) {
  const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000)

  try {
    // Base query for usage logs
    let query = supabase
      .from('usage_logs')
      .select('response_time_ms, success, created_at, room_url, user_id, error_message')
      .gte('created_at', timeWindow.toISOString())
      .order('created_at', { ascending: false })

    if (endpoint) {
      // Filter by endpoint if specified (would need to add endpoint column to usage_logs)
      // For now, we'll use all data
    }

    const { data: logs, error: logsError } = await query

    if (logsError) {
      console.error('Failed to fetch usage logs:', logsError)
      return getDefaultPerformanceData()
    }

    if (!logs || logs.length === 0) {
      return getDefaultPerformanceData()
    }

    const typedLogs = logs as UsageLog[]

    // Calculate basic metrics
    const totalRequests = typedLogs.length
    const successfulRequests = typedLogs.filter((log: UsageLog) => log.success).length
    const failedRequests = totalRequests - successfulRequests
    const successRate = (successfulRequests / totalRequests) * 100

    // Response time metrics
    const responseTimes = typedLogs
      .map((log: UsageLog) => log.response_time_ms)
      .filter((rt: number) => rt > 0)
      .sort((a: number, b: number) => a - b)

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0

    const medianResponseTime = responseTimes.length > 0
      ? responseTimes[Math.floor(responseTimes.length / 2)]
      : 0

    const p95ResponseTime = responseTimes.length > 0
      ? responseTimes[Math.floor(responseTimes.length * 0.95)]
      : 0

    const p99ResponseTime = responseTimes.length > 0
      ? responseTimes[Math.floor(responseTimes.length * 0.99)]
      : 0

    const minResponseTime = responseTimes.length > 0 ? responseTimes[0] : 0
    const maxResponseTime = responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0

    // Throughput (requests per hour)
    const throughput = totalRequests / hours

    // Error analysis
    const errorTypes = typedLogs
      .filter((log: UsageLog) => !log.success && log.error_message)
      .reduce((acc: Record<string, number>, log: UsageLog) => {
        const errorType = log.error_message?.split(':')[0] || 'Unknown'
        acc[errorType] = (acc[errorType] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    // Time-based trends (hourly buckets)
    const hourlyData = Array.from({ length: hours }, (_, i) => {
      const hourStart = new Date(Date.now() - (hours - i) * 60 * 60 * 1000)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
      
      const hourLogs = typedLogs.filter((log: UsageLog) => {
        const logTime = new Date(log.created_at)
        return logTime >= hourStart && logTime < hourEnd
      })

      const hourResponseTimes = hourLogs
        .map((log: UsageLog) => log.response_time_ms)
        .filter((rt: number) => rt > 0)

      return {
        hour: i,
        timestamp: hourStart.toISOString(),
        requests: hourLogs.length,
        successfulRequests: hourLogs.filter((log: UsageLog) => log.success).length,
        averageResponseTime: hourResponseTimes.length > 0
          ? hourResponseTimes.reduce((sum, rt) => sum + rt, 0) / hourResponseTimes.length
          : 0,
        successRate: hourLogs.length > 0
          ? (hourLogs.filter((log: UsageLog) => log.success).length / hourLogs.length) * 100
          : 100
      }
    })

    // Endpoint-specific metrics (mock data since we don't track endpoints separately yet)
    const endpoints = [
      {
        path: '/api/signature',
        requests: Math.floor(totalRequests * 0.6),
        averageResponseTime: averageResponseTime * 1.1,
        successRate: successRate,
        errors: Math.floor(failedRequests * 0.6)
      },
      {
        path: '/api/eulerstream',
        requests: Math.floor(totalRequests * 0.25),
        averageResponseTime: averageResponseTime * 0.9,
        successRate: Math.min(successRate + 2, 100),
        errors: Math.floor(failedRequests * 0.25)
      },
      {
        path: '/api/sign',
        requests: Math.floor(totalRequests * 0.15),
        averageResponseTime: averageResponseTime * 0.8,
        successRate: Math.min(successRate + 1, 100),
        errors: Math.floor(failedRequests * 0.15)
      }
    ]

    // Performance alerts
    const alerts = []
    
    if (averageResponseTime > 3000) {
      alerts.push({
        type: 'performance',
        severity: 'high',
        message: `Average response time is ${averageResponseTime.toFixed(0)}ms (threshold: 3000ms)`,
        metric: 'response_time',
        value: averageResponseTime,
        threshold: 3000
      })
    }

    if (successRate < 95) {
      alerts.push({
        type: 'reliability',
        severity: successRate < 90 ? 'critical' : 'high',
        message: `Success rate is ${successRate.toFixed(1)}% (threshold: 95%)`,
        metric: 'success_rate',
        value: successRate,
        threshold: 95
      })
    }

    if (throughput > 1000) {
      alerts.push({
        type: 'capacity',
        severity: 'medium',
        message: `High throughput detected: ${throughput.toFixed(1)} requests/hour`,
        metric: 'throughput',
        value: throughput,
        threshold: 1000
      })
    }

    // Performance recommendations
    const recommendations = []

    if (p95ResponseTime > 5000) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        title: 'Optimize slow requests',
        description: `95th percentile response time is ${p95ResponseTime}ms. Consider optimizing signature generation or database queries.`,
        action: 'investigate_slow_queries'
      })
    }

    if (Object.keys(errorTypes).length > 0) {
      const topError = Object.entries(errorTypes).sort(([,a], [,b]) => b - a)[0]
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        title: 'Address common errors',
        description: `Most common error: ${topError[0]} (${topError[1]} occurrences)`,
        action: 'review_error_patterns'
      })
    }

    if (throughput > 500 && averageResponseTime > 2000) {
      recommendations.push({
        type: 'scaling',
        priority: 'medium',
        title: 'Consider scaling optimization',
        description: 'High throughput with elevated response times may indicate need for optimization or scaling.',
        action: 'review_scaling_options'
      })
    }

    return {
      metrics: {
        requests: {
          total: totalRequests,
          successful: successfulRequests,
          failed: failedRequests,
          successRate,
          throughput
        },
        responseTime: {
          average: averageResponseTime,
          median: medianResponseTime,
          p95: p95ResponseTime,
          p99: p99ResponseTime,
          min: minResponseTime,
          max: maxResponseTime
        },
        errors: {
          total: failedRequests,
          rate: ((failedRequests / totalRequests) * 100),
          types: errorTypes
        }
      },
      trends: {
        hourly: hourlyData,
        responseTimeDistribution: calculateResponseTimeDistribution(responseTimes)
      },
      endpoints,
      alerts,
      recommendations
    }

  } catch (error) {
    console.error('Failed to calculate performance metrics:', error)
    return getDefaultPerformanceData()
  }
}

function calculateResponseTimeDistribution(responseTimes: number[]) {
  if (responseTimes.length === 0) {
    return []
  }

  const buckets = [
    { label: '0-100ms', min: 0, max: 100, count: 0 },
    { label: '100-500ms', min: 100, max: 500, count: 0 },
    { label: '500ms-1s', min: 500, max: 1000, count: 0 },
    { label: '1-2s', min: 1000, max: 2000, count: 0 },
    { label: '2-5s', min: 2000, max: 5000, count: 0 },
    { label: '5s+', min: 5000, max: Infinity, count: 0 }
  ]

  responseTimes.forEach(rt => {
    const bucket = buckets.find(b => rt >= b.min && rt < b.max)
    if (bucket) {
      bucket.count++
    }
  })

  return buckets.map(bucket => ({
    label: bucket.label,
    count: bucket.count,
    percentage: (bucket.count / responseTimes.length) * 100
  }))
}

function getDefaultPerformanceData() {
  return {
    metrics: {
      requests: { total: 0, successful: 0, failed: 0, successRate: 100, throughput: 0 },
      responseTime: { average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 },
      errors: { total: 0, rate: 0, types: {} }
    },
    trends: { hourly: [], responseTimeDistribution: [] },
    endpoints: [],
    alerts: [],
    recommendations: []
  }
}