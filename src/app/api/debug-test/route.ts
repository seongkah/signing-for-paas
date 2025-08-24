import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🚨 DEBUG TEST: Function started')
  console.log('🚨 DEBUG TEST: Headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const body = await request.json()
    console.log('🚨 DEBUG TEST: Body parsed successfully:', body)
    
    console.log('🚨 DEBUG TEST: Environment check:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    return NextResponse.json({
      success: true,
      message: 'Debug test successful',
      timestamp: new Date().toISOString(),
      hasBody: !!body,
      bodyKeys: Object.keys(body || {}),
      headers: Object.fromEntries(request.headers.entries())
    })
    
  } catch (error) {
    console.error('🚨 DEBUG TEST: Error occurred:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  console.log('🚨 DEBUG TEST: GET request received')
  return NextResponse.json({
    success: true,
    message: 'Debug test GET successful',
    timestamp: new Date().toISOString()
  })
}