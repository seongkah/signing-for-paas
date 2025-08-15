import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ErrorType } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: error.message,
            code: 'LOGOUT_FAILED',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error during logout',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}