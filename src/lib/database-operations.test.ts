import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  logUsage, 
  checkQuota, 
  getUserApiKeys, 
  createApiKey, 
  getUserAnalytics 
} from './database-operations'

// Mock Supabase client
vi.mock('./supabase-server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn() })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({ count: vi.fn() }))
          })),
          single: vi.fn(),
          order: vi.fn(() => ({ limit: vi.fn() }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ select: vi.fn() }))
      })),
      upsert: vi.fn(() => ({ select: vi.fn() }))
    }))
  }))
}))

// Mock crypto for API key generation
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('mock-random-bytes')),
  createHash: vi.fn(() => ({
    update: vi.fn(() => ({
      digest: vi.fn(() => 'mock-hash')
    }))
  }))
}))

describe('database-operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logUsage', () => {
    it('should log successful signature generation', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockInsert = vi.fn(() => ({ 
        select: vi.fn().mockResolvedValue({ data: [{ id: 'log-id' }], error: null })
      }))
      vi.mocked(mockSupabase.from).mockReturnValue({ insert: mockInsert })

      await logUsage({
        userId: 'test-user',
        roomUrl: 'https://www.tiktok.com/@username/live',
        success: true,
        responseTimeMs: 150
      })

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user',
        room_url: 'https://www.tiktok.com/@username/live',
        success: true,
        response_time_ms: 150
      })
    })

    it('should log failed signature generation with error', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockInsert = vi.fn(() => ({ 
        select: vi.fn().mockResolvedValue({ data: [{ id: 'log-id' }], error: null })
      }))
      vi.mocked(mockSupabase.from).mockReturnValue({ insert: mockInsert })

      await logUsage({
        userId: 'test-user',
        roomUrl: 'https://www.tiktok.com/@username/live',
        success: false,
        responseTimeMs: 50,
        errorMessage: 'Invalid TikTok URL'
      })

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user',
        room_url: 'https://www.tiktok.com/@username/live',
        success: false,
        response_time_ms: 50,
        error_message: 'Invalid TikTok URL'
      })
    })
  })

  describe('checkQuota', () => {
    it('should return within limit for user under daily quota', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockCount = vi.fn().mockResolvedValue({ count: 50, error: null })
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({ count: mockCount }))
          }))
        }))
      }))
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await checkQuota('test-user', 'daily')

      expect(result.withinLimit).toBe(true)
      expect(result.currentUsage).toBe(50)
      expect(result.limit).toBe(1000) // Daily limit for free tier
    })

    it('should return over limit for user exceeding daily quota', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockCount = vi.fn().mockResolvedValue({ count: 1500, error: null })
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({ count: mockCount }))
          }))
        }))
      }))
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await checkQuota('test-user', 'daily')

      expect(result.withinLimit).toBe(false)
      expect(result.currentUsage).toBe(1500)
      expect(result.limit).toBe(1000)
      expect(result.message).toContain('Daily quota exceeded')
    })

    it('should return within limit for monthly quota check', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockCount = vi.fn().mockResolvedValue({ count: 5000, error: null })
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({ count: mockCount }))
          }))
        }))
      }))
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await checkQuota('test-user', 'monthly')

      expect(result.withinLimit).toBe(true)
      expect(result.currentUsage).toBe(5000)
      expect(result.limit).toBe(10000) // Monthly limit for free tier
    })
  })

  describe('getUserApiKeys', () => {
    it('should return user API keys without exposing hash', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockOrder = vi.fn(() => ({ 
        limit: vi.fn().mockResolvedValue({
          data: [
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
          ],
          error: null
        })
      }))
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({ order: mockOrder }))
      }))
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await getUserApiKeys('test-user')

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id', 'key-1')
      expect(result[0]).toHaveProperty('name', 'Test Key 1')
      expect(result[0]).not.toHaveProperty('key_hash')
    })

    it('should return empty array for user with no API keys', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockOrder = vi.fn(() => ({ 
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({ order: mockOrder }))
      }))
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await getUserApiKeys('test-user')

      expect(result).toHaveLength(0)
    })
  })

  describe('createApiKey', () => {
    it('should create new API key successfully', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{
          id: 'new-key-id',
          name: 'New Test Key',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true
        }],
        error: null
      })
      
      const mockInsert = vi.fn(() => ({ select: mockSelect }))
      vi.mocked(mockSupabase.from).mockReturnValue({ insert: mockInsert })

      const result = await createApiKey('test-user', 'New Test Key')

      expect(result).toHaveProperty('id', 'new-key-id')
      expect(result).toHaveProperty('name', 'New Test Key')
      expect(result).toHaveProperty('key')
      expect(result.key).toMatch(/^sk_test_/)
    })

    it('should throw error when API key creation fails', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
      
      const mockInsert = vi.fn(() => ({ select: mockSelect }))
      vi.mocked(mockSupabase.from).mockReturnValue({ insert: mockInsert })

      await expect(createApiKey('test-user', 'New Test Key')).rejects.toThrow('Database error')
    })
  })

  describe('getUserAnalytics', () => {
    it('should return user analytics data', async () => {
      const { createServerClient } = await import('./supabase-server')
      const mockSupabase = createServerClient()
      
      // Mock multiple database calls for analytics
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({ count: vi.fn().mockResolvedValue({ count: 1500, error: null }) }))
          }))
        })
        .mockReturnValueOnce({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              eq: vi.fn(() => ({ count: vi.fn().mockResolvedValue({ count: 1450, error: null }) }))
            }))
          }))
        })
        .mockReturnValueOnce({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              eq: vi.fn(() => ({ count: vi.fn().mockResolvedValue({ count: 50, error: null }) }))
            }))
          }))
        })
      
      vi.mocked(mockSupabase.from).mockReturnValue({ select: mockSelect })

      const result = await getUserAnalytics('test-user', 30)

      expect(result).toHaveProperty('totalRequests', 1500)
      expect(result).toHaveProperty('successfulRequests', 1450)
      expect(result).toHaveProperty('failedRequests', 50)
      expect(result).toHaveProperty('successRate')
      expect(result.successRate).toBeCloseTo(96.67, 2)
    })
  })
})