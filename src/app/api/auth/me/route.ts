import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ErrorType } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
    }

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('Failed to fetch user data:', userError)
      // Return basic user info from auth if our table query fails
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            tier: 'free',
            isActive: true,
            createdAt: new Date(user.created_at),
            lastLogin: null
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          tier: userData.tier,
          isActive: userData.is_active,
          createdAt: new Date(userData.created_at),
          lastLogin: userData.last_login ? new Date(userData.last_login) : null
        }
      }
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching user data',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}