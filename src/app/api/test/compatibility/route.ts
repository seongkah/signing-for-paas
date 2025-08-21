import { NextRequest, NextResponse } from 'next/server'

/**
 * Comprehensive compatibility testing endpoint
 * Tests all aspects of EulerStream replacement functionality
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testSuite, testUrl } = body
    
    const testUrl_safe = testUrl || 'https://www.tiktok.com/@testuser/live'
    
    switch (testSuite) {
      case 'full_compatibility':
        return runFullCompatibilityTest(testUrl_safe)
      
      case 'format_compatibility':
        return runFormatCompatibilityTest(testUrl_safe)
      
      case 'endpoint_compatibility':
        return runEndpointCompatibilityTest(testUrl_safe)
      
      case 'error_compatibility':
        return runErrorCompatibilityTest()
      
      case 'performance_compatibility':
        return runPerformanceCompatibilityTest(testUrl_safe)
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid test suite',
            available_suites: [
              'full_compatibility',
              'format_compatibility',
              'endpoint_compatibility',
              'error_compatibility',
              'performance_compatibility'
            ]
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

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'EulerStream Compatibility Test Suite',
    description: 'Comprehensive testing for TikTok Live Connector integration',
    
    test_suites: {
      full_compatibility: {
        description: 'Complete compatibility test covering all aspects',
        includes: ['format', 'endpoints', 'errors', 'performance']
      },
      format_compatibility: {
        description: 'Test request/response format compatibility',
        tests: ['JSON format', 'plain text format', 'response structure']
      },
      endpoint_compatibility: {
        description: 'Test all endpoint variations',
        endpoints: ['/api/signature', '/api/eulerstream', '/api/sign']
      },
      error_compatibility: {
        description: 'Test error handling and response formats',
        scenarios: ['invalid URLs', 'missing data', 'server errors']
      },
      performance_compatibility: {
        description: 'Test response times and throughput',
        metrics: ['response time', 'concurrent requests', 'success rate']
      }
    },
    
    usage: {
      method: 'POST',
      body: {
        testSuite: 'full_compatibility',
        testUrl: 'https://www.tiktok.com/@username/live'
      }
    }
  })
}

async function runFullCompatibilityTest(testUrl: string) {
  const startTime = Date.now()
  const results: {
    format_test: any,
    endpoint_test: any,
    error_test: any,
    performance_test: any
  } = {
    format_test: null,
    endpoint_test: null,
    error_test: null,
    performance_test: null
  }
  
  try {
    // Run all test suites
    const [formatResult, endpointResult, errorResult, performanceResult] = await Promise.all([
      runFormatCompatibilityTest(testUrl),
      runEndpointCompatibilityTest(testUrl),
      runErrorCompatibilityTest(),
      runPerformanceCompatibilityTest(testUrl)
    ])
    
    results.format_test = await formatResult.json()
    results.endpoint_test = await endpointResult.json()
    results.error_test = await errorResult.json()
    results.performance_test = await performanceResult.json()
    
    // Calculate overall compatibility score
    const scores = [
      results.format_test?.compatibility_score || 0,
      results.endpoint_test?.compatibility_score || 0,
      results.error_test?.compatibility_score || 0,
      results.performance_test?.compatibility_score || 0
    ]
    
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    
    return NextResponse.json({
      test_suite: 'full_compatibility',
      success: true,
      total_test_time_ms: Date.now() - startTime,
      overall_compatibility_score: Math.round(overallScore * 100) / 100,
      results,
      summary: {
        format_compatible: results.format_test?.success || false,
        endpoints_compatible: results.endpoint_test?.success || false,
        error_handling_compatible: results.error_test?.success || false,
        performance_acceptable: results.performance_test?.success || false,
        ready_for_production: overallScore >= 0.8
      },
      recommendations: generateRecommendations(results, overallScore)
    })
  } catch (error) {
    return NextResponse.json({
      test_suite: 'full_compatibility',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      partial_results: results
    })
  }
}

async function runFormatCompatibilityTest(testUrl: string) {
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  const tests = []
  
  // Test JSON format (EulerStream style)
  try {
    const response = await fetch(`${baseUrl}/api/eulerstream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testUrl })
    })
    const data = await response.json()
    
    tests.push({
      format: 'eulerstream_json',
      success: response.ok,
      has_required_fields: !!(data.success && data.data?.signature),
      response_structure_valid: !!(data.data?.signed_url && data.data?.['X-Bogus']),
      sample_response: data
    })
  } catch (error) {
    tests.push({
      format: 'eulerstream_json',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Test plain text format (legacy)
  try {
    const response = await fetch(`${baseUrl}/api/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: testUrl
    })
    const data = await response.json()
    
    tests.push({
      format: 'legacy_text',
      success: response.ok,
      has_required_fields: !!(data.status === 'ok' && data.data?.signature),
      response_structure_valid: !!(data.data?.signed_url && data.data?.['X-Bogus']),
      sample_response: data
    })
  } catch (error) {
    tests.push({
      format: 'legacy_text',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Test modern JSON format
  try {
    const response = await fetch(`${baseUrl}/api/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomUrl: testUrl })
    })
    const data = await response.json()
    
    tests.push({
      format: 'modern_json',
      success: response.ok,
      has_required_fields: !!(data.success && data.data?.signature),
      response_structure_valid: !!(data.data?.signed_url && data.data?.['X-Bogus']),
      sample_response: data
    })
  } catch (error) {
    tests.push({
      format: 'modern_json',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  const successfulTests = tests.filter(t => t.success).length
  const compatibilityScore = successfulTests / tests.length
  
  return NextResponse.json({
    test_type: 'format_compatibility',
    success: compatibilityScore >= 0.8,
    compatibility_score: compatibilityScore,
    tests,
    summary: {
      total_formats_tested: tests.length,
      successful_formats: successfulTests,
      eulerstream_compatible: tests.find(t => t.format === 'eulerstream_json')?.success || false,
      legacy_compatible: tests.find(t => t.format === 'legacy_text')?.success || false,
      modern_compatible: tests.find(t => t.format === 'modern_json')?.success || false
    }
  })
}

async function runEndpointCompatibilityTest(testUrl: string) {
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  const endpoints = [
    { path: '/api/signature', description: 'Main signature endpoint' },
    { path: '/api/eulerstream', description: 'EulerStream compatibility endpoint' },
    { path: '/api/sign', description: 'Legacy compatibility endpoint' }
  ]
  
  const tests = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: testUrl, roomUrl: testUrl })
        })
        
        const data = await response.json()
        
        return {
          endpoint: endpoint.path,
          description: endpoint.description,
          success: response.ok,
          status_code: response.status,
          has_signature_data: !!(data.data?.signature || data.signature),
          response_format_valid: !!(data.success !== undefined || data.status !== undefined),
          sample_response: data
        }
      } catch (error) {
        return {
          endpoint: endpoint.path,
          description: endpoint.description,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  )
  
  const successfulEndpoints = tests.filter(t => t.success).length
  const compatibilityScore = successfulEndpoints / tests.length
  
  return NextResponse.json({
    test_type: 'endpoint_compatibility',
    success: compatibilityScore >= 0.8,
    compatibility_score: compatibilityScore,
    tests,
    summary: {
      total_endpoints: tests.length,
      successful_endpoints: successfulEndpoints,
      all_endpoints_working: compatibilityScore === 1.0
    }
  })
}

async function runErrorCompatibilityTest() {
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  const errorScenarios = [
    { name: 'invalid_url', input: 'not_a_url', expected_error: true },
    { name: 'non_tiktok_url', input: 'https://www.youtube.com/watch', expected_error: true },
    { name: 'empty_input', input: '', expected_error: true },
    { name: 'missing_field', input: null, expected_error: true }
  ]
  
  const tests = await Promise.all(
    errorScenarios.map(async (scenario) => {
      try {
        const body = scenario.input === null ? {} : { url: scenario.input }
        
        const response = await fetch(`${baseUrl}/api/eulerstream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        
        const data = await response.json()
        
        const isErrorResponse = !response.ok || data.success === false || data.status === 'error'
        const hasErrorMessage = !!(data.error || data.message)
        
        return {
          scenario: scenario.name,
          input: scenario.input,
          expected_error: scenario.expected_error,
          got_error_response: isErrorResponse,
          has_error_message: hasErrorMessage,
          status_code: response.status,
          correct_behavior: scenario.expected_error === isErrorResponse,
          sample_response: data
        }
      } catch (error) {
        return {
          scenario: scenario.name,
          input: scenario.input,
          network_error: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  )
  
  const correctBehaviors = tests.filter(t => t.correct_behavior).length
  const compatibilityScore = correctBehaviors / tests.length
  
  return NextResponse.json({
    test_type: 'error_compatibility',
    success: compatibilityScore >= 0.8,
    compatibility_score: compatibilityScore,
    tests,
    summary: {
      total_scenarios: tests.length,
      correct_error_handling: correctBehaviors,
      error_handling_score: Math.round(compatibilityScore * 100)
    }
  })
}

async function runPerformanceCompatibilityTest(testUrl: string) {
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  const iterations = 3
  const results = []
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${baseUrl}/api/eulerstream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl })
      })
      
      const data = await response.json()
      const responseTime = Date.now() - startTime
      
      results.push({
        iteration: i + 1,
        success: response.ok,
        response_time_ms: responseTime,
        reported_time_ms: data.response_time_ms || null,
        status_code: response.status
      })
    } catch (error) {
      results.push({
        iteration: i + 1,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response_time_ms: Date.now() - startTime
      })
    }
  }
  
  const successfulResults = results.filter(r => r.success)
  const avgResponseTime = successfulResults.length > 0
    ? successfulResults.reduce((sum, r) => sum + r.response_time_ms, 0) / successfulResults.length
    : 0
  
  const performanceScore = avgResponseTime < 3000 ? 1.0 : (avgResponseTime < 5000 ? 0.8 : 0.5)
  
  return NextResponse.json({
    test_type: 'performance_compatibility',
    success: performanceScore >= 0.8,
    compatibility_score: performanceScore,
    results,
    summary: {
      total_iterations: iterations,
      successful_iterations: successfulResults.length,
      average_response_time_ms: Math.round(avgResponseTime),
      performance_acceptable: avgResponseTime < 3000,
      success_rate: (successfulResults.length / iterations) * 100
    }
  })
}

function generateRecommendations(results: any, overallScore: number): string[] {
  const recommendations: string[] = []
  
  if (overallScore >= 0.9) {
    recommendations.push('✅ Excellent compatibility! Ready for production use.')
  } else if (overallScore >= 0.8) {
    recommendations.push('✅ Good compatibility. Minor improvements recommended.')
  } else {
    recommendations.push('⚠️ Compatibility issues detected. Review failed tests.')
  }
  
  if (!results.format_test?.success) {
    recommendations.push('🔧 Fix request/response format compatibility issues')
  }
  
  if (!results.endpoint_test?.success) {
    recommendations.push('🔧 Ensure all endpoints are working correctly')
  }
  
  if (!results.error_test?.success) {
    recommendations.push('🔧 Improve error handling and response formats')
  }
  
  if (!results.performance_test?.success) {
    recommendations.push('🔧 Optimize response times for better performance')
  }
  
  recommendations.push('📚 Test with actual TikTok Live Connector integration')
  recommendations.push('🔍 Monitor logs for any integration issues')
  
  return recommendations
}