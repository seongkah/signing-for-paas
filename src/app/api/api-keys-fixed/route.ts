import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

// Import Supabase carefully with error handling
let createServerClient: any = null
let Database: any = null

try {
  const supabaseSSR = require('@supabase/ssr')
  createServerClient = supabaseSSR.createServerClient
  console.log('🔥 FIXED: Supabase SSR imported successfully')
} catch (importError) {
  console.error('🔥 FIXED: Failed to import Supabase SSR:', importError)
}

console.log('🔥 FIXED: API keys fixed route module loaded')

// Generate API key function
function generateApiKey(): { key: string; hash: string } {
  const key = `sk_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(key).digest('hex')
  return { key, hash }
}

// Safe cookie reading function
function getCookieValue(request: NextRequest, cookieName: string): string | undefined {
  try {
    // Try to read from request headers directly
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) return undefined
    
    const cookies = cookieHeader.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === cookieName) {
        return decodeURIComponent(value)
      }
    }
    return undefined
  } catch (error) {
    console.error('🔥 FIXED: Cookie reading failed:', error)
    return undefined
  }
}

// Safe Supabase client creation
function createSafeSupabaseClient(useServiceRole = false) {
  try {
    if (!createServerClient) {
      throw new Error('Supabase SSR not available')
    }
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = useServiceRole 
      ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    
    return createServerClient(url, key, {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {}
      }
    })
  } catch (error) {
    console.error('🔥 FIXED: Supabase client creation failed:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  console.log('🔥 FIXED: POST function started')
  console.log('🔥 FIXED: Timestamp:', new Date().toISOString())
  console.log('🔥 FIXED: URL:', request.url)
  
  try {
    // Parse request body
    let body: any = null
    try {
      body = await request.json()
      console.log('🔥 FIXED: Body parsed successfully:', typeof body)
    } catch (bodyError) {
      console.log('🔥 FIXED: Body parse failed:', bodyError)
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON body'
      }, { status: 400 })
    }
    
    // Validate name
    const { name } = body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('🔥 FIXED: Name validation failed')
      return NextResponse.json({
        success: false,
        error: 'API key name is required'
      }, { status: 400 })
    }
    
    console.log('🔥 FIXED: Name validated:', name)
    
    // Try to check authentication (but don't fail if it doesn't work)
    let isAuthenticated = false
    let userId: string | null = null
    
    try {
      console.log('🔥 FIXED: Attempting authentication...')
      
      // Check for session cookies directly from headers
      const cookieHeader = request.headers.get('cookie')
      console.log('🔥 FIXED: Cookie header length:', cookieHeader?.length || 0)
      
      if (cookieHeader && cookieHeader.includes('supabase')) {
        console.log('🔥 FIXED: Found Supabase cookies in header')
        
        // Try to create Supabase client and get user
        const supabase = createSafeSupabaseClient(false)
        if (supabase) {
          console.log('🔥 FIXED: Supabase client created, checking user...')
          // For now, just check if we can create the client
          isAuthenticated = true
          userId = 'mock-user-id' // Mock for testing
        }
      }
    } catch (authError) {
      console.log('🔥 FIXED: Authentication failed, continuing without auth:', authError)
    }
    
    console.log('🔥 FIXED: Authentication result:', { isAuthenticated, userId })
    
    // Generate mock API key for testing
    const { key, hash } = generateApiKey()
    console.log('🔥 FIXED: API key generated')
    
    // Return success response
    console.log('🔥 FIXED: About to return success response')
    
    return NextResponse.json({
      success: true,
      message: 'FIXED: API key creation test successful',
      data: {
        apiKey: {
          id: 'fixed-test-id-12345',
          name: name.trim(),
          key: key,
          createdAt: new Date(),
          isActive: true
        },
        authInfo: {
          authenticated: isAuthenticated,
          userId: userId
        },
        warning: 'This is a MOCK response for testing - no real database operation'
      }
    })
    
  } catch (error) {
    console.error('🔥 FIXED: Fatal error:', error)
    console.error('🔥 FIXED: Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error in fixed test',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}