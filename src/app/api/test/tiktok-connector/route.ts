import { NextRequest, NextResponse } from 'next/server'

/**
 * TikTok Live Connector integration testing endpoint
 * Provides utilities to test EulerStream replacement compatibility
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType, url, expectedFormat } = body

    switch (testType) {
      case 'format_compatibility':
        return testFormatCompatibility(url, expectedFormat)
      
      case 'response_structure':
        return testResponseStructure(url)
      
      case 'error_handling':
        return testErrorHandling(url)
      
      case 'performance':
        return testPerformance(url)
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid test type',
            supportedTests: [
              'format_compatibility',
              'response_structure', 
              'error_handling',
              'performance'
            ]
          },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'TikTok Live Connector Integration Tester',
    description: 'Test compatibility with TikTok Live Connector library',
    available_tests: {
      format_compatibility: {
        description: 'Test response format compatibility with EulerStream',
        method: 'POST',
        body: {
          testType: 'format_compatibility',
          url: 'https://www.tiktok.com/@username/live',
          expectedFormat: 'eulerstream'
        }
      },
      response_structure: {
        description: 'Validate response structure matches expected format',
        method: 'POST',
        body: {
          testType: 'response_structure',
          url: 'https://www.tiktok.com/@username/live'
        }
      },
      error_handling: {
        description: 'Test error response compatibility',
        method: 'POST',
        body: {
          testType: 'error_handling',
          url: 'invalid_url'
        }
      },
      performance: {
        description: 'Test response time and performance metrics',
        method: 'POST',
        body: {
          testType: 'performance',
          url: 'https://www.tiktok.com/@username/live'
        }
      }
    },
    integration_examples: {
      before_eulerstream: `
const { TikTokLiveConnector } = require('tiktok-live-connector');
const connection = new TikTokLiveConnector('@username', {
    signProvider: 'eulerstream'
});`,
      after_our_service: `
const { TikTokLiveConnector } = require('tiktok-live-connector');
const connection = new TikTokLiveConnector('@username', {
    signProvider: 'https://your-app.vercel.app/api/eulerstream'
});`
    }
  })
}

async function testFormatCompatibility(url: string, expectedFormat: string) {
  const startTime = Date.now()
  
  try {
    // Test our EulerStream endpoint
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/eulerstream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
    
    const data = await response.json()
    const responseTime = Date.now() - startTime
    
    // Check if response matches expected EulerStream format
    const hasRequiredFields = data.success !== undefined &&
                             data.data?.signature !== undefined &&
                             data.data?.signed_url !== undefined &&
                             data.data?.['X-Bogus'] !== undefined
    
    return NextResponse.json({
      test: 'format_compatibility',
      success: true,
      results: {
        response_time_ms: responseTime,
        status_code: response.status,
        format_compatible: hasRequiredFields,
        expected_format: expectedFormat,
        response_structure: {
          has_success_field: data.success !== undefined,
          has_data_field: data.data !== undefined,
          has_signature: data.data?.signature !== undefined,
          has_signed_url: data.data?.signed_url !== undefined,
          has_x_bogus: data.data?.['X-Bogus'] !== undefined,
          has_navigator: data.data?.navigator !== undefined
        },
        sample_response: data
      }
    })
  } catch (error) {
    return NextResponse.json({
      test: 'format_compatibility',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime
    })
  }
}

async function testResponseStructure(url: string) {
  const startTime = Date.now()
  
  try {
    // Test multiple endpoints for consistency
    const endpoints = [
      '/api/signature',
      '/api/eulerstream', 
      '/api/sign'
    ]
    
    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, roomUrl: url })
          })
          
          const data = await response.json()
          
          return {
            endpoint,
            status: response.status,
            success: response.ok,
            structure: {
              has_success_or_status: data.success !== undefined || data.status !== undefined,
              has_data: data.data !== undefined,
              has_error_handling: data.error !== undefined || data.status === 'error',
              response_format: data.status === 'ok' ? 'legacy' : 'modern'
            },
            sample: data
          }
        } catch (error) {
          return {
            endpoint,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )
    
    return NextResponse.json({
      test: 'response_structure',
      success: true,
      response_time_ms: Date.now() - startTime,
      results,
      summary: {
        total_endpoints: endpoints.length,
        successful_endpoints: results.filter(r => r.success).length,
        consistent_structure: results.every(r => r.success && r.structure?.has_data)
      }
    })
  } catch (error) {
    return NextResponse.json({
      test: 'response_structure',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime
    })
  }
}

async function testErrorHandling(url: string) {
  const startTime = Date.now()
  
  try {
    const testCases = [
      { name: 'invalid_url', url: 'not_a_url' },
      { name: 'non_tiktok_url', url: 'https://www.youtube.com/watch?v=test' },
      { name: 'empty_url', url: '' },
      { name: 'null_url', url: null }
    ]
    
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        try {
          const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/eulerstream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: testCase.url })
          })
          
          const data = await response.json()
          
          return {
            test_case: testCase.name,
            input: testCase.url,
            status_code: response.status,
            is_error_response: !response.ok,
            has_error_message: data.error !== undefined || data.message !== undefined,
            error_format_valid: data.success === false || data.status === 'error',
            response: data
          }
        } catch (error) {
          return {
            test_case: testCase.name,
            input: testCase.url,
            network_error: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )
    
    return NextResponse.json({
      test: 'error_handling',
      success: true,
      response_time_ms: Date.now() - startTime,
      results,
      summary: {
        total_test_cases: testCases.length,
        proper_error_responses: results.filter(r => r.is_error_response && r.has_error_message).length,
        error_handling_score: results.filter(r => r.error_format_valid).length / testCases.length
      }
    })
  } catch (error) {
    return NextResponse.json({
      test: 'error_handling',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime
    })
  }
}

async function testPerformance(url: string) {
  const startTime = Date.now()
  
  try {
    const iterations = 5
    const results = []
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now()
      
      try {
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/eulerstream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        
        const data = await response.json()
        const iterationTime = Date.now() - iterationStart
        
        results.push({
          iteration: i + 1,
          response_time_ms: iterationTime,
          status_code: response.status,
          success: response.ok,
          reported_time: data.response_time_ms || null
        })
      } catch (error) {
        results.push({
          iteration: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          response_time_ms: Date.now() - iterationStart
        })
      }
    }
    
    const successfulResults = results.filter(r => r.success)
    const avgResponseTime = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.response_time_ms, 0) / successfulResults.length
      : 0
    
    return NextResponse.json({
      test: 'performance',
      success: true,
      total_test_time_ms: Date.now() - startTime,
      results,
      summary: {
        total_iterations: iterations,
        successful_iterations: successfulResults.length,
        average_response_time_ms: Math.round(avgResponseTime),
        min_response_time_ms: Math.min(...successfulResults.map(r => r.response_time_ms)),
        max_response_time_ms: Math.max(...successfulResults.map(r => r.response_time_ms)),
        success_rate: (successfulResults.length / iterations) * 100
      }
    })
  } catch (error) {
    return NextResponse.json({
      test: 'performance',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime
    })
  }
}