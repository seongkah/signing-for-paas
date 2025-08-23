import { NextRequest, NextResponse } from 'next/server'

/**
 * DEBUG: /api/webcast/fetchWebcastURL endpoint
 * TikTok Live Connector might use this endpoint name instead
 */

export async function POST(request: NextRequest) {
  const url = request.nextUrl
  const headers = Object.fromEntries(request.headers.entries())
  
  let body = null
  try {
    body = await request.json()
  } catch {
    try {
      const text = await request.text()
      body = text
    } catch {
      body = 'Could not parse body'
    }
  }
  
  console.log('🔍 DEBUG /api/webcast/fetchWebcastURL Request:')
  console.log('   Method: POST')
  console.log('   URL:', url.toString())
  console.log('   Path:', url.pathname)
  console.log('   Search Params:', Object.fromEntries(url.searchParams.entries()))
  console.log('   Headers:', headers)
  console.log('   Body:', body)
  
  // Return debug info
  return NextResponse.json({
    debug: true,
    endpoint: '/api/webcast/fetchWebcastURL',
    method: 'POST',
    receivedData: {
      url: url.toString(),
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams.entries()),
      headers: headers,
      body: body
    },
    message: 'DEBUG: This endpoint captured the request data',
    timestamp: new Date().toISOString()
  })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    debug: true,
    endpoint: '/api/webcast/fetchWebcastURL',
    method: 'GET',
    message: 'DEBUG: GET request captured',
    timestamp: new Date().toISOString()
  })
}