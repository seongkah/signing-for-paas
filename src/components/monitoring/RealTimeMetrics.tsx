'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface RealTimeMetricsProps {
  userId: string
  refreshInterval?: number
  className?: string
}

interface LiveMetrics {
  requestsPerMinute: number
  averageResponseTime: number
  successRate: number
  activeConnections: number
  lastUpdated: Date
}

export function RealTimeMetrics({
  userId,
  refreshInterval = 30000, // 30 seconds
  className
}: RealTimeMetricsProps) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  const fetchMetrics = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/user/analytics?days=1&live=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch real-time metrics')
      }

      const result = await response.json()
      
      if (result.success && result.data.analytics) {
        const analytics = result.data.analytics
        
        // Calculate real-time metrics from recent data
        const now = new Date()
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
        
        // Simulate real-time data (in production, this would come from the API)
        const recentRequests = analytics.hourlyDistribution
          .filter((h: any) => h.hour === now.getHours())
          .reduce((sum: number, h: any) => sum + h.count, 0)
        
        setMetrics({
          requestsPerMinute: Math.round(recentRequests / 60),
          averageResponseTime: analytics.averageResponseTime,
          successRate: analytics.successRate,
          activeConnections: Math.floor(Math.random() * 10) + 1, // Simulated
          lastUpdated: now
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [userId])

  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, isAutoRefresh])

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getResponseTimeColor = (ms: number) => {
    if (ms <= 1000) return 'text-green-600'
    if (ms <= 2000) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Real-Time Metrics</CardTitle>
          <CardDescription>Live service performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Real-Time Metrics</CardTitle>
          <CardDescription>Live service performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchMetrics} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Real-Time Metrics</CardTitle>
          <CardDescription>Live service performance data</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <Button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            {isAutoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            onClick={fetchMetrics}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics && (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Requests/min</p>
                <p className="text-lg font-bold">{metrics.requestsPerMinute}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className={`text-lg font-bold ${getStatusColor(metrics.successRate, { good: 95, warning: 90 })}`}>
                  {metrics.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Response</p>
                <p className={`text-lg font-bold ${getResponseTimeColor(metrics.averageResponseTime)}`}>
                  {metrics.averageResponseTime.toFixed(0)}ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-bold">{metrics.activeConnections}</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Service Status</span>
                <span className={`font-medium ${
                  metrics.successRate >= 95 ? 'text-green-600' : 
                  metrics.successRate >= 90 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {metrics.successRate >= 95 ? 'Excellent' : 
                   metrics.successRate >= 90 ? 'Good' : 'Issues Detected'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Performance</span>
                <span className={`font-medium ${getResponseTimeColor(metrics.averageResponseTime)}`}>
                  {metrics.averageResponseTime <= 1000 ? 'Fast' : 
                   metrics.averageResponseTime <= 2000 ? 'Moderate' : 'Slow'}
                </span>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-muted-foreground">
              Last updated: {metrics.lastUpdated.toLocaleTimeString()}
            </div>

            {/* Alerts */}
            {metrics.successRate < 90 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Success rate below 90%. Check error logs for issues.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.averageResponseTime > 3000 && (
              <Alert>
                <AlertDescription>
                  Response times are elevated. Consider optimizing requests.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}