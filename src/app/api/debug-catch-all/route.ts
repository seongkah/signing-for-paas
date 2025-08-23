import { NextRequest, NextResponse } from 'next/server'

/**
 * DEBUG: Catch-all endpoint to see what TikTok Live Connector is requesting
 * This helps us understand the exact API endpoints we need to implement
 */

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const headers = Object.fromEntries(request.headers.entries())
  
  console.log('🔍 DEBUG CATCH-ALL GET Request:')
  console.log('   URL:', url.toString())
  console.log('   Path:', url.pathname)
  console.log('   Search Params:', Object.fromEntries(url.searchParams.entries()))
  console.log('   Headers:', headers)
  
  return NextResponse.json({
    debug: true,
    method: 'GET',
    url: url.toString(),
    pathname: url.pathname,
    searchParams: Object.fromEntries(url.searchParams.entries()),
    headers: headers,
    timestamp: new Date().toISOString()
  })
}

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
  
  console.log('🔍 DEBUG CATCH-ALL POST Request:')
  console.log('   URL:', url.toString())
  console.log('   Path:', url.pathname)
  console.log('   Search Params:', Object.fromEntries(url.searchParams.entries()))
  console.log('   Headers:', headers)
  console.log('   Body:', body)
  
  return NextResponse.json({
    debug: true,
    method: 'POST',
    url: url.toString(),
    pathname: url.pathname,
    searchParams: Object.fromEntries(url.searchParams.entries()),
    headers: headers,
    body: body,
    timestamp: new Date().toISOString()
  })
}

export async function PUT(request: NextRequest) {
  return POST(request) // Same handling as POST
}

export async function PATCH(request: NextRequest) {
  return POST(request) // Same handling as POST
}

export async function DELETE(request: NextRequest) {
  return GET(request) // Same handling as GET
}