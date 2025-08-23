import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Import TikTok Live Connector's protobuf encoder directly from the package
let ProtoMessageFetchResult: any
let createBaseProtoMessageFetchResult: any

try {
  // Import TikTok Live Connector's protobuf schema directly
  const tikTokSchema = require('tiktok-live-connector/dist/types/tiktok-schema.js')
  ProtoMessageFetchResult = tikTokSchema.ProtoMessageFetchResult
  
  // Get the base message creator function
  createBaseProtoMessageFetchResult = () => ({
    messages: [],
    cursor: "",
    fetchInterval: "0",
    now: "0",
    internalExt: "",
    fetchType: 0,
    wsParams: {},
    heartBeatDuration: "0",
    needsAck: false,
    wsUrl: "",
    isFirst: false,
    historyCommentCursor: "",
    historyNoMore: false,
  })
  
  console.log('✅ TikTok Live Connector protobuf schema loaded successfully')
} catch (error) {
  console.error('❌ Failed to load TikTok Live Connector schema:', error)
  ProtoMessageFetchResult = null
  createBaseProtoMessageFetchResult = null
}

/**
 * Create a minimal valid protobuf binary response
 * This creates a basic protobuf structure that TikTok Live Connector can parse
 */
function createMinimalProtobufResponse(protoMessage: any): Buffer {
  // Create a minimal protobuf message with required fields
  // This is a simplified binary encoding that should pass basic protobuf parsing
  
  const parts: Buffer[] = []
  
  // Field 2: cursor (string) - tag = (2 << 3) | 2 = 18
  if (protoMessage.cursor) {
    const cursorBytes = Buffer.from(protoMessage.cursor, 'utf8')
    parts.push(Buffer.from([18, cursorBytes.length]), cursorBytes)
  }
  
  // Field 3: fetchInterval (int64) - tag = (3 << 3) | 0 = 24  
  if (protoMessage.fetchInterval) {
    const interval = parseInt(protoMessage.fetchInterval)
    parts.push(Buffer.from([24]), encodeVarint(interval))
  }
  
  // Field 4: now (int64) - tag = (4 << 3) | 0 = 32
  if (protoMessage.now) {
    const now = parseInt(protoMessage.now)
    parts.push(Buffer.from([32]), encodeVarint(now))
  }
  
  // Field 10: wsUrl (string) - tag = (10 << 3) | 2 = 82
  if (protoMessage.wsUrl) {
    const wsUrlBytes = Buffer.from(protoMessage.wsUrl, 'utf8')
    parts.push(Buffer.from([82, wsUrlBytes.length]), wsUrlBytes)
  }
  
  // Field 11: isFirst (bool) - tag = (11 << 3) | 0 = 88
  if (protoMessage.isFirst) {
    parts.push(Buffer.from([88, 1]))
  }
  
  return Buffer.concat(parts)
}

/**
 * Encode a number as varint (variable-length integer)
 */
function encodeVarint(value: number): Buffer {
  const bytes: number[] = []
  while (value >= 0x80) {
    bytes.push((value & 0xFF) | 0x80)
    value >>>= 7
  }
  bytes.push(value & 0xFF)
  return Buffer.from(bytes)
}

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
    
    // Return EulerStream-compatible response format with proper protobuf encoding
    const responseHeaders = {
      'x-set-tt-cookie': signData.cookies || 'mock_cookie_data',
      'x-room-id': roomId || searchParams.room_id || 'mock_room_id',
      'Content-Type': 'application/octet-stream',
      'X-Log-Id': Date.now().toString(),
      'X-Agent-ID': 'tiktok-signing-paas'
    }
    
    // Create ProtoMessageFetchResult structure
    const protoMessage = {
      messages: [], // Empty messages array for initial fetch
      cursor: searchParams.cursor || '0',
      fetchInterval: '1000',
      now: Date.now().toString(),
      internalExt: '',
      fetchType: 0,
      wsParams: {
        // Include signature and other WebSocket parameters
        signature: signData.signature || '',
        signed_url: signData.signed_url || '',
        user_agent: signData.user_agent || '',
        cookies: signData.cookies || ''
      },
      heartBeatDuration: '30000',
      needsAck: false,
      wsUrl: signData.signed_url || 'wss://webcast.tiktok.com/webcast/im/fetch/',
      isFirst: true,
      historyCommentCursor: '',
      historyNoMore: false
    }
    
    console.log('🔧 Creating protobuf response:', JSON.stringify(protoMessage, null, 2))
    
    // Encode using TikTok Live Connector's native protobuf encoder
    let buffer: Buffer
    
    try {
      if (ProtoMessageFetchResult && createBaseProtoMessageFetchResult) {
        // Use TikTok Live Connector's exact schema structure
        const baseMessage = createBaseProtoMessageFetchResult()
        const fullMessage = {
          ...baseMessage,
          cursor: protoMessage.cursor || '0',
          fetchInterval: protoMessage.fetchInterval || '1000',
          now: protoMessage.now || Date.now().toString(),
          wsUrl: protoMessage.wsUrl || 'wss://webcast.tiktok.com/webcast/im/fetch/',
          isFirst: protoMessage.isFirst || true,
          wsParams: protoMessage.wsParams || {},
          heartBeatDuration: '30000'
        }
        
        console.log('🔧 Using TikTok Live Connector schema:', JSON.stringify(fullMessage, null, 2))
        
        // Try to use TikTok Live Connector's own encoder
        try {
          // Create a simple Uint8Array buffer that represents a valid protobuf message
          // This uses the exact structure TikTok Live Connector expects
          const encoder = ProtoMessageFetchResult.encode
          if (encoder) {
            // Use a more direct approach - serialize to bytes
            const messageBytes = encoder(fullMessage)
            if (messageBytes && messageBytes.finish) {
              buffer = Buffer.from(messageBytes.finish())
              console.log('✅ TikTok Live Connector protobuf encoding successful, buffer size:', buffer.length)
            } else {
              throw new Error('Encoder did not return expected format')
            }
          } else {
            throw new Error('Encoder function not available')
          }
        } catch (encoderError) {
          console.warn('⚠️ TikTok Live Connector encoder failed, using minimal protobuf:', encoderError.message)
          buffer = createMinimalProtobufResponse(fullMessage)
        }
      } else {
        // Create minimal valid protobuf binary
        console.warn('⚠️ TikTok Live Connector schema not available, creating minimal protobuf binary')
        buffer = createMinimalProtobufResponse(protoMessage)
      }
    } catch (protobufError) {
      console.error('❌ Protobuf encoding failed:', protobufError)
      // Fallback to minimal protobuf binary
      buffer = createMinimalProtobufResponse(protoMessage)
    }
    
    return new NextResponse(buffer as any, {
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