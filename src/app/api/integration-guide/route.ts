import { NextRequest, NextResponse } from 'next/server'

/**
 * Integration guide endpoint for TikTok Live Connector migration
 * Provides comprehensive documentation and examples for replacing EulerStream
 */

export async function GET(request: NextRequest) {
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  
  return NextResponse.json({
    title: 'TikTok Live Connector Integration Guide',
    description: 'Complete guide for migrating from EulerStream to our signing service',
    
    migration_steps: {
      step_1: {
        title: 'Update TikTok Live Connector Configuration',
        description: 'Replace EulerStream with our service endpoint',
        before: {
          code: `const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: 'eulerstream'  // Paid service
});`,
          notes: 'This requires EulerStream subscription and API key'
        },
        after: {
          code: `const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: '${baseUrl}/api/eulerstream'  // Free service
});`,
          notes: 'No API key required for basic usage, optional authentication for higher limits'
        }
      },
      
      step_2: {
        title: 'Optional: Add Authentication for Higher Limits',
        description: 'Use API keys for unlimited access',
        code: `const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('@username', {
    signProvider: '${baseUrl}/api/eulerstream',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
});`,
        notes: 'Get your API key from the dashboard at ${baseUrl}/dashboard'
      },
      
      step_3: {
        title: 'Test the Integration',
        description: 'Verify the connection works with your TikTok Live Connector setup',
        code: `connection.connect().then(state => {
    console.log('Connected to TikTok Live:', state);
}).catch(err => {
    console.error('Connection failed:', err);
});

connection.on('chat', data => {
    console.log('Chat message:', data.comment);
});

connection.on('gift', data => {
    console.log('Gift received:', data.giftName);
});`
      }
    },
    
    endpoint_compatibility: {
      primary_endpoint: {
        url: `${baseUrl}/api/eulerstream`,
        method: 'POST',
        description: 'Main EulerStream-compatible endpoint',
        request_format: {
          headers: { 'Content-Type': 'application/json' },
          body: { url: 'https://www.tiktok.com/@username/live' }
        },
        response_format: {
          success: true,
          data: {
            signature: 'generated_signature',
            signed_url: 'https://www.tiktok.com/@username/live?signature=...',
            'X-Bogus': 'x_bogus_value',
            'x-tt-params': 'params_value',
            navigator: {
              deviceScaleFactor: 1,
              user_agent: 'Mozilla/5.0...',
              browser_language: 'en-US',
              browser_platform: 'Win32',
              browser_name: 'Chrome',
              browser_version: '120.0.0.0'
            }
          },
          timestamp: '2024-01-01T00:00:00.000Z',
          response_time_ms: 150
        }
      },
      
      alternative_endpoints: [
        {
          url: `${baseUrl}/api/signature`,
          description: 'Modern API endpoint with enhanced features',
          supports: ['JSON', 'plain text'],
          authentication: 'recommended'
        },
        {
          url: `${baseUrl}/api/sign`,
          description: 'Legacy compatibility endpoint',
          supports: ['JSON', 'plain text'],
          authentication: 'optional'
        }
      ]
    },
    
    authentication_options: {
      free_tier: {
        description: 'No authentication required',
        limits: 'Rate limited based on IP address',
        usage: 'Perfect for testing and small projects'
      },
      
      api_key: {
        description: 'API key authentication for unlimited access',
        how_to_get: `Visit ${baseUrl}/dashboard to generate API keys`,
        usage: {
          header: 'Authorization: Bearer YOUR_API_KEY',
          benefits: ['Unlimited requests', 'Priority processing', 'Usage analytics']
        }
      }
    },
    
    error_handling: {
      common_errors: [
        {
          error: 'Invalid TikTok URL format',
          cause: 'URL is not a valid TikTok live stream URL',
          solution: 'Ensure URL follows format: https://www.tiktok.com/@username/live'
        },
        {
          error: 'Rate limit exceeded',
          cause: 'Too many requests from free tier',
          solution: 'Get an API key for unlimited access or wait for rate limit reset'
        },
        {
          error: 'Authentication failed',
          cause: 'Invalid or expired API key',
          solution: 'Check your API key or generate a new one from the dashboard'
        }
      ],
      
      error_response_format: {
        success: false,
        error: 'Error description',
        message: 'Detailed error message',
        code: 'ERROR_CODE',
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    },
    
    testing_utilities: {
      integration_tester: {
        url: `${baseUrl}/api/test/tiktok-connector`,
        description: 'Test compatibility with TikTok Live Connector',
        available_tests: [
          'format_compatibility',
          'response_structure',
          'error_handling',
          'performance'
        ]
      },
      
      health_check: {
        url: `${baseUrl}/api/health`,
        description: 'Check service status and availability'
      }
    },
    
    migration_checklist: [
      'Update TikTok Live Connector configuration to use our endpoint',
      'Test connection with a known TikTok live stream',
      'Verify chat messages and gifts are received correctly',
      'Optional: Set up API key authentication for production use',
      'Monitor usage and performance through our dashboard',
      'Update error handling to match our response format'
    ],
    
    support: {
      documentation: `${baseUrl}/dashboard`,
      health_status: `${baseUrl}/api/health`,
      integration_testing: `${baseUrl}/api/test/tiktok-connector`,
      issues: 'Check the dashboard for service status and error logs'
    },
    
    performance_comparison: {
      eulerstream: {
        cost: 'Paid subscription required',
        reliability: 'Depends on external service',
        rate_limits: 'Based on subscription plan',
        support: 'Third-party support'
      },
      our_service: {
        cost: 'Free tier available, optional API keys',
        reliability: 'Self-hosted on reliable cloud infrastructure',
        rate_limits: 'Generous free tier, unlimited with API key',
        support: 'Direct access to service dashboard and logs'
      }
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body
    
    switch (action) {
      case 'validate_migration':
        return validateMigration(data)
      
      case 'test_endpoint':
        return testEndpoint(data)
      
      case 'generate_config':
        return generateConfig(data)
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            available_actions: ['validate_migration', 'test_endpoint', 'generate_config']
          },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    )
  }
}

async function validateMigration(data: any) {
  const { currentConfig, targetUrl } = data
  
  // Validate the migration configuration
  const validation = {
    current_config_valid: !!currentConfig?.signProvider,
    target_url_valid: !!targetUrl && targetUrl.includes('/api/'),
    migration_ready: false,
    recommendations: [] as string[]
  }
  
  if (currentConfig?.signProvider === 'eulerstream') {
    validation.recommendations.push('✅ Currently using EulerStream - ready for migration')
  } else {
    validation.recommendations.push('⚠️ Not currently using EulerStream - verify current setup')
  }
  
  if (targetUrl?.includes('/api/eulerstream')) {
    validation.recommendations.push('✅ Target URL uses EulerStream-compatible endpoint')
  } else {
    validation.recommendations.push('💡 Consider using /api/eulerstream for best compatibility')
  }
  
  validation.migration_ready = validation.current_config_valid && validation.target_url_valid
  
  return NextResponse.json({
    success: true,
    validation,
    next_steps: validation.migration_ready 
      ? ['Update signProvider URL', 'Test connection', 'Monitor performance']
      : ['Fix configuration issues', 'Retry validation']
  })
}

async function testEndpoint(data: any) {
  const { endpoint, testUrl } = data
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testUrl })
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      test_results: {
        endpoint,
        status_code: response.status,
        response_ok: response.ok,
        has_signature_data: !!result.data?.signature,
        response_time_valid: !!result.response_time_ms,
        format_compatible: result.success !== undefined || result.status !== undefined
      },
      sample_response: result
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Endpoint test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function generateConfig(data: any) {
  const { username, useAuth, endpoint } = data
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  
  const config = {
    basic: `const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('${username || '@username'}', {
    signProvider: '${baseUrl}${endpoint || '/api/eulerstream'}'
});`,
    
    with_auth: useAuth ? `const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('${username || '@username'}', {
    signProvider: '${baseUrl}${endpoint || '/api/eulerstream'}',
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
});` : null,
    
    complete_example: `const { TikTokLiveConnector } = require('tiktok-live-connector');

const connection = new TikTokLiveConnector('${username || '@username'}', {
    signProvider: '${baseUrl}${endpoint || '/api/eulerstream'}'${useAuth ? `,
    signProviderHeaders: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }` : ''}
});

connection.connect().then(state => {
    console.log('Connected to TikTok Live:', state);
}).catch(err => {
    console.error('Connection failed:', err);
});

connection.on('chat', data => {
    console.log(\`\${data.uniqueId}: \${data.comment}\`);
});

connection.on('gift', data => {
    console.log(\`\${data.uniqueId} sent \${data.giftName} x\${data.repeatCount}\`);
});

connection.on('disconnect', () => {
    console.log('Disconnected from TikTok Live');
});`
  }
  
  return NextResponse.json({
    success: true,
    generated_config: config,
    instructions: [
      'Copy the configuration code into your project',
      useAuth ? 'Replace YOUR_API_KEY with your actual API key from the dashboard' : 'No API key needed for basic usage',
      'Test the connection with a known TikTok live stream',
      'Monitor performance and upgrade to API key if needed'
    ]
  })
}