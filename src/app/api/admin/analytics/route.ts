import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { analyticsOps } from '@/lib/database-operations'
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

    // For now, allow any authenticated user to access system analytics
    // In production, you might want to add admin role checking
    const { user } = authResult.context

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
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    // Get system analytics
    const systemAnalytics = await analyticsOps.getSystemAnalytics(days)
    if (!systemAnalytics) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch system analytics',
            code: 'SYSTEM_ANALYTICS_FETCH_FAILED',
            timestamp: new Date()
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        requestedBy: {
          id: user.id,
          tier: user.tier
        },
        period: {
          days,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        analytics: systemAnalytics,
        insights: generateSystemInsights(systemAnalytics)
      }
    })

  } catch (error) {
    console.error('System analytics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching system analytics',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

function generateSystemInsights(analytics: any): Array<{
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  metric?: string
  value?: number
}> {
  const insights: Array<{
    type: 'success' | 'warning' | 'error' | 'info'
    title: string
    message: string
    metric?: string
    value?: number
  }> = []

  // Success rate insights
  if (analytics.successRate >= 95) {
    insights.push({
      type: 'success',
      title: 'Excellent Service Reliability',
      message: `System is performing excellently with ${analytics.successRate.toFixed(1)}% success rate`,
      metric: 'success_rate',
      value: analytics.successRate
    })
  } else if (analytics.successRate >= 90) {
    insights.push({
      type: 'info',
      title: 'Good Service Reliability',
      message: `System is performing well with ${analytics.successRate.toFixed(1)}% success rate`,
      metric: 'success_rate',
      value: analytics.successRate
    })
  } else if (analytics.successRate >= 80) {
    insights.push({
      type: 'warning',
      title: 'Service Reliability Concern',
      message: `Success rate of ${analytics.successRate.toFixed(1)}% indicates potential issues that need attention`,
      metric: 'success_rate',
      value: analytics.successRate
    })
  } else {
    insights.push({
      type: 'error',
      title: 'Critical Service Issues',
      message: `Low success rate of ${analytics.successRate.toFixed(1)}% requires immediate attention`,
      metric: 'success_rate',
      value: analytics.successRate
    })
  }

  // Response time insights
  if (analytics.averageResponseTime <= 1000) {
    insights.push({
      type: 'success',
      title: 'Fast Response Times',
      message: `Average response time of ${analytics.averageResponseTime.toFixed(0)}ms is excellent`,
      metric: 'response_time',
      value: analytics.averageResponseTime
    })
  } else if (analytics.averageResponseTime <= 2000) {
    insights.push({
      type: 'info',
      title: 'Good Response Times',
      message: `Average response time of ${analytics.averageResponseTime.toFixed(0)}ms is acceptable`,
      metric: 'response_time',
      value: analytics.averageResponseTime
    })
  } else if (analytics.averageResponseTime <= 5000) {
    insights.push({
      type: 'warning',
      title: 'Slow Response Times',
      message: `Average response time of ${analytics.averageResponseTime.toFixed(0)}ms may impact user experience`,
      metric: 'response_time',
      value: analytics.averageResponseTime
    })
  } else {
    insights.push({
      type: 'error',
      title: 'Very Slow Response Times',
      message: `Average response time of ${analytics.averageResponseTime.toFixed(0)}ms requires optimization`,
      metric: 'response_time',
      value: analytics.averageResponseTime
    })
  }

  // User engagement insights
  const engagementRate = analytics.totalUsers > 0 ? (analytics.activeUsers / analytics.totalUsers) * 100 : 0
  if (engagementRate >= 50) {
    insights.push({
      type: 'success',
      title: 'High User Engagement',
      message: `${engagementRate.toFixed(1)}% of users are actively using the service`,
      metric: 'engagement_rate',
      value: engagementRate
    })
  } else if (engagementRate >= 25) {
    insights.push({
      type: 'info',
      title: 'Moderate User Engagement',
      message: `${engagementRate.toFixed(1)}% of users are actively using the service`,
      metric: 'engagement_rate',
      value: engagementRate
    })
  } else {
    insights.push({
      type: 'warning',
      title: 'Low User Engagement',
      message: `Only ${engagementRate.toFixed(1)}% of users are actively using the service`,
      metric: 'engagement_rate',
      value: engagementRate
    })
  }

  // Top errors insight
  if (analytics.topErrors && analytics.topErrors.length > 0) {
    const topError = analytics.topErrors[0]
    insights.push({
      type: 'warning',
      title: 'Most Common Error',
      message: `"${topError.error}" occurred ${topError.count} times and should be investigated`,
      metric: 'top_error_count',
      value: topError.count
    })
  }

  // Usage by tier insights
  const freeUsers = analytics.usageByTier.find((tier: any) => tier.tier === 'free')
  const apiKeyUsers = analytics.usageByTier.find((tier: any) => tier.tier === 'api_key')
  
  if (freeUsers && apiKeyUsers) {
    const freeToApiRatio = freeUsers.users > 0 ? apiKeyUsers.users / freeUsers.users : 0
    if (freeToApiRatio > 0.1) {
      insights.push({
        type: 'success',
        title: 'Good API Key Adoption',
        message: `${(freeToApiRatio * 100).toFixed(1)}% of users have upgraded to API keys`,
        metric: 'api_key_adoption',
        value: freeToApiRatio * 100
      })
    } else {
      insights.push({
        type: 'info',
        title: 'API Key Adoption Opportunity',
        message: `Only ${(freeToApiRatio * 100).toFixed(1)}% of users have API keys - consider promoting upgrades`,
        metric: 'api_key_adoption',
        value: freeToApiRatio * 100
      })
    }
  }

  return insights
}