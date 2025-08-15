import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { usageLogOps } from '@/lib/database-operations'
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

    const { searchParams } = new URL(request.url)
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Get user usage logs
    const usageLogs = await usageLogOps.getUserUsageLogs(user.id, limit, offset)

    return NextResponse.json({
      success: true,
      data: {
        usageLogs,
        pagination: {
          limit,
          offset,
          hasMore: usageLogs.length === limit
        }
      }
    })

  } catch (error) {
    console.error('Get user usage error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching usage data',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}