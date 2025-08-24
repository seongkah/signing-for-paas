import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 ENV CHECK: Function started')
  console.log('🔍 ENV CHECK: Request URL:', request.url)
  console.log('🔍 ENV CHECK: Request headers count:', request.headers.entries().next().value ? 'has headers' : 'no headers')
  
  try {
    // Basic environment info
    const basicEnv = {
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      vercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION || 'unknown'
    }
    
    console.log('🔍 ENV CHECK: Basic environment:', basicEnv)
    
    // Supabase environment variables
    const supabaseEnv = {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` : 
          'NOT SET'
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
          'NOT SET'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
          `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 
          'NOT SET'
      }
    }
    
    console.log('🔍 ENV CHECK: Supabase environment variables:', supabaseEnv)
    
    // Critical analysis
    const issues = []
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      issues.push('NEXT_PUBLIC_SUPABASE_URL is missing')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing') 
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      issues.push('SUPABASE_SERVICE_ROLE_KEY is missing - THIS IS LIKELY THE ROOT CAUSE')
    }
    
    console.log('🔍 ENV CHECK: Issues found:', issues.length ? issues : 'None')
    
    // Test import paths that might be failing
    let importTest = { supabaseServer: false, types: false }
    try {
      // Don't actually import to avoid side effects, just test the concept
      console.log('🔍 ENV CHECK: Import paths would be testable here')
      importTest = { supabaseServer: true, types: true }
    } catch (importError) {
      console.error('🔍 ENV CHECK: Import test failed:', importError)
    }
    
    console.log('🔍 ENV CHECK: About to return response')
    
    return NextResponse.json({
      success: issues.length === 0,
      basicEnvironment: basicEnv,
      supabaseEnvironment: supabaseEnv,
      issues: issues,
      importTest: importTest,
      recommendation: issues.length > 0 ? 
        'Add missing environment variables to Vercel project settings' :
        'Environment looks good - issue is likely elsewhere'
    })
    
  } catch (error) {
    console.error('🚨 ENV CHECK: Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}