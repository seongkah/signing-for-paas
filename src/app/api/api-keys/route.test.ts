import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/auth-middleware', () => ({
  validateRequest: vi.fn()
}))

vi.mock('@/lib/database-operations', () => ({
  getUserApiKeys: vi.fn(),
  createApiKey: vi.fn()
}))

describe('/api/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return user API keys for authenticated user', async () => {
      const { validateRequest } = await import('@/lib/auth-middleware')
      const { getUserApiKeys } = await import('@/lib/database-operations')
      
      vi.mocked(validateRequest).mockResolvedValue({
        isValid: true,
        user: { id: 'test-user', tier: 'free' }
      })
      
      vi.mocked(getUserApiKeys).mockResolvedValue([
        {
          id: 'key-1',
          name: 'Test Key 1',
          created_at: '2024-01-01T00:00:00Z',
          last_used: '2024-01-02T00:00:00Z',
          is_active: true
        },
        {
          id: 'key-2',
          name: 'Test Key 2',
          created_at: '2024-01-01T00:00:00Z',
          last_used: null,
          is_active: true
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/api-keys', {
        headers: { 'Authorization': 'Bearer test-token' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('name')
      expect(data[0]).not.toHaveProperty('key_hash') // Should not expose hash
    })

    it('should reject unauthenticated requests', async () => {
      const { validateRequest } = await import('@/lib/auth-middleware')
      
      vi.mocked(validateRequest).mockResolvedValue({
        isValid: false,
        error: 'Invalid token'
      })

      const request = new NextRequest('http://localhost:3000/api/api-keys')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('AUTHENTICATION_ERROR')
    })
  })

  describe('POST', () => {
    it('should create new API key for authenticated user', async () => {
      const { validateRequest } = await import('@/lib/auth-middleware')
      const { createApiKey } = await import('@/lib/database-operations')
      
      vi.mocked(validateRequest).mockResolvedValue({
        isValid: true,
        user: { id: 'test-user', tier: 'free' }
      })
      
      vi.mocked(createApiKey).mockResolvedValue({
        id: 'new-key-id',
        name: 'New Test Key',
        key: 'sk_test_new_api_key_12345',
        created_at: '2024-01-01T00:00:00Z',
        is_active: true
      })

      const request = new NextRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Test Key' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', 'New Test Key')
      expect(data).toHaveProperty('key')
      expect(data.key).toMatch(/^sk_test_/)
    })

    it('should validate API key name', async () => {
      const { validateRequest } = await import('@/lib/auth-middleware')
      
      vi.mocked(validateRequest).mockResolvedValue({
        isValid: true,
        user: { id: 'test-user', tier: 'free' }
      })

      const request = new NextRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
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

    it('should limit number of API keys per user', async () => {
      const { validateRequest } = await import('@/lib/auth-middleware')
      const { createApiKey } = await import('@/lib/database-operations')
      
      vi.mocked(validateRequest).mockResolvedValue({
        isValid: true,
        user: { id: 'test-user', tier: 'free' }
      })
      
      vi.mocked(createApiKey).mockRejectedValue(new Error('Maximum API keys limit reached'))

      const request = new NextRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: 'Another Key' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Maximum API keys limit reached')
    })
  })
})