import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Test database connection
    const { error: dbError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    const databaseConnected = !dbError

    // Test authentication system
    let authSystemReady = false
    try {
      const { error: authError } = await supabase.auth.getSession()
      authSystemReady = !authError
    } catch (error) {
      authSystemReady = false
    }

    const isHealthy = databaseConnected && authSystemReady

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'tiktok-signing-paas',
      version: '1.0.0',
      checks: {
        database: databaseConnected ? 'connected' : 'disconnected',
        authentication: authSystemReady ? 'ready' : 'not_ready',
        signature_generator: 'pending' // Will be updated in later tasks
      }
    }, {
      status: isHealthy ? 200 : 503
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'tiktok-signing-paas',
        version: '1.0.0',
        error: 'Health check failed',
        checks: {
          database: 'unknown',
          authentication: 'unknown',
          signature_generator: 'unknown'
        }
      },
      { status: 500 }
    )
  }
}