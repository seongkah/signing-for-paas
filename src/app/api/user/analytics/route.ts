import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkQuotaWarnings } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { analyticsOps, quotaOps } from '@/lib/database-operations'
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
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const includeWarnings = searchParams.get('warnings') === 'true'

    // Get user analytics
    const analytics = await analyticsOps.getUserAnalytics(user.id, days)
    if (!analytics) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch user analytics',
            code: 'ANALYTICS_FETCH_FAILED',
            timestamp: new Date()
          }
        },
        { status: 500 }
      )
    }

    // Get current quota status
    const quotaStatus = await quotaOps.getUserQuotaUsage(user.id)
    const quotaHistory = await quotaOps.getUserQuotaHistory(user.id, days)

    // Get quota warnings if requested
    let warnings: any[] = []
    if (includeWarnings) {
      const warningResult = await checkQuotaWarnings(authResult.context, supabase)
      warnings = warningResult.warnings
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          tier: user.tier
        },
        period: {
          days,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        analytics,
        quota: {
          current: quotaStatus,
          history: quotaHistory
        },
        warnings
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching analytics',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}