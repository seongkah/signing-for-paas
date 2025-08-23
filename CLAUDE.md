# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **TikTok Signing Platform-as-a-Service** built with Next.js 14 and Supabase. It provides signature generation services for TikTok Live stream connections as a **complete EulerStream replacement**. The project includes both a legacy Node.js signing server and a modern Next.js web application with user management, API keys, monitoring, and analytics.

### Business Model
- **Free Tier**: 100 requests/day, no authentication required (IP-based rate limiting)
- **Unlimited Tier**: API key required, unlimited requests, advanced features
- **EulerStream Compatible**: Drop-in replacement for TikTok Live Connector projects

### Production Status
**✅ PRODUCTION READY** - The service is fully implemented and ready for deployment as an EulerStream alternative. All core features are complete including authentication, rate limiting, monitoring, and TikTok Live Connector compatibility.

### Supabase Configuration
- **Project ID**: `wfxyvtmvftygvddxspxw`
- **API Authentication**: Use `X-API-Key` header (NOT `Authorization: Bearer`)
- **API Key Format**: Raw UUID format (e.g., `ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c`)

### API Usage Examples
```bash
# Correct API key header format
curl -X POST "https://signing-for-paas.vercel.app/api/signature" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c" \
  -d '{"url": "https://www.tiktok.com/@testuser/live"}'

# EulerStream compatibility endpoint
curl -X POST "https://signing-for-paas.vercel.app/api/eulerstream" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ce9af56a-6cc1-4820-83fb-cfcaaf87cf9c" \
  -d '{"url": "https://www.tiktok.com/@testuser/live"}'
```

## Database & Security Architecture

### Row Level Security (RLS) Implementation
**✅ CRITICAL**: This project uses **proper RLS configuration** with service role authentication for system operations.

#### **Service Role vs Anonymous Key Usage**
```typescript
// ❌ WRONG - Don't use for system operations
import { createServerSupabaseClient } from './supabase-server'
const supabase = createServerSupabaseClient() // Uses anon key + cookies

// ✅ CORRECT - Use for system operations that bypass RLS
import { createServiceSupabaseClient } from './supabase-server'  
const supabase = createServiceSupabaseClient() // Uses service role key
```

#### **When to Use Which Client:**

**🔧 Use `createServiceSupabaseClient()` for:**
- **Authentication middleware** (`src/lib/auth-middleware.ts`)
- **API key lookups and validation**
- **System logging** (IP tracking, signature logs, usage logs)
- **Rate limiting operations**
- **Admin functions and analytics**
- **Any operation that needs to bypass user-level RLS**

**👤 Use `createServerSupabaseClient()` for:**
- **User session management** (reading auth cookies)
- **User-specific data access** (respecting RLS policies)
- **Frontend data fetching** (user dashboard, profile)

#### **RLS Policies Configuration**
All tables have proper RLS policies:
```sql
-- Example policy structure for all tables
CREATE POLICY "Service role can manage all records" 
ON table_name FOR ALL 
TO public 
USING (auth.role() = 'service_role');

-- User-specific policies for authenticated users
CREATE POLICY "Users can manage own records" 
ON table_name FOR ALL 
TO public 
USING (user_id = auth.uid());
```

#### **Critical Fix Applied**
**Problem**: Authentication was failing because middleware used `createServerSupabaseClient()` (anon key) instead of `createServiceSupabaseClient()` (service role) for API key lookups.

**Solution**: 
1. ✅ **Enable RLS** on all tables (`users`, `api_keys`, `usage_logs`, `ip_usage_logs`, `ip_usage_tracking`, `signature_logs`)
2. ✅ **Add service role policies** allowing `auth.role() = 'service_role'` full access
3. ✅ **Update all system operations** to use `createServiceSupabaseClient()`
4. ✅ **Keep session operations** using `createServerSupabaseClient()` for cookie access

#### **Files Updated for RLS Compliance**
```typescript
// src/lib/auth-middleware.ts
- OLD: const supabase = createServerSupabaseClient()
+ NEW: const supabase = createServiceSupabaseClient() // For API key lookups
+ NEW: const sessionSupabase = createServerSupabaseClient() // For session auth

// src/lib/ip-rate-limiting.ts  
- OLD: const supabase = createServerSupabaseClient()
+ NEW: const supabase = createServiceSupabaseClient() // For all IP operations

// src/lib/signature-logging.ts
+ NEW: const supabase = createServiceSupabaseClient() // For comprehensive logging

// src/app/api/signature/route.ts
+ NEW: logSignatureRequest() calls for all requests (success/error)

// src/app/api/eulerstream/route.ts
+ NEW: logSignatureRequest() calls for all requests (success/error)
```

#### **Database Tables with RLS Enabled**
- ✅ **users**: User accounts and profiles
- ✅ **api_keys**: API key management and authentication
- ✅ **usage_logs**: User-specific request logging  
- ✅ **ip_usage_logs**: Anonymous IP request logging
- ✅ **ip_usage_tracking**: IP-based rate limiting counters
- ✅ **signature_logs**: Comprehensive request tracking (NEW)
- ✅ **quota_usage**: Daily usage quotas and limits

### Comprehensive Logging System
**NEW FEATURE**: Complete request tracking across all tiers and endpoints.

#### **signature_logs Table Schema**
```sql
CREATE TABLE signature_logs (
    id UUID PRIMARY KEY,
    request_id VARCHAR(50),           -- Unique correlation ID
    endpoint VARCHAR(50),             -- '/api/signature', '/api/eulerstream'
    
    -- Client Info  
    ip_address INET,                  -- Real IP via Vercel headers
    user_agent TEXT,                  -- Browser/client identification
    country_code VARCHAR(3),          -- Geographic location
    region VARCHAR(50),               -- Geographic region
    
    -- Authentication & Tier
    tier VARCHAR(20),                 -- 'free', 'api_key'
    authentication_method VARCHAR(20), -- 'ip_based', 'api_key', 'session'
    user_id UUID,                     -- NULL for anonymous
    api_key_id UUID,                  -- NULL for non-API key
    
    -- Request Details
    room_url TEXT,                    -- TikTok room URL
    request_format VARCHAR(20),       -- 'modern', 'eulerstream', 'legacy'
    success BOOLEAN,                  -- Request success/failure
    response_time_ms INTEGER,         -- Performance tracking
    error_type VARCHAR(50),           -- Error classification
    error_message TEXT,               -- Detailed error info
    
    -- Rate Limiting Context
    rate_limit_hit BOOLEAN,           -- Was request rate limited
    daily_usage_count INTEGER,        -- Usage at time of request
    daily_limit INTEGER,              -- Limit at time of request
    
    -- Signature Details
    signature_type VARCHAR(20),       -- 'mock', 'real', 'cached'
    signature_length INTEGER,         -- Generated signature size
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Analytics & Monitoring**
- **Complete visibility**: Every signature request logged regardless of tier
- **Business intelligence**: Revenue tracking (API key vs free usage)
- **Performance monitoring**: Response times, error patterns, peak usage
- **Geographic insights**: User distribution by country/region
- **Security analytics**: Rate limit patterns, abuse detection
- **Capacity planning**: Usage trends and scaling requirements

## Commands

### Development
- `npm run dev` - Start development server (Next.js frontend + API routes)
- `npm start` - Start production server
- `npm run build` - Build Next.js application for production
- `npm run lint` - Run ESLint for code quality checks
- `npm run type-check` - Run TypeScript type checking without emitting files

### Testing
- `npm run test` - Run all unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:unit` - Run only unit tests in src/
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run Playwright end-to-end tests  
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:performance` - Run performance tests
- `npm run test:all` - Run all test suites (unit + integration + e2e + performance)

### Database Management
- `npm run supabase:start` - Start local Supabase instance
- `npm run supabase:stop` - Stop local Supabase instance
- `npm run supabase:status` - Check Supabase status
- `npm run db:reset` - Reset database schema
- `npm run db:seed` - Seed database with initial data

### Environment Setup
- `npm run setup:dev` - Setup development environment
- `npm run setup:staging` - Setup staging environment  
- `npm run setup:prod` - Setup production environment
- `npm run validate:env` - Validate environment variables

### Deployment
- `npm run deploy:dev` - Deploy to development
- `npm run deploy:staging` - Deploy to staging
- `npm run deploy:prod` - Deploy to production

### Legacy Server Commands
- `node src/server.js` - Start legacy signature server on port 3000
- `./test-all.sh` - Run comprehensive legacy server test suite
- `node src/test-live-stream-connection.js` - Test TikTok Live stream connections

### TikTok Live Connector Integration
**IMPORTANT**: This project uses TikTok Live Connector **v2.x.x** (TypeScript-based).

#### **Key Changes in v2.x.x:**
- ❌ **OLD**: `WebcastPushConnection` (deprecated in v2.x.x)
- ✅ **NEW**: `TikTokLiveConnection` (TypeScript-based)
- ❌ **OLD**: CommonJS `require()` support removed
- ✅ **NEW**: ES Modules `import` only
- ✅ **Backward compatibility**: `WebcastPushConnection` still available for legacy

#### **Correct Usage Pattern:**
```javascript
// ✅ CORRECT - v2.x.x
const { TikTokLiveConnection } = require('tiktok-live-connector');

const connection = new TikTokLiveConnection('@username', {
    signProvider: 'https://signing-for-paas.vercel.app/api/eulerstream',
    signProviderHeaders: {
        'X-API-Key': 'your-api-key-here',
        'Content-Type': 'application/json'
    }
});

// ❌ DEPRECATED - v1.x.x (still works but not recommended)
const { WebcastPushConnection } = require('tiktok-live-connector');
```

## Architecture

### Core Components

#### Next.js App Router Structure
- **src/app/** - Next.js 14 App Router with API routes
- **src/app/api/** - RESTful API endpoints for all services
- **src/components/** - Reusable React components with shadcn/ui
- **src/lib/** - Shared utilities and database operations
- **src/types/** - TypeScript type definitions

#### Key API Routes
- **GET /api/health** - Health check endpoint
- **POST /api/signature** - TikTok signature generation (main service with advanced features)
- **POST /api/eulerstream** - EulerStream-compatible endpoint (drop-in replacement)
- **POST /api/sign** - Legacy signature endpoint (JSON/plain text format)
- **POST /api/auth/** - Authentication endpoints (login, register, logout)
- **GET/POST /api/api-keys/** - API key management and generation
- **GET /api/user/** - User profile and analytics
- **GET /api/admin/** - Admin monitoring and analytics
- **GET /api/integration-guide** - API integration documentation

#### Legacy Components (Node.js)
- **src/SignatureGenerator.js** - Core TikTok signature generation using SignTok
- **src/LocalSigningProvider.js** - TikTok Live Connector integration
- **src/server.js** - Legacy HTTP server with /signature and /sign endpoints
- **src/Logger.js** - Structured logging utility

#### Database Schema (Supabase)
- **users** - User accounts with tier-based access (free/api_key)
- **api_keys** - User API keys for programmatic access
- **usage_logs** - Request logging for analytics and debugging
- **quota_usage** - Daily usage tracking for rate limiting

### Authentication & Authorization
- **Dual Authentication**: Supabase Auth (session-based) + API key authentication
- **Tier System**: Free tier (100/day) vs Unlimited tier (API key required)
- **Optional Authentication**: `/api/eulerstream` works without auth for free tier
- **Automatic Upgrades**: Users automatically upgraded to unlimited when creating API key
- **Role-based Access Control**: Different rate limits and features per tier

### Rate Limiting & Quotas
- **Multi-level Rate Limiting**: Daily (100 free, unlimited paid), Hourly (20 free), Burst (5/min free, 100/min paid)
- **IP-based Limits**: Free tier uses IP tracking for unauthenticated requests
- **Usage Tracking**: All requests logged with response times and success rates
- **Quota Warnings**: Users warned at 80% daily usage
- **Real-time Monitoring**: Live usage statistics and alerts

### EulerStream Compatibility
- **Drop-in Replacement**: `/api/eulerstream` endpoint matches EulerStream API format exactly
- **TikTok Live Connector Compatible**: Works with existing `signProvider: 'eulerstream'` code
- **Multiple Response Formats**: EulerStream, legacy, and modern JSON formats supported
- **Backward Compatibility**: Supports all existing TikTok Live Connector integrations
- **Migration Tools**: Complete guides and testing utilities for smooth migration

### Monitoring & Analytics
- **Real-time Dashboard**: Live metrics, error rates, response times
- **Usage Analytics**: Per-user statistics, tier analysis, geographic distribution
- **Error Monitoring**: Structured error logging with stack traces and context
- **Performance Tracking**: Response time histograms and percentiles
- **Health Monitoring**: Database connectivity, service status, dependency checks
- **Alert System**: Quota warnings, error rate thresholds, service degradation alerts

## Development Guidelines

### Path Aliases
Use these TypeScript path aliases consistently:
- `@/` - Maps to `src/`
- `@/components/*` - Maps to `src/components/*`
- `@/lib/*` - Maps to `src/lib/*`
- `@/types/*` - Maps to `src/types/*`
- `@/app/*` - Maps to `src/app/*`

### Environment Variables
Required environment variables (see config/environment.ts):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Application URL

Optional environment variables:
- `DEBUG=true` - Enable debug mode
- `LOG_LEVEL=debug|info|warn|error` - Set logging level
- `RATE_LIMIT_ENABLED=true` - Enable rate limiting
- `MAX_REQUESTS_PER_HOUR=500` - Hourly rate limit
- `MAX_REQUESTS_PER_DAY=5000` - Daily rate limit

### Testing Strategy
- **Unit Tests**: Vitest for individual functions and utilities
- **Integration Tests**: API route testing with mocked Supabase
- **E2E Tests**: Playwright for complete user workflows
- **Performance Tests**: Response time and load testing
- Always run `npm run lint` and `npm run type-check` before committing

### Database Operations
- Use `src/lib/database-operations.ts` for all database interactions
- Follow Supabase Row Level Security (RLS) policies
- Use typed database operations with TypeScript interfaces
- Handle database errors gracefully with proper error types

### Error Handling
- Use ErrorType enum from `src/types/index.ts`
- Implement consistent error response format
- Log errors with structured logging
- Provide user-friendly error messages

### Component Development
- Use shadcn/ui components as base
- Follow React best practices with hooks
- Implement proper loading and error states
- Use TypeScript for all components

## EulerStream Replacement & TikTok Live Connector Integration

### Complete EulerStream Replacement
This service provides a **100% compatible replacement** for EulerStream in TikTok Live Connector projects:

#### **Direct Replacement Method**
```javascript
// Before (EulerStream)
const connection = new WebcastPushConnection('username', {
    signProvider: 'eulerstream'
});

// After (Your Service) - ZERO code changes needed!
// Just update the TikTok Live Connector configuration file:
// node_modules/tiktok-live-connector/dist/lib/config.js:218
// Change: basePath: process.env.SIGN_API_URL || 'https://your-domain.com/api'
```

#### **Environment Variable Method**
```bash
# Set environment variable to override EulerStream
export SIGN_API_URL="https://your-domain.com/api"
# Now all existing code using signProvider: 'eulerstream' uses your server!
```

#### **Explicit URL Method**
```javascript
const connection = new WebcastPushConnection('username', {
    signProvider: 'https://your-domain.com/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',  // Optional for unlimited access
        'Content-Type': 'application/json'
    }
});
```

### TikTok Live Connector Compatibility
- **✅ Drop-in Replacement**: Existing code works without modifications
- **✅ Same Response Format**: Matches EulerStream API responses exactly
- **✅ All TikTok Live Connector Features**: Chat, gifts, viewers, room info
- **✅ Error Handling**: Compatible error responses and codes
- **✅ Performance**: Optimized for low latency and high throughput

### Integration Testing
- **Demo Scripts**: `demo-live-viewer-count.js`, `demo-simple-live.js`
- **Integration Tests**: `test-direct-eulerstream-replacement.js`
- **Compatibility Validation**: Automated testing suite for TikTok Live Connector features
- **Real-world Testing**: Confirmed working with live TikTok streams

### Migration Benefits
- **Cost Savings**: Free tier (100/day) + unlimited paid tier vs EulerStream's $29-99/month
- **Full Control**: Self-hosted, no third-party dependencies
- **Enhanced Features**: Better monitoring, analytics, and error handling
- **Open Source**: Complete transparency and customization options

## Security Considerations
- All API routes protected with authentication middleware
- Rate limiting prevents abuse
- Input validation on all endpoints  
- Secure cookie handling in production
- HTTPS-only in production environments
- No sensitive data in logs or commits

## Common Development Patterns

### API Route Structure
```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, updateUsageQuota } from '@/lib/auth-middleware'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { usageLogOps } from '@/lib/database-operations'
import { ErrorType } from '@/types'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let authContext: any = null

  try {
    // Parse and validate request
    const body = await request.json()
    const roomUrl = body.url || body.roomUrl
    
    if (!roomUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: url'
      }, { status: 400 })
    }

    // Authenticate (optional for free tier)
    const authResult = await authenticateRequest(request)
    
    if (authResult.success && authResult.context) {
      authContext = authResult.context
      const supabase = createServerSupabaseClient()

      // Check rate limits
      const rateLimitResult = await checkRateLimit(authContext, supabase)
      if (!rateLimitResult.allowed) {
        return NextResponse.json({
          success: false,
          error: 'Rate limit exceeded',
          rateLimit: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime
          }
        }, { status: 429 })
      }
    }

    // Process request (generate signature, etc.)
    const responseTime = Date.now() - startTime
    
    // Log request
    await usageLogOps.logRequest({
      userId: authContext?.user?.id,
      apiKeyId: authContext?.apiKey?.id,
      roomUrl,
      success: true,
      responseTimeMs: responseTime
    })

    // Update usage quota
    if (authContext) {
      const supabase = createServerSupabaseClient()
      await updateUsageQuota(authContext.user.id, supabase)
    }

    return NextResponse.json({
      success: true,
      data: { /* response data */ },
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    await usageLogOps.logRequest({
      userId: authContext?.user?.id,
      apiKeyId: authContext?.apiKey?.id,
      roomUrl: '',
      success: false,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

### Database Operations
```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { User, ApiKey } from '@/types'

// User operations
export async function getUserById(id: string): Promise<User | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }
  
  return data
}

// API key operations
export async function createApiKey(userId: string, name: string, keyHash: string): Promise<ApiKey> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: keyHash,
      name: name.trim(),
      is_active: true
    })
    .select('id, name, created_at')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create API key: ${error?.message}`)
  }

  return data
}

// Usage logging
export async function logRequest(params: {
  userId?: string
  apiKeyId?: string
  roomUrl: string
  success: boolean
  responseTimeMs: number
  errorMessage?: string
}): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('usage_logs')
    .insert({
      user_id: params.userId,
      api_key_id: params.apiKeyId,
      room_url: params.roomUrl,
      success: params.success,
      response_time_ms: params.responseTimeMs,
      error_message: params.errorMessage,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to log request:', error)
  }
}
```

### Component with Error Handling
```typescript
'use client'
import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ApiKeyData {
  id: string
  name: string
  key?: string
  createdAt: string
  isActive: boolean
}

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setApiKeys(data.data.apiKeys)
      } else {
        setError(data.error?.message || 'Failed to fetch API keys')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async (name: string) => {
    setCreating(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name })
      })
      
      const data = await response.json()
      if (data.success) {
        // Show the API key to user (only shown once!)
        alert(`API Key Created: ${data.data.apiKey.key}`)
        await fetchApiKeys() // Refresh list
      } else {
        setError(data.error?.message || 'Failed to create API key')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <Button 
          onClick={() => createApiKey('New API Key')}
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Create API Key'}
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No API keys found. Create one to get unlimited access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <CardTitle>{key.name}</CardTitle>
                <CardDescription>
                  Created: {new Date(key.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Status: {key.isActive ? '✅ Active' : '❌ Inactive'}
                  </span>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

## Production Deployment Guide

### Vercel Deployment
The service is ready for production deployment on Vercel:

```bash
# Deploy to production
npm run deploy:prod

# Or manual deployment
vercel --prod
```

### Environment Variables (Production)
Set these in Vercel dashboard:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

### Custom Domain Setup
1. Add custom domain in Vercel dashboard
2. Update all references to your domain in documentation
3. Test all endpoints with new domain

### Post-Deployment Testing
```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Test EulerStream compatibility
curl -X POST https://your-domain.com/api/eulerstream \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@testuser/live"}'

# Test TikTok Live Connector integration
node test-direct-eulerstream-replacement.js testuser
```

## Business Model Implementation

### Free Tier (Public Access)
- **100 requests/day per IP**
- **No authentication required**
- **Rate limited by IP address**
- **Basic error messages**
- **Community support**

### Unlimited Tier (API Key Required)
- **Unlimited requests**
- **API key authentication**
- **Priority processing**
- **Detailed analytics**
- **Enhanced error reporting**
- **Direct support**

### Monetization Options
- **Freemium Model**: Free tier with paid upgrades
- **API Key Sales**: One-time or subscription-based
- **Enterprise Features**: Custom rate limits, SLA, support
- **White-label Solutions**: Custom branding for resellers

## Competitive Advantages Over EulerStream

| Feature | EulerStream | Your Service | Advantage |
|---------|-------------|--------------|-----------|
| **Cost** | $29-99/month | Free + Optional API keys | 💰 Cost savings |
| **Free Tier** | Limited trial | 100/day permanent | 🎁 Better free offering |
| **Open Source** | Proprietary | Fully open | 🔓 Transparency |
| **Customization** | None | Complete control | 🛠️ Flexibility |
| **Monitoring** | Basic | Advanced dashboard | 📊 Better insights |
| **Support** | Email only | Documentation + Community | 🤝 Better support |
| **Reliability** | Third-party dependency | Self-hosted | 🛡️ Independence |

## Success Metrics to Track

### Technical Metrics
- **Response Time**: < 500ms average
- **Uptime**: > 99.9%
- **Error Rate**: < 1%
- **Throughput**: Requests per second capacity

### Business Metrics
- **Daily Active Users**: Free tier usage
- **API Key Conversions**: Free → Paid rate
- **Usage Growth**: Month-over-month growth
- **Cost Per Request**: Infrastructure efficiency

### User Experience Metrics
- **Migration Success Rate**: EulerStream replacement success
- **Integration Time**: Time to first successful request
- **Support Tickets**: Issues and resolution time
- **User Satisfaction**: Feedback and ratings

---

**🚀 PRODUCTION STATUS: READY FOR LAUNCH**

This TikTok Signing Platform-as-a-Service is **production-ready** and provides a complete, cost-effective alternative to EulerStream with enhanced features, better monitoring, and flexible pricing tiers.