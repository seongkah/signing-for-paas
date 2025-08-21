import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RealTimeMetrics } from './RealTimeMetrics'

describe('RealTimeMetrics', () => {
  it('should display metrics correctly', () => {
    const mockData = {
      totalRequests: 1500,
      successfulRequests: 1450,
      failedRequests: 50,
      averageResponseTime: 180,
      peakResponseTime: 500,
      requestsPerHour: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]
    }

    render(<RealTimeMetrics data={mockData} />)

    expect(screen.getByText('1,500')).toBeInTheDocument() // Total requests
    expect(screen.getByText('1,450')).toBeInTheDocument() // Successful requests
    expect(screen.getByText('50')).toBeInTheDocument() // Failed requests
    expect(screen.getByText('180ms')).toBeInTheDocument() // Average response time
    expect(screen.getByText('500ms')).toBeInTheDocument() // Peak response time
  })

  it('should calculate success rate correctly', () => {
    const mockData = {
      totalRequests: 1000,
      successfulRequests: 950,
      failedRequests: 50,
      averageResponseTime: 200,
      peakResponseTime: 600,
      requestsPerHour: []
    }

    render(<RealTimeMetrics data={mockData} />)

    expect(screen.getByText('95.0%')).toBeInTheDocument() // Success rate
  })

  it('should handle zero requests gracefully', () => {
    const mockData = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakResponseTime: 0,
      requestsPerHour: []
    }

    render(<RealTimeMetrics data={mockData} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0ms')).toBeInTheDocument()
    expect(screen.getByText('0.0%')).toBeInTheDocument() // Success rate should be 0%
  })

  it('should display loading state when no data provided', () => {
    render(<RealTimeMetrics data={null} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should format large numbers correctly', () => {
    const mockData = {
      totalRequests: 1234567,
      successfulRequests: 1234000,
      failedRequests: 567,
      averageResponseTime: 1500,
      peakResponseTime: 5000,
      requestsPerHour: []
    }

    render(<RealTimeMetrics data={mockData} />)

    expect(screen.getByText('1,234,567')).toBeInTheDocument()
    expect(screen.getByText('1,234,000')).toBeInTheDocument()
    expect(screen.getByText('1,500ms')).toBeInTheDocument()
    expect(screen.getByText('5,000ms')).toBeInTheDocument()
  })

  it('should show trend indicators', () => {
    const mockData = {
      totalRequests: 1500,
      successfulRequests: 1450,
      failedRequests: 50,
      averageResponseTime: 180,
      peakResponseTime: 500,
      requestsPerHour: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65],
      trends: {
        requestsTrend: 'up',
        responseTimeTrend: 'down',
        successRateTrend: 'stable'
      }
    }

    render(<RealTimeMetrics data={mockData} />)

    // Check for trend indicators (assuming they're implemented with icons or text)
    expect(screen.getByTestId('requests-trend')).toBeInTheDocument()
    expect(screen.getByTestId('response-time-trend')).toBeInTheDocument()
    expect(screen.getByTestId('success-rate-trend')).toBeInTheDocument()
  })

  it('should render chart when hourly data is provided', () => {
    const mockData = {
      totalRequests: 1500,
      successfulRequests: 1450,
      failedRequests: 50,
      averageResponseTime: 180,
      peakResponseTime: 500,
      requestsPerHour: Array.from({ length: 24 }, (_, i) => i * 10)
    }

    render(<RealTimeMetrics data={mockData} />)

    expect(screen.getByTestId('requests-chart')).toBeInTheDocument()
  })
})