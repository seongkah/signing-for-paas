# Technical Implementation Guide - Service Monitoring

## Overview

This technical guide provides detailed implementation information for the service monitoring and health check systems. It covers architecture decisions, code structure, database design, and integration patterns for developers and system administrators.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Database Design](#database-design)
4. [Health Monitoring Implementation](#health-monitoring-implementation)
5. [Performance Monitoring Implementation](#performance-monitoring-implementation)
6. [Alerting System Implementation](#alerting-system-implementation)
7. [Scheduler Implementation](#scheduler-implementation)
8. [API Implementation](#api-implementation)
9. [Frontend Components](#frontend-components)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Considerations](#deployment-considerations)
12. [Performance Optimization](#performance-optimization)

## Architecture Overview

### System Architecture

The monitoring system follows a layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         React Components & Dashboard UI                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         Next.js API Routes & Middleware                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │    Health Monitor │ Alerting System │ Quota Monitor    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Access Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         Supabase Client & Database Operations          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Storage                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Each component has a single responsibility
2. **Singleton Pattern**: Core services use singleton pattern for consistency
3. **Observer Pattern**: Event-driven architecture for real-time updates
4. **Factory Pattern**: Flexible component creation and configuration
5. **Strategy Pattern**: Pluggable alert conditions and notification methods

### Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Realtime
- **Scheduling**: Node.js setInterval with graceful shutdown
- **Monitoring**: Custom health check system
- **Alerting**: Custom rule-based alerting engine

## Core Components

### Health Monitor (`src/lib/health-monitor.ts`)

The central health monitoring component responsible for system health assessment.

#### Class Structure

```typescript
export class HealthMonitor {
  private supabase: SupabaseClient
  private uptimeHistory: UptimeRecord[]
  private readonly MAX_HISTORY_RECORDS = 1440 // 24 hours

  // Core methods
  async performHealthCheck(): Promise<HealthCheckResult>
  private async checkDatabaseHealth(): Promise<ServiceComponent>
  private async checkAuthenticationHealth(): Promise<ServiceComponent>
  private async checkEdgeFunctionHealth(): Promise<ServiceComponent>
  private async checkSignatureGenerationHealth(): Promise<ServiceComponent>
  private async checkAPIEndpointsHealth(): Promise<ServiceComponent[]>
  
  // Utility methods
  private determineOverallStatus(components: ServiceComponent[]): SystemStatus
  private recordUptime(record: UptimeRecord): void
  private async storeHealthCheckResult(result: HealthCheckResult): Promise<void>
  
  // Public methods
  getUptimeHistory(hours: number): UptimeRecord[]
  getComponentAvailability(componentName: string, hours: number): number
}
```

#### Health Check Flow

```typescript
// Health check execution flow
async performHealthCheck() {
  const startTime = Date.now()
  const components: ServiceComponent[] = []

  // Parallel health checks for performance
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

  components.push(databaseHealth, authHealth, edgeFunctionHealth, signatureHealth, ...apiHealth)

  // Determine overall status
  const overall = this.determineOverallStatus(components)

  // Get additional metrics
  const performance = await this.getPerformanceMetrics()
  const uptime = await this.getUptimeStatistics()
  const quotas = await this.getQuotaStatus()

  // Record and store results
  const result = { overall, timestamp: new Date(), components, uptime, performance, quotas }
  await this.storeHealthCheckResult(result)

  return result
}
```

#### Component Health Checks

Each component health check follows a consistent pattern:

```typescript
private async checkDatabaseHealth(): Promise<ServiceComponent> {
  const startTime = Date.now()
  
  try {
    // Test connectivity
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
    const { error: writeError } = await this.supabase
      .from('health_checks')
      .upsert({
        id: 'db-health-test',
        component: 'database',
        data: { test: true, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString()
      })

    const responseTime = Date.now() - startTime
    const status = responseTime < 500 ? 'healthy' : responseTime < 2000 ? 'degraded' : 'unhealthy'

    return {
      name: 'database',
      status: writeError ? 'degraded' : status,
      responseTime,
      lastCheck: new Date(),
      error: writeError?.message,
      metadata: {
        writeTestPassed: !writeError,
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
```

### Alerting System (`src/lib/alerting-system.ts`)

Rule-based alerting system with configurable conditions and notifications.

#### Class Structure

```typescript
export class AlertingSystem {
  private static instance: AlertingSystem
  private supabase: SupabaseClient
  private alertRules: AlertRule[]
  private isInitialized: boolean

  // Core methods
  async initialize(): Promise<void>
  async checkAlerts(): Promise<void>
  private async evaluateRule(rule: AlertRule): Promise<boolean>
  private async triggerAlert(rule: AlertRule): Promise<void>
  
  // Rule evaluation methods
  private async checkErrorRate(condition: AlertCondition, timeWindow: Date): Promise<boolean>
  private async checkErrorCount(condition: AlertCondition, timeWindow: Date): Promise<boolean>
  private async checkConsecutiveFailures(condition: AlertCondition): Promise<boolean>
  private async checkResponseTime(condition: AlertCondition, timeWindow: Date): Promise<boolean>
  private async checkQuotaUsage(condition: AlertCondition): Promise<boolean>
  private async checkServiceDegradation(condition: AlertCondition): Promise<boolean>
  private async checkUptimeThreshold(condition: AlertCondition, timeWindow: Date): Promise<boolean>
  
  // Management methods
  async getActiveAlerts(): Promise<AlertNotification[]>
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean>
  async getAlertRules(): Promise<AlertRule[]>
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean>
}
```

#### Alert Rule Configuration

```typescript
// Default alert rules
const defaultAlertRules: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    condition: {
      type: 'error_rate',
      threshold: 0.1, // 10% error rate
      timeWindowMinutes: 15
    },
    severity: ErrorSeverity.HIGH,
    enabled: true,
    cooldownMinutes: 30
  },
  {
    id: 'quota-limit-approaching',
    name: 'Quota Limit Approaching',
    condition: {
      type: 'quota_usage',
      threshold: 0.8, // 80% of quota
      timeWindowMinutes: 60
    },
    severity: ErrorSeverity.MEDIUM,
    enabled: true,
    cooldownMinutes: 60
  }
  // ... additional rules
]
```

#### Alert Evaluation Process

```typescript
async checkAlerts(): Promise<void> {
  for (const rule of this.alertRules) {
    if (!rule.enabled) continue

    // Check cooldown
    if (rule.lastTriggered) {
      const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000)
      if (new Date() < cooldownEnd) continue
    }

    try {
      const shouldTrigger = await this.evaluateRule(rule)
      if (shouldTrigger) {
        await this.triggerAlert(rule)
        rule.lastTriggered = new Date()
      }
    } catch (error) {
      console.error(`Failed to evaluate alert rule ${rule.id}:`, error)
    }
  }
}
```

### Health Scheduler (`src/lib/health-scheduler.ts`)

Automated scheduling service for periodic monitoring tasks.

#### Class Structure

```typescript
export class HealthScheduler {
  private static instance: HealthScheduler
  private healthCheckInterval: NodeJS.Timeout | null = null
  private alertCheckInterval: NodeJS.Timeout | null = null
  private quotaCheckInterval: NodeJS.Timeout | null = null
  private isRunning: boolean = false

  // Core methods
  async start(): Promise<void>
  stop(): void
  getStatus(): SchedulerStatus
  
  // Manual trigger methods
  async triggerHealthCheck(): Promise<HealthCheckResult>
  async triggerAlertCheck(): Promise<void>
  async triggerQuotaCheck(): Promise<QuotaAlert[]>
}
```

#### Scheduler Implementation

```typescript
async start(): Promise<void> {
  if (this.isRunning) return

  try {
    // Initialize systems
    await alertingSystem.initialize()
    
    // Start periodic health checks (every 2 minutes)
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthResult = await healthMonitor.performHealthCheck()
        console.log(`Health check completed: ${healthResult.overall}`)
      } catch (error) {
        console.error('Scheduled health check failed:', error)
      }
    }, 2 * 60 * 1000)

    // Start periodic alert checks (every 5 minutes)
    this.alertCheckInterval = setInterval(async () => {
      try {
        await alertingSystem.checkAlerts()
      } catch (error) {
        console.error('Scheduled alert check failed:', error)
      }
    }, 5 * 60 * 1000)

    // Start periodic quota checks (every 15 minutes)
    this.quotaCheckInterval = setInterval(async () => {
      try {
        const quotaAlerts = await quotaMonitor.checkQuotaAlerts()
        if (quotaAlerts.length > 0) {
          console.warn(`Quota alerts generated: ${quotaAlerts.length}`)
        }
      } catch (error) {
        console.error('Scheduled quota check failed:', error)
      }
    }, 15 * 60 * 1000)

    this.isRunning = true
    console.log('Health monitoring scheduler started successfully')

  } catch (error) {
    console.error('Failed to start health monitoring scheduler:', error)
    this.stop()
  }
}
```

## Database Design

### Health Checks Table

```sql
CREATE TABLE health_checks (
  id TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_health_checks_component ON health_checks(component);
CREATE INDEX idx_health_checks_created_at ON health_checks(created_at);
CREATE INDEX idx_health_checks_component_created_at ON health_checks(component, created_at);
```

#### Data Structure

```typescript
// Health check record structure
interface HealthCheckRecord {
  id: string                    // Unique identifier
  component: string             // Component name (system, uptime, database, etc.)
  data: {
    // System health check
    overall?: 'healthy' | 'degraded' | 'unhealthy'
    components?: ComponentHealth[]
    performance?: PerformanceMetrics
    uptime?: UptimeMetrics
    
    // Uptime record
    status?: 'healthy' | 'degraded' | 'unhealthy'
    responseTime?: number
    components?: Record<string, boolean>
    
    // Component-specific data
    test?: boolean
    timestamp?: string
    [key: string]: any
  }
  created_at: string           // ISO timestamp
}
```

### Usage Logs Integration

The monitoring system leverages existing `usage_logs` table for performance metrics:

```sql
-- Existing table structure used for performance monitoring
SELECT 
  response_time_ms,
  success,
  created_at,
  room_url,
  user_id,
  error_message
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Error Logs Integration

The alerting system uses existing `error_logs` table:

```sql
-- Existing table structure used for error tracking
SELECT 
  type,
  severity,
  message,
  created_at,
  acknowledged
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
AND acknowledged = false;
```

## Health Monitoring Implementation

### Component Health Check Pattern

Each health check follows a consistent implementation pattern:

```typescript
interface HealthCheckPattern {
  // 1. Start timing
  const startTime = Date.now()
  
  try {
    // 2. Perform health check operations
    const result = await performHealthOperation()
    
    // 3. Calculate response time
    const responseTime = Date.now() - startTime
    
    // 4. Determine status based on response time and result
    const status = determineStatus(result, responseTime)
    
    // 5. Return structured result
    return {
      name: 'component_name',
      status,
      responseTime,
      lastCheck: new Date(),
      error: result.error,
      metadata: result.metadata
    }
    
  } catch (error) {
    // 6. Handle errors gracefully
    return {
      name: 'component_name',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      error: error.message
    }
  }
}
```

### Status Determination Logic

```typescript
function determineComponentStatus(responseTime: number, hasError: boolean): ComponentStatus {
  if (hasError) return 'unhealthy'
  
  if (responseTime < 500) return 'healthy'
  if (responseTime < 2000) return 'degraded'
  return 'unhealthy'
}

function determineOverallStatus(components: ServiceComponent[]): SystemStatus {
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
```

### Performance Metrics Collection

```typescript
async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  const { data: recentLogs } = await supabase
    .from('usage_logs')
    .select('response_time_ms, success')
    .gte('created_at', oneHourAgo.toISOString())
    .order('created_at', { ascending: false })

  if (!recentLogs || recentLogs.length === 0) {
    return defaultMetrics
  }

  const responseTimes = recentLogs.map(log => log.response_time_ms).filter(rt => rt > 0)
  const successfulRequests = recentLogs.filter(log => log.success).length
  
  const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
  const sortedTimes = responseTimes.sort((a, b) => a - b)
  const p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
  
  return {
    averageResponseTime,
    p95ResponseTime,
    throughput: recentLogs.length,
    errorRate: ((recentLogs.length - successfulRequests) / recentLogs.length) * 100
  }
}
```

## Performance Monitoring Implementation

### Metrics Calculation

The performance monitoring system calculates various metrics from usage logs:

```typescript
interface PerformanceCalculation {
  // Request metrics
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  throughput: number

  // Response time metrics
  averageResponseTime: number
  medianResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  minResponseTime: number
  maxResponseTime: number

  // Error analysis
  errorTypes: Record<string, number>
  errorRate: number
}
```

### Trend Analysis Implementation

```typescript
function calculateHourlyTrends(logs: UsageLog[], hours: number): HourlyTrend[] {
  return Array.from({ length: hours }, (_, i) => {
    const hourStart = new Date(Date.now() - (hours - i) * 60 * 60 * 1000)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
    
    const hourLogs = logs.filter(log => {
      const logTime = new Date(log.created_at)
      return logTime >= hourStart && logTime < hourEnd
    })

    const hourResponseTimes = hourLogs
      .map(log => log.response_time_ms)
      .filter(rt => rt > 0)

    return {
      hour: i,
      timestamp: hourStart.toISOString(),
      requests: hourLogs.length,
      successfulRequests: hourLogs.filter(log => log.success).length,
      averageResponseTime: hourResponseTimes.length > 0
        ? hourResponseTimes.reduce((sum, rt) => sum + rt, 0) / hourResponseTimes.length
        : 0,
      successRate: hourLogs.length > 0
        ? (hourLogs.filter(log => log.success).length / hourLogs.length) * 100
        : 100
    }
  })
}
```

### Response Time Distribution

```typescript
function calculateResponseTimeDistribution(responseTimes: number[]): ResponseTimeDistribution[] {
  const buckets = [
    { label: '0-100ms', min: 0, max: 100, count: 0 },
    { label: '100-500ms', min: 100, max: 500, count: 0 },
    { label: '500ms-1s', min: 500, max: 1000, count: 0 },
    { label: '1-2s', min: 1000, max: 2000, count: 0 },
    { label: '2-5s', min: 2000, max: 5000, count: 0 },
    { label: '5s+', min: 5000, max: Infinity, count: 0 }
  ]

  responseTimes.forEach(rt => {
    const bucket = buckets.find(b => rt >= b.min && rt < b.max)
    if (bucket) bucket.count++
  })

  return buckets.map(bucket => ({
    label: bucket.label,
    count: bucket.count,
    percentage: (bucket.count / responseTimes.length) * 100
  }))
}
```

## Alerting System Implementation

### Alert Rule Engine

The alerting system uses a rule-based engine with pluggable conditions:

```typescript
interface AlertConditionEvaluator {
  [key: string]: (condition: AlertCondition, timeWindow?: Date) => Promise<boolean>
}

const conditionEvaluators: AlertConditionEvaluator = {
  error_rate: async (condition, timeWindow) => {
    const { count: totalRequests } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', timeWindow.toISOString())

    const { count: errorRequests } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', timeWindow.toISOString())

    const errorRate = (errorRequests || 0) / (totalRequests || 1)
    return errorRate >= condition.threshold
  },

  quota_usage: async (condition) => {
    const { quotaMonitor } = await import('./quota-monitor')
    const systemQuota = await quotaMonitor.getSystemQuotaStatus()
    
    if (!systemQuota) return false
    
    const quotaChecks = [
      systemQuota.quotaUtilization.free.averageUsage / 100
    ]
    
    return quotaChecks.some(usage => usage >= condition.threshold)
  },

  service_degradation: async (condition) => {
    const { healthMonitor } = await import('./health-monitor')
    const healthResult = await healthMonitor.performHealthCheck()
    
    const totalComponents = healthResult.components.length
    const degradedComponents = healthResult.components.filter(c => 
      c.status === 'degraded' || c.status === 'unhealthy'
    ).length

    const degradationRatio = totalComponents > 0 ? degradedComponents / totalComponents : 0
    return degradationRatio >= condition.threshold
  }
}
```

### Alert Notification System

```typescript
interface NotificationChannel {
  send(notification: AlertNotification): Promise<void>
}

class EmailNotificationChannel implements NotificationChannel {
  async send(notification: AlertNotification): Promise<void> {
    // Email notification implementation
    await sendEmail({
      to: 'admin@example.com',
      subject: `Alert: ${notification.message}`,
      body: formatAlertEmail(notification)
    })
  }
}

class SlackNotificationChannel implements NotificationChannel {
  async send(notification: AlertNotification): Promise<void> {
    // Slack webhook implementation
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ${notification.severity}: ${notification.message}`,
        attachments: [formatSlackAttachment(notification)]
      })
    })
  }
}
```

## Scheduler Implementation

### Graceful Shutdown Handling

```typescript
class HealthScheduler {
  private setupGracefulShutdown(): void {
    const shutdown = () => {
      console.log('Received shutdown signal, stopping health scheduler...')
      this.stop()
      process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    process.on('SIGUSR2', shutdown) // nodemon restart
  }

  stop(): void {
    console.log('Stopping health monitoring scheduler...')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval)
      this.alertCheckInterval = null
    }

    if (this.quotaCheckInterval) {
      clearInterval(this.quotaCheckInterval)
      this.quotaCheckInterval = null
    }

    this.isRunning = false
    console.log('Health monitoring scheduler stopped')
  }
}
```

### Error Handling and Recovery

```typescript
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        console.error(`Operation failed after ${maxRetries} attempts:`, lastError)
        throw lastError
      }
      
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message)
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}
```

## API Implementation

### Error Handling Middleware

```typescript
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  endpoint: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error(`${endpoint} error:`, error)
      
      const errorResponse = {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      }

      return NextResponse.json(errorResponse, { status: 500 })
    }
  }
}
```

### Authentication Middleware Integration

```typescript
async function authenticateAdminRequest(request: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateRequest(request)
  
  if (!authResult.success || !authResult.context) {
    return {
      success: false,
      error: {
        type: ErrorType.AUTHENTICATION_ERROR,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date()
      }
    }
  }

  const { user } = authResult.context

  // Check admin permissions
  if (!user || user.tier !== 'admin') {
    return {
      success: false,
      error: {
        type: ErrorType.AUTHORIZATION_ERROR,
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED',
        timestamp: new Date()
      }
    }
  }

  return authResult
}
```

### Response Caching

```typescript
class ResponseCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  set(key: string, data: any, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }
}

const responseCache = new ResponseCache()

// Usage in API routes
export async function GET(request: NextRequest) {
  const cacheKey = `health-${request.url}`
  const cached = responseCache.get(cacheKey)
  
  if (cached) {
    return NextResponse.json(cached)
  }

  const healthResult = await healthMonitor.performHealthCheck()
  responseCache.set(cacheKey, healthResult, 30) // 30 second cache
  
  return NextResponse.json(healthResult)
}
```

## Frontend Components

### React Component Architecture

```typescript
// Base monitoring component pattern
interface MonitoringComponentProps {
  refreshInterval?: number
  className?: string
  onError?: (error: Error) => void
  onDataUpdate?: (data: any) => void
}

function useMonitoringData<T>(
  endpoint: string,
  refreshInterval: number = 30000,
  dependencies: any[] = []
): {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success === false) {
        throw new Error(result.error?.message || 'API request failed')
      }

      setData(result.data || result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, refreshInterval])

  return { data, loading, error, refresh: fetchData }
}
```

### Real-time Updates

```typescript
function useRealtimeMonitoring<T>(
  endpoint: string,
  supabaseTable: string,
  refreshInterval: number = 30000
): {
  data: T | null
  loading: boolean
  error: string | null
  isLive: boolean
} {
  const { data, loading, error, refresh } = useMonitoringData<T>(endpoint, refreshInterval)
  const [isLive, setIsLive] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const subscription = supabase
      .channel(`monitoring-${supabaseTable}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: supabaseTable },
        (payload) => {
          console.log('Real-time update:', payload)
          refresh()
          setIsLive(true)
          setTimeout(() => setIsLive(false), 2000) // Flash indicator
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabaseTable, refresh])

  return { data, loading, error, isLive }
}
```

### Component State Management

```typescript
// Context for monitoring data
interface MonitoringContextType {
  healthData: HealthCheckResult | null
  performanceData: PerformanceMetrics | null
  uptimeData: UptimeData | null
  alertsData: AlertData | null
  refreshAll: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const MonitoringContext = createContext<MonitoringContextType | null>(null)

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null)
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null)
  const [alertsData, setAlertsData] = useState<AlertData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [healthResponse, performanceResponse, uptimeResponse, alertsResponse] = await Promise.all([
        fetch('/api/health?detailed=true'),
        fetch('/api/admin/performance'),
        fetch('/api/admin/uptime'),
        fetch('/api/admin/alerting')
      ])

      // Process responses...
      setHealthData(healthResult)
      setPerformanceData(performanceResult)
      setUptimeData(uptimeResult)
      setAlertsData(alertsResult)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh monitoring data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
    const interval = setInterval(refreshAll, 30000) // 30 second refresh
    return () => clearInterval(interval)
  }, [refreshAll])

  return (
    <MonitoringContext.Provider value={{
      healthData,
      performanceData,
      uptimeData,
      alertsData,
      refreshAll,
      isLoading,
      error
    }}>
      {children}
    </MonitoringContext.Provider>
  )
}
```

## Testing Strategy

### Unit Testing

```typescript
// Health monitor unit tests
describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor
  let mockSupabase: jest.Mocked<SupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    healthMonitor = new HealthMonitor(mockSupabase)
  })

  describe('checkDatabaseHealth', () => {
    it('should return healthy status for fast database response', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const result = await healthMonitor.checkDatabaseHealth()

      expect(result.status).toBe('healthy')
      expect(result.responseTime).toBeLessThan(500)
    })

    it('should return unhealthy status for database connection error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: new Error('Connection failed') })
        })
      })

      const result = await healthMonitor.checkDatabaseHealth()

      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('Connection failed')
    })
  })

  describe('determineOverallStatus', () => {
    it('should return unhealthy when critical components fail', () => {
      const components = [
        { name: 'database', status: 'unhealthy' },
        { name: 'authentication', status: 'healthy' }
      ]

      const status = healthMonitor.determineOverallStatus(components)
      expect(status).toBe('unhealthy')
    })

    it('should return degraded when non-critical components fail', () => {
      const components = [
        { name: 'database', status: 'healthy' },
        { name: 'edge_functions', status: 'unhealthy' }
      ]

      const status = healthMonitor.determineOverallStatus(components)
      expect(status).toBe('degraded')
    })
  })
})
```

### Integration Testing

```typescript
// API integration tests
describe('Health API Integration', () => {
  let app: NextApiHandler

  beforeAll(async () => {
    app = await createTestApp()
  })

  it('should return basic health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body).toMatchObject({
      status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
      timestamp: expect.any(String),
      service: 'tiktok-signing-paas'
    })
  })

  it('should return detailed health status with detailed=true', async () => {
    const response = await request(app)
      .get('/api/health?detailed=true')
      .expect(200)

    expect(response.body).toMatchObject({
      detailed: true,
      components: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          status: expect.stringMatching(/^(healthy|degraded|unhealthy|unknown)$/),
          responseTime: expect.any(Number)
        })
      ])
    })
  })

  it('should require authentication for admin endpoints', async () => {
    await request(app)
      .get('/api/admin/performance')
      .expect(401)
  })
})
```

### End-to-End Testing

```typescript
// E2E monitoring tests
describe('Monitoring Dashboard E2E', () => {
  let page: Page

  beforeAll(async () => {
    page = await browser.newPage()
    await page.goto('/dashboard')
    await loginAsAdmin(page)
  })

  it('should display monitoring dashboard', async () => {
    await page.click('[data-testid="monitoring-tab"]')
    
    await expect(page.locator('[data-testid="system-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="uptime-display"]')).toBeVisible()
  })

  it('should refresh monitoring data', async () => {
    const initialTimestamp = await page.textContent('[data-testid="last-updated"]')
    
    await page.click('[data-testid="refresh-button"]')
    await page.waitForTimeout(1000)
    
    const newTimestamp = await page.textContent('[data-testid="last-updated"]')
    expect(newTimestamp).not.toBe(initialTimestamp)
  })

  it('should display alerts when present', async () => {
    // Trigger an alert condition
    await triggerTestAlert()
    
    await page.click('[data-testid="alerts-tab"]')
    await expect(page.locator('[data-testid="active-alert"]')).toBeVisible()
  })
})
```

## Deployment Considerations

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Monitoring Configuration
HEALTH_CHECK_INTERVAL=120000  # 2 minutes
ALERT_CHECK_INTERVAL=300000   # 5 minutes
QUOTA_CHECK_INTERVAL=900000   # 15 minutes

# Alert Configuration
ERROR_RATE_THRESHOLD=0.1      # 10%
RESPONSE_TIME_THRESHOLD=5000  # 5 seconds
QUOTA_WARNING_THRESHOLD=0.8   # 80%

# Notification Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=alerts@example.com
```

### Docker Configuration

```dockerfile
# Dockerfile for monitoring service
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# monitoring-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tiktok-signing-monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tiktok-signing-monitoring
  template:
    metadata:
      labels:
        app: tiktok-signing-monitoring
    spec:
      containers:
      - name: monitoring
        image: tiktok-signing-paas:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: supabase-config
              key: url
        - name: SUPABASE_SERVICE_ROLE_KEY
          valueFrom:
            secretKeyRef:
              name: supabase-config
              key: service-role-key
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: monitoring-service
spec:
  selector:
    app: tiktok-signing-monitoring
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Monitoring and Observability

```yaml
# Prometheus monitoring configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'tiktok-signing-monitoring'
      static_configs:
      - targets: ['monitoring-service:80']
      metrics_path: '/api/metrics'
      scrape_interval: 30s
```

## Performance Optimization

### Database Query Optimization

```sql
-- Optimized health check queries
-- Use indexes for efficient filtering
CREATE INDEX CONCURRENTLY idx_usage_logs_created_at_success 
ON usage_logs(created_at, success) 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Partitioning for large tables
CREATE TABLE usage_logs_y2024m01 PARTITION OF usage_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Materialized views for common aggregations
CREATE MATERIALIZED VIEW hourly_performance_stats AS
SELECT 
  date_trunc('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour;

-- Refresh materialized view periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_performance_stats;
```

### Caching Strategy

```typescript
// Multi-level caching implementation
class MonitoringCache {
  private memoryCache = new Map<string, CacheEntry>()
  private redisClient?: RedisClient

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Level 1: Memory cache
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data
    }

    // Level 2: Redis cache
    if (this.redisClient) {
      const redisData = await this.redisClient.get(key)
      if (redisData) {
        const parsed = JSON.parse(redisData)
        // Update memory cache
        this.memoryCache.set(key, {
          data: parsed.data,
          timestamp: parsed.timestamp,
          ttl: parsed.ttl
        })
        return parsed.data
      }
    }

    return null
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    }

    // Level 1: Memory cache
    this.memoryCache.set(key, entry)

    // Level 2: Redis cache
    if (this.redisClient) {
      await this.redisClient.setex(key, ttlSeconds, JSON.stringify(entry))
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
}
```

### Connection Pooling

```typescript
// Optimized Supabase client with connection pooling
class OptimizedSupabaseClient {
  private static instance: OptimizedSupabaseClient
  private client: SupabaseClient
  private connectionPool: Pool

  private constructor() {
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: 'public'
        },
        auth: {
          persistSession: false
        }
      }
    )

    // Configure connection pool for direct database access
    this.connectionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  public static getInstance(): OptimizedSupabaseClient {
    if (!OptimizedSupabaseClient.instance) {
      OptimizedSupabaseClient.instance = new OptimizedSupabaseClient()
    }
    return OptimizedSupabaseClient.instance
  }

  async executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    const client = await this.connectionPool.connect()
    try {
      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  getClient(): SupabaseClient {
    return this.client
  }
}
```

### Batch Processing

```typescript
// Batch health check processing
class BatchHealthChecker {
  private batchSize = 10
  private batchTimeout = 5000

  async performBatchHealthChecks(components: string[]): Promise<ServiceComponent[]> {
    const batches = this.createBatches(components, this.batchSize)
    const results: ServiceComponent[] = []

    for (const batch of batches) {
      const batchPromises = batch.map(component => 
        this.performComponentHealthCheck(component)
      )

      try {
        const batchResults = await Promise.allSettled(batchPromises)
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            results.push({
              name: batch[index],
              status: 'unhealthy',
              responseTime: this.batchTimeout,
              lastCheck: new Date(),
              error: result.reason?.message || 'Health check failed'
            })
          }
        })
      } catch (error) {
        console.error('Batch health check failed:', error)
      }
    }

    return results
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }
}
```

This technical implementation guide provides comprehensive details about the architecture, implementation patterns, and best practices used in the service monitoring and health check systems. It serves as a reference for developers working on the system and provides insights into the technical decisions and trade-offs made during implementation.