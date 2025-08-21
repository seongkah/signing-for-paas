import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateRequest, validateApiKey } from './auth-middleware'
import { NextRequest } from 'next/server'

// Mock Supabase client
vi.mock('./supabase-server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}))

describe('auth-middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateRequest', () => {
    it('should validate JWT token successfully', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z'
          }
        },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'Authorization': 'Bearer valid-jwt-token' }
      })

      const result = await validateRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        tier: 'free'
      })
    })

    it('should reject invalid JWT token', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const result = await validateRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid JWT')
    })

    it('should reject request without authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test')

      const result = await validateRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('No authorization header')
    })

    it('should validate API key successfully', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'api-key-id',
              user_id: 'test-user-id',
              is_active: true,
              users: {
                id: 'test-user-id',
                email: 'test@example.com'
              }
            },
            error: null
          })
        }))
      }))
      
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'X-API-Key': 'sk_test_valid_api_key' }
      })

      const result = await validateRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        tier: 'api_key'
      })
    })

    it('should reject invalid API key', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'API key not found' }
          })
        }))
      }))
      
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'X-API-Key': 'sk_test_invalid_api_key' }
      })

      const result = await validateRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })
  })

  describe('validateApiKey', () => {
    it('should validate active API key', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'api-key-id',
              user_id: 'test-user-id',
              is_active: true,
              users: {
                id: 'test-user-id',
                email: 'test@example.com'
              }
            },
            error: null
          })
        }))
      }))
      
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await validateApiKey('sk_test_valid_api_key')

      expect(result.isValid).toBe(true)
      expect(result.user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        tier: 'api_key'
      })
    })

    it('should reject inactive API key', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'api-key-id',
              user_id: 'test-user-id',
              is_active: false,
              users: {
                id: 'test-user-id',
                email: 'test@example.com'
              }
            },
            error: null
          })
        }))
      }))
      
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await validateApiKey('sk_test_inactive_api_key')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('API key is inactive')
    })

    it('should reject non-existent API key', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'API key not found' }
          })
        }))
      }))
      
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await validateApiKey('sk_test_nonexistent_api_key')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })
  })
})