import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock the health monitor
vi.mock('@/lib/health-monitor', () => ({
  checkSystemHealth: vi.fn()
}))

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return healthy status when all systems are operational', async () => {
    const { checkSystemHealth } = await import('@/lib/health-monitor')
    
    vi.mocked(checkSystemHealth).mockResolvedValue({
      status: 'healthy',
      timestamp: '2024-01-01T00:00:00Z',
      signature_generator_ready: true,
      database_connected: true,
      quota_status: {
        edgeFunctions: { used: 1000, limit: 2000000, percentage: 0.05 },
        databaseStorage: { used: 50, limit: 500, percentage: 10 },
        bandwidth: { used: 1000, limit: 100000, percentage: 1 }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.signature_generator_ready).toBe(true)
    expect(data.database_connected).toBe(true)
    expect(data.quota_status).toBeDefined()
  })

  it('should return unhealthy status when database is disconnected', async () => {
    const { checkSystemHealth } = await import('@/lib/health-monitor')
    
    vi.mocked(checkSystemHealth).mockResolvedValue({
      status: 'unhealthy',
      timestamp: '2024-01-01T00:00:00Z',
      signature_generator_ready: true,
      database_connected: false,
      quota_status: {
        edgeFunctions: { used: 1000, limit: 2000000, percentage: 0.05 },
        databaseStorage: { used: 50, limit: 500, percentage: 10 },
        bandwidth: { used: 1000, limit: 100000, percentage: 1 }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.database_connected).toBe(false)
  })

  it('should return unhealthy status when signature generator is not ready', async () => {
    const { checkSystemHealth } = await import('@/lib/health-monitor')
    
    vi.mocked(checkSystemHealth).mockResolvedValue({
      status: 'unhealthy',
      timestamp: '2024-01-01T00:00:00Z',
      signature_generator_ready: false,
      database_connected: true,
      quota_status: {
        edgeFunctions: { used: 1000, limit: 2000000, percentage: 0.05 },
        databaseStorage: { used: 50, limit: 500, percentage: 10 },
        bandwidth: { used: 1000, limit: 100000, percentage: 1 }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.signature_generator_ready).toBe(false)
  })

  it('should handle health check errors gracefully', async () => {
    const { checkSystemHealth } = await import('@/lib/health-monitor')
    
    vi.mocked(checkSystemHealth).mockRejectedValue(new Error('Health check failed'))

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.status).toBe('unhealthy')
    expect(data.error).toBeDefined()
  })
})