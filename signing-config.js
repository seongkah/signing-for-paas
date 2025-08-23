/**
 * TikTok Signing Service Configuration Manager
 * Provides flexible endpoint switching between EulerStream and our service
 */

const SigningEndpoints = {
  eulerstream: {
    url: 'https://tiktok.eulerstream.com',
    apiKey: null,
    description: 'Original EulerStream service (external)',
    tier: 'external',
    rateLimit: 'Variable (paid service)',
    cost: '$29-99/month'
  },
  free: {
    url: 'https://signing-for-paas.vercel.app/api',
    apiKey: null,
    description: 'Our free tier - 100 requests/day per IP',
    tier: 'free',
    rateLimit: '100/day, 20/hour, 5/min',
    cost: 'Free'
  },
  paid: {
    url: 'https://signing-for-paas.vercel.app/api',
    apiKey: process.env.TIKTOK_SIGNING_API_KEY,
    description: 'Our unlimited paid tier with API key',
    tier: 'unlimited',
    rateLimit: 'Unlimited requests, 100/min burst',
    cost: 'Competitive pricing'
  }
}

class TikTokSigningConfig {
  constructor() {
    this.currentEndpoint = process.env.TIKTOK_SIGNING_ENDPOINT || 'free'
    this.validateConfiguration()
  }

  /**
   * Get the current endpoint configuration
   */
  getCurrentConfig() {
    const config = SigningEndpoints[this.currentEndpoint]
    if (!config) {
      console.warn(`⚠️  Invalid endpoint '${this.currentEndpoint}', falling back to 'free'`)
      this.currentEndpoint = 'free'
      return SigningEndpoints.free
    }
    return config
  }

  /**
   * Set the active endpoint
   */
  setEndpoint(endpoint) {
    if (!SigningEndpoints[endpoint]) {
      throw new Error(`Invalid endpoint: ${endpoint}. Available: ${Object.keys(SigningEndpoints).join(', ')}`)
    }
    this.currentEndpoint = endpoint
    console.log(`🔧 Switched to ${endpoint} endpoint: ${SigningEndpoints[endpoint].description}`)
    return this.getCurrentConfig()
  }

  /**
   * Set API key for paid tier
   */
  setApiKey(apiKey) {
    if (this.currentEndpoint === 'paid') {
      SigningEndpoints.paid.apiKey = apiKey
      console.log(`🔑 API key set for paid tier`)
    } else {
      console.warn(`⚠️  API key only relevant for 'paid' tier, currently using '${this.currentEndpoint}'`)
    }
  }

  /**
   * Get environment variables for TikTok Live Connector
   */
  getEnvironmentConfig() {
    const config = this.getCurrentConfig()
    return {
      SIGN_API_URL: config.url,
      SIGN_API_KEY: config.apiKey,
      TIKTOK_SIGNING_ENDPOINT: this.currentEndpoint
    }
  }

  /**
   * Apply configuration to environment
   */
  applyToEnvironment() {
    const envConfig = this.getEnvironmentConfig()
    Object.entries(envConfig).forEach(([key, value]) => {
      if (value !== null) {
        process.env[key] = value
      }
    })
    
    // IMPORTANT: TikTok Live Connector uses SIGN_API_KEY for authentication
    const config = this.getCurrentConfig()
    if (config.apiKey) {
      process.env.SIGN_API_KEY = config.apiKey
      console.log(`🔑 Set SIGN_API_KEY environment variable for TikTok Live Connector`)
    } else {
      // Clear API key for free tier
      delete process.env.SIGN_API_KEY
    }
    
    console.log(`✅ Applied ${this.currentEndpoint} configuration to environment`)
  }

  /**
   * Validate current configuration
   */
  validateConfiguration() {
    const config = this.getCurrentConfig()
    
    if (this.currentEndpoint === 'paid' && !config.apiKey) {
      console.warn('⚠️  Paid tier selected but no API key provided. Set TIKTOK_SIGNING_API_KEY environment variable.')
    }
    
    return {
      valid: true,
      endpoint: this.currentEndpoint,
      config: config
    }
  }

  /**
   * Display current configuration
   */
  displayStatus() {
    const config = this.getCurrentConfig()
    console.log('\n🎯 TikTok Signing Configuration Status:')
    console.log('=====================================')
    console.log(`Current Endpoint: ${this.currentEndpoint}`)
    console.log(`Service URL: ${config.url}`)
    console.log(`Description: ${config.description}`)
    console.log(`Tier: ${config.tier}`)
    console.log(`Rate Limit: ${config.rateLimit}`)
    console.log(`Cost: ${config.cost}`)
    console.log(`API Key: ${config.apiKey ? '✅ Set' : '❌ Not set'}`)
    
    console.log('\n📋 Available Endpoints:')
    Object.entries(SigningEndpoints).forEach(([key, endpoint]) => {
      const current = key === this.currentEndpoint ? '👈 ACTIVE' : ''
      console.log(`  ${key}: ${endpoint.description} ${current}`)
    })
    console.log('')
  }

  /**
   * Test endpoint connectivity
   */
  async testEndpoint(endpoint = this.currentEndpoint) {
    const config = SigningEndpoints[endpoint]
    if (!config) {
      throw new Error(`Invalid endpoint: ${endpoint}`)
    }

    console.log(`🧪 Testing ${endpoint} endpoint...`)
    
    try {
      // Test basic connectivity
      const testUrl = `${config.url}/webcast/fetch?client=ttlive-node&unique_id=testuser`
      const startTime = Date.now()
      
      const headers = {
        'User-Agent': 'tiktok-signing-config-test/1.0'
      }
      
      if (config.apiKey) {
        headers['X-API-Key'] = config.apiKey
      }

      const response = await fetch(testUrl, { 
        method: 'GET',
        headers: headers,
        timeout: 10000
      })
      
      const responseTime = Date.now() - startTime
      const status = response.status
      
      console.log(`  Status: ${status}`)
      console.log(`  Response Time: ${responseTime}ms`)
      console.log(`  Content-Type: ${response.headers.get('content-type')}`)
      
      if (status === 200) {
        console.log(`✅ ${endpoint} endpoint is working`)
        return true
      } else {
        console.log(`⚠️  ${endpoint} endpoint returned ${status}`)
        return false
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} endpoint failed: ${error.message}`)
      return false
    }
  }

  /**
   * Run comprehensive configuration tests
   */
  async testAllEndpoints() {
    console.log('🧪 Testing all available endpoints...')
    
    const results = {}
    for (const endpoint of Object.keys(SigningEndpoints)) {
      results[endpoint] = await this.testEndpoint(endpoint)
      console.log('') // Add spacing
    }
    
    console.log('📊 Test Results Summary:')
    Object.entries(results).forEach(([endpoint, success]) => {
      const status = success ? '✅ WORKING' : '❌ FAILED'
      console.log(`  ${endpoint}: ${status}`)
    })
    
    return results
  }
}

// Export singleton instance
const signingConfig = new TikTokSigningConfig()

module.exports = {
  SigningEndpoints,
  TikTokSigningConfig,
  signingConfig,
  
  // Convenience functions
  setEndpoint: (endpoint) => signingConfig.setEndpoint(endpoint),
  setApiKey: (apiKey) => signingConfig.setApiKey(apiKey),
  getCurrentConfig: () => signingConfig.getCurrentConfig(),
  applyToEnvironment: () => signingConfig.applyToEnvironment(),
  displayStatus: () => signingConfig.displayStatus(),
  testEndpoint: (endpoint) => signingConfig.testEndpoint(endpoint),
  testAllEndpoints: () => signingConfig.testAllEndpoints()
}