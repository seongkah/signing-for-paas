import { createServiceSupabaseClient } from './supabase-server'
import { quotaMonitor } from './quota-monitor'
import { alertingSystem } from './alerting-system'

export interface ServiceComponent {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  responseTime: number
  lastCheck: Date
  error?: string
  metadata?: any
}

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  components: ServiceComponent[]
  uptime: {
    percentage: number
    totalChecks: number
    successfulChecks: number
    lastDowntime?: Date
    downtimeMinutes: number
  }
  performance: {
    averageResponseTime: number
    p95ResponseTime: number
    throughput: number
    errorRate: number
  }
  quotas: {
    supabaseEdgeFunctions: QuotaStatus
    supabaseBandwidth: QuotaStatus
    vercelBandwidth: QuotaStatus
    databaseStorage: QuotaStatus
  }
}

export interface QuotaStatus {
  used: number
  limit: number
  percentage: number
  status: 'healthy' | 'warning' | 'critical'
  resetDate?: Date
}

export interface UptimeRecord {
  timestamp: Date
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  components: Record<string, boolean>
}

/**
 * Comprehensive health monitoring system
 */
export class HealthMonitor {
  private supabase = createServiceSupabaseClient()
  private uptimeHistory: UptimeRecord[] = []
  private readonly MAX_HISTORY_RECORDS = 1440 // 24 hours of minute-by-minute data

  /**
   * Perform comprehensive health check of all system components
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const components: ServiceComponent[] = []

    // Check all service components
    const [
      databaseHealth,
      authHealth,
      edgeFunctionHealth,
      signatureHealth,
      apiHealth
    ] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkAuthenticationHealth(),
      this.checkEdgeFunctionHealth(),
      this.checkSignatureGenerationHealth(),
      this.checkAPIEndpointsHealth()
    ])

    components.push(
      databaseHealth,
      authHealth,
      edgeFunctionHealth,
      signatureHealth,
      ...apiHealth
    )

    // Determine overall status
    const overall = this.determineOverallStatus(components)

    // Get performance metrics
    const performance = await this.getPerformanceMetrics()

    // Get uptime statistics
    const uptime = await this.getUptimeStatistics()

    // Get quota status
    const quotas = await this.getQuotaStatus()

    // Record uptime data
    const uptimeRecord: UptimeRecord = {
      timestamp: new Date(),
      status: overall === 'healthy' ? 'up' : overall === 'degraded' ? 'degraded' : 'down',
      responseTime: Date.now() - startTime,
      components: components.reduce((acc, comp) => {
        acc[comp.name] = comp.status === 'healthy'
        return acc
      }, {} as Record<string, boolean>)
    }

    this.recordUptime(uptimeRecord)

    const result: HealthCheckResult = {
      overall,
      timestamp: new Date(),
      components,
      uptime,
      performance,
      quotas
    }

    // Store health check result
    await this.storeHealthCheckResult(result)

    return result
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<ServiceComponent> {
    const startTime = Date.now()
    
    try {
      // Test basic connectivity
      const { error: connectError } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1)

      if (connectError) {
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastCheck: new Date(),
          error: connectError.message
        }
      }

      // Test write operation
      const testData = { test: true, timestamp: new Date().toISOString() }
      const { error: writeError } = await this.supabase
        .from('health_checks')
        .upsert({ 
          id: 'db-health-test',
          component: 'database',
          data: testData,
          created_at: new Date().toISOString()
        })

      const responseTime = Date.now() - startTime

      if (writeError) {
        return {
          name: 'database',
          status: 'degraded',
          responseTime,
          lastCheck: new Date(),
          error: `Write test failed: ${writeError.message}`
        }
      }

      // Determine status based on response time
      const status = responseTime < 500 ? 'healthy' : responseTime < 2000 ? 'degraded' : 'unhealthy'

      return {
        name: 'database',
        status,
        responseTime,
        lastCheck: new Date(),
        metadata: {
          writeTestPassed: true,
          connectionPool: 'active'
        }
      }

    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }
  }

  /**
   * Check authentication system health
   */
  private async checkAuthenticationHealth(): Promise<ServiceComponent> {
    const startTime = Date.now()
    
    try {
      // Test auth session retrieval
      const { error: sessionError } = await this.supabase.auth.getSession()
      
      if (sessionError) {
        return {
          name: 'authentication',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastCheck: new Date(),
          error: sessionError.message
        }
      }

      // Test user lookup
      const { error: userError } = await this.supabase
        .from('users')
        .select('id')
        .limit(1)

      const responseTime = Date.now() - startTime
      const status = responseTime < 300 ? 'healthy' : responseTime < 1000 ? 'degraded' : 'unhealthy'

      return {
        name: 'authentication',
        status: userError ? 'degraded' : status,
        responseTime,
        lastCheck: new Date(),
        error: userError?.message,
        metadata: {
          sessionCheck: !sessionError,
          userLookup: !userError
        }
      }

    } catch (error) {
      return {
        name: 'authentication',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown auth error'
      }
    }
  }

  /**
   * Check Edge Functions health
   */
  private async checkEdgeFunctionHealth(): Promise<ServiceComponent> {
    const startTime = Date.now()
    
    try {
      // Test health check edge function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/health-check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        return {
          name: 'edge_functions',
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      const status = responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy'

      return {
        name: 'edge_functions',
        status,
        responseTime,
        lastCheck: new Date(),
        metadata: {
          httpStatus: response.status,
          functionResponse: data
        }
      }

    } catch (error) {
      return {
        name: 'edge_functions',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Edge function unreachable'
      }
    }
  }

  /**
   * Check signature generation health
   */
  private async checkSignatureGenerationHealth(): Promise<ServiceComponent> {
    const startTime = Date.now()
    
    try {
      // Test signature generation with a sample URL
      const testUrl = 'https://www.tiktok.com/@test/live'
      const response = await fetch('/api/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ roomUrl: testUrl })
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        return {
          name: 'signature_generation',
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          error: `Signature test failed: HTTP ${response.status}`
        }
      }

      const data = await response.json()
      const status = responseTime < 2000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy'

      return {
        name: 'signature_generation',
        status: data.success ? status : 'degraded',
        responseTime,
        lastCheck: new Date(),
        error: data.success ? undefined : data.error,
        metadata: {
          testUrl,
          signatureGenerated: !!data.data?.signature
        }
      }

    } catch (error) {
      return {
        name: 'signature_generation',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Signature generation failed'
      }
    }
  }

  /**
   * Check API endpoints health
   */
  private async checkAPIEndpointsHealth(): Promise<ServiceComponent[]> {
    const endpoints = [
      { name: 'api_health', path: '/api/health' },
      { name: 'api_eulerstream', path: '/api/eulerstream' },
      { name: 'api_sign', path: '/api/sign' }
    ]

    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        const startTime = Date.now()
        
        try {
          const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}${endpoint.path}`, {
            method: 'GET',
            headers: {
              'User-Agent': 'HealthMonitor/1.0'
            }
          })

          const responseTime = Date.now() - startTime
          const status: 'healthy' | 'degraded' | 'unhealthy' = response.ok 
            ? (responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy')
            : 'unhealthy'

          return {
            name: endpoint.name,
            status,
            responseTime,
            lastCheck: new Date(),
            error: response.ok ? undefined : `HTTP ${response.status}`,
            metadata: {
              httpStatus: response.status,
              endpoint: endpoint.path
            }
          }

        } catch (error) {
          return {
            name: endpoint.name,
            status: 'unhealthy' as const,
            responseTime: Date.now() - startTime,
            lastCheck: new Date(),
            error: error instanceof Error ? error.message : 'Endpoint unreachable'
          }
        }
      })
    )

    return results
  }

  /**
   * Get performance metrics from recent usage
   */
  private async getPerformanceMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      const { data: recentLogs } = await this.supabase
        .from('usage_logs')
        .select('response_time_ms, success')
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })

      if (!recentLogs || recentLogs.length === 0) {
        return {
          averageResponseTime: 0,
          p95ResponseTime: 0,
          throughput: 0,
          errorRate: 0
        }
      }

      const responseTimes = recentLogs.map(log => log.response_time_ms).filter(rt => rt > 0)
      const successfulRequests = recentLogs.filter(log => log.success).length
      
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length 
        : 0

      // Calculate 95th percentile
      const sortedTimes = responseTimes.sort((a, b) => a - b)
      const p95Index = Math.floor(sortedTimes.length * 0.95)
      const p95ResponseTime = sortedTimes.length > 0 ? sortedTimes[p95Index] || 0 : 0

      const throughput = recentLogs.length // requests per hour
      const errorRate = recentLogs.length > 0 ? ((recentLogs.length - successfulRequests) / recentLogs.length) * 100 : 0

      return {
        averageResponseTime,
        p95ResponseTime,
        throughput,
        errorRate
      }

    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        throughput: 0,
        errorRate: 0
      }
    }
  }

  /**
   * Get uptime statistics
   */
  private async getUptimeStatistics() {
    try {
      // Get uptime data from the last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const { data: healthChecks } = await this.supabase
        .from('health_checks')
        .select('data, created_at')
        .eq('component', 'uptime')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })

      if (!healthChecks || healthChecks.length === 0) {
        return {
          percentage: 100,
          totalChecks: 0,
          successfulChecks: 0,
          downtimeMinutes: 0
        }
      }

      const totalChecks = healthChecks.length
      const successfulChecks = healthChecks.filter(check => 
        check.data && check.data.status === 'healthy'
      ).length

      const percentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100

      // Calculate downtime
      let downtimeMinutes = 0
      let lastDowntime: Date | undefined

      for (let i = 0; i < healthChecks.length - 1; i++) {
        const current = healthChecks[i]
        const next = healthChecks[i + 1]
        
        if (current.data && current.data.status !== 'healthy') {
          const downStart = new Date(current.created_at)
          const downEnd = new Date(next.created_at)
          downtimeMinutes += (downStart.getTime() - downEnd.getTime()) / (1000 * 60)
          
          if (!lastDowntime || downStart > lastDowntime) {
            lastDowntime = downStart
          }
        }
      }

      return {
        percentage,
        totalChecks,
        successfulChecks,
        lastDowntime,
        downtimeMinutes
      }

    } catch (error) {
      console.error('Failed to get uptime statistics:', error)
      return {
        percentage: 100,
        totalChecks: 0,
        successfulChecks: 0,
        downtimeMinutes: 0
      }
    }
  }

  /**
   * Get quota status for all services
   */
  private async getQuotaStatus() {
    try {
      const systemQuota = await quotaMonitor.getSystemQuotaStatus()
      
      // Mock quota data - in production, these would come from actual service APIs
      const quotas = {
        supabaseEdgeFunctions: {
          used: systemQuota?.totalRequests || 0,
          limit: 2000000, // 2M free tier limit
          percentage: ((systemQuota?.totalRequests || 0) / 2000000) * 100,
          status: 'healthy' as const,
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        },
        supabaseBandwidth: {
          used: 0, // Would need to track actual bandwidth usage
          limit: 2 * 1024 * 1024 * 1024, // 2GB
          percentage: 0,
          status: 'healthy' as const,
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        },
        vercelBandwidth: {
          used: 0, // Would need to track actual bandwidth usage
          limit: 100 * 1024 * 1024 * 1024, // 100GB
          percentage: 0,
          status: 'healthy' as const,
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        },
        databaseStorage: {
          used: 0, // Would need to query actual database size
          limit: 500 * 1024 * 1024, // 500MB
          percentage: 0,
          status: 'healthy' as const
        }
      }

      // Update status based on usage percentage
      Object.values(quotas).forEach(quota => {
        if (quota.percentage > 90) {
          (quota as any).status = 'critical'
        } else if (quota.percentage > 75) {
          (quota as any).status = 'warning'
        }
      })

      return quotas

    } catch (error) {
      console.error('Failed to get quota status:', error)
      // Return default healthy status on error
      return {
        supabaseEdgeFunctions: { used: 0, limit: 2000000, percentage: 0, status: 'healthy' as const },
        supabaseBandwidth: { used: 0, limit: 2147483648, percentage: 0, status: 'healthy' as const },
        vercelBandwidth: { used: 0, limit: 107374182400, percentage: 0, status: 'healthy' as const },
        databaseStorage: { used: 0, limit: 524288000, percentage: 0, status: 'healthy' as const }
      }
    }
  }

  /**
   * Determine overall system status based on component health
   */
  private determineOverallStatus(components: ServiceComponent[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy')
    const degradedComponents = components.filter(c => c.status === 'degraded')

    // Critical components that make the system unhealthy if they fail
    const criticalComponents = ['database', 'signature_generation']
    const criticalUnhealthy = unhealthyComponents.some(c => criticalComponents.includes(c.name))

    if (criticalUnhealthy || unhealthyComponents.length >= 3) {
      return 'unhealthy'
    }

    if (unhealthyComponents.length > 0 || degradedComponents.length >= 2) {
      return 'degraded'
    }

    return 'healthy'
  }

  /**
   * Record uptime data
   */
  private recordUptime(record: UptimeRecord) {
    this.uptimeHistory.push(record)
    
    // Keep only the last MAX_HISTORY_RECORDS
    if (this.uptimeHistory.length > this.MAX_HISTORY_RECORDS) {
      this.uptimeHistory = this.uptimeHistory.slice(-this.MAX_HISTORY_RECORDS)
    }
  }

  /**
   * Store health check result in database
   */
  private async storeHealthCheckResult(result: HealthCheckResult) {
    try {
      await this.supabase
        .from('health_checks')
        .insert({
          id: `health-${Date.now()}`,
          component: 'system',
          data: {
            overall: result.overall,
            components: result.components.map(c => ({
              name: c.name,
              status: c.status,
              responseTime: c.responseTime,
              error: c.error
            })),
            performance: result.performance,
            uptime: result.uptime
          },
          created_at: result.timestamp.toISOString()
        })

      // Also store uptime record
      await this.supabase
        .from('health_checks')
        .insert({
          id: `uptime-${Date.now()}`,
          component: 'uptime',
          data: {
            status: result.overall,
            responseTime: result.performance.averageResponseTime,
            components: result.components.reduce((acc, comp) => {
              acc[comp.name] = comp.status === 'healthy'
              return acc
            }, {} as Record<string, boolean>)
          },
          created_at: result.timestamp.toISOString()
        })

    } catch (error) {
      console.error('Failed to store health check result:', error)
    }
  }

  /**
   * Get historical uptime data
   */
  getUptimeHistory(hours: number = 24): UptimeRecord[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.uptimeHistory.filter(record => record.timestamp >= cutoff)
  }

  /**
   * Get component availability percentage
   */
  getComponentAvailability(componentName: string, hours: number = 24): number {
    const history = this.getUptimeHistory(hours)
    if (history.length === 0) return 100

    const availableCount = history.filter(record => 
      record.components[componentName] === true
    ).length

    return (availableCount / history.length) * 100
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor()