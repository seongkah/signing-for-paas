'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MetricsCard } from './MetricsCard'
import { QuotaUsageCard } from './QuotaUsageCard'
import { SimpleChart } from './SimpleChart'
import { RealTimeMetrics } from './RealTimeMetrics'
import { ErrorLogViewer } from './ErrorLogViewer'
import { SystemStatus } from './SystemStatus'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface DashboardData {
  analytics: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    successRate: number
    averageResponseTime: number
    peakResponseTime: number
    requestsPerDay: Array<{ date: string; count: number }>
    errorBreakdown: Array<{ error: string; count: number }>
    hourlyDistribution: Array<{ hour: number; count: number }>
  }
  quota: {
    current: {
      requestCount: number
      dailyLimit: number
      remaining: number
      resetTime: Date
    }
    history: Array<{
      date: string
      requestCount: number
      dailyLimit: number
    }>
  }
  warnings: Array<{
    type: string
    message: string
    severity: string
  }>
}

interface MonitoringDashboardProps {
  className?: string
}

export function MonitoringDashboard({ className }: MonitoringDashboardProps) {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(60000) // 1 minute

  const fetchDashboardData = useCallback(async () => {
    if (!user) return

    try {
      setError(null)
      
      const response = await fetch('/api/user/analytics?days=30&warnings=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData({
          analytics: result.data.analytics,
          quota: result.data.quota,
          warnings: result.data.warnings || []
        })
      } else {
        throw new Error(result.error?.message || 'Failed to fetch data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user, fetchDashboardData])

  useEffect(() => {
    const interval = setInterval(fetchDashboardData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, fetchDashboardData])

  const getChangeFromYesterday = (requestsPerDay: Array<{ date: string; count: number }>) => {
    if (requestsPerDay.length < 2) return null
    
    const today = requestsPerDay[requestsPerDay.length - 1]?.count || 0
    const yesterday = requestsPerDay[requestsPerDay.length - 2]?.count || 0
    
    if (yesterday === 0) return null
    
    const change = ((today - yesterday) / yesterday) * 100
    return {
      value: Math.abs(change),
      type: change > 0 ? 'increase' as const : change < 0 ? 'decrease' as const : 'neutral' as const,
      period: 'yesterday'
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchDashboardData} variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertDescription>No data available</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { analytics, quota, warnings } = data

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <Alert key={index} variant={warning.severity === 'critical' ? 'destructive' : 'default'}>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Requests"
          value={analytics.totalRequests.toLocaleString()}
          change={getChangeFromYesterday(analytics.requestsPerDay) || undefined}
          status={analytics.totalRequests > 0 ? 'info' : 'warning'}
          icon={<span>📊</span>}
        />
        
        <MetricsCard
          title="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          status={
            analytics.successRate >= 95 ? 'success' : 
            analytics.successRate >= 90 ? 'warning' : 'error'
          }
          icon={<span>✅</span>}
        />
        
        <MetricsCard
          title="Avg Response Time"
          value={`${analytics.averageResponseTime.toFixed(0)}ms`}
          status={
            analytics.averageResponseTime <= 1000 ? 'success' : 
            analytics.averageResponseTime <= 2000 ? 'warning' : 'error'
          }
          icon={<span>⚡</span>}
        />
        
        <MetricsCard
          title="Failed Requests"
          value={analytics.failedRequests.toLocaleString()}
          status={analytics.failedRequests === 0 ? 'success' : 'warning'}
          icon={<span>❌</span>}
        />
      </div>

      {/* Real-time Metrics, System Status, and Quota Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RealTimeMetrics userId={user?.id || ''} />
        
        <SystemStatus />
        
        <QuotaUsageCard
          title="Daily Quota Usage"
          used={quota.current.requestCount}
          limit={quota.current.dailyLimit}
          resetTime={new Date(quota.current.resetTime)}
          type="daily"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Per Day Chart */}
        <SimpleChart
          title="Requests Per Day"
          description="Daily request volume over the past 30 days"
          data={analytics.requestsPerDay.slice(-14).map(day => ({
            label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: day.count,
            color: '#3b82f6'
          }))}
          type="area"
          height={200}
        />

        {/* Hourly Distribution Chart */}
        <SimpleChart
          title="Hourly Distribution"
          description="Request distribution by hour of day"
          data={analytics.hourlyDistribution.map(hour => ({
            label: `${hour.hour}:00`,
            value: hour.count,
            color: hour.count > 0 ? '#10b981' : '#e5e7eb'
          }))}
          type="bar"
          height={200}
        />
      </div>

      {/* Error Analysis and Quota History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Log Viewer */}
        <ErrorLogViewer userId={user?.id || ''} maxEntries={10} />

        {/* Quota History Chart */}
        <SimpleChart
          title="Quota Usage History"
          description="Daily quota usage over time"
          data={quota.history.slice(-14).map(day => ({
            label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: day.requestCount,
            color: day.requestCount >= day.dailyLimit * 0.8 ? '#ef4444' : '#3b82f6'
          }))}
          type="line"
          height={200}
        />
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricsCard
          title="Peak Response Time"
          value={`${analytics.peakResponseTime.toFixed(0)}ms`}
          description="Highest response time recorded"
          status={
            analytics.peakResponseTime <= 2000 ? 'success' : 
            analytics.peakResponseTime <= 5000 ? 'warning' : 'error'
          }
        />
        
        <MetricsCard
          title="Error Rate"
          value={`${((analytics.failedRequests / Math.max(analytics.totalRequests, 1)) * 100).toFixed(1)}%`}
          description="Percentage of failed requests"
          status={
            analytics.failedRequests === 0 ? 'success' : 
            (analytics.failedRequests / Math.max(analytics.totalRequests, 1)) * 100 <= 5 ? 'warning' : 'error'
          }
        />
        
        <MetricsCard
          title="Quota Remaining"
          value={quota.current.remaining.toLocaleString()}
          description={`Resets ${new Date(quota.current.resetTime).toLocaleDateString()}`}
          status={
            quota.current.remaining > quota.current.dailyLimit * 0.2 ? 'success' : 
            quota.current.remaining > 0 ? 'warning' : 'error'
          }
        />
      </div>

      {/* Refresh Controls */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Last updated: {new Date().toLocaleTimeString()}
        </span>
        <div className="flex items-center gap-2">
          <span>Auto-refresh:</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
            <option value={0}>Off</option>
          </select>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            Refresh Now
          </Button>
        </div>
      </div>
    </div>
  )
}