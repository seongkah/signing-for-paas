import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createHash } from 'crypto'

/**
 * Debug endpoint to test RLS policies and service role access
 */
export async function POST(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    step: 'starting'
  }

  try {
    const supabase = createServerSupabaseClient()
    
    // Test 1: Check if we can see tables at all
    debugInfo.step = 'checking_table_access'
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'api_keys'])

    debugInfo.table_access = {
      error: tableError?.message || null,
      tables_found: tables?.map(t => t.table_name) || []
    }

    // Test 2: Try to query api_keys with service role (bypassing RLS)
    debugInfo.step = 'testing_api_keys_access'
    
    const { data: allKeys, error: allKeysError, count: keyCount } = await supabase
      .from('api_keys')
      .select('id, name, is_active', { count: 'exact' })
      .limit(5)

    debugInfo.api_keys_test = {
      error: allKeysError?.message || null,
      error_code: allKeysError?.code || null,
      count: keyCount,
      sample_data: allKeys || []
    }

    // Test 3: Try to query users
    debugInfo.step = 'testing_users_access'
    
    const { data: allUsers, error: allUsersError, count: userCount } = await supabase
      .from('users')
      .select('id, email, tier', { count: 'exact' })
      .limit(5)

    debugInfo.users_test = {
      error: allUsersError?.message || null,
      error_code: allUsersError?.code || null,
      count: userCount,
      sample_data: allUsers?.map(u => ({ ...u, email: u.email ? `${u.email.substring(0, 3)}***` : null })) || []
    }

    // Test 4: Try specific API key lookup
    const apiKey = 'ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c'
    const keyHash = createHash('sha256').update(apiKey).digest('hex')
    
    debugInfo.step = 'testing_specific_key_lookup'
    const { data: specificKey, error: specificError } = await supabase
      .from('api_keys')
      .select('id, user_id, name, is_active')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    debugInfo.specific_key_test = {
      api_key_hash: keyHash.substring(0, 16) + '...',
      error: specificError?.message || null,
      error_code: specificError?.code || null,
      found: !!specificKey,
      data: specificKey || null
    }

    debugInfo.step = 'complete'

    return NextResponse.json({
      success: true,
      message: 'RLS and access debug completed',
      debug: debugInfo
    })

  } catch (error) {
    debugInfo.step = 'error_occurred'
    debugInfo.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : null
    }

    return NextResponse.json({
      success: false,
      message: 'RLS debug failed',
      debug: debugInfo
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'Debug RLS and Service Role Access',
    description: 'POST to test database access patterns and RLS policies',
    usage: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {}
    }
  })
}