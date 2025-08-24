import { NextRequest, NextResponse } from 'next/server'
// NO SUPABASE IMPORTS - Testing if this is the issue

console.log('🔥 SIMPLE API KEYS: Module loaded without Supabase imports')

export async function POST(request: NextRequest) {
  console.log('🔥 SIMPLE API KEYS: POST function started')
  console.log('🔥 SIMPLE API KEYS: Timestamp:', new Date().toISOString())
  console.log('🔥 SIMPLE API KEYS: URL:', request.url)
  
  try {
    // Test basic request processing without any Supabase
    console.log('🔥 SIMPLE API KEYS: Testing without Supabase...')
    
    // Parse body
    let body: any = null
    try {
      body = await request.json()
      console.log('🔥 SIMPLE API KEYS: Body parsed:', typeof body)
    } catch (bodyError) {
      console.log('🔥 SIMPLE API KEYS: Body parse failed:', bodyError)
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON body'
      }, { status: 400 })
    }
    
    // Validate name
    const { name } = body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('🔥 SIMPLE API KEYS: Name validation failed:', name)
      return NextResponse.json({
        success: false,
        error: 'API key name is required'
      }, { status: 400 })
    }
    
    console.log('🔥 SIMPLE API KEYS: Name validated successfully:', name)
    
    // Simulate API key creation without database
    const mockApiKey = `sk_${Math.random().toString(36).substring(2)}_mock_key`
    
    console.log('🔥 SIMPLE API KEYS: Mock API key generated')
    console.log('🔥 SIMPLE API KEYS: About to return success response')
    
    return NextResponse.json({
      success: true,
      message: 'MOCK: API key creation test successful (no database)',
      data: {
        apiKey: {
          id: 'mock-id-12345',
          name: name.trim(),
          key: mockApiKey,
          createdAt: new Date(),
          isActive: true
        },
        warning: 'This is a MOCK response - no real API key created'
      }
    })
    
  } catch (error) {
    console.error('🔥 SIMPLE API KEYS: Error occurred:', error)
    console.error('🔥 SIMPLE API KEYS: Error type:', typeof error)
    console.error('🔥 SIMPLE API KEYS: Error message:', error instanceof Error ? error.message : String(error))
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error in simple test',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}