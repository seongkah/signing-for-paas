# Task 7: Technical Implementation Guide

## Overview

This guide provides detailed technical information about the monitoring dashboard implementation, including code structure, data flow, and integration patterns.

## Code Architecture

### Component Hierarchy

```
MonitoringDashboard (Main Container)
├── MetricsCard (Key Metrics Row)
│   ├── Total Requests
│   ├── Success Rate
│   ├── Average Response Time
│   └── Failed Requests
├── RealTimeMetrics (Live Data)
├── SystemStatus (Health Monitoring)
├── QuotaUsageCard (Usage Tracking)
├── SimpleChart (Visualizations)
│   ├── Requests Per Day
│   ├── Hourly Distribution
│   └── Quota History
├── ErrorLogViewer (Error Analysis)
└── Performance Insights
```

### Data Flow

```mermaid
graph TD
    A[MonitoringDashboard] --> B[fetchDashboardData]
    B --> C[/api/user/analytics]
    C --> D[Database Queries]
    D --> E[Analytics Data]
    E --> F[Component State]
    F --> G[UI Rendering]
    
    H[RealTimeMetrics] --> I[Auto-refresh Timer]
    I --> J[/api/user/analytics?live=true]
    J --> K[Live Metrics Update]
    
    L[SystemStatus] --> M[/api/admin/system-health]
    M --> N[System Health Data]
```

## Component Implementation Details

### MonitoringDashboard.tsx

**State Management:**
```tsx
const [data, setData] = useState<DashboardData | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [refreshInterval, setRefreshInterval] = useState(60000)
```

**Data Fetching Logic:**
```tsx
const fetchDashboardData = async () => {
  try {
    setError(null)
    const response = await fetch('/api/user/analytics?days=30&warnings=true')
    const result = await response.json()
    
    if (result.success) {
      setData({
        analytics: result.data.analytics,
        quota: result.data.quota,
        warnings: result.data.warnings || []
      })
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch data')
  } finally {
    setLoading(false)
  }
}
```

**Auto-refresh Implementation:**
```tsx
useEffect(() => {
  const interval = setInterval(fetchDashboardData, refreshInterval)
  return () => clearInterval(interval)
}, [refreshInterval])
```

### MetricsCard.tsx

**Status Color Logic:**
```tsx
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'success': return 'text-green-600 bg-green-50 border-green-200'
    case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'error': return 'text-red-600 bg-red-50 border-red-200'
    case 'info': return 'text-blue-600 bg-blue-50 border-blue-200'
    default: return ''
  }
}
```

**Change Indicator Logic:**
```tsx
const getChangeIcon = (type: string) => {
  switch (type) {
    case 'increase': return '↗'
    case 'decrease': return '↘'
    default: return '→'
  }
}
```

### QuotaUsageCard.tsx

**Progress Calculation:**
```tsx
const percentage = limit > 0 ? (used / limit) * 100 : 0
const remaining = Math.max(0, limit - used)

const getStatusColor = (percentage: number) => {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 75) return 'bg-yellow-500'
  if (percentage >= 50) return 'bg-blue-500'
  return 'bg-green-500'
}
```

**Value Formatting:**
```tsx
const formatValue = (value: number, type: string) => {
  switch (type) {
    case 'bandwidth':
    case 'storage':
      if (value >= 1024 * 1024 * 1024) {
        return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
      }
      // ... more formatting logic
    default:
      return value.toLocaleString()
  }
}
```

### SimpleChart.tsx

**SVG Chart Generation:**
```tsx
const getBarHeight = (value: number) => {
  return ((value - minValue) / range) * (height - 40)
}

const getLinePoints = () => {
  const width = 300
  const stepX = width / (data.length - 1 || 1)
  
  return data.map((point, index) => {
    const x = index * stepX
    const y = height - 20 - getBarHeight(point.value)
    return `${x},${y}`
  }).join(' ')
}
```

**Chart Rendering:**
```tsx
{type === 'bar' && (
  <g>
    {data.map((point, index) => {
      const barWidth = 300 / data.length * 0.8
      const x = (300 / data.length) * index + (300 / data.length - barWidth) / 2
      const barHeight = getBarHeight(point.value)
      const y = height - 20 - barHeight
      
      return (
        <rect
          key={index}
          x={x}
          y={y}
          width={barWidth}
          height={barHeight}
          fill={point.color || '#3b82f6'}
        />
      )
    })}
  </g>
)}
```

### RealTimeMetrics.tsx

**Live Data Fetching:**
```tsx
const fetchMetrics = async () => {
  try {
    const response = await fetch(`/api/user/analytics?days=1&live=true`)
    const result = await response.json()
    
    if (result.success && result.data.analytics) {
      const analytics = result.data.analytics
      
      setMetrics({
        requestsPerMinute: Math.round(recentRequests / 60),
        averageResponseTime: analytics.averageResponseTime,
        successRate: analytics.successRate,
        activeConnections: Math.floor(Math.random() * 10) + 1,
        lastUpdated: new Date()
      })
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
  }
}
```

**Auto-refresh Control:**
```tsx
useEffect(() => {
  if (!isAutoRefresh) return
  const interval = setInterval(fetchMetrics, refreshInterval)
  return () => clearInterval(interval)
}, [refreshInterval, isAutoRefresh])
```

## API Implementation

### Enhanced Analytics Endpoint

**Live Metrics Support:**
```typescript
// Get query parameters
const days = parseInt(searchParams.get('days') || '30', 10)
const includeWarnings = searchParams.get('warnings') === 'true'
const includeLive = searchParams.get('live') === 'true'

// Get live metrics if requested
let liveMetrics: any = null
if (includeLive) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const { data: recentLogs } = await supabase
    .from('usage_logs')
    .select('success, response_time_ms, created_at')
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo.toISOString())

  if (recentLogs && recentLogs.length > 0) {
    const totalRecent = recentLogs.length
    const successfulRecent = recentLogs.filter(log => log.success).length
    const avgResponseTime = recentLogs.reduce((sum, log) => sum + log.response_time_ms, 0) / totalRecent

    liveMetrics = {
      requestsLastHour: totalRecent,
      successRateLastHour: totalRecent > 0 ? (successfulRecent / totalRecent) * 100 : 0,
      avgResponseTimeLastHour: avgResponseTime,
      lastActivity: recentLogs[recentLogs.length - 1]?.created_at
    }
  }
}
```

### System Health Endpoint

**Health Metrics Collection:**
```typescript
async function getSystemHealthMetrics(supabase: any) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Database connectivity test
  const dbHealthStart = Date.now()
  const { data: dbTest, error: dbError } = await supabase
    .from('users')
    .select('count')
    .limit(1)
  const dbResponseTime = Date.now() - dbHealthStart

  // Recent request metrics
  const { data: recentRequests } = await supabase
    .from('usage_logs')
    .select('success, response_time_ms, created_at')
    .gte('created_at', oneHourAgo.toISOString())

  // Calculate metrics
  const totalRecentRequests = recentRequests?.length || 0
  const successfulRecentRequests = recentRequests?.filter((r: any) => r.success).length || 0
  const recentSuccessRate = totalRecentRequests > 0 ? (successfulRecentRequests / totalRecentRequests) * 100 : 0

  return {
    database: {
      connected: !dbError,
      responseTime: dbResponseTime,
      status: !dbError && dbResponseTime < 1000 ? 'healthy' : 'degraded'
    },
    requests: {
      lastHour: {
        total: totalRecentRequests,
        successful: successfulRecentRequests,
        successRate: recentSuccessRate
      }
    }
    // ... more metrics
  }
}
```

## Database Integration

### Analytics Queries

**User Analytics Query:**
```typescript
const analytics = await analyticsOps.getUserAnalytics(user.id, days)

// Implementation in database-operations.ts
async getUserAnalytics(userId: string, days: number = 30) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const { data: logs, error } = await supabase
    .from('usage_logs')
    .select('success, response_time_ms, error_message, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  // Process and aggregate data
  const totalRequests = logs.length
  const successfulRequests = logs.filter(log => log.success).length
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
  
  // ... more calculations
  
  return {
    totalRequests,
    successfulRequests,
    failedRequests: totalRequests - successfulRequests,
    successRate,
    averageResponseTime,
    peakResponseTime,
    requestsPerDay: requestsPerDayArray,
    errorBreakdown: errorBreakdownArray,
    hourlyDistribution: hourlyDistributionArray
  }
}
```

### Quota Tracking

**Quota Usage Query:**
```typescript
async getUserQuotaUsage(userId: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('quota_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('date', targetDate)
    .single()

  const requestCount = data?.request_count || 0
  const dailyLimit = 100 // Free tier daily limit
  const remaining = Math.max(0, dailyLimit - requestCount)
  
  const resetTime = new Date()
  resetTime.setDate(resetTime.getDate() + 1)
  resetTime.setHours(0, 0, 0, 0)

  return {
    requestCount,
    dailyLimit,
    remaining,
    resetTime
  }
}
```

## Error Handling Patterns

### Component Error Boundaries

**Loading States:**
```tsx
if (loading) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Error States:**
```tsx
if (error) {
  return (
    <Card className={className}>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchData} variant="outline" size="sm" className="mt-4">
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}
```

### API Error Handling

**Standardized Error Response:**
```typescript
return NextResponse.json(
  {
    success: false,
    error: {
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: 'Internal server error while fetching analytics',
      code: 'INTERNAL_ERROR',
      timestamp: new Date()
    }
  },
  { status: 500 }
)
```

## Performance Optimizations

### React Optimizations

**Memoization:**
```tsx
const getChangeFromYesterday = useMemo(() => {
  return (requestsPerDay: Array<{ date: string; count: number }>) => {
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
}, [])
```

**Debounced Updates:**
```tsx
const debouncedFetch = useMemo(
  () => debounce(fetchDashboardData, 1000),
  [fetchDashboardData]
)
```

### Database Optimizations

**Indexed Queries:**
```sql
-- Ensure proper indexes for analytics queries
CREATE INDEX idx_usage_logs_user_created ON usage_logs(user_id, created_at);
CREATE INDEX idx_quota_usage_user_date ON quota_usage(user_id, date);
```

**Query Optimization:**
```typescript
// Use specific field selection instead of SELECT *
const { data: logs } = await supabase
  .from('usage_logs')
  .select('success, response_time_ms, created_at') // Only needed fields
  .eq('user_id', userId)
  .gte('created_at', startDate.toISOString())
  .order('created_at', { ascending: false })
  .limit(1000) // Reasonable limit
```

## Testing Considerations

### Component Testing

**Mock Data Setup:**
```typescript
const mockAnalyticsData = {
  totalRequests: 1234,
  successfulRequests: 1200,
  failedRequests: 34,
  successRate: 97.2,
  averageResponseTime: 850,
  requestsPerDay: [
    { date: '2024-01-14', count: 45 },
    { date: '2024-01-15', count: 52 }
  ]
}
```

**API Mocking:**
```typescript
// Mock fetch for testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      data: { analytics: mockAnalyticsData }
    })
  })
) as jest.Mock
```

### Integration Testing

**Dashboard Flow Test:**
```typescript
test('monitoring dashboard loads and displays data', async () => {
  render(<MonitoringDashboard />)
  
  // Check loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  
  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('1,234')).toBeInTheDocument() // Total requests
    expect(screen.getByText('97.2%')).toBeInTheDocument() // Success rate
  })
})
```

## Deployment Considerations

### Environment Variables

```bash
# Required for monitoring features
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Build Optimization

**Bundle Analysis:**
```bash
# Analyze bundle size
npm run build
npm run analyze
```

**Code Splitting:**
```typescript
// Lazy load monitoring components
const MonitoringDashboard = lazy(() => import('@/components/monitoring/MonitoringDashboard'))
```

## Monitoring and Observability

### Performance Monitoring

**Client-side Metrics:**
```typescript
// Track component render times
const renderStart = performance.now()
// ... component rendering
const renderTime = performance.now() - renderStart
console.log(`Dashboard render time: ${renderTime}ms`)
```

**API Response Times:**
```typescript
const fetchStart = Date.now()
const response = await fetch('/api/user/analytics')
const fetchTime = Date.now() - fetchStart
console.log(`API response time: ${fetchTime}ms`)
```

### Error Tracking

**Client-side Error Logging:**
```typescript
window.addEventListener('error', (event) => {
  console.error('Dashboard error:', event.error)
  // Send to error tracking service
})
```

**API Error Logging:**
```typescript
console.error('Analytics API error:', error)
// Log to monitoring service (e.g., Sentry, LogRocket)
```

## Security Implementation

### Data Sanitization

**Input Validation:**
```typescript
const days = Math.max(1, Math.min(365, parseInt(searchParams.get('days') || '30', 10)))
```

**Output Encoding:**
```typescript
// Sanitize error messages before displaying
const sanitizeError = (error: string) => {
  return error.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}
```

### Access Control

**User Data Isolation:**
```typescript
// Ensure users only access their own data
const { data: analytics } = await supabase
  .from('usage_logs')
  .select('*')
  .eq('user_id', user.id) // Critical: filter by authenticated user
```

**Admin Endpoint Protection:**
```typescript
// Admin-only endpoints require additional validation
if (!user.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

This technical implementation guide provides the detailed code structure and patterns used in the monitoring dashboard implementation. It serves as a reference for developers working on the system and for future enhancements.