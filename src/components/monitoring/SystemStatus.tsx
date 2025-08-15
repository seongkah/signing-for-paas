'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface SystemHealth {
  database: {
    connected: boolean
    responseTime: number
    status: 'healthy' | 'degraded' | 'unhealthy'
  }
  requests: {
    lastHour: {
      total: number
      successful: number
      successRate: number
      errors: number
    }
    last24Hours: {
      total: number
      successful: number
      successRate: number
      averageResponseTime: number
    }
  }
  users: {
    activeInLast24Hours: number
  }
  performance: {
    averageResponseTime: number
    status: 'good' | 'degraded' | 'poor' | 'unknown'
  }
  errors: {
    recentCount: number
    status: 'good' | 'warning' | 'critical' | 'unknown'
  }
}

interface SystemStatusProps {
  className?: string
  refreshInterval?: number
}

export function SystemStatus({ className, refreshInterval = 60000 }: SystemStatusProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchSystemHealth = async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/admin/system-health')
      
      if (!response.ok) {
        throw new Error('Failed to fetch system health')
      }

      const result = await response.json()
      
      if (result.success) {
        setHealth(result.data.health)
        setOverallStatus(result.data.status)
        setLastUpdated(new Date())
      } else {
        throw new Error(result.error?.message || 'Failed to fetch system health')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemHealth()
  }, [])

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchSystemHealth, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'unhealthy':
      case 'poor':
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return '🟢'
      case 'degraded':
      case 'warning':
        return '🟡'
      case 'unhealthy':
      case 'poor':
      case 'critical':
        return '🔴'
      default:
        return '⚪'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <CardDescription>Overall system health and performance</CardDescription>
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
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <CardDescription>Overall system health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchSystemHealth} variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <CardDescription>Overall system health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>No system health data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <CardDescription>Overall system health and performance</CardDescription>
        </div>
        <Button onClick={fetchSystemHealth} variant="ghost" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className={`p-3 rounded-lg border ${getStatusColor(overallStatus)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getStatusIcon(overallStatus)}</span>
              <span className="font-medium capitalize">{overallStatus}</span>
            </div>
            <span className="text-sm">
              System is {overallStatus === 'healthy' ? 'operating normally' : 
                        overallStatus === 'degraded' ? 'experiencing issues' : 'experiencing problems'}
            </span>
          </div>
        </div>

        {/* Component Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Database */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <span className="text-xs">{getStatusIcon(health.database.status)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {health.database.connected ? 'Connected' : 'Disconnected'}
              {health.database.connected && ` (${health.database.responseTime}ms)`}
            </div>
          </div>

          {/* Performance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance</span>
              <span className="text-xs">{getStatusIcon(health.performance.status)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Avg: {health.performance.averageResponseTime.toFixed(0)}ms
            </div>
          </div>

          {/* Errors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Errors</span>
              <span className="text-xs">{getStatusIcon(health.errors.status)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {health.errors.recentCount} in last hour
            </div>
          </div>

          {/* Activity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Activity</span>
              <span className="text-xs">📊</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {health.users.activeInLast24Hours} active users
            </div>
          </div>
        </div>

        {/* Request Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Request Metrics</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Last Hour</p>
              <p className="font-medium">
                {health.requests.lastHour.total} requests
              </p>
              <p className="text-xs text-muted-foreground">
                {health.requests.lastHour.successRate.toFixed(1)}% success rate
              </p>
            </div>
            
            <div>
              <p className="text-muted-foreground">Last 24 Hours</p>
              <p className="font-medium">
                {health.requests.last24Hours.total} requests
              </p>
              <p className="text-xs text-muted-foreground">
                {health.requests.last24Hours.successRate.toFixed(1)}% success rate
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {overallStatus !== 'healthy' && (
          <Alert variant={overallStatus === 'unhealthy' ? 'destructive' : 'default'}>
            <AlertDescription>
              {overallStatus === 'unhealthy' 
                ? 'System is experiencing critical issues. Check error logs and database connectivity.'
                : 'System performance is degraded. Monitor metrics closely.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}