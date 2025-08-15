import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { healthScheduler } from '@/lib/health-scheduler'
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

    // Get monitoring system status
    const schedulerStatus = healthScheduler.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        endpoints: {
          health: '/api/health',
          detailedHealth: '/api/health?detailed=true',
          systemHealth: '/api/admin/system-health',
          performance: '/api/admin/performance',
          uptime: '/api/admin/uptime',
          alerting: '/api/admin/alerting'
        },
        capabilities: {
          healthMonitoring: true,
          performanceTracking: true,
          uptimeMonitoring: true,
          alerting: true,
          quotaMonitoring: true,
          componentTracking: true
        },
        configuration: {
          healthCheckInterval: '2 minutes',
          alertCheckInterval: '5 minutes',
          quotaCheckInterval: '15 minutes',
          uptimeHistoryRetention: '24 hours',
          performanceMetricsRetention: '24 hours'
        }
      }
    })

  } catch (error) {
    console.error('Monitoring status API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching monitoring status',
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

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start':
        await healthScheduler.start()
        return NextResponse.json({
          success: true,
          message: 'Health monitoring scheduler started'
        })

      case 'stop':
        healthScheduler.stop()
        return NextResponse.json({
          success: true,
          message: 'Health monitoring scheduler stopped'
        })

      case 'triggerHealthCheck':
        const healthResult = await healthScheduler.triggerHealthCheck()
        return NextResponse.json({
          success: true,
          message: 'Manual health check completed',
          data: healthResult
        })

      case 'triggerAlertCheck':
        await healthScheduler.triggerAlertCheck()
        return NextResponse.json({
          success: true,
          message: 'Manual alert check completed'
        })

      case 'triggerQuotaCheck':
        const quotaAlerts = await healthScheduler.triggerQuotaCheck()
        return NextResponse.json({
          success: true,
          message: 'Manual quota check completed',
          data: {
            alertsGenerated: quotaAlerts.length,
            alerts: quotaAlerts
          }
        })

      case 'status':
        const status = healthScheduler.getStatus()
        return NextResponse.json({
          success: true,
          data: status
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              type: ErrorType.VALIDATION_ERROR,
              message: 'Invalid action. Supported actions: start, stop, triggerHealthCheck, triggerAlertCheck, triggerQuotaCheck, status',
              code: 'INVALID_ACTION',
              timestamp: new Date()
            }
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Monitoring control API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while controlling monitoring system',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}