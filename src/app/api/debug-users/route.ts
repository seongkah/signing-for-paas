import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Debug endpoint to check what users exist in the database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Query all users (mask sensitive data)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, tier, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: 500 })
    }

    // Mask email addresses for security
    const maskedUsers = users?.map(user => ({
      id: user.id,
      email: user.email ? `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}` : null,
      tier: user.tier,
      is_active: user.is_active,
      created_at: user.created_at
    })) || []

    return NextResponse.json({
      success: true,
      total_users: maskedUsers.length,
      users: maskedUsers
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Create a test user for API key testing
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const testUserId = '550e8400-e29b-41d4-a716-446655440000' // Fixed UUID for testing
    
    // Create test user
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: testUserId,
        email: 'test@example.com',
        tier: 'api_key',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      return NextResponse.json({
        success: false,
        error: userError.message,
        step: 'create_user'
      }, { status: 500 })
    }

    // Create API key for this user
    const apiKey = 'ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c'
    const crypto = require('crypto')
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .upsert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        key_hash: keyHash,
        name: 'Test API Key for Authentication Debug',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (keyError) {
      return NextResponse.json({
        success: false,
        error: keyError.message,
        step: 'create_api_key'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test user and API key created successfully',
      user: {
        id: testUserId,
        tier: 'api_key'
      },
      apiKey: {
        id: apiKeyData.id,
        name: apiKeyData.name,
        key: apiKey // Only shown here for testing
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}