#!/usr/bin/env node

/**
 * TikTok Signing Configuration Helper Utilities
 * 
 * Provides helper functions for managing TikTok signing service configuration
 */

const fs = require('fs')
const path = require('path')

class TikTokSigningConfigHelper {
  constructor(configPath = './tiktok-signing.config.js') {
    this.configPath = configPath
    this.config = null
  }
  
  /**
   * Load configuration from file
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        delete require.cache[require.resolve(this.configPath)]
        this.config = require(this.configPath)
        return this.config
      } else {
        throw new Error(`Configuration file not found: ${this.configPath}`)
      }
    } catch (error) {
      console.error(`Failed to load configuration: ${error.message}`)
      return null
    }
  }
  
  /**
   * Create a new configuration file from template
   * @param {string} service - Service type ('eulerstream', 'free', 'paid')
   * @param {string} apiKey - API key (optional)
   * @param {string} outputPath - Output file path
   */
  createConfig(service = 'free', apiKey = 'YOUR_API_KEY_HERE', outputPath = './tiktok-signing.config.js') {
    const templatePath = path.join(__dirname, 'tiktok-signing.config.js')
    
    if (!fs.existsSync(templatePath)) {
      console.error('Template configuration file not found')
      return false
    }
    
    try {
      let configContent = fs.readFileSync(templatePath, 'utf8')
      
      // Replace default values
      configContent = configContent.replace(
        /service: 'free'/,
        `service: '${service}'`
      )
      
      if (apiKey !== 'YOUR_API_KEY_HERE') {
        configContent = configContent.replace(
          /apiKey: 'YOUR_API_KEY_HERE'/,
          `apiKey: '${apiKey}'`
        )
      }
      
      fs.writeFileSync(outputPath, configContent)
      console.log(`✅ Configuration file created: ${outputPath}`)
      console.log(`   Service: ${service}`)
      if (service === 'paid') {
        console.log(`   API Key: ${apiKey === 'YOUR_API_KEY_HERE' ? 'Not configured' : 'Configured'}`)
      }
      return true
      
    } catch (error) {
      console.error(`Failed to create configuration file: ${error.message}`)
      return false
    }
  }
  
  /**
   * Update existing configuration file
   * @param {Object} updates - Configuration updates
   */
  updateConfig(updates) {
    if (!this.config) {
      this.loadConfig()
    }
    
    if (!this.config) {
      console.error('No configuration loaded')
      return false
    }
    
    try {
      let configContent = fs.readFileSync(this.configPath, 'utf8')
      
      // Update service
      if (updates.service) {
        configContent = configContent.replace(
          /service: '[^']*'/,
          `service: '${updates.service}'`
        )
      }
      
      // Update API key
      if (updates.apiKey) {
        configContent = configContent.replace(
          /apiKey: '[^']*'/,
          `apiKey: '${updates.apiKey}'`
        )
      }
      
      // Update service URL
      if (updates.serviceUrl) {
        configContent = configContent.replace(
          /serviceUrl: '[^']*'/,
          `serviceUrl: '${updates.serviceUrl}'`
        )
      }
      
      fs.writeFileSync(this.configPath, configContent)
      console.log(`✅ Configuration updated: ${this.configPath}`)
      return true
      
    } catch (error) {
      console.error(`Failed to update configuration: ${error.message}`)
      return false
    }
  }
  
  /**
   * Test current configuration by making a test request
   * @returns {Promise<Object>} Test result
   */
  async testConfig() {
    if (!this.config) {
      this.loadConfig()
    }
    
    if (!this.config) {
      return { success: false, error: 'No configuration loaded' }
    }
    
    const validation = this.config.validateConfig()
    if (!validation.valid) {
      return { 
        success: false, 
        error: 'Configuration validation failed',
        details: validation.errors 
      }
    }
    
    // For EulerStream, we can't test directly
    if (this.config.service === 'eulerstream') {
      return { 
        success: true, 
        message: 'EulerStream configuration looks valid (cannot test directly)',
        service: 'eulerstream'
      }
    }
    
    // Test our service endpoints
    try {
      const https = require('https')
      const url = require('url')
      
      const testUrl = this.config.serviceUrl
      const testData = JSON.stringify({ url: 'https://www.tiktok.com/@testuser/live' })
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(testData)
        }
      }
      
      // Add API key for paid service
      if (this.config.service === 'paid' && this.config.apiKey) {
        options.headers['X-API-Key'] = this.config.apiKey
      }
      
      const parsedUrl = url.parse(testUrl)
      options.hostname = parsedUrl.hostname
      options.port = parsedUrl.port || 443
      options.path = parsedUrl.path
      
      return new Promise((resolve) => {
        const req = https.request(options, (res) => {
          let data = ''
          res.on('data', chunk => data += chunk)
          res.on('end', () => {
            try {
              const response = JSON.parse(data)
              if (res.statusCode === 200 && response.success) {
                resolve({
                  success: true,
                  message: 'Configuration test successful',
                  service: this.config.service,
                  responseTime: response.response_time_ms || 'N/A'
                })
              } else {
                resolve({
                  success: false,
                  error: 'Service returned error',
                  statusCode: res.statusCode,
                  details: response.error || data
                })
              }
            } catch (parseError) {
              resolve({
                success: false,
                error: 'Invalid response format',
                details: data.slice(0, 200)
              })
            }
          })
        })
        
        req.on('error', (error) => {
          resolve({
            success: false,
            error: 'Network error',
            details: error.message
          })
        })
        
        req.setTimeout(15000, () => {
          resolve({
            success: false,
            error: 'Request timeout (15s)'
          })
        })
        
        req.write(testData)
        req.end()
      })
      
    } catch (error) {
      return {
        success: false,
        error: 'Test failed',
        details: error.message
      }
    }
  }
  
  /**
   * Generate ready-to-use code examples
   * @returns {Object} Code examples for different languages
   */
  generateExamples() {
    if (!this.config) {
      this.loadConfig()
    }
    
    if (!this.config) {
      return {}
    }
    
    const signingConfig = this.config.getSigningConfig()
    const configStr = JSON.stringify(signingConfig, null, 2)
      .replace(/"/g, "'")
      .replace(/\n  /g, '\n    ')
    
    return {
      nodejs: `// TikTok Live Connector with ${this.config.service} service
const { TikTokLiveConnection } = require('tiktok-live-connector');
const config = require('./tiktok-signing.config.js');

const connection = new TikTokLiveConnection('@username', config.getSigningConfig());

connection.on('connected', (state) => {
  console.log('🎉 Connected to TikTok Live!');
  console.log(\`Viewer count: \${state.viewerCount}\`);
});

connection.on('chat', (data) => {
  console.log(\`💬 \${data.uniqueId}: \${data.comment}\`);
});

connection.on('gift', (data) => {
  console.log(\`🎁 \${data.uniqueId} sent \${data.giftName}\`);
});

await connection.connect();`,

      direct: `// Direct configuration (without config file)
const { TikTokLiveConnection } = require('tiktok-live-connector');

const connection = new TikTokLiveConnection('@username', ${configStr});

await connection.connect();`,

      curl: this.config.service === 'eulerstream' ? 
        '# EulerStream service - use their API documentation' :
        `# Direct API test
curl -X POST "${this.config.serviceUrl}" \\
  -H "Content-Type: application/json"${this.config.service === 'paid' ? ` \\
  -H "X-API-Key: ${this.config.apiKey}"` : ''} \\
  -d '{
    "url": "https://www.tiktok.com/@username/live"
  }'`
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const helper = new TikTokSigningConfigHelper()
  
  if (args.length === 0) {
    console.log(`
🔧 TikTok Signing Configuration Helper

Usage:
  node config-helper.js <command> [options]

Commands:
  status                    Show current configuration status
  test                      Test current configuration
  create [service] [apikey] Create new configuration file
  update service <name>     Update service type
  update apikey <key>       Update API key
  examples                  Generate code examples

Examples:
  node config-helper.js create free
  node config-helper.js create paid my-api-key-123
  node config-helper.js update service paid
  node config-helper.js test
`)
    process.exit(0)
  }
  
  const command = args[0]
  
  switch (command) {
    case 'status':
      const config = helper.loadConfig()
      if (config) {
        config.printStatus()
      }
      break
      
    case 'test':
      helper.testConfig().then(result => {
        if (result.success) {
          console.log(`✅ ${result.message}`)
          console.log(`   Service: ${result.service}`)
          if (result.responseTime) {
            console.log(`   Response time: ${result.responseTime}ms`)
          }
        } else {
          console.log(`❌ ${result.error}`)
          if (result.details) {
            console.log(`   Details: ${result.details}`)
          }
        }
      })
      break
      
    case 'create':
      const service = args[1] || 'free'
      const apiKey = args[2] || 'YOUR_API_KEY_HERE'
      helper.createConfig(service, apiKey)
      break
      
    case 'update':
      const updateType = args[1]
      const updateValue = args[2]
      
      if (updateType === 'service') {
        helper.updateConfig({ service: updateValue })
      } else if (updateType === 'apikey') {
        helper.updateConfig({ apiKey: updateValue })
      } else {
        console.log('Usage: node config-helper.js update [service|apikey] <value>')
      }
      break
      
    case 'examples':
      const examples = helper.generateExamples()
      console.log('📝 Code Examples\n================')
      
      Object.entries(examples).forEach(([lang, code]) => {
        console.log(`\n--- ${lang.toUpperCase()} ---`)
        console.log(code)
      })
      break
      
    default:
      console.log(`Unknown command: ${command}`)
      console.log('Run without arguments to see usage help')
  }
}

module.exports = TikTokSigningConfigHelper