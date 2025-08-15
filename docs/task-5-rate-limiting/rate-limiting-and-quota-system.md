# Rate Limiting and Quota Tracking System

This document describes the comprehensive rate limiting and quota tracking system implemented for the TikTok Signing PaaS.

## Overview

The system implements multi-tier rate limiting with comprehensive analytics and monitoring capabilities to ensure fair usage and prevent abuse while providing detailed insights into service usage patterns.

## Rate Limiting Tiers

### Free Tier Users
- **Daily Limit**: 100 requests per day
- **Hourly Limit**: 20 requests per hour
- **Burst Limit**: 5 requests per minute
- **Window Size**: 60 seconds

### API Key Users
- **Daily Limit**: Unlimited (-1)
- **Hourly Limit**: Unlimited (-1)
- **Burst Limit**: 100 requests per minute (higher than free tier)
- **Window Size**: 60 seconds

## System Components

### 1. Database Operations (`src/lib/database-operations.ts`)

#### Quota Operations (`quotaOps`)
- `getUserQuotaUsage(userId, date?)`: Get current quota usage for a user
- `updateQuotaUsage(userId, increment)`: Atomically increment quota usage
- `getUserQuotaHistory(userId, days)`: Get historical quota usage

#### Analytics Operations (`analyticsOps`)
- `getUserAnalytics(userId, days)`: Comprehensive user analytics including success rates, response times, error breakdown
- `getSystemAnalytics(days)`: System-wide analytics for monitoring overall service health

### 2. Authentication Middleware (`src/lib/auth-middleware.ts`)

#### Enhanced Rate Limiting
- `checkRateLimit(context, supabase)`: Multi-tier rate limit checking (daily, hourly, burst)
- `updateUsageQuota(userId, supabase, increment)`: Update quota usage atomically
- `checkQuotaWarnings(context, supabase)`: Generate warnings when approaching limits

#### Rate Limit Configuration
```typescript
export const RATE_LIMITS = {
  FREE_TIER: {
    DAILY_LIMIT: 100,
    HOURLY_LIMIT: 20,
    BURST_LIMIT: 5,
    WINDOW_SIZE: 60 * 1000
  },
  API_KEY: {
    DAILY_LIMIT: -1, // Unlimited
    HOURLY_LIMIT: -1, // Unlimited
    BURST_LIMIT: 100,
    WINDOW_SIZE: 60 * 1000
  }
}
```

### 3. Quota Monitor (`src/lib/quota-monitor.ts`)

#### Alert System
- `checkQuotaAlerts()`: Scan for users approaching or exceeding limits
- Alert types: `approaching_limit`, `limit_exceeded`, `unusual_activity`
- Severity levels: `low`, `medium`, `high`, `critical`

#### System Monitoring
- `getSystemQuotaStatus()`: Overall system quota utilization
- `getUserQuotaRecommendations(userId)`: Personalized recommendations for optimization

### 4. Database Functions

#### Atomic Quota Updates
```sql
CREATE OR REPLACE FUNCTION increment_quota_usage(
  p_user_id UUID,
  p_date DATE,
  p_increment INTEGER DEFAULT 1
)
```
This function ensures atomic quota updates to prevent race conditions.

## API Endpoints

### User Analytics
- **GET** `/api/user/analytics?days=30&warnings=true`
- Returns comprehensive user analytics and quota warnings

### User Quota Status
- **GET** `/api/user/quota?history=7`
- Returns current quota status, limits, and usage history

### Admin Analytics
- **GET** `/api/admin/analytics?days=30`
- System-wide analytics for administrators

### Quota Monitoring
- **GET** `/api/admin/quota-monitor?recommendations=true`
- Real-time quota monitoring with alerts and recommendations

## Rate Limiting Flow

1. **Request Authentication**: Verify user credentials or API key
2. **Multi-Tier Checking**: 
   - Check daily quota (if applicable)
   - Check hourly limits (if applicable)
   - Check burst limits (always applied)
3. **Request Processing**: If all checks pass, process the request
4. **Usage Tracking**: Log request and update quotas atomically
5. **Response**: Include rate limit headers in response

## Monitoring and Alerts

### Automatic Alerts
- Users at 90% of daily quota
- Users exceeding daily quota
- Unusual burst activity patterns
- System-wide performance issues

### Analytics Insights
- Success rate trends
- Response time patterns
- Error frequency analysis
- Usage distribution by tier
- Peak usage hours

### Recommendations Engine
- Upgrade suggestions for heavy users
- Usage optimization tips
- Error reduction guidance
- Performance improvement suggestions

## Usage Examples

### Check User Quota Status
```typescript
import { quotaOps } from '@/lib/database-operations'

const quotaStatus = await quotaOps.getUserQuotaUsage('user-id')
console.log(`Used: ${quotaStatus.requestCount}/${quotaStatus.dailyLimit}`)
```

### Generate User Analytics
```typescript
import { analyticsOps } from '@/lib/database-operations'

const analytics = await analyticsOps.getUserAnalytics('user-id', 30)
console.log(`Success rate: ${analytics.successRate}%`)
```

### Monitor System Health
```typescript
import { quotaMonitor } from '@/lib/quota-monitor'

const systemStatus = await quotaMonitor.getSystemQuotaStatus()
console.log(`Active users: ${systemStatus.activeUsers}/${systemStatus.totalUsers}`)
```

## Error Handling

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_ERROR",
    "message": "Daily rate limit of 100 requests exceeded",
    "code": "DAILY_RATE_LIMIT_EXCEEDED",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "rateLimit": {
    "remaining": 0,
    "resetTime": "2024-01-02T00:00:00.000Z",
    "limits": {
      "daily": { "used": 100, "limit": 100, "remaining": 0 },
      "hourly": { "used": 15, "limit": 20, "remaining": 5 },
      "burst": { "used": 2, "limit": 5, "remaining": 3 }
    }
  }
}
```

## Performance Considerations

### Database Optimization
- Indexed queries on `user_id` and `date` fields
- Atomic operations to prevent race conditions
- Efficient aggregation queries for analytics

### Caching Strategy
- Rate limit status cached for short periods
- Analytics data cached with appropriate TTL
- System metrics cached to reduce database load

### Scalability
- Horizontal scaling through Supabase's distributed architecture
- Efficient query patterns to minimize database load
- Background processing for analytics generation

## Security Features

### Abuse Prevention
- Multi-tier rate limiting prevents various attack patterns
- Burst limiting prevents rapid-fire attacks
- Usage pattern analysis detects unusual activity

### Data Protection
- Row Level Security (RLS) on all tables
- Secure API key hashing
- Audit trails for all quota operations

## Monitoring Dashboard Features

### Real-time Metrics
- Current quota utilization across all users
- Active rate limiting events
- System performance indicators

### Historical Analysis
- Usage trends over time
- Peak usage identification
- Error pattern analysis

### Alert Management
- Configurable alert thresholds
- Multiple notification channels
- Alert acknowledgment and resolution tracking

This comprehensive system ensures fair usage, prevents abuse, and provides valuable insights for both users and administrators while maintaining high performance and reliability.