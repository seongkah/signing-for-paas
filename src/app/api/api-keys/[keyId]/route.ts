import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ErrorType } from '@/types'

// DELETE - Deactivate API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params

    if (!keyId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'API key ID is required',
            code: 'MISSING_KEY_ID',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get current user
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

    // Verify the API key belongs to the user
    const { data: apiKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, user_id, name')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHORIZATION_ERROR,
            message: 'API key not found or access denied',
            code: 'KEY_NOT_FOUND',
            timestamp: new Date()
          }
        },
        { status: 404 }
      )
    }

    // Deactivate the API key (soft delete)
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to deactivate API key:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL_SERVER_ERROR,
            message: 'Failed to deactivate API key',
            code: 'KEY_DEACTIVATION_FAILED',
            timestamp: new Date()
          }
        },
        { status: 500 }
      )
    }

    // Check if user has any remaining active API keys
    const { count, error: countError } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (countError) {
      console.error('Failed to count remaining API keys:', countError)
    } else if (count === 0) {
      // If no active API keys remain, downgrade user to free tier
      const { error: tierUpdateError } = await supabase
        .from('users')
        .update({ tier: 'free' })
        .eq('id', user.id)

      if (tierUpdateError) {
        console.error('Failed to update user tier:', tierUpdateError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `API key "${apiKey.name}" has been deactivated`
    })

  } catch (error) {
    console.error('Delete API key error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while deactivating API key',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

// PUT - Update API key name
export async function PUT(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params
    const { name } = await request.json()

    if (!keyId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'API key ID is required',
            code: 'MISSING_KEY_ID',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'API key name is required',
            code: 'MISSING_NAME',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get current user
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

    // Verify the API key belongs to the user and update name
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({ name: name.trim() })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select('id, name, created_at, last_used')
      .single()

    if (updateError || !updatedKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHORIZATION_ERROR,
            message: 'API key not found or access denied',
            code: 'KEY_NOT_FOUND',
            timestamp: new Date()
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          createdAt: new Date(updatedKey.created_at),
          lastUsed: updatedKey.last_used ? new Date(updatedKey.last_used) : null,
          isActive: true
        }
      },
      message: 'API key updated successfully'
    })

  } catch (error) {
    console.error('Update API key error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while updating API key',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}