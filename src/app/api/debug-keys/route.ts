import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Debug endpoint to check what API keys exist in the database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Query all API keys (without exposing the actual keys)
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, user_id, name, is_active, created_at, key_hash')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: 500 })
    }

    // Mask the key hashes for security
    const maskedKeys = apiKeys?.map(key => ({
      id: key.id,
      user_id: key.user_id,
      name: key.name,
      is_active: key.is_active,
      created_at: key.created_at,
      key_hash_preview: key.key_hash ? `${key.key_hash.substring(0, 16)}...` : null
    })) || []

    return NextResponse.json({
      success: true,
      total_keys: maskedKeys.length,
      api_keys: maskedKeys
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}