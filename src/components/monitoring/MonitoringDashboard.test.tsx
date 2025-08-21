import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MonitoringDashboard } from './MonitoringDashboard'

// Mock the child components
vi.mock('./RealTimeMetrics', () => ({
  RealTimeMetrics: ({ data }: any) => (
    <div data-testid="real-time-metrics">
      Requests: {data?.totalRequests || 0}
    </div>
  )
}))

vi.mock('./SystemStatus', () => ({
  SystemStatus: ({ status }: any) => (
    <div data-testid="system-status">
      Status: {status || 'unknown'}
    </div>
  )
}))

vi.mock('./QuotaUsageCard', () => ({
  QuotaUsageCard: ({ quota }: any) => (
    <div data-testid="quota-usage">
      Usage: {quota?.percentage || 0}%
    </div>
  )
}))

vi.mock('./ErrorLogViewer', () => ({
  ErrorLogViewer: ({ errors }: any) => (
    <div data-testid="error-log-viewer">
      Errors: {errors?.length || 0}
    </div>
  )
}))

// Mock fetch
global.fetch = vi.fn()

describe('MonitoringDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dashboard with loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    )

    render(<MonitoringDashboard />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should render dashboard with data after loading', async () => {
    const mockMetrics = {
      totalRequests: 1500,
      successfulRequests: 1450,
      failedRequests: 50,
      averageResponseTime: 180,
      peakResponseTime: 500
    }

    const mockHealth = {
      status: 'healthy',
      signature_generator_ready: true,
      database_connected: true
    }

    const mockQuota = {
      daily: { used: 150, limit: 1000, percentage: 15 },
      monthly: { used: 3500, limit: 10000, percentage: 35 }
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealth)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQuota)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      } as Response)

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('real-time-metrics')).toBeInTheDocument()
      expect(screen.getByTestId('system-status')).toBeInTheDocument()
      expect(screen.getByTestId('quota-usage')).toBeInTheDocument()
      expect(screen.getByTestId('error-log-viewer')).toBeInTheDocument()
    })

    expect(screen.getByText('Requests: 1500')).toBeInTheDocument()
    expect(screen.getByText('Status: healthy')).toBeInTheDocument()
    expect(screen.getByText('Usage: 15%')).toBeInTheDocument()
    expect(screen.getByText('Errors: 0')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('API Error'))

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard data/i)).toBeInTheDocument()
    })
  })

  it('should refresh data automatically', async () => {
    const mockMetrics = {
      totalRequests: 1500,
      successfulRequests: 1450,
      failedRequests: 50,
      averageResponseTime: 180,
      peakResponseTime: 500
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMetrics)
    } as Response)

    render(<MonitoringDashboard refreshInterval={100} />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(4) // Initial load for 4 endpoints
    })

    // Wait for refresh
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(8) // Second load
    }, { timeout: 200 })
  })

  it('should display correct metrics in cards', async () => {
    const mockMetrics = {
      totalRequests: 2500,
      successfulRequests: 2400,
      failedRequests: 100,
      averageResponseTime: 220,
      peakResponseTime: 800
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Requests: 2500')).toBeInTheDocument()
    })
  })

  it('should handle empty data gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null)
    } as Response)

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Requests: 0')).toBeInTheDocument()
      expect(screen.getByText('Status: unknown')).toBeInTheDocument()
      expect(screen.getByText('Usage: 0%')).toBeInTheDocument()
      expect(screen.getByText('Errors: 0')).toBeInTheDocument()
    })
  })
})