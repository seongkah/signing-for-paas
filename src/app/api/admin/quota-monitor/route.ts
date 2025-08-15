import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { quotaMonitor } from '@/lib/quota-monitor'
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

    // For now, allow any authenticated user to access quota monitoring
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

    // Get system quota status
    const systemStatus = await quotaMonitor.getSystemQuotaStatus()
    if (!systemStatus) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch system quota status',
            code: 'QUOTA_STATUS_FETCH_FAILED',
            timestamp: new Date()
          }
        },
        { status: 500 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const includeRecommendations = searchParams.get('recommendations') === 'true'

    let userRecommendations: any = null
    if (includeRecommendations) {
      userRecommendations = await quotaMonitor.getUserQuotaRecommendations(user.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        requestedBy: {
          id: user.id,
          tier: user.tier
        },
        timestamp: new Date().toISOString(),
        system: systemStatus,
        userRecommendations,
        summary: {
          totalAlerts: systemStatus.alerts.length,
          criticalAlerts: systemStatus.alerts.filter(a => a.severity === 'critical').length,
          highAlerts: systemStatus.alerts.filter(a => a.severity === 'high').length,
          quotaUtilizationRate: systemStatus.freeUsers > 0 
            ? (systemStatus.quotaUtilization.free.averageUsage / 100) * 100 
            : 0,
          activeUserRate: systemStatus.totalUsers > 0 
            ? (systemStatus.activeUsers / systemStatus.totalUsers) * 100 
            : 0
        }
      }
    })

  } catch (error) {
    console.error('Quota monitor API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching quota monitoring data',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { action, userId } = body

    if (action === 'check_alerts') {
      // Manually trigger alert checking
      const alerts = await quotaMonitor.checkQuotaAlerts()
      
      return NextResponse.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          timestamp: new Date().toISOString()
        }
      })
    }

    if (action === 'get_user_recommendations' && userId) {
      // Get recommendations for a specific user
      const recommendations = await quotaMonitor.getUserQuotaRecommendations(userId)
      
      return NextResponse.json({
        success: true,
        data: {
          userId,
          recommendations,
          count: recommendations.length,
          timestamp: new Date().toISOString()
        }
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Invalid action or missing parameters',
          code: 'INVALID_ACTION',
          timestamp: new Date()
        }
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('Quota monitor POST API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while processing quota monitoring action',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}