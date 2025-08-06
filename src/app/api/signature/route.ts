import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Placeholder response - will be implemented in later tasks
    return NextResponse.json({
      status: 'ok',
      message: 'Signature generation endpoint - implementation pending',
      data: {
        roomUrl: body.roomUrl,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Invalid request format',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'TikTok Signature Generation API',
    endpoints: {
      signature: 'POST /api/signature',
      health: 'GET /api/health'
    }
  })
}