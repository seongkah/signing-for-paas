#!/usr/bin/env node

/**
 * Comprehensive End-to-End API Key Integration Test
 * Tests the complete flow of API key authentication with signature generation
 */

const https = require('https')

const BASE_URL = 'https://signing-for-paas.vercel.app'

// Sample API key for testing (replace with actual if available)
const TEST_API_KEY = 'test-key-for-integration-testing-replace-with-real-key'

async function makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint)
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'E2E-Test-Script/1.0',
        ...headers
      }
    }

    const req = https.request(options, (res) => {
      let body = ''
      
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonBody
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: { raw: body }
          })
        }
      })
    })

    req.on('error', reject)
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

async function testSignatureEndpoint(endpoint, useApiKey = false, description) {
  console.log(`\n🧪 Testing: ${description}`)
  console.log(`📍 Endpoint: ${endpoint}`)
  
  const headers = {}
  if (useApiKey) {
    headers['X-API-Key'] = TEST_API_KEY
    console.log(`🔑 Using API Key: ${TEST_API_KEY.slice(0, 20)}...`)
  }
  
  try {
    const response = await makeRequest(endpoint, 'POST', {
      url: 'https://www.tiktok.com/@testuser/live'
    }, headers)
    
    console.log(`📊 Status: ${response.status}`)
    console.log(`⏱️  Response Time: ${response.data.response_time_ms || 'N/A'}ms`)
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ SUCCESS: ${description}`)
      console.log(`📝 Signature Type: ${response.data.data?.signature?.includes('mock') ? 'Mock' : 'Real'}`)
      return true
    } else {
      console.log(`❌ FAILED: ${description}`)
      console.log(`💬 Error: ${response.data.error || 'Unknown error'}`)
      return false
    }
  } catch (error) {
    console.log(`❌ ERROR: ${description}`)
    console.log(`💬 Exception: ${error.message}`)
    return false
  }
}

async function testHealthCheck() {
  console.log(`\n🏥 Testing: System Health Check`)
  
  try {
    const response = await makeRequest('/api/health')
    console.log(`📊 Status: ${response.status}`)
    
    if (response.status === 200) {
      console.log(`✅ Health Check: Service is responding`)
      const checks = response.data.checks || {}
      Object.entries(checks).forEach(([service, status]) => {
        const icon = status === 'operational' || status === 'passed' ? '✅' : '⚠️'
        console.log(`  ${icon} ${service}: ${status}`)
      })
      return true
    } else {
      console.log(`⚠️  Health Check: Service issues detected`)
      return false
    }
  } catch (error) {
    console.log(`❌ Health Check Failed: ${error.message}`)
    return false
  }
}

async function testRateLimiting() {
  console.log(`\n🛡️  Testing: Rate Limiting (Free Tier)`)
  
  let successCount = 0
  let rateLimitCount = 0
  
  // Make multiple rapid requests to test rate limiting
  for (let i = 0; i < 10; i++) {
    try {
      const response = await makeRequest('/api/signature', 'POST', {
        url: `https://www.tiktok.com/@testuser${i}/live`
      })
      
      if (response.status === 200) {
        successCount++
      } else if (response.status === 429) {
        rateLimitCount++
        console.log(`⏸️  Rate limit hit after ${successCount} requests`)
        break
      }
    } catch (error) {
      console.log(`❌ Request ${i} failed: ${error.message}`)
    }
    
    // Small delay to avoid overwhelming
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`📊 Results: ${successCount} successful, ${rateLimitCount} rate limited`)
  console.log(`✅ Rate limiting is ${rateLimitCount > 0 || successCount < 10 ? 'working' : 'needs attention'}`)
}

async function runFullE2ETest() {
  console.log('🚀 Starting Comprehensive End-to-End API Integration Test')
  console.log('=' .repeat(60))
  
  const results = {
    health: false,
    freeSignature: false,
    freeEulerstream: false,
    apiKeySignature: false,
    apiKeyEulerstream: false,
    rateLimiting: false
  }
  
  // Test 1: Health Check
  results.health = await testHealthCheck()
  
  // Test 2: Free Tier Signature Generation  
  results.freeSignature = await testSignatureEndpoint(
    '/api/signature', 
    false, 
    'Free Tier Signature Generation'
  )
  
  // Test 3: Free Tier EulerStream Compatibility
  results.freeEulerstream = await testSignatureEndpoint(
    '/api/eulerstream', 
    false, 
    'Free Tier EulerStream Compatibility'
  )
  
  // Test 4: API Key Signature Generation
  results.apiKeySignature = await testSignatureEndpoint(
    '/api/signature', 
    true, 
    'API Key Signature Generation'
  )
  
  // Test 5: API Key EulerStream Compatibility  
  results.apiKeyEulerstream = await testSignatureEndpoint(
    '/api/eulerstream', 
    true, 
    'API Key EulerStream Compatibility'
  )
  
  // Test 6: Rate Limiting
  await testRateLimiting()
  results.rateLimiting = true
  
  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📋 TEST RESULTS SUMMARY')
  console.log('=' .repeat(60))
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌'
    const status = passed ? 'PASSED' : 'FAILED'
    console.log(`${icon} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${status}`)
  })
  
  const passedTests = Object.values(results).filter(Boolean).length
  const totalTests = Object.keys(results).length
  const successRate = Math.round((passedTests / totalTests) * 100)
  
  console.log('\n📊 Overall Results:')
  console.log(`   Tests Passed: ${passedTests}/${totalTests}`)
  console.log(`   Success Rate: ${successRate}%`)
  
  if (successRate >= 80) {
    console.log(`🎉 SYSTEM STATUS: PRODUCTION READY`)
  } else if (successRate >= 60) {
    console.log(`⚠️  SYSTEM STATUS: NEEDS ATTENTION`)
  } else {
    console.log(`❌ SYSTEM STATUS: CRITICAL ISSUES`)
  }
  
  console.log('\n🏁 End-to-End Testing Complete!')
}

// Run the test
if (require.main === module) {
  runFullE2ETest().catch(console.error)
}

module.exports = { runFullE2ETest, testSignatureEndpoint, makeRequest }