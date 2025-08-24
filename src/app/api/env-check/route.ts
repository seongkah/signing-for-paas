import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 Environment check endpoint called')
  
  try {
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
    
    console.log('🔧 Environment variables status:', envCheck)
    
    // Critical check - if service role key is missing, this is the problem!
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!')
      console.error('   This will cause RLS permission errors for API key creation')
      console.error('   The service client will fall back to anonymous key and fail writes')
    }
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: process.env.SUPABASE_SERVICE_ROLE_KEY 
        ? 'All required environment variables are set' 
        : 'CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!'
    })
    
  } catch (error) {
    console.error('🚨 Environment check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}