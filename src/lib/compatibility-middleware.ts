import { NextRequest } from 'next/server'

/**
 * Compatibility middleware for handling different request formats
 * Supports EulerStream, legacy local server, and modern API formats
 */

export interface CompatibilityContext {
  roomUrl: string
  format: 'eulerstream' | 'legacy' | 'modern'
  contentType: string
  originalBody: any
}

export async function parseCompatibleRequest(request: NextRequest): Promise<CompatibilityContext> {
  const contentType = request.headers.get('content-type') || ''
  let roomUrl = ''
  let format: 'eulerstream' | 'legacy' | 'modern' = 'modern'
  let originalBody: any = null

  try {
    if (contentType.includes('text/plain')) {
      // Legacy local server format - plain text body
      roomUrl = await request.text()
      format = 'legacy'
      originalBody = roomUrl
    } else {
      // JSON format - could be EulerStream or modern
      const body = await request.json()
      originalBody = body
      
      // EulerStream typically uses 'url' field
      if (body.url) {
        roomUrl = body.url
        format = 'eulerstream'
      }
      // Modern API uses 'roomUrl' field
      else if (body.roomUrl) {
        roomUrl = body.roomUrl
        format = 'modern'
      }
      // Legacy compatibility - also check 'room_url'
      else if (body.room_url) {
        roomUrl = body.room_url
        format = 'legacy'
      }
    }

    if (!roomUrl || typeof roomUrl !== 'string') {
      throw new Error('No valid room URL found in request')
    }

    return {
      roomUrl: roomUrl.trim(),
      format,
      contentType,
      originalBody
    }
  } catch (error) {
    throw new Error(`Failed to parse request: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function formatCompatibleResponse(data: any, format: 'eulerstream' | 'legacy' | 'modern', responseTime: number) {
  const baseData = {
    signature: data.signature || 'placeholder_signature',
    signed_url: data.signed_url || `${data.roomUrl}?signature=placeholder`,
    'X-Bogus': data['X-Bogus'] || 'placeholder_x_bogus',
    'x-tt-params': data['x-tt-params'] || 'placeholder_params',
    navigator: data.navigator || {
      deviceScaleFactor: 1,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      browser_language: 'en-US',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: '120.0.0.0'
    }
  }

  switch (format) {
    case 'eulerstream':
      return {
        success: true,
        data: baseData,
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime
      }

    case 'legacy':
      return {
        status: 'ok',
        data: baseData,
        response_time_ms: responseTime
      }

    case 'modern':
    default:
      return {
        success: true,
        data: baseData,
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString()
      }
  }
}

export function formatCompatibleError(error: string, details: string, format: 'eulerstream' | 'legacy' | 'modern', responseTime: number) {
  switch (format) {
    case 'eulerstream':
      return {
        success: false,
        error,
        message: details,
        timestamp: new Date().toISOString()
      }

    case 'legacy':
      return {
        status: 'error',
        error,
        details,
        response_time_ms: responseTime
      }

    case 'modern':
    default:
      return {
        success: false,
        error: {
          type: 'COMPATIBILITY_ERROR',
          message: error,
          details,
          code: 'COMPAT_ERROR',
          timestamp: new Date()
        }
      }
  }
}

export function isValidTikTokUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    
    // Must be TikTok domain
    if (!urlObj.hostname.includes('tiktok.com')) {
      return false
    }

    // Should be a reasonable TikTok URL format
    const path = urlObj.pathname.toLowerCase()
    return path.includes('/live') || 
           path.includes('/@') || 
           urlObj.search.includes('live') ||
           path.length > 1
  } catch {
    return false
  }
}

export function detectRequestFormat(request: NextRequest): 'eulerstream' | 'legacy' | 'modern' {
  const userAgent = request.headers.get('user-agent') || ''
  const contentType = request.headers.get('content-type') || ''
  const url = request.url

  // Detect based on endpoint
  if (url.includes('/api/eulerstream')) {
    return 'eulerstream'
  }
  
  if (url.includes('/api/sign')) {
    return 'legacy'
  }

  // Detect based on content type
  if (contentType.includes('text/plain')) {
    return 'legacy'
  }

  // Detect based on user agent
  if (userAgent.includes('TikTok-Live-Connector')) {
    return 'eulerstream'
  }

  // Default to modern
  return 'modern'
}

export interface SignatureGenerationResult {
  success: boolean
  data?: {
    signature: string
    signed_url: string
    'X-Bogus': string
    'x-tt-params': string
    navigator: {
      deviceScaleFactor: number
      user_agent: string
      browser_language: string
      browser_platform: string
      browser_name: string
      browser_version: string
    }
  }
  error?: string
  details?: string
  responseTimeMs: number
}

export function createMockSignatureResult(roomUrl: string, responseTime: number): SignatureGenerationResult {
  // TODO: Replace with actual signature generation logic
  return {
    success: true,
    data: {
      signature: 'mock_signature_' + Date.now(),
      signed_url: `${roomUrl}?signature=mock_${Date.now()}`,
      'X-Bogus': 'mock_x_bogus_' + Date.now(),
      'x-tt-params': 'mock_params_' + Date.now(),
      navigator: {
        deviceScaleFactor: 1,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        browser_language: 'en-US',
        browser_platform: 'Win32',
        browser_name: 'Chrome',
        browser_version: '120.0.0.0'
      }
    },
    responseTimeMs: responseTime
  }
}