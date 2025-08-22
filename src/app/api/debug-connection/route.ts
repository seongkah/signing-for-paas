import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Debug endpoint to verify which Supabase project we're connecting to
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get database connection info
    const { data: result, error } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })

    const userCount = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Check environment variables (safely)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return NextResponse.json({
      success: true,
      connection: {
        supabase_url: supabaseUrl,
        has_service_key: hasServiceKey,
        has_anon_key: hasAnonKey,
        project_id: supabaseUrl ? supabaseUrl.split('.')[0].replace('https://', '') : 'unknown'
      },
      database: {
        api_keys_count: result || 0,
        api_keys_error: error?.message || null,
        users_count: userCount.count || 0,
        users_error: userCount.error?.message || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      connection: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }, { status: 500 })
  }
}