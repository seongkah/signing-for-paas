import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  console.log('🍪 COOKIE TEST: Function started')
  console.log('🍪 COOKIE TEST: Request URL:', request.url)
  console.log('🍪 COOKIE TEST: Request host:', request.headers.get('host'))
  
  try {
    // Get all cookies using Next.js cookies() helper
    const cookieStore = cookies()
    const allCookies: any = {}
    const supabaseRelatedCookies: any = {}
    let cookieCount = 0
    
    // Iterate through all cookies
    console.log('🍪 COOKIE TEST: Reading cookies...')
    
    // Get cookie entries
    cookieStore.getAll().forEach(cookie => {
      cookieCount++
      allCookies[cookie.name] = {
        value: cookie.value ? `${cookie.value.substring(0, 20)}...` : 'empty',
        hasValue: !!cookie.value
      }
      
      // Check for Supabase-related cookies
      if (cookie.name.includes('supabase') || cookie.name.includes('auth') || cookie.name.includes('sb-')) {
        supabaseRelatedCookies[cookie.name] = {
          value: cookie.value ? `${cookie.value.substring(0, 20)}...` : 'empty', 
          hasValue: !!cookie.value,
          length: cookie.value?.length || 0
        }
        console.log('🍪 COOKIE TEST: Found Supabase cookie:', cookie.name, 'length:', cookie.value?.length)
      }
    })
    
    console.log('🍪 COOKIE TEST: Total cookies found:', cookieCount)
    console.log('🍪 COOKIE TEST: Supabase cookies found:', Object.keys(supabaseRelatedCookies).length)
    
    // Test direct cookie access for common Supabase cookie names
    const commonSupabaseCookies = [
      'sb-access-token',
      'sb-refresh-token', 
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.split('//')[1]}-auth-token`,
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.split('//')[1]}-auth-token.0`,
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.split('//')[1]}-auth-token.1`,
    ]
    
    const directCookieTest: any = {}
    commonSupabaseCookies.forEach(cookieName => {
      const cookieValue = cookieStore.get(cookieName)
      directCookieTest[cookieName] = {
        found: !!cookieValue,
        hasValue: !!(cookieValue?.value),
        valueLength: cookieValue?.value?.length || 0
      }
    })
    
    console.log('🍪 COOKIE TEST: Direct cookie test results:', directCookieTest)
    
    // Test cookie headers directly from request
    const cookieHeader = request.headers.get('cookie')
    console.log('🍪 COOKIE TEST: Raw cookie header length:', cookieHeader?.length || 0)
    console.log('🍪 COOKIE TEST: Raw cookie header preview:', cookieHeader ? `${cookieHeader.substring(0, 100)}...` : 'No cookie header')
    
    const domainInfo = {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'), 
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')?.includes('vercel') ? 'vercel-internal' : 'external-request'
    }
    
    console.log('🍪 COOKIE TEST: Domain info:', domainInfo)
    console.log('🍪 COOKIE TEST: About to return response')
    
    return NextResponse.json({
      success: true,
      cookieSummary: {
        totalCount: cookieCount,
        supabaseCount: Object.keys(supabaseRelatedCookies).length,
        hasCookieHeader: !!cookieHeader,
        cookieHeaderLength: cookieHeader?.length || 0
      },
      allCookies: allCookies,
      supabaseCookies: supabaseRelatedCookies,
      directCookieTest: directCookieTest,
      domainInfo: domainInfo,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🚨 COOKIE TEST: Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}