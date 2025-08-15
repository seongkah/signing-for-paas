import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { withErrorHandling, ApiContext } from '@/lib/api-wrapper'
import { createValidationError, createAuthenticationError } from '@/lib/error-handler'
import { ErrorType } from '@/types'

async function handleLogin(request: NextRequest, context: ApiContext) {
  const { email, password } = await request.json()

  if (!email || !password) {
    throw createValidationError('Email and password are required', { email: !!email, password: !!password });
  }

  const supabase = createServerSupabaseClient()

  // Authenticate user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    throw createAuthenticationError('Invalid email or password');
  }

  if (!authData.user) {
    throw createAuthenticationError('Login failed');
  }

  // Update context with user information
  context.userId = authData.user.id;

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
}

export const POST = withErrorHandling(handleLogin, '/api/auth/login');