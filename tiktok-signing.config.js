#!/usr/bin/env node

/**
 * TikTok Signing Service Configuration
 * 
 * Simple configuration file to switch between signing services:
 * - 'eulerstream': Use original EulerStream service (paid)
 * - 'free': Use our service with free tier (100 requests/day per IP)
 * - 'paid': Use our service with API key (unlimited requests)
 * 
 * Usage:
 *   const config = require('./tiktok-signing.config.js')
 *   const connection = new TikTokLiveConnector('@username', config.getSigningConfig())
 */

module.exports = {
  // ===== CONFIGURATION SETTINGS =====
  
  /**
   * Choose your signing service:
   * - 'eulerstream': Original EulerStream service (requires subscription)
   * - 'free': Our free service (100 requests/day per IP, no auth required)
   * - 'paid': Our paid service (unlimited requests, requires API key)
   */
  service: 'eulerstream',  // ← CHANGE THIS LINE TO SWITCH SERVICES
  
  /**
   * API Key for paid tier (only needed when service = 'paid')
   * Get your API key from: https://signing-for-paas.vercel.app/dashboard
   */
  apiKey: 'sk_abcd115a395c4ec6726546f7427545924b8b59c30d0fd50df3fc4ebf965eb64f',
  
  /**
   * Service URL (usually no need to change this)
   */
  serviceUrl: 'https://signing-for-paas.vercel.app/api/eulerstream',
  
  // ===== AUTO-GENERATED CONFIGURATION =====
  
  /**
   * Get the TikTok Live Connector configuration based on selected service
   * @returns {Object} Configuration object for TikTokLiveConnector
   */
  getSigningConfig() {
    switch(this.service) {
      case 'eulerstream':
        return {
          signProvider: 'eulerstream'
        }
        
      case 'free':
        return {
          signProvider: this.serviceUrl,
          // No additional headers needed for free tier
        }
        
      case 'paid':
        if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
          console.warn('⚠️  Warning: API key not configured for paid tier')
          console.warn('   Get your API key from: https://signing-for-paas.vercel.app/dashboard')
          console.warn('   Or switch to free tier by setting service: "free"')
        }
        return {
          signProvider: this.serviceUrl,
          signProviderHeaders: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
        
      default:
        throw new Error(`Unknown service: ${this.service}. Use 'eulerstream', 'free', or 'paid'`)
    }
  },
  
  /**
   * Get current service information
   * @returns {Object} Service details
   */
  getServiceInfo() {
    const serviceInfo = {
      eulerstream: {
        name: 'EulerStream',
        description: 'Original paid service',
        cost: '$29-99/month',
        rateLimit: 'Based on subscription plan',
        authRequired: 'EulerStream subscription'
      },
      free: {
        name: 'Our Free Service',
        description: 'Free tier with IP-based rate limiting',
        cost: 'Free',
        rateLimit: '100 requests/day per IP',
        authRequired: 'None'
      },
      paid: {
        name: 'Our Paid Service',
        description: 'Unlimited service with API key',
        cost: 'Generate API key from dashboard',
        rateLimit: 'Unlimited',
        authRequired: 'API key required'
      }
    }
    
    return serviceInfo[this.service] || {}
  },
  
  /**
   * Validate current configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const result = {
      valid: true,
      warnings: [],
      errors: []
    }
    
    // Check service type
    if (!['eulerstream', 'free', 'paid'].includes(this.service)) {
      result.valid = false
      result.errors.push(`Invalid service: ${this.service}`)
    }
    
    // Check API key for paid service
    if (this.service === 'paid') {
      if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
        result.valid = false
        result.errors.push('API key required for paid service')
      }
    }
    
    // Check service URL format
    if (this.service !== 'eulerstream') {
      if (!this.serviceUrl.startsWith('https://')) {
        result.warnings.push('Service URL should use HTTPS for security')
      }
    }
    
    return result
  },
  
  /**
   * Print current configuration status
   */
  printStatus() {
    console.log('\n🔧 TikTok Signing Service Configuration')
    console.log('=====================================')
    console.log(`Current Service: ${this.service}`)
    
    const info = this.getServiceInfo()
    if (info.name) {
      console.log(`Service Name: ${info.name}`)
      console.log(`Description: ${info.description}`)
      console.log(`Cost: ${info.cost}`)
      console.log(`Rate Limit: ${info.rateLimit}`)
      console.log(`Auth Required: ${info.authRequired}`)
    }
    
    if (this.service !== 'eulerstream') {
      console.log(`Service URL: ${this.serviceUrl}`)
    }
    
    if (this.service === 'paid') {
      const hasValidKey = this.apiKey && this.apiKey !== 'YOUR_API_KEY_HERE'
      console.log(`API Key: ${hasValidKey ? '✅ Configured' : '❌ Not configured'}`)
    }
    
    const validation = this.validateConfig()
    if (validation.errors.length > 0) {
      console.log(`\n❌ Errors:`)
      validation.errors.forEach(error => console.log(`   - ${error}`))
    }
    
    if (validation.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`)
      validation.warnings.forEach(warning => console.log(`   - ${warning}`))
    }
    
    if (validation.valid && validation.warnings.length === 0) {
      console.log(`\n✅ Configuration is valid and ready to use!`)
    }
    
    console.log('') // Empty line
  }
}

// If running directly, show configuration status
if (require.main === module) {
  module.exports.printStatus()
}