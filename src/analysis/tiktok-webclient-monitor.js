#!/usr/bin/env node

/**
 * TikTok Web Client Monitor
 * 
 * This system monitors TikTok's web client JavaScript for algorithm changes by:
 * 1. Fetching and analyzing TikTok's web client JavaScript files
 * 2. Detecting changes in signature generation functions
 * 3. Identifying new anti-bot measures
 * 4. Tracking algorithm evolution patterns
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Logger = require('../Logger');

/**
 * TikTok Web Client Monitor
 */
class TikTokWebClientMonitor {
  constructor() {
    this.logger = new Logger('INFO');
    this.cacheDir = path.join(__dirname, 'webclient-cache');
    this.analysisDir = path.join(__dirname, 'webclient-analysis');
    
    // Ensure directories exist
    [this.cacheDir, this.analysisDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // TikTok web client URLs to monitor
    this.monitorUrls = [
      'https://www.tiktok.com/',
      'https://www.tiktok.com/@username/live',
      'https://www.tiktok.com/explore'
    ];

    // JavaScript patterns to look for
    this.algorithmPatterns = {
      signature: [
        /signature.*?function/gi,
        /_signature.*?=/gi,
        /sign.*?algorithm/gi,
        /crypto.*?sign/gi
      ],
      xBogus: [
        /x-bogus/gi,
        /X-Bogus/gi,
        /bogus.*?generate/gi,
        /anti.*?bot/gi
      ],
      navigator: [
        /navigator.*?fingerprint/gi,
        /user.*?agent/gi,
        /browser.*?detect/gi,
        /device.*?info/gi
      ],
      webSocket: [
        /websocket.*?url/gi,
        /ws.*?connect/gi,
        /live.*?stream/gi,
        /webcast.*?im/gi
      ]
    };
  }

  /**
   * Fetch TikTok web client content
   */
  async fetchWebClient(url) {
    try {
      this.logger.info('Fetching TikTok web client', { url });
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000,
        maxRedirects: 5
      });

      return {
        url: url,
        content: response.data,
        headers: response.headers,
        timestamp: new Date().toISOString(),
        contentHash: crypto.createHash('md5').update(response.data).digest('hex'),
        contentLength: response.data.length
      };
      
    } catch (error) {
      this.logger.error('Failed to fetch web client', { url, error: error.message });
      return {
        url: url,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract JavaScript files from HTML content
   */
  extractJavaScriptFiles(htmlContent) {
    const jsFiles = [];
    
    // Extract inline JavaScript
    const inlineScriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let inlineMatch;
    let inlineIndex = 0;
    
    while ((inlineMatch = inlineScriptRegex.exec(htmlContent)) !== null) {
      if (inlineMatch[1].trim().length > 100) { // Only significant scripts
        jsFiles.push({
          type: 'inline',
          index: inlineIndex++,
          content: inlineMatch[1],
          hash: crypto.createHash('md5').update(inlineMatch[1]).digest('hex')
        });
      }
    }

    // Extract external JavaScript files
    const externalScriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let externalMatch;
    
    while ((externalMatch = externalScriptRegex.exec(htmlContent)) !== null) {
      jsFiles.push({
        type: 'external',
        src: externalMatch[1],
        hash: null // Will be fetched separately
      });
    }

    return jsFiles;
  }

  /**
   * Analyze JavaScript content for algorithm patterns
   */
  analyzeJavaScriptContent(jsContent) {
    const analysis = {
      timestamp: new Date().toISOString(),
      contentHash: crypto.createHash('md5').update(jsContent).digest('hex'),
      contentLength: jsContent.length,
      patterns: {},
      functions: [],
      variables: [],
      suspiciousCode: []
    };

    // Search for algorithm patterns
    for (const [category, patterns] of Object.entries(this.algorithmPatterns)) {
      analysis.patterns[category] = [];
      
      for (const pattern of patterns) {
        const matches = jsContent.match(pattern);
        if (matches) {
          analysis.patterns[category].push({
            pattern: pattern.toString(),
            matches: matches.length,
            examples: matches.slice(0, 3) // First 3 matches
          });
        }
      }
    }

    // Extract function definitions
    const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/g;
    let funcMatch;
    
    while ((funcMatch = functionRegex.exec(jsContent)) !== null) {
      const funcName = funcMatch[1];
      if (this.isSuspiciousFunction(funcName)) {
        analysis.functions.push({
          name: funcName,
          position: funcMatch.index,
          suspicious: true
        });
      }
    }

    // Extract variable assignments
    const varRegex = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
    let varMatch;
    
    while ((varMatch = varRegex.exec(jsContent)) !== null) {
      const varName = varMatch[1];
      if (this.isSuspiciousVariable(varName)) {
        analysis.variables.push({
          name: varName,
          position: varMatch.index,
          suspicious: true
        });
      }
    }

    // Look for obfuscated or suspicious code patterns
    analysis.suspiciousCode = this.detectSuspiciousCode(jsContent);

    return analysis;
  }

  /**
   * Compare two JavaScript analyses for changes
   */
  compareJavaScriptAnalyses(oldAnalysis, newAnalysis) {
    const comparison = {
      timestamp: new Date().toISOString(),
      contentChanged: oldAnalysis.contentHash !== newAnalysis.contentHash,
      sizeChange: newAnalysis.contentLength - oldAnalysis.contentLength,
      patternChanges: {},
      functionChanges: {
        added: [],
        removed: [],
        modified: []
      },
      variableChanges: {
        added: [],
        removed: []
      },
      suspiciousChanges: [],
      algorithmChangeIndicators: []
    };

    // Compare patterns
    for (const category of Object.keys(this.algorithmPatterns)) {
      const oldPatterns = oldAnalysis.patterns[category] || [];
      const newPatterns = newAnalysis.patterns[category] || [];
      
      comparison.patternChanges[category] = {
        oldCount: oldPatterns.reduce((sum, p) => sum + p.matches, 0),
        newCount: newPatterns.reduce((sum, p) => sum + p.matches, 0),
        changed: JSON.stringify(oldPatterns) !== JSON.stringify(newPatterns)
      };
      
      // Significant pattern changes indicate algorithm changes
      const countDiff = comparison.patternChanges[category].newCount - comparison.patternChanges[category].oldCount;
      if (Math.abs(countDiff) > 5) {
        comparison.algorithmChangeIndicators.push({
          type: 'pattern_count_change',
          category: category,
          change: countDiff,
          significance: 'high'
        });
      }
    }

    // Compare functions
    const oldFunctions = new Set(oldAnalysis.functions.map(f => f.name));
    const newFunctions = new Set(newAnalysis.functions.map(f => f.name));
    
    comparison.functionChanges.added = [...newFunctions].filter(f => !oldFunctions.has(f));
    comparison.functionChanges.removed = [...oldFunctions].filter(f => !newFunctions.has(f));
    
    // New suspicious functions indicate algorithm changes
    if (comparison.functionChanges.added.length > 0) {
      comparison.algorithmChangeIndicators.push({
        type: 'new_functions',
        functions: comparison.functionChanges.added,
        significance: 'medium'
      });
    }

    // Compare suspicious code
    const oldSuspicious = oldAnalysis.suspiciousCode.length;
    const newSuspicious = newAnalysis.suspiciousCode.length;
    
    if (newSuspicious > oldSuspicious) {
      comparison.algorithmChangeIndicators.push({
        type: 'increased_obfuscation',
        change: newSuspicious - oldSuspicious,
        significance: 'high'
      });
    }

    return comparison;
  }

  /**
   * Monitor web client changes
   */
  async monitorWebClientChanges() {
    this.logger.info('Starting TikTok web client monitoring...');
    
    const monitoringResults = {
      timestamp: new Date().toISOString(),
      urls: [],
      overallChanges: false,
      algorithmChangeDetected: false,
      changeIndicators: []
    };

    for (const url of this.monitorUrls) {
      try {
        // Fetch current web client
        const currentClient = await this.fetchWebClient(url);
        
        if (currentClient.error) {
          monitoringResults.urls.push({
            url: url,
            error: currentClient.error,
            status: 'failed'
          });
          continue;
        }

        // Load cached version
        const cacheFile = path.join(this.cacheDir, this.urlToFilename(url) + '.json');
        const cachedClient = this.loadCachedClient(cacheFile);

        const urlResult = {
          url: url,
          status: 'analyzed',
          contentChanged: false,
          jsFiles: [],
          changes: null
        };

        // Extract and analyze JavaScript
        const jsFiles = this.extractJavaScriptFiles(currentClient.content);
        urlResult.jsFiles = jsFiles.map(js => ({
          type: js.type,
          hash: js.hash,
          size: js.content?.length || 0
        }));

        // Analyze each JavaScript file
        for (const jsFile of jsFiles) {
          if (jsFile.content) {
            const analysis = this.analyzeJavaScriptContent(jsFile.content);
            
            // Compare with cached version if available
            if (cachedClient && cachedClient.jsAnalyses) {
              const cachedAnalysis = cachedClient.jsAnalyses.find(ca => 
                ca.type === jsFile.type && ca.index === jsFile.index
              );
              
              if (cachedAnalysis) {
                const comparison = this.compareJavaScriptAnalyses(cachedAnalysis, analysis);
                
                if (comparison.contentChanged) {
                  urlResult.contentChanged = true;
                  monitoringResults.overallChanges = true;
                  
                  // Check for algorithm change indicators
                  if (comparison.algorithmChangeIndicators.length > 0) {
                    monitoringResults.algorithmChangeDetected = true;
                    monitoringResults.changeIndicators.push(...comparison.algorithmChangeIndicators);
                  }
                  
                  urlResult.changes = comparison;
                }
              }
            }
            
            // Store analysis for future comparison
            jsFile.analysis = analysis;
          }
        }

        // Cache current version
        const cacheData = {
          timestamp: currentClient.timestamp,
          contentHash: currentClient.contentHash,
          jsAnalyses: jsFiles.filter(js => js.analysis).map(js => ({
            type: js.type,
            index: js.index,
            ...js.analysis
          }))
        };
        
        this.saveCachedClient(cacheFile, cacheData);
        
        monitoringResults.urls.push(urlResult);
        
      } catch (error) {
        this.logger.error('Failed to monitor URL', { url, error: error.message });
        monitoringResults.urls.push({
          url: url,
          error: error.message,
          status: 'failed'
        });
      }
    }

    // Save monitoring results
    const resultsFile = path.join(this.analysisDir, `monitoring-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(monitoringResults, null, 2));

    this.logger.info('Web client monitoring completed', {
      urlsMonitored: monitoringResults.urls.length,
      changesDetected: monitoringResults.overallChanges,
      algorithmChanges: monitoringResults.algorithmChangeDetected
    });

    return monitoringResults;
  }

  /**
   * Helper methods
   */

  isSuspiciousFunction(funcName) {
    const suspiciousPatterns = [
      /sign/i, /crypto/i, /hash/i, /encode/i, /decode/i,
      /bogus/i, /anti/i, /bot/i, /detect/i, /finger/i,
      /navigator/i, /agent/i, /device/i, /browser/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(funcName));
  }

  isSuspiciousVariable(varName) {
    const suspiciousPatterns = [
      /signature/i, /sign/i, /bogus/i, /hash/i, /key/i,
      /token/i, /auth/i, /crypto/i, /encode/i, /decode/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(varName));
  }

  detectSuspiciousCode(jsContent) {
    const suspicious = [];
    
    // Look for obfuscated code patterns
    const obfuscationPatterns = [
      { pattern: /eval\s*\(/g, type: 'eval_usage', risk: 'high' },
      { pattern: /String\.fromCharCode/g, type: 'char_code_obfuscation', risk: 'medium' },
      { pattern: /\\x[0-9a-fA-F]{2}/g, type: 'hex_encoding', risk: 'medium' },
      { pattern: /\\u[0-9a-fA-F]{4}/g, type: 'unicode_encoding', risk: 'medium' },
      { pattern: /atob\s*\(/g, type: 'base64_decode', risk: 'medium' },
      { pattern: /btoa\s*\(/g, type: 'base64_encode', risk: 'medium' }
    ];

    for (const { pattern, type, risk } of obfuscationPatterns) {
      const matches = jsContent.match(pattern);
      if (matches && matches.length > 5) { // Threshold for suspicion
        suspicious.push({
          type: type,
          count: matches.length,
          risk: risk
        });
      }
    }

    return suspicious;
  }

  urlToFilename(url) {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  loadCachedClient(cacheFile) {
    try {
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.logger.error('Failed to load cached client', { cacheFile, error: error.message });
    }
    return null;
  }

  saveCachedClient(cacheFile, data) {
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.error('Failed to save cached client', { cacheFile, error: error.message });
    }
  }

  /**
   * Generate web client monitoring report
   */
  generateMonitoringReport(monitoringResults) {
    console.log('\n📊 TikTok Web Client Monitoring Report');
    console.log('=' .repeat(60));
    console.log(`Timestamp: ${monitoringResults.timestamp}`);
    console.log(`URLs Monitored: ${monitoringResults.urls.length}`);
    console.log(`Overall Changes: ${monitoringResults.overallChanges ? '🚨 YES' : '✅ NO'}`);
    console.log(`Algorithm Changes: ${monitoringResults.algorithmChangeDetected ? '🚨 DETECTED' : '✅ NONE'}`);

    if (monitoringResults.changeIndicators.length > 0) {
      console.log('\n🚨 Algorithm Change Indicators:');
      monitoringResults.changeIndicators.forEach((indicator, index) => {
        console.log(`   ${index + 1}. ${indicator.type} (${indicator.significance} significance)`);
        if (indicator.category) {
          console.log(`      Category: ${indicator.category}`);
        }
        if (indicator.change) {
          console.log(`      Change: ${indicator.change}`);
        }
        if (indicator.functions) {
          console.log(`      Functions: ${indicator.functions.join(', ')}`);
        }
      });
    }

    console.log('\n📋 URL Analysis Results:');
    monitoringResults.urls.forEach((urlResult, index) => {
      const status = urlResult.status === 'failed' ? '❌' : 
                    urlResult.contentChanged ? '🔄' : '✅';
      console.log(`   ${status} ${urlResult.url}`);
      
      if (urlResult.error) {
        console.log(`      Error: ${urlResult.error}`);
      } else if (urlResult.jsFiles) {
        console.log(`      JS Files: ${urlResult.jsFiles.length}`);
        if (urlResult.contentChanged) {
          console.log(`      Content Changed: YES`);
        }
      }
    });

    if (monitoringResults.algorithmChangeDetected) {
      console.log('\n💡 Recommended Actions:');
      console.log('   1. Update SignTok library immediately');
      console.log('   2. Check TikTok reverse engineering communities');
      console.log('   3. Analyze specific algorithm changes');
      console.log('   4. Test signature generation with new patterns');
      console.log('   5. Implement emergency fallback procedures');
    }

    console.log('');
  }
}

// Command line interface
if (require.main === module) {
  const monitor = new TikTokWebClientMonitor();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('TikTok Web Client Monitor');
    console.log('');
    console.log('Usage:');
    console.log('  node src/analysis/tiktok-webclient-monitor.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --continuous    Run continuous monitoring (every 30 minutes)');
    console.log('  --once          Run single monitoring cycle (default)');
    console.log('  --help, -h      Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node src/analysis/tiktok-webclient-monitor.js                # Single run');
    console.log('  node src/analysis/tiktok-webclient-monitor.js --continuous   # Continuous monitoring');
    console.log('');
    console.log('This monitor detects:');
    console.log('  - Changes in TikTok web client JavaScript');
    console.log('  - New signature generation algorithms');
    console.log('  - Anti-bot measure updates');
    console.log('  - Code obfuscation changes');
    process.exit(0);
  }
  
  if (args.includes('--continuous')) {
    console.log('🔄 Starting continuous TikTok web client monitoring...');
    console.log('Press Ctrl+C to stop');
    
    const runContinuous = async () => {
      try {
        const results = await monitor.monitorWebClientChanges();
        monitor.generateMonitoringReport(results);
        
        if (results.algorithmChangeDetected) {
          console.log('🚨 ALGORITHM CHANGES DETECTED - Consider running emergency response!');
        }
      } catch (error) {
        console.error('Monitoring error:', error.message);
      }
      
      // Schedule next run in 30 minutes
      setTimeout(runContinuous, 30 * 60 * 1000);
    };
    
    runContinuous();
  } else {
    // Single run
    monitor.monitorWebClientChanges()
      .then((results) => {
        monitor.generateMonitoringReport(results);
        const exitCode = results.algorithmChangeDetected ? 1 : 0;
        process.exit(exitCode);
      })
      .catch((error) => {
        console.error('Monitoring failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = TikTokWebClientMonitor;