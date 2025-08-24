import { NextRequest, NextResponse } from 'next/server'

// COMPLETELY ISOLATED TEST - No custom imports at all
console.log('🔥 ISOLATED: Route module loaded')

export async function POST(request: NextRequest) {
  console.log('🔥 ISOLATED: POST function started')
  console.log('🔥 ISOLATED: Timestamp:', new Date().toISOString())
  console.log('🔥 ISOLATED: Method:', request.method)
  console.log('🔥 ISOLATED: URL:', request.url)
  
  try {
    // Test basic request processing
    console.log('🔥 ISOLATED: Testing basic request processing...')
    
    // Test header reading
    const headers = Object.fromEntries(request.headers.entries())
    console.log('🔥 ISOLATED: Headers parsed, count:', Object.keys(headers).length)
    
    // Test body parsing
    let body: any = null
    try {
      console.log('🔥 ISOLATED: About to parse body...')
      body = await request.json()
      console.log('🔥 ISOLATED: Body parsed successfully:', typeof body)
    } catch (bodyError) {
      console.log('🔥 ISOLATED: Body parse failed:', bodyError)
    }
    
    console.log('🔥 ISOLATED: About to return success response')
    
    return NextResponse.json({
      success: true,
      message: 'Isolated test successful',
      timestamp: new Date().toISOString(),
      hasBody: !!body,
      bodyData: body,
      headerCount: Object.keys(headers).length,
      sampleHeaders: {
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent']?.substring(0, 50) + '...',
        'cookie': headers['cookie'] ? `${headers['cookie'].substring(0, 50)}...` : 'none'
      }
    })
    
  } catch (error) {
    console.error('🔥 ISOLATED: Fatal error:', error)
    console.error('🔥 ISOLATED: Error type:', typeof error)
    console.error('🔥 ISOLATED: Error message:', error instanceof Error ? error.message : String(error))
    console.error('🔥 ISOLATED: Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({
      success: false,
      error: 'Isolated test failed',
      errorDetails: {
        type: typeof error,
        message: error instanceof Error ? error.message : String(error)
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}