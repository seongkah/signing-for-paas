import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * /api/webcast/fetch endpoint - EulerStream Compatible
 * This is the main endpoint TikTok Live Connector calls for signature generation
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
  
  console.log('🎯 EulerStream Compatible Request:')
  console.log('   Method: POST')
  console.log('   URL:', url.toString())
  console.log('   Headers:', headers)
  console.log('   Body:', body)
  
  // Log to signature_logs table
  try {
    const supabase = createServerSupabaseClient()
    await supabase.from('signature_logs').insert({
      request_id: crypto.randomUUID(),
      endpoint: '/api/webcast/fetch',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'Unknown',
      tier: 'free',
      authentication_method: 'none',
      room_url: body?.url || body?.roomUrl || 'test',
      request_format: 'POST',
      success: false,
      response_time_ms: 0,
      error_type: 'NOT_IMPLEMENTED',
      error_message: 'TikTok Live Connector POST request to /api/webcast/fetch - protobuf implementation needed',
    })
  } catch (error) {
    console.error('Failed to log to signature_logs:', error)
  }
  
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
  const startTime = Date.now()
  const url = request.nextUrl
  const headers = Object.fromEntries(request.headers.entries())
  const searchParams = Object.fromEntries(url.searchParams.entries())
  
  console.log('🎯 EulerStream Compatible GET Request:')
  console.log('   Method: GET')
  console.log('   URL:', url.toString())
  console.log('   Search Params:', searchParams)
  console.log('   Headers:', headers)
  
  const requestId = crypto.randomUUID()
  let success = false
  let errorMessage = ''
  let errorType = ''
  
  try {
    // Extract required parameters for signature generation
    const roomId = searchParams.room_id
    const uniqueId = searchParams.unique_id
    const client = searchParams.client || 'ttlive-node'
    
    if (!roomId && !uniqueId) {
      throw new Error('Missing room_id or unique_id parameter')
    }
    
    // Use our existing signature generation by calling our own API
    // This ensures consistency with our other endpoints
    const signatureUrl = uniqueId 
      ? `https://www.tiktok.com/@${uniqueId}/live`
      : `https://www.tiktok.com/live/${roomId}`
    
    console.log('🔧 Generating signature for:', signatureUrl)
    
    // Call our signature generation service
    const signResponse = await fetch(`${url.origin}/api/signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url: signatureUrl,
        // Include all the original parameters for the signature generation
        client: client,
        room_id: roomId,
        unique_id: uniqueId,
        cursor: searchParams.cursor,
        session_id: searchParams.session_id,
        user_agent: searchParams.user_agent,
        tt_target_idc: searchParams.tt_target_idc
      })
    })
    
    const signData = await signResponse.json()
    
    if (!signData.success) {
      throw new Error(signData.error || 'Signature generation failed')
    }
    
    // Log successful request
    const responseTime = Date.now() - startTime
    success = true
    
    try {
      const supabase = createServerSupabaseClient()
      await supabase.from('signature_logs').insert({
        request_id: requestId,
        endpoint: '/api/webcast/fetch',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        tier: 'free',
        authentication_method: 'none',
        room_url: signatureUrl,
        request_format: 'GET',
        success: true,
        response_time_ms: responseTime,
        signature_type: 'tiktok_live',
        signature_length: signData.signature?.length || 0
      })
    } catch (logError) {
      console.error('Failed to log to signature_logs:', logError)
    }
    
    // Return EulerStream-compatible response format
    // TikTok Live Connector expects specific headers and binary data
    const responseHeaders = {
      'x-set-tt-cookie': signData.cookies || 'mock_cookie_data',
      'x-room-id': roomId || searchParams.room_id || 'mock_room_id',
      'Content-Type': 'application/octet-stream',
      'X-Log-Id': Date.now().toString(),
      'X-Agent-ID': 'tiktok-signing-paas'
    }
    
    // For now, return the signature data as binary until we implement full protobuf encoding
    // This should at least get us past the connection phase
    const responseData = {
      signature: signData.signature,
      signed_url: signData.signed_url,
      user_agent: signData.user_agent,
      cookies: signData.cookies,
      // Add minimal protobuf-like structure
      cursor: searchParams.cursor || '0',
      fetchInterval: '1000',
      now: Date.now().toString(),
      wsUrl: 'wss://webcast.tiktok.com/webcast/im/fetch/',
      wsParams: signData.signature || '',
    }
    
    const buffer = Buffer.from(JSON.stringify(responseData))
    
    return new NextResponse(buffer, {
      status: 200,
      headers: responseHeaders
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errorType = 'SIGNATURE_ERROR'
    success = false
    
    console.error('🚨 EulerStream fetch error:', error)
    
    // Log failed request
    try {
      const supabase = createServerSupabaseClient()
      await supabase.from('signature_logs').insert({
        request_id: requestId,
        endpoint: '/api/webcast/fetch',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        tier: 'free',
        authentication_method: 'none',
        room_url: searchParams.unique_id ? `https://www.tiktok.com/@${searchParams.unique_id}/live` : 'unknown',
        request_format: 'GET',
        success: false,
        response_time_ms: responseTime,
        error_type: errorType,
        error_message: errorMessage
      })
    } catch (logError) {
      console.error('Failed to log to signature_logs:', logError)
    }
    
    // Return error response in format TikTok Live Connector can handle
    return new NextResponse(JSON.stringify({
      error: errorMessage,
      code: errorType,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}