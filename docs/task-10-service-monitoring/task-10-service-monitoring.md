# Task 10: Service Monitoring and Health Check Systems

## Overview

This document provides comprehensive documentation for the service monitoring and health check systems implemented in Task 10. The system provides enterprise-grade monitoring capabilities including real-time health checks, uptime tracking, performance monitoring, and intelligent alerting.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Health Monitoring](#health-monitoring)
4. [Performance Monitoring](#performance-monitoring)
5. [Uptime Tracking](#uptime-tracking)
6. [Alerting System](#alerting-system)
7. [API Endpoints](#api-endpoints)
8. [Dashboard Interface](#dashboard-interface)
9. [Configuration](#configuration)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

## System Architecture

The monitoring system consists of several interconnected components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Dashboard                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │  Overview   │ │ Performance │ │   Uptime    │ │ Alerts │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │   Health    │ │ Performance │ │   Uptime    │ │Alerting│ │
│  │     API     │ │     API     │ │     API     │ │  API   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Services                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │   Health    │ │   Health    │ │  Alerting   │ │ Quota  │ │
│  │  Monitor    │ │  Scheduler  │ │   System    │ │Monitor │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Storage                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Health      │ │ Usage       │ │ Error       │ │ Quota  │ │
│  │ Checks      │ │ Logs        │ │ Logs        │ │ Usage  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Health Monitor (`src/lib/health-monitor.ts`)

The central component responsible for performing comprehensive health checks across all system components.

**Key Features:**
- Database connectivity and performance testing
- Authentication system validation
- Edge Functions health verification
- Signature generation testing
- API endpoint monitoring
- Component availability tracking

**Health Check Components:**
- **Database**: Connection, read/write operations, response time
- **Authentication**: Session validation, user lookup
- **Edge Functions**: Function availability and response time
- **Signature Generation**: Core functionality testing
- **API Endpoints**: Health, Eulerstream, Sign endpoints

### 2. Health Scheduler (`src/lib/health-scheduler.ts`)

Automated scheduling service that runs periodic monitoring tasks.

**Scheduling Intervals:**
- Health checks: Every 2 minutes
- Alert evaluations: Every 5 minutes
- Quota monitoring: Every 15 minutes

**Features:**
- Graceful startup and shutdown
- Manual trigger capabilities
- Error handling and recovery
- Status reporting

### 3. Alerting System (`src/lib/alerting-system.ts`)

Enhanced alerting system with multiple alert types and intelligent management.

**Alert Types:**
- High error rate (>10% in 15 minutes)
- Critical errors (any critical error in 5 minutes)
- Signature generation failures (5+ failures in 10 minutes)
- Database connection issues (3+ errors in 5 minutes)
- Consecutive API failures (10+ consecutive failures)
- Slow response times (>5 seconds average in 10 minutes)
- Quota usage alerts (80% and 100% thresholds)
- Service degradation (50%+ components degraded)
- Uptime threshold alerts (<99% uptime)

**Features:**
- Configurable cooldown periods
- Alert acknowledgment system
- Severity classification
- Automatic notification handling

### 4. Quota Monitor (`src/lib/quota-monitor.ts`)

Monitors system-wide quota usage and generates alerts for approaching limits.

**Monitoring Capabilities:**
- User quota tracking
- System-wide usage statistics
- Unusual activity detection
- Quota recommendations
- Alert generation for limit violations

## Health Monitoring

### Component Health Checks

The system monitors the following components:

#### Database Health
```typescript
// Tests performed:
- Connection establishment
- Read operation (user count query)
- Write operation (health check record)
- Response time measurement
- Connection pool status
```

#### Authentication Health
```typescript
// Tests performed:
- Session retrieval
- User lookup operations
- Response time measurement
- Error rate tracking
```

#### Edge Functions Health
```typescript
// Tests performed:
- Function availability
- Response time measurement
- Function execution validation
- Error handling
```

#### Signature Generation Health
```typescript
// Tests performed:
- Sample signature generation
- Response time measurement
- Success rate validation
- Error pattern analysis
```

#### API Endpoints Health
```typescript
// Endpoints monitored:
- /api/health
- /api/eulerstream
- /api/sign
- Response time tracking
- HTTP status monitoring
```

### Health Status Determination

The system uses a three-tier status classification:

- **Healthy**: All components operating normally
- **Degraded**: Some components experiencing issues but system functional
- **Unhealthy**: Critical components failing or system compromised

**Status Logic:**
```typescript
// Critical components that make system unhealthy if they fail:
const criticalComponents = ['database', 'signature_generation']

if (criticalUnhealthy || unhealthyComponents.length >= 3) {
  return 'unhealthy'
}

if (unhealthyComponents.length > 0 || degradedComponents.length >= 2) {
  return 'degraded'
}

return 'healthy'
```

## Performance Monitoring

### Metrics Collected

The performance monitoring system tracks:

#### Request Metrics
- Total requests per time period
- Successful vs failed requests
- Success rate percentage
- Throughput (requests per hour)

#### Response Time Metrics
- Average response time
- Median response time
- 95th percentile (P95)
- 99th percentile (P99)
- Minimum and maximum response times

#### Error Analysis
- Total error count
- Error rate percentage
- Error categorization by type
- Error pattern analysis

#### Trend Analysis
- Hourly performance trends
- Response time distribution
- Success rate trends over time
- Throughput patterns

### Performance Alerts

The system generates alerts for:
- Average response time >3000ms (High severity)
- Success rate <95% (High/Critical severity)
- High throughput >1000 requests/hour (Medium severity)
- P95 response time >5000ms (Optimization recommendation)

### Performance Recommendations

The system provides intelligent recommendations:
- **Optimization**: For slow response times or high error rates
- **Scaling**: For high throughput with elevated response times
- **Reliability**: For addressing common error patterns

## Uptime Tracking

### Uptime Metrics

The system tracks comprehensive uptime statistics:

#### Overall Uptime
- Uptime percentage over time periods
- Total checks vs successful checks
- Mean Time To Recovery (MTTR)
- Longest downtime period

#### Component-Specific Uptime
- Individual component availability
- Component-specific incident counts
- Component failure patterns

#### Incident Tracking
- Incident start and end times
- Duration calculation
- Affected components identification
- Severity classification (Critical/Degraded)

### Uptime Calculation

```typescript
// Uptime percentage calculation
const uptimePercentage = (successfulChecks / totalChecks) * 100

// MTTR calculation
const meanTimeToRecovery = resolvedIncidents.length > 0
  ? resolvedIncidents.reduce((sum, inc) => sum + inc.duration, 0) / resolvedIncidents.length
  : 0
```

### Historical Data

The system maintains:
- 24-hour uptime history
- Component availability trends
- Incident history with details
- Recovery time statistics

## Alerting System

### Alert Rules Configuration

The alerting system includes pre-configured rules:

```typescript
const alertRules = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    condition: { type: 'error_rate', threshold: 0.1, timeWindowMinutes: 15 },
    severity: 'HIGH',
    cooldownMinutes: 30
  },
  {
    id: 'quota-limit-approaching',
    name: 'Quota Limit Approaching',
    condition: { type: 'quota_usage', threshold: 0.8, timeWindowMinutes: 60 },
    severity: 'MEDIUM',
    cooldownMinutes: 60
  },
  // ... additional rules
]
```

### Alert Evaluation

The system evaluates alerts based on:
- **Error Rate**: Percentage of failed requests
- **Error Count**: Absolute number of errors
- **Response Time**: Average response time thresholds
- **Consecutive Failures**: Sequential failure detection
- **Quota Usage**: Resource utilization thresholds
- **Service Degradation**: Component health degradation
- **Uptime**: System availability thresholds

### Alert Management

Features include:
- **Cooldown Periods**: Prevent alert spam
- **Acknowledgment**: Manual alert dismissal
- **Severity Levels**: Critical, High, Medium, Low
- **Notification Channels**: Configurable notification methods

## API Endpoints

### Health Check API

#### `GET /api/health`
Basic health check endpoint with optional detailed mode.

**Query Parameters:**
- `detailed=true`: Returns comprehensive health data
- `component=<name>`: Returns specific component health

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "tiktok-signing-paas",
  "version": "1.0.0",
  "components": [...],
  "uptime": {...},
  "performance": {...}
}
```

### System Health API

#### `GET /api/admin/system-health`
Detailed system health metrics for administrators.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "health": {
      "database": {...},
      "requests": {...},
      "users": {...},
      "performance": {...},
      "errors": {...}
    },
    "status": "healthy|degraded|unhealthy"
  }
}
```

### Performance API

#### `GET /api/admin/performance`
Performance metrics and analytics.

**Query Parameters:**
- `hours=<number>`: Time window for metrics (default: 24)
- `endpoint=<string>`: Filter by specific endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    "timeWindow": {...},
    "metrics": {
      "requests": {...},
      "responseTime": {...},
      "errors": {...}
    },
    "trends": {...},
    "alerts": [...],
    "recommendations": [...]
  }
}
```

### Uptime API

#### `GET /api/admin/uptime`
Uptime and availability metrics.

**Query Parameters:**
- `hours=<number>`: Time window for data (default: 24)
- `component=<string>`: Filter by specific component

**Response:**
```json
{
  "success": true,
  "data": {
    "timeWindow": {...},
    "overall": {
      "percentage": 99.95,
      "totalChecks": 720,
      "upChecks": 719,
      "meanTimeToRecovery": 2.5,
      "longestDowntime": 5.0
    },
    "components": {...},
    "incidents": [...]
  }
}
```

### Monitoring Control API

#### `GET /api/admin/monitoring`
Get monitoring system status.

#### `POST /api/admin/monitoring`
Control monitoring system operations.

**Actions:**
- `start`: Start health scheduler
- `stop`: Stop health scheduler
- `triggerHealthCheck`: Manual health check
- `triggerAlertCheck`: Manual alert evaluation
- `triggerQuotaCheck`: Manual quota check
- `status`: Get scheduler status

### Alerting API

#### `GET /api/admin/alerting`
Get alerting system status and active alerts.

#### `POST /api/admin/alerting`
Manage alerts and trigger checks.

**Actions:**
- `check`: Trigger manual alert evaluation
- `acknowledge`: Acknowledge specific alert

#### `PUT /api/admin/alerting`
Update alert rule configuration.

## Dashboard Interface

### Comprehensive Monitoring Dashboard

The dashboard provides a multi-tab interface with:

#### Overview Tab
- System status summary
- Component health indicators
- Real-time metrics display
- Overall health visualization

#### Performance Tab
- Request metrics cards
- Response time statistics
- Performance trend charts
- Optimization recommendations

#### Uptime Tab
- Uptime percentage display
- Component availability metrics
- Incident history
- MTTR statistics

#### Alerts Tab
- Active alerts display
- Alert severity indicators
- Alert acknowledgment controls
- System alert status

### Dashboard Features

- **Real-time Updates**: Configurable refresh intervals
- **Interactive Charts**: Performance trend visualization
- **Status Indicators**: Color-coded health status
- **Alert Management**: In-dashboard alert handling
- **Historical Data**: Trend analysis and reporting

## Configuration

### Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Monitoring Configuration
HEALTH_CHECK_INTERVAL=120000  # 2 minutes
ALERT_CHECK_INTERVAL=300000   # 5 minutes
QUOTA_CHECK_INTERVAL=900000   # 15 minutes

# Alert Thresholds
ERROR_RATE_THRESHOLD=0.1      # 10%
RESPONSE_TIME_THRESHOLD=5000  # 5 seconds
QUOTA_WARNING_THRESHOLD=0.8   # 80%
QUOTA_CRITICAL_THRESHOLD=1.0  # 100%
```

### Database Schema

The monitoring system uses the following database tables:

#### health_checks
```sql
CREATE TABLE health_checks (
  id TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### usage_logs
```sql
-- Existing table used for performance metrics
-- Contains request logs with response times and success status
```

#### error_logs
```sql
-- Existing table used for error tracking
-- Contains detailed error information and patterns
```

### Alert Rule Configuration

Alert rules can be customized by modifying the alerting system:

```typescript
// Example custom alert rule
{
  id: 'custom-alert',
  name: 'Custom Alert Rule',
  condition: {
    type: 'error_rate',
    threshold: 0.05,  // 5% error rate
    timeWindowMinutes: 10,
    endpoints: ['/api/signature']  // Specific endpoint
  },
  severity: ErrorSeverity.HIGH,
  enabled: true,
  cooldownMinutes: 15
}
```

## Testing

### Test Script

A comprehensive test script is provided at `src/scripts/test-health-monitoring.ts`:

```bash
# Run the test script
npx tsx src/scripts/test-health-monitoring.ts
```

### Test Coverage

The test script validates:
- Health monitor functionality
- Alerting system operations
- Quota monitoring
- Scheduler status
- Component availability tracking
- API endpoint accessibility

### Manual Testing

#### Health Check Testing
```bash
# Basic health check
curl http://localhost:3000/api/health

# Detailed health check
curl http://localhost:3000/api/health?detailed=true

# Component-specific check
curl http://localhost:3000/api/health?component=database
```

#### Performance Testing
```bash
# Get performance metrics
curl http://localhost:3000/api/admin/performance

# Get 12-hour performance data
curl http://localhost:3000/api/admin/performance?hours=12
```

#### Uptime Testing
```bash
# Get uptime data
curl http://localhost:3000/api/admin/uptime

# Get component-specific uptime
curl http://localhost:3000/api/admin/uptime?component=database
```

## Troubleshooting

### Common Issues

#### Health Scheduler Not Starting
```bash
# Check scheduler status
curl -X POST http://localhost:3000/api/admin/monitoring \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'

# Start scheduler manually
curl -X POST http://localhost:3000/api/admin/monitoring \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

#### Database Connection Issues
- Verify Supabase credentials
- Check network connectivity
- Validate RLS policies
- Review database logs

#### High Response Times
- Check database performance
- Review signature generation efficiency
- Analyze network latency
- Monitor resource utilization

#### Missing Health Check Data
- Verify database table creation
- Check service role permissions
- Review error logs
- Validate data insertion

### Debugging

#### Enable Debug Logging
```typescript
// Add to health monitor
console.log('Health check debug:', {
  component: componentName,
  status: componentStatus,
  responseTime: responseTime,
  error: errorMessage
})
```

#### Monitor Scheduler Activity
```bash
# Check application logs for scheduler activity
# Look for messages like:
# "Running scheduled health check..."
# "Health check completed: healthy"
# "Alert check completed"
```

#### Database Query Debugging
```sql
-- Check recent health checks
SELECT * FROM health_checks 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check component-specific data
SELECT component, data, created_at 
FROM health_checks 
WHERE component = 'system'
ORDER BY created_at DESC
LIMIT 10;
```

### Performance Optimization

#### Reduce Check Frequency
```typescript
// Adjust intervals in health-scheduler.ts
const healthCheckInterval = 5 * 60 * 1000  // 5 minutes instead of 2
const alertCheckInterval = 10 * 60 * 1000  // 10 minutes instead of 5
```

#### Optimize Database Queries
- Add appropriate indexes
- Limit historical data retention
- Use connection pooling
- Implement query caching

#### Reduce Alert Noise
- Increase cooldown periods
- Adjust alert thresholds
- Implement alert grouping
- Add alert suppression rules

## Best Practices

### Monitoring Strategy
1. **Proactive Monitoring**: Set up alerts before issues become critical
2. **Baseline Establishment**: Understand normal system behavior
3. **Trend Analysis**: Monitor patterns over time
4. **Incident Response**: Have clear procedures for alert handling

### Alert Management
1. **Meaningful Alerts**: Ensure alerts indicate actionable issues
2. **Alert Fatigue Prevention**: Use appropriate thresholds and cooldowns
3. **Escalation Procedures**: Define clear escalation paths
4. **Documentation**: Maintain runbooks for common issues

### Performance Optimization
1. **Regular Review**: Analyze performance trends regularly
2. **Capacity Planning**: Monitor growth patterns
3. **Resource Optimization**: Identify and address bottlenecks
4. **Continuous Improvement**: Iterate on monitoring strategies

### Data Management
1. **Retention Policies**: Define appropriate data retention periods
2. **Storage Optimization**: Implement efficient data storage strategies
3. **Backup Procedures**: Ensure monitoring data is backed up
4. **Privacy Compliance**: Handle monitoring data according to privacy requirements

## Conclusion

The service monitoring and health check systems provide comprehensive visibility into the TikTok Signing PaaS service. The implementation includes real-time monitoring, intelligent alerting, performance tracking, and uptime analysis, ensuring high availability and optimal performance of the service.

The system is designed to be extensible and configurable, allowing for customization based on specific operational requirements and scaling needs.