import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  console.log('🚨 BASIC TEST: GET function called')
  console.log('🚨 BASIC TEST: Timestamp:', new Date().toISOString())
  console.log('🚨 BASIC TEST: Environment:', process.env.NODE_ENV)
  
  return NextResponse.json({
    success: true,
    message: 'Basic GET test successful',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV
  })
}

export async function POST(request: NextRequest) {
  console.log('🚨 BASIC TEST: POST function started')
  console.log('🚨 BASIC TEST: Request method:', request.method)
  console.log('🚨 BASIC TEST: Request URL:', request.url)
  
  // Test basic header reading
  const headers = Object.fromEntries(request.headers.entries())
  console.log('🚨 BASIC TEST: Header count:', Object.keys(headers).length)
  
  // Test basic body parsing
  let body = null
  try {
    body = await request.json()
    console.log('🚨 BASIC TEST: Body parsed successfully:', typeof body)
  } catch (error) {
    console.log('🚨 BASIC TEST: Body parsing failed:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  console.log('🚨 BASIC TEST: About to return response')
  
  return NextResponse.json({
    success: true,
    message: 'Basic POST test successful',
    timestamp: new Date().toISOString(),
    hasBody: !!body,
    headerCount: Object.keys(headers).length
  })
}