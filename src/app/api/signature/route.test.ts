import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/auth-middleware', () => ({
  validateRequest: vi.fn()
}))

vi.mock('@/lib/database-operations', () => ({
  logUsage: vi.fn(),
  checkQuota: vi.fn()
}))

vi.mock('@/lib/error-handler', () => ({
  handleError: vi.fn()
}))

describe('/api/signature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate signature for valid TikTok URL', async () => {
    const { validateRequest } = await import('@/lib/auth-middleware')
    const { logUsage, checkQuota } = await import('@/lib/database-operations')
    
    vi.mocked(validateRequest).mockResolvedValue({
      isValid: true,
      user: { id: 'test-user', tier: 'free' }
    })
    
    vi.mocked(checkQuota).mockResolvedValue({ withinLimit: true })
    vi.mocked(logUsage).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/signature', {
      method: 'POST',
      body: JSON.stringify({
        roomUrl: 'https://www.tiktok.com/@username/live'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.data).toHaveProperty('signature')
    expect(data.data).toHaveProperty('signed_url')
    expect(data.data).toHaveProperty('X-Bogus')
    expect(data.data).toHaveProperty('x-tt-params')
    expect(data.data).toHaveProperty('navigator')
    expect(data.response_time_ms).toBeGreaterThan(0)
  })

  it('should reject invalid TikTok URL', async () => {
    const { validateRequest } = await import('@/lib/auth-middleware')
    
    vi.mocked(validateRequest).mockResolvedValue({
      isValid: true,
      user: { id: 'test-user', tier: 'free' }
    })

    const request = new NextRequest('http://localhost:3000/api/signature', {
      method: 'POST',
      body: JSON.stringify({
        roomUrl: 'https://invalid-url.com'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('VALIDATION_ERROR')
  })

  it('should reject unauthenticated requests', async () => {
    const { validateRequest } = await import('@/lib/auth-middleware')
    
    vi.mocked(validateRequest).mockResolvedValue({
      isValid: false,
      error: 'Invalid token'
    })

    const request = new NextRequest('http://localhost:3000/api/signature', {
      method: 'POST',
      body: JSON.stringify({
        roomUrl: 'https://www.tiktok.com/@username/live'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('AUTHENTICATION_ERROR')
  })

  it('should enforce quota limits for free tier users', async () => {
    const { validateRequest } = await import('@/lib/auth-middleware')
    const { checkQuota } = await import('@/lib/database-operations')
    
    vi.mocked(validateRequest).mockResolvedValue({
      isValid: true,
      user: { id: 'test-user', tier: 'free' }
    })
    
    vi.mocked(checkQuota).mockResolvedValue({ 
      withinLimit: false,
      message: 'Daily quota exceeded'
    })

    const request = new NextRequest('http://localhost:3000/api/signature', {
      method: 'POST',
      body: JSON.stringify({
        roomUrl: 'https://www.tiktok.com/@username/live'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('RATE_LIMIT_ERROR')
  })

  it('should allow unlimited access for API key users', async () => {
    const { validateRequest } = await import('@/lib/auth-middleware')
    const { logUsage } = await import('@/lib/database-operations')
    
    vi.mocked(validateRequest).mockResolvedValue({
      isValid: true,
      user: { id: 'test-user', tier: 'api_key' }
    })
    
    vi.mocked(logUsage).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/signature', {
      method: 'POST',
      body: JSON.stringify({
        roomUrl: 'https://www.tiktok.com/@username/live'
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk_test_api_key_12345'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('ok')
    // Should not call checkQuota for API key users
    const { checkQuota } = await import('@/lib/database-operations')
    expect(vi.mocked(checkQuota)).not.toHaveBeenCalled()
  })
})