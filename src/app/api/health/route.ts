import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/health-monitor'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url)
    const detailed = url.searchParams.get('detailed') === 'true'
    const component = url.searchParams.get('component')

    if (detailed) {
      // Perform comprehensive health check
      const healthResult = await healthMonitor.performHealthCheck()
      
      return NextResponse.json({
        status: healthResult.overall,
        timestamp: healthResult.timestamp.toISOString(),
        service: 'tiktok-signing-paas',
        version: '1.0.0',
        detailed: true,
        components: healthResult.components,
        uptime: healthResult.uptime,
        performance: healthResult.performance,
        quotas: healthResult.quotas,
        compatibility: {
          eulerstream_replacement: 'operational',
          tiktok_live_connector: 'compatible',
          supported_formats: ['JSON', 'plain text'],
          endpoints: {
            '/api/signature': 'operational',
            '/api/eulerstream': 'operational', 
            '/api/sign': 'operational'
          }
        },
        integration: {
          testing_endpoint: '/api/test/compatibility',
          tiktok_connector_testing: '/api/test/tiktok-connector',
          integration_guide: '/api/integration-guide',
          documentation: '/docs/eulerstream-replacement-guide.md'
        }
      }, {
        status: healthResult.overall === 'healthy' ? 200 : 
                healthResult.overall === 'degraded' ? 200 : 503
      })
    }

    if (component) {
      // Check specific component
      const healthResult = await healthMonitor.performHealthCheck()
      const componentHealth = healthResult.components.find(c => c.name === component)
      
      if (!componentHealth) {
        return NextResponse.json({
          error: 'Component not found',
          available_components: healthResult.components.map(c => c.name)
        }, { status: 404 })
      }

      return NextResponse.json({
        status: componentHealth.status,
        timestamp: new Date().toISOString(),
        component: componentHealth,
        availability: healthMonitor.getComponentAvailability(component)
      })
    }

    // Basic health check (legacy compatibility)
    const healthResult = await healthMonitor.performHealthCheck()
    const isHealthy = healthResult.overall === 'healthy'

    return NextResponse.json({
      status: healthResult.overall,
      timestamp: healthResult.timestamp.toISOString(),
      service: 'tiktok-signing-paas',
      version: '1.0.0',
      checks: healthResult.components.reduce((acc, comp) => {
        acc[comp.name] = comp.status === 'healthy' ? 'operational' : 
                        comp.status === 'degraded' ? 'degraded' : 'failed'
        return acc
      }, {} as Record<string, string>),
      uptime_percentage: healthResult.uptime.percentage,
      average_response_time: healthResult.performance.averageResponseTime,
      compatibility: {
        eulerstream_replacement: 'operational',
        tiktok_live_connector: 'compatible',
        supported_formats: ['JSON', 'plain text'],
        endpoints: {
          '/api/signature': 'operational',
          '/api/eulerstream': 'operational', 
          '/api/sign': 'operational'
        }
      },
      integration: {
        testing_endpoint: '/api/test/compatibility',
        tiktok_connector_testing: '/api/test/tiktok-connector',
        integration_guide: '/api/integration-guide',
        documentation: '/docs/eulerstream-replacement-guide.md'
      }
    }, {
      status: isHealthy ? 200 : 503
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'tiktok-signing-paas',
        version: '1.0.0',
        error: 'Health check failed',
        checks: {
          database: 'unknown',
          authentication: 'unknown',
          signature_generator: 'unknown',
          edge_functions: 'unknown',
          api_endpoints: 'unknown'
        }
      },
      { status: 500 }
    )
  }
}