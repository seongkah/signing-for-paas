'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SystemStatus } from './SystemStatus'
import { RealTimeMetrics } from './RealTimeMetrics'
import { SimpleChart } from './SimpleChart'

interface HealthComponent {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  responseTime: number
  lastCheck: string
  error?: string
  metadata?: any
}

interface PerformanceMetrics {
  requests: {
    total: number
    successful: number
    failed: number
    successRate: number
    throughput: number
  }
  responseTime: {
    average: number
    median: number
    p95: number
    p99: number
    min: number
    max: number
  }
  errors: {
    total: number
    rate: number
    types: Record<string, number>
  }
}

interface UptimeData {
  overall: {
    percentage: number
    totalChecks: number
    upChecks: number
    meanTimeToRecovery: number
    longestDowntime: number
  }
  components: Record<string, {
    availability: number
    totalChecks: number
    upChecks: number
    incidents: number
  }>
  incidents: Array<{
    start: string
    end: string | null
    duration: number
    affectedComponents: string[]
    severity: 'critical' | 'degraded'
  }>
}

interface ComprehensiveMonitoringProps {
  className?: string
  refreshInterval?: number
}

export function ComprehensiveMonitoring({ className, refreshInterval = 30000 }: ComprehensiveMonitoringProps) {
  const [healthData, setHealthData] = useState<{
    overall: string
    components: HealthComponent[]
    uptime: any
    performance: any
    quotas: any
  } | null>(null)
  const [performanceData, setPerformanceData] = useState<{
    metrics: PerformanceMetrics
    trends: any
    alerts: any[]
    recommendations: any[]
  } | null>(null)
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'uptime' | 'alerts'>('overview')

  const fetchMonitoringData = async () => {
    try {
      setError(null)
      
      const [healthResponse, performanceResponse, uptimeResponse] = await Promise.all([
        fetch('/api/health?detailed=true'),
        fetch('/api/admin/performance?hours=24'),
        fetch('/api/admin/uptime?hours=24')
      ])

      if (healthResponse.ok) {
        const healthResult = await healthResponse.json()
        setHealthData(healthResult)
      }

      if (performanceResponse.ok) {
        const performanceResult = await performanceResponse.json()
        if (performanceResult.success) {
          setPerformanceData(performanceResult.data)
        }
      }

      if (uptimeResponse.ok) {
        const uptimeResult = await uptimeResponse.json()
        if (uptimeResult.success) {
          setUptimeData(uptimeResult.data)
        }
      }

      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitoringData()
  }, [])

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMonitoringData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '🟢'
      case 'degraded':
        return '🟡'
      case 'unhealthy':
        return '🔴'
      default:
        return '⚪'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Comprehensive Monitoring</CardTitle>
          <CardDescription>System health, performance, and uptime monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Comprehensive Monitoring</CardTitle>
          <CardDescription>System health, performance, and uptime monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchMonitoringData} variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comprehensive Monitoring</h2>
          <p className="text-muted-foreground">System health, performance, and uptime monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchMonitoringData} variant="outline" size="sm">
            Refresh
          </Button>
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'performance', label: 'Performance' },
          { id: 'uptime', label: 'Uptime' },
          { id: 'alerts', label: 'Alerts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <SystemStatus />
          
          {/* Real-time Metrics */}
          <RealTimeMetrics userId="system" />

          {/* Overall Health Summary */}
          {healthData && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(healthData.overall)}</span>
                  System Health Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg border mb-4 ${getStatusColor(healthData.overall)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{healthData.overall}</span>
                    <span className="text-sm">
                      {healthData.components.length} components monitored
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {healthData.components.map((component) => (
                    <div key={component.name} className="text-center">
                      <div className="text-2xl mb-1">{getStatusIcon(component.status)}</div>
                      <div className="text-sm font-medium capitalize">
                        {component.name.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {component.responseTime}ms
                      </div>
                      {component.error && (
                        <div className="text-xs text-red-600 mt-1 truncate" title={component.error}>
                          {component.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'performance' && performanceData && (
        <div className="space-y-6">
          {/* Performance Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.metrics.requests.total.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {performanceData.metrics.requests.throughput.toFixed(1)}/hour
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceData.metrics.requests.successRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {performanceData.metrics.requests.failed} failures
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceData.metrics.responseTime.average.toFixed(0)}ms
                </div>
                <div className="text-xs text-muted-foreground">
                  P95: {performanceData.metrics.responseTime.p95.toFixed(0)}ms
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceData.metrics.errors.rate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {performanceData.metrics.errors.total} errors
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          {performanceData.trends.hourly && performanceData.trends.hourly.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends (24 Hours)</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleChart
                  title="Requests per Hour"
                  type="bar"
                  data={performanceData.trends.hourly.map((hour: any) => ({
                    label: `${hour.hour}h`,
                    value: hour.requests,
                    color: '#8884d8'
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Performance Recommendations */}
          {performanceData.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {performanceData.recommendations.map((rec: any, index: number) => (
                  <Alert key={index} variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                    <AlertDescription>
                      <div className="font-medium">{rec.title}</div>
                      <div className="text-sm mt-1">{rec.description}</div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'uptime' && uptimeData && (
        <div className="space-y-6">
          {/* Uptime Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {uptimeData.overall.percentage.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {uptimeData.overall.upChecks}/{uptimeData.overall.totalChecks} checks
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">MTTR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {uptimeData.overall.meanTimeToRecovery.toFixed(1)}m
                </div>
                <div className="text-xs text-muted-foreground">
                  Mean Time To Recovery
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Longest Downtime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {uptimeData.overall.longestDowntime.toFixed(1)}m
                </div>
                <div className="text-xs text-muted-foreground">
                  Maximum downtime period
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Component Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(uptimeData.components).map(([name, data]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium capitalize">
                        {name.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data.incidents} incidents
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${data.availability}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {data.availability.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Incidents */}
          {uptimeData.incidents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uptimeData.incidents.slice(0, 5).map((incident, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          incident.severity === 'critical' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {incident.severity}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {incident.duration.toFixed(1)} minutes
                        </span>
                      </div>
                      <div className="text-sm">
                        <div>Started: {new Date(incident.start).toLocaleString()}</div>
                        {incident.end && (
                          <div>Ended: {new Date(incident.end).toLocaleString()}</div>
                        )}
                        <div className="mt-1">
                          Affected: {incident.affectedComponents.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Performance Alerts */}
          {performanceData?.alerts && performanceData.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {performanceData.alerts.map((alert: any, index: number) => (
                  <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm mt-1">
                            Current: {alert.value.toFixed(1)} | Threshold: {alert.threshold}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === 'critical' 
                            ? 'bg-red-100 text-red-800' 
                            : alert.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* System Alerts Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                Active alerts from the alerting system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2">✅</div>
                <div>No active system alerts</div>
                <div className="text-sm mt-1">All systems operating normally</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}