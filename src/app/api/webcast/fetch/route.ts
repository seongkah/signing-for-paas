import { NextRequest, NextResponse } from 'next/server'

/**
 * DEBUG: /api/webcast/fetch endpoint
 * This captures what TikTok Live Connector sends to this endpoint
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
  
  console.log('🔍 DEBUG /api/webcast/fetch Request:')
  console.log('   Method: POST')
  console.log('   URL:', url.toString())
  console.log('   Path:', url.pathname)
  console.log('   Search Params:', Object.fromEntries(url.searchParams.entries()))
  console.log('   Headers:', headers)
  console.log('   Body:', body)
  
  // Return debug info but in a format that might not crash TikTok Live Connector
  return NextResponse.json({
    debug: true,
    endpoint: '/api/webcast/fetch',
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
  const url = request.nextUrl
  const headers = Object.fromEntries(request.headers.entries())
  const searchParams = Object.fromEntries(url.searchParams.entries())
  
  console.log('🔍 DEBUG /api/webcast/fetch GET Request:')
  console.log('   Method: GET')
  console.log('   URL:', url.toString())
  console.log('   Search Params:', searchParams)
  console.log('   Headers:', headers)
  console.log('')
  console.log('🎯 DISCOVERED: TikTok Live Connector uses GET /webcast/fetch with these parameters:')
  Object.keys(searchParams).forEach(key => {
    console.log(`   - ${key}: ${searchParams[key]}`)
  })
  
  // Return EulerStream-compatible response format
  // Based on the TikTok Live Connector expecting binary protobuf response
  const mockResponse = {
    status: 200,
    data: {
      response: {
        // Mock WebSocket connection data
        wsUrl: `wss://webcast.tiktok.com/webcast/im/fetch/`,
        wsParams: 'mock_websocket_params',
        cursor: searchParams.cursor || '0',
        // Mock protobuf-like data (will be converted to arraybuffer)
        protobufData: Buffer.from('mock_protobuf_data', 'utf-8')
      }
    },
    debug_info: {
      endpoint: '/api/webcast/fetch',
      method: 'GET',
      received_params: searchParams,
      message: 'DEBUG: This is the endpoint TikTok Live Connector is calling!'
    }
  }
  
  // Set headers that TikTok Live Connector expects
  const responseHeaders = {
    'x-set-tt-cookie': 'mock_cookie_data',
    'x-room-id': searchParams.room_id || 'mock_room_id',
    'Content-Type': 'application/octet-stream'  // Binary response expected
  }
  
  // Convert to arraybuffer as TikTok Live Connector expects binary response
  const buffer = Buffer.from(JSON.stringify(mockResponse))
  
  return new NextResponse(buffer, {
    status: 200,
    headers: responseHeaders
  })
}