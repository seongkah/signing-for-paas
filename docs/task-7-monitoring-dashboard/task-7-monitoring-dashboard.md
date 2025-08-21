# Task 7: Monitoring Dashboard and Real-Time Metrics

## Overview

This document provides comprehensive documentation for the monitoring dashboard and real-time metrics system implemented in Task 7. The system provides users with detailed insights into their API usage, system performance, quota consumption, and error tracking through an intuitive web interface.

## Features Implemented

### 1. Dashboard Components for Service Metrics
- **Real-time metrics display** with auto-refresh capabilities
- **Key performance indicators** (KPIs) with visual status indicators
- **Usage statistics** with historical data and trends
- **System health monitoring** with component-level status tracking

### 2. Real-Time Data Fetching
- **Live metrics** updated every 30-60 seconds
- **Supabase integration** for real-time data retrieval
- **Auto-refresh controls** with configurable intervals
- **Error handling** with retry mechanisms

### 3. Charts and Visualizations
- **Request volume charts** showing daily and hourly patterns
- **Response time tracking** with performance indicators
- **Success rate monitoring** with trend analysis
- **Error distribution** with severity classification

### 4. Quota Usage Indicators
- **Visual progress bars** for quota consumption
- **Free tier limit tracking** with alerts
- **Historical usage patterns** and projections
- **Reset time indicators** for quota periods

## Architecture

### Component Structure

```
src/components/monitoring/
├── MonitoringDashboard.tsx    # Main dashboard container
├── MetricsCard.tsx           # Reusable metric display component
├── QuotaUsageCard.tsx        # Quota tracking with progress bars
├── SimpleChart.tsx           # Lightweight charting component
├── RealTimeMetrics.tsx       # Live metrics with auto-refresh
├── ErrorLogViewer.tsx        # Error log display and filtering
├── SystemStatus.tsx          # System health monitoring
└── index.ts                  # Component exports
```

### API Endpoints

```
/api/user/analytics           # User-specific analytics data
/api/admin/analytics          # System-wide analytics (admin)
/api/admin/system-health      # System health monitoring
/api/admin/quota-monitor      # Quota monitoring and alerts
```

## Component Documentation

### MonitoringDashboard

The main dashboard component that orchestrates all monitoring features.

**Props:**
- `className?: string` - Optional CSS classes

**Features:**
- Tabbed interface integration
- Real-time data fetching
- Error handling and loading states
- Configurable refresh intervals

**Usage:**
```tsx
import { MonitoringDashboard } from '@/components/monitoring'

<MonitoringDashboard />
```

### MetricsCard

Reusable component for displaying key metrics with status indicators.

**Props:**
```tsx
interface MetricsCardProps {
  title: string
  description?: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period: string
  }
  status?: 'success' | 'warning' | 'error' | 'info'
  icon?: React.ReactNode
  className?: string
}
```

**Example:**
```tsx
<MetricsCard
  title="Total Requests"
  value="1,234"
  change={{ value: 15, type: 'increase', period: 'yesterday' }}
  status="success"
  icon={<span>📊</span>}
/>
```

### QuotaUsageCard

Visual quota usage tracking with progress bars and alerts.

**Props:**
```tsx
interface QuotaUsageCardProps {
  title: string
  used: number
  limit: number
  resetTime?: Date
  type: 'daily' | 'monthly' | 'bandwidth' | 'storage'
  className?: string
}
```

**Features:**
- Visual progress bars with color coding
- Usage percentage calculations
- Reset time countdown
- Automatic alerts for high usage

### SimpleChart

Lightweight charting component supporting multiple chart types.

**Props:**
```tsx
interface SimpleChartProps {
  title: string
  description?: string
  data: ChartDataPoint[]
  type: 'bar' | 'line' | 'area'
  height?: number
  className?: string
}
```

**Supported Chart Types:**
- **Bar charts** for categorical data
- **Line charts** for time series data
- **Area charts** for cumulative metrics

### RealTimeMetrics

Live metrics display with auto-refresh capabilities.

**Props:**
```tsx
interface RealTimeMetricsProps {
  userId: string
  refreshInterval?: number // milliseconds
  className?: string
}
```

**Features:**
- Real-time request monitoring
- Success rate tracking
- Response time analysis
- Auto-refresh controls

### ErrorLogViewer

Searchable and filterable error log display.

**Props:**
```tsx
interface ErrorLogViewerProps {
  userId: string
  maxEntries?: number
  className?: string
}
```

**Features:**
- Error severity classification
- Search and filtering capabilities
- Error details and recommendations
- Pagination support

### SystemStatus

Overall system health monitoring component.

**Props:**
```tsx
interface SystemStatusProps {
  className?: string
  refreshInterval?: number
}
```

**Monitors:**
- Database connectivity
- Performance metrics
- Error rates
- User activity

## API Documentation

### GET /api/user/analytics

Retrieves user-specific analytics data.

**Query Parameters:**
- `days` (optional): Number of days to include (default: 30)
- `warnings` (optional): Include quota warnings (true/false)
- `live` (optional): Include live metrics (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "tier": "free" },
    "period": { "days": 30, "startDate": "...", "endDate": "..." },
    "analytics": {
      "totalRequests": 1234,
      "successfulRequests": 1200,
      "failedRequests": 34,
      "successRate": 97.2,
      "averageResponseTime": 850,
      "peakResponseTime": 2100,
      "requestsPerDay": [...],
      "errorBreakdown": [...],
      "hourlyDistribution": [...]
    },
    "quota": {
      "current": { "requestCount": 45, "dailyLimit": 100, ... },
      "history": [...]
    },
    "warnings": [...],
    "live": { // if live=true
      "requestsLastHour": 5,
      "successRateLastHour": 100,
      "avgResponseTimeLastHour": 750,
      "lastActivity": "2024-01-15T10:30:00Z"
    }
  }
}
```

### GET /api/admin/system-health

System health monitoring endpoint (admin access).

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "health": {
      "database": {
        "connected": true,
        "responseTime": 45,
        "status": "healthy"
      },
      "requests": {
        "lastHour": { "total": 150, "successful": 147, ... },
        "last24Hours": { "total": 2400, "successful": 2350, ... }
      },
      "users": { "activeInLast24Hours": 25 },
      "performance": { "averageResponseTime": 850, "status": "good" },
      "errors": { "recentCount": 3, "status": "good" }
    },
    "status": "healthy"
  }
}
```

## Dashboard Navigation

The monitoring dashboard is integrated into the main dashboard with a tabbed interface:

1. **Overview Tab** - Account information and quick start guide
2. **Monitoring & Analytics Tab** - Full monitoring dashboard
3. **API Keys Tab** - API key management

### Accessing the Monitoring Dashboard

1. Log in to your account
2. Navigate to the Dashboard
3. Click on the "Monitoring & Analytics" tab
4. View real-time metrics and analytics

## Key Metrics Explained

### Request Metrics
- **Total Requests**: Cumulative number of API calls
- **Success Rate**: Percentage of successful requests
- **Average Response Time**: Mean response time in milliseconds
- **Failed Requests**: Number of failed API calls

### Quota Metrics
- **Daily Usage**: Current day's request count vs. limit
- **Remaining Quota**: Requests remaining until limit
- **Reset Time**: When quota resets (daily at midnight UTC)
- **Usage History**: Historical quota consumption patterns

### System Health Indicators
- **🟢 Healthy**: All systems operating normally
- **🟡 Degraded**: Some performance issues detected
- **🔴 Unhealthy**: Critical issues requiring attention

### Error Severity Levels
- **🔴 Critical**: System failures, crashes
- **🟠 High**: Timeouts, connection issues
- **🟡 Medium**: Validation errors, invalid inputs
- **🔵 Low**: Minor issues, warnings

## Real-Time Features

### Auto-Refresh
- **Default Interval**: 60 seconds
- **Configurable Options**: 30s, 1m, 5m, or disabled
- **Manual Refresh**: Available via refresh buttons
- **Pause/Resume**: Control auto-refresh as needed

### Live Metrics
- **Requests per Minute**: Current request rate
- **Success Rate**: Real-time success percentage
- **Response Time**: Current average response time
- **Active Connections**: Simulated connection count

## Error Handling

### Component Error States
- **Loading States**: Spinner animations during data fetch
- **Error Messages**: Clear error descriptions with retry options
- **Fallback UI**: Graceful degradation when data unavailable
- **Retry Mechanisms**: Automatic and manual retry options

### API Error Handling
- **Authentication Errors**: Redirect to login
- **Authorization Errors**: Access denied messages
- **Network Errors**: Connection issue notifications
- **Server Errors**: Internal error handling

## Performance Considerations

### Optimization Strategies
- **Data Caching**: Client-side caching of analytics data
- **Lazy Loading**: Components load data on demand
- **Debounced Requests**: Prevent excessive API calls
- **Efficient Queries**: Optimized database queries

### Resource Management
- **Memory Usage**: Efficient data structures and cleanup
- **Network Requests**: Batched and optimized API calls
- **Rendering Performance**: React optimization techniques
- **Bundle Size**: Tree-shaking and code splitting

## Troubleshooting

### Common Issues

**Dashboard Not Loading**
- Check authentication status
- Verify API endpoint availability
- Check browser console for errors

**Real-Time Data Not Updating**
- Verify auto-refresh is enabled
- Check network connectivity
- Ensure API endpoints are responding

**Charts Not Displaying**
- Verify data format and structure
- Check for JavaScript errors
- Ensure sufficient data points

**Quota Information Incorrect**
- Check database quota_usage table
- Verify user tier settings
- Ensure quota calculations are current

### Debug Information

Enable debug mode by adding query parameter `?debug=true` to see:
- API response times
- Data fetch status
- Component render information
- Error stack traces

## Security Considerations

### Data Protection
- **User Isolation**: Users only see their own data
- **Admin Access**: System-wide data requires admin privileges
- **API Authentication**: All endpoints require valid authentication
- **Data Sanitization**: Input validation and output encoding

### Privacy
- **Personal Data**: No sensitive personal information displayed
- **Usage Patterns**: Aggregated data only
- **Error Logs**: Sanitized error messages
- **Access Logs**: Secure audit trail

## Future Enhancements

### Planned Features
- **Custom Dashboards**: User-configurable dashboard layouts
- **Alert System**: Email/SMS notifications for quota limits
- **Export Functionality**: CSV/PDF export of analytics data
- **Advanced Filtering**: More granular data filtering options

### Integration Opportunities
- **Third-party Monitoring**: Integration with external monitoring tools
- **Webhook Support**: Real-time notifications via webhooks
- **API Versioning**: Support for multiple API versions
- **Mobile App**: Native mobile monitoring application

## Conclusion

The monitoring dashboard provides comprehensive visibility into API usage, system performance, and quota consumption. With real-time updates, intuitive visualizations, and detailed error tracking, users can effectively monitor their TikTok Signing Service usage and optimize their integration accordingly.

For technical support or feature requests, please refer to the main project documentation or contact the development team.