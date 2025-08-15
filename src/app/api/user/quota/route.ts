import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, RATE_LIMITS } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { quotaOps } from '@/lib/database-operations'
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

    // Get current rate limit status
    const rateLimitResult = await checkRateLimit(authResult.context, supabase)
    
    // Get quota usage for today
    const quotaUsage = await quotaOps.getUserQuotaUsage(user.id)
    
    // Get quota history
    const { searchParams } = new URL(request.url)
    const historyDays = parseInt(searchParams.get('history') || '7', 10)
    const quotaHistory = await quotaOps.getUserQuotaHistory(user.id, historyDays)

    // Get tier limits
    const tierLimits = user.tier === 'api_key' ? RATE_LIMITS.API_KEY : RATE_LIMITS.FREE_TIER

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          tier: user.tier
        },
        limits: {
          daily: tierLimits.DAILY_LIMIT,
          hourly: tierLimits.HOURLY_LIMIT,
          burst: tierLimits.BURST_LIMIT,
          burstWindow: tierLimits.WINDOW_SIZE
        },
        current: {
          allowed: rateLimitResult.allowed,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
          limits: rateLimitResult.limits,
          error: rateLimitResult.error
        },
        today: quotaUsage,
        history: quotaHistory,
        recommendations: generateQuotaRecommendations(user.tier, quotaUsage, rateLimitResult.limits)
      }
    })

  } catch (error) {
    console.error('Quota API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching quota information',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

function generateQuotaRecommendations(
  tier: 'free' | 'api_key',
  quotaUsage: any,
  limits: any
): Array<{
  type: 'info' | 'warning' | 'upgrade'
  message: string
  action?: string
}> {
  const recommendations: Array<{
    type: 'info' | 'warning' | 'upgrade'
    message: string
    action?: string
  }> = []

  if (tier === 'free' && quotaUsage) {
    const usagePercentage = (quotaUsage.requestCount / quotaUsage.dailyLimit) * 100

    if (usagePercentage >= 90) {
      recommendations.push({
        type: 'upgrade',
        message: 'You\'re approaching your daily limit. Consider upgrading to an API key for unlimited access.',
        action: 'upgrade_to_api_key'
      })
    } else if (usagePercentage >= 75) {
      recommendations.push({
        type: 'warning',
        message: `You've used ${usagePercentage.toFixed(1)}% of your daily quota. Monitor your usage to avoid hitting limits.`,
        action: 'monitor_usage'
      })
    } else if (usagePercentage >= 50) {
      recommendations.push({
        type: 'info',
        message: `You've used ${usagePercentage.toFixed(1)}% of your daily quota. You're on track for moderate usage.`
      })
    }

    if (limits?.burst && limits.burst.used >= limits.burst.limit * 0.8) {
      recommendations.push({
        type: 'warning',
        message: 'High request frequency detected. Consider spacing out your requests to avoid burst limits.',
        action: 'reduce_frequency'
      })
    }
  }

  if (tier === 'api_key') {
    recommendations.push({
      type: 'info',
      message: 'You have unlimited access with your API key. Monitor your usage for cost optimization.'
    })
  }

  return recommendations
}