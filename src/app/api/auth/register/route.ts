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

    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: authError.message,
            code: 'REGISTRATION_FAILED',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'User registration failed',
            code: 'USER_CREATION_FAILED',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    // Create user record in our users table
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        tier: 'free',
        is_active: true
      })

    if (dbError) {
      // If user record creation fails, we should clean up the auth user
      // But for now, we'll just log the error and continue
      console.error('Failed to create user record:', dbError)
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          tier: 'free',
          isActive: true,
          createdAt: new Date()
        },
        message: 'User registered successfully. Please check your email for verification.'
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error during registration',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}