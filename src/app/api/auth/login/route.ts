import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ErrorType } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'Email and password are required',
            code: 'MISSING_CREDENTIALS',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Authenticate user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Login failed',
            code: 'LOGIN_FAILED',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
    }

    // Update last_login in our users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id)

    if (updateError) {
      console.error('Failed to update last_login:', updateError)
    }

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userData) {
      console.error('Failed to fetch user data:', userError)
      // Return basic user info from auth if our table query fails
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            tier: 'free',
            isActive: true,
            createdAt: new Date(authData.user.created_at),
            lastLogin: new Date()
          },
          session: authData.session
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
        },
        session: authData.session
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error during login',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}