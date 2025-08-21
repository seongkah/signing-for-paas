#!/usr/bin/env node

/**
 * TikTok Algorithm Change Analyzer
 * 
 * This system analyzes TikTok algorithm changes by:
 * 1. Comparing signature generation patterns before/after changes
 * 2. Analyzing TikTok web client JavaScript changes
 * 3. Identifying specific algorithm components that changed
 * 4. Providing actionable insights for fixing the signing process
 */

const SignatureGenerator = require('../SignatureGenerator');
const Logger = require('../Logger');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Algorithm Change Analyzer
 */
class AlgorithmChangeAnalyzer {
  constructor() {
    this.logger = new Logger('INFO');
    this.generator = new SignatureGenerator('ERROR');
    this.analysisDir = path.join(__dirname, 'analysis-data');
    this.baselineFile = path.join(this.analysisDir, 'baseline-signatures.json');
    this.webClientCacheFile = path.join(this.analysisDir, 'tiktok-webclient-cache.json');
    
    // Ensure analysis directory exists
    if (!fs.existsSync(this.analysisDir)) {
      fs.mkdirSync(this.analysisDir, { recursive: true });
    }
  }

  /**
   * Create baseline signature patterns when system is working
   */
  async createBaseline() {
    this.logger.info('Creating algorithm baseline...');
    
    const baseline = {
      timestamp: new Date().toISOString(),
      signaturePatterns: {},
      navigatorFingerprint: null,
      algorithmVersion: null,
      testCases: []
    };

    // Test URLs for pattern analysis
    const testUrls = [
      'https://www.tiktok.com/@test1/live',
      'https://www.tiktok.com/@test2/live',
      'https://www.tiktok.com/@charlidamelio/live',
      'https://www.tiktok.com/@addisonre/live',
      'https://www.tiktok.com/@bellapoarch/live'
    ];

    // Generate signatures for pattern analysis
    for (const url of testUrls) {
      try {
        const result = this.generator.generateSignature(url);
        
        if (result.success) {
          const analysis = this.analyzeSignatureStructure(result.data);
          baseline.testCases.push({
            url: url,
            success: true,
            signatureAnalysis: analysis,
            timestamp: new Date().toISOString()
          });
          
          // Extract patterns
          this.extractSignaturePatterns(result.data, baseline.signaturePatterns);
        } else {
          baseline.testCases.push({
            url: url,
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        this.logger.error('Baseline generation failed for URL', { url, error: error.message });
      }
    }

    // Get navigator fingerprint
    baseline.navigatorFingerprint = this.generator.getNavigator();
    
    // Detect algorithm version (if possible)
    baseline.algorithmVersion = await this.detectAlgorithmVersion();
    
    // Save baseline
    fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
    
    this.logger.info('Baseline created successfully', {
      testCases: baseline.testCases.length,
      successfulCases: baseline.testCases.filter(tc => tc.success).length
    });
    
    return baseline;
  }

  /**
   * Analyze current algorithm state and compare with baseline
   */
  async analyzeAlgorithmChanges() {
    this.logger.info('Analyzing algorithm changes...');
    
    // Load baseline
    const baseline = this.loadBaseline();
    if (!baseline) {
      throw new Error('No baseline found. Run createBaseline() first.');
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      baselineTimestamp: baseline.timestamp,
      changesDetected: false,
      changeTypes: [],
      affectedComponents: [],
      currentState: {},
      comparison: {},
      recommendations: []
    };

    // Test current signature generation
    const currentResults = [];
    for (const baselineCase of baseline.testCases) {
      if (!baselineCase.success) continue;
      
      try {
        const currentResult = this.generator.generateSignature(baselineCase.url);
        const currentAnalysis = currentResult.success 
          ? this.analyzeSignatureStructure(currentResult.data)
          : null;
        
        currentResults.push({
          url: baselineCase.url,
          success: currentResult.success,
          signatureAnalysis: currentAnalysis,
          error: currentResult.error,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        currentResults.push({
          url: baselineCase.url,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    analysis.currentState = { testCases: currentResults };

    // Compare with baseline
    analysis.comparison = this.compareWithBaseline(baseline, analysis.currentState);
    
    // Detect specific changes
    const changeDetection = this.detectSpecificChanges(baseline, analysis.currentState);
    analysis.changesDetected = changeDetection.changesDetected;
    analysis.changeTypes = changeDetection.changeTypes;
    analysis.affectedComponents = changeDetection.affectedComponents;

    // Generate recommendations
    analysis.recommendations = this.generateFixRecommendations(analysis);

    // Save analysis
    const analysisFile = path.join(this.analysisDir, `analysis-${Date.now()}.json`);
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));

    return analysis;
  }

  /**
   * Analyze TikTok web client JavaScript changes
   */
  async analyzeWebClientChanges() {
    this.logger.info('Analyzing TikTok web client changes...');
    
    try {
      // Fetch current TikTok web client
      const webClientData = await this.fetchTikTokWebClient();
      
      // Load cached version
      const cachedData = this.loadCachedWebClient();
      
      if (!cachedData) {
        // First time - cache current version
        this.cacheWebClient(webClientData);
        return {
          firstRun: true,
          message: 'Web client cached for future comparison'
        };
      }

      // Compare versions
      const comparison = this.compareWebClientVersions(cachedData, webClientData);
      
      // Update cache with new version
      this.cacheWebClient(webClientData);
      
      return comparison;
      
    } catch (error) {
      this.logger.error('Web client analysis failed', { error: error.message });
      return {
        error: error.message,
        analysis: 'Unable to fetch or analyze web client'
      };
    }
  }

  /**
   * Analyze signature structure for patterns
   */
  analyzeSignatureStructure(signatureData) {
    const analysis = {
      signature: {
        length: signatureData.signature?.length || 0,
        prefix: signatureData.signature?.substring(0, 10) || '',
        suffix: signatureData.signature?.substring(-10) || '',
        pattern: this.extractPattern(signatureData.signature)
      },
      xBogus: {
        length: signatureData['X-Bogus']?.length || 0,
        prefix: signatureData['X-Bogus']?.substring(0, 10) || '',
        suffix: signatureData['X-Bogus']?.substring(-10) || '',
        pattern: this.extractPattern(signatureData['X-Bogus'])
      },
      xTtParams: {
        present: !!signatureData['x-tt-params'],
        length: signatureData['x-tt-params']?.length || 0,
        pattern: this.extractPattern(signatureData['x-tt-params'])
      },
      navigator: {
        userAgentHash: signatureData.navigator?.user_agent 
          ? crypto.createHash('md5').update(signatureData.navigator.user_agent).digest('hex')
          : null,
        browserName: signatureData.navigator?.browser_name,
        browserVersion: signatureData.navigator?.browser_version,
        deviceScaleFactor: signatureData.navigator?.deviceScaleFactor
      },
      signedUrl: {
        parameterCount: this.countUrlParameters(signatureData.signed_url),
        hasSignature: signatureData.signed_url?.includes('_signature=') || false,
        hasXBogus: signatureData.signed_url?.includes('X-Bogus=') || false
      }
    };

    return analysis;
  }

  /**
   * Extract signature patterns for comparison
   */
  extractSignaturePatterns(signatureData, patterns) {
    // Signature patterns
    if (signatureData.signature) {
      const sig = signatureData.signature;
      patterns.signatureLength = patterns.signatureLength || [];
      patterns.signatureLength.push(sig.length);
      
      patterns.signaturePrefix = patterns.signaturePrefix || new Set();
      patterns.signaturePrefix.add(sig.substring(0, 5));
    }

    // X-Bogus patterns
    if (signatureData['X-Bogus']) {
      const xBogus = signatureData['X-Bogus'];
      patterns.xBogusLength = patterns.xBogusLength || [];
      patterns.xBogusLength.push(xBogus.length);
      
      patterns.xBogusPrefix = patterns.xBogusPrefix || new Set();
      patterns.xBogusPrefix.add(xBogus.substring(0, 5));
    }

    // Convert Sets to Arrays for JSON serialization
    if (patterns.signaturePrefix instanceof Set) {
      patterns.signaturePrefix = Array.from(patterns.signaturePrefix);
    }
    if (patterns.xBogusPrefix instanceof Set) {
      patterns.xBogusPrefix = Array.from(patterns.xBogusPrefix);
    }
  }

  /**
   * Compare current state with baseline
   */
  compareWithBaseline(baseline, currentState) {
    const comparison = {
      successRateChange: 0,
      patternChanges: [],
      structuralChanges: [],
      navigatorChanges: []
    };

    // Success rate comparison
    const baselineSuccessRate = baseline.testCases.filter(tc => tc.success).length / baseline.testCases.length;
    const currentSuccessRate = currentState.testCases.filter(tc => tc.success).length / currentState.testCases.length;
    comparison.successRateChange = currentSuccessRate - baselineSuccessRate;

    // Pattern comparison
    const baselinePatterns = baseline.signaturePatterns;
    const currentPatterns = {};
    
    currentState.testCases.forEach(tc => {
      if (tc.success && tc.signatureAnalysis) {
        this.extractSignaturePatterns({ 
          signature: 'dummy', 
          'X-Bogus': 'dummy' 
        }, currentPatterns);
      }
    });

    // Compare signature lengths
    if (baselinePatterns.signatureLength && currentPatterns.signatureLength) {
      const baselineAvgLength = baselinePatterns.signatureLength.reduce((a, b) => a + b, 0) / baselinePatterns.signatureLength.length;
      const currentAvgLength = currentPatterns.signatureLength.reduce((a, b) => a + b, 0) / currentPatterns.signatureLength.length;
      
      if (Math.abs(baselineAvgLength - currentAvgLength) > 5) {
        comparison.patternChanges.push({
          type: 'signature_length_change',
          baseline: baselineAvgLength,
          current: currentAvgLength,
          difference: currentAvgLength - baselineAvgLength
        });
      }
    }

    return comparison;
  }

  /**
   * Detect specific types of algorithm changes
   */
  detectSpecificChanges(baseline, currentState) {
    const detection = {
      changesDetected: false,
      changeTypes: [],
      affectedComponents: []
    };

    const baselineSuccessCount = baseline.testCases.filter(tc => tc.success).length;
    const currentSuccessCount = currentState.testCases.filter(tc => tc.success).length;

    // Complete failure indicates major algorithm change
    if (currentSuccessCount === 0 && baselineSuccessCount > 0) {
      detection.changesDetected = true;
      detection.changeTypes.push('complete_algorithm_change');
      detection.affectedComponents.push('signature_generation', 'x_bogus_generation');
    }

    // Partial failure indicates specific component changes
    else if (currentSuccessCount < baselineSuccessCount) {
      detection.changesDetected = true;
      detection.changeTypes.push('partial_algorithm_change');
      
      // Analyze error patterns to identify affected components
      const errors = currentState.testCases.filter(tc => !tc.success).map(tc => tc.error);
      
      if (errors.some(e => e && e.includes('signature'))) {
        detection.affectedComponents.push('signature_generation');
      }
      if (errors.some(e => e && e.includes('X-Bogus'))) {
        detection.affectedComponents.push('x_bogus_generation');
      }
      if (errors.some(e => e && e.includes('navigator'))) {
        detection.affectedComponents.push('navigator_fingerprinting');
      }
    }

    // Pattern changes indicate algorithm evolution
    const patternChanges = this.detectPatternChanges(baseline, currentState);
    if (patternChanges.length > 0) {
      detection.changesDetected = true;
      detection.changeTypes.push('pattern_evolution');
      detection.affectedComponents.push(...patternChanges);
    }

    return detection;
  }

  /**
   * Generate fix recommendations based on analysis
   */
  generateFixRecommendations(analysis) {
    const recommendations = [];

    if (analysis.changeTypes.includes('complete_algorithm_change')) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Update SignTok library immediately',
        description: 'Complete algorithm change detected - library update required',
        commands: [
          'npm update signtok',
          'Check SignTok GitHub for latest releases',
          'Monitor TikTok reverse engineering communities'
        ]
      });
    }

    if (analysis.affectedComponents.includes('signature_generation')) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Fix signature generation algorithm',
        description: 'Signature generation component has changed',
        commands: [
          'Review SignTok signature generation code',
          'Check for TikTok web client JavaScript changes',
          'Test with different signature parameters'
        ]
      });
    }

    if (analysis.affectedComponents.includes('x_bogus_generation')) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Update X-Bogus generation',
        description: 'X-Bogus parameter generation has changed',
        commands: [
          'Review X-Bogus generation algorithm',
          'Check TikTok anti-bot parameter changes',
          'Update X-Bogus calculation logic'
        ]
      });
    }

    if (analysis.affectedComponents.includes('navigator_fingerprinting')) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Update navigator fingerprinting',
        description: 'Browser fingerprinting requirements have changed',
        commands: [
          'Update navigator data generation',
          'Check browser fingerprint requirements',
          'Test with different user agent strings'
        ]
      });
    }

    if (analysis.changeTypes.includes('pattern_evolution')) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Adapt to pattern changes',
        description: 'Algorithm patterns have evolved but core logic intact',
        commands: [
          'Fine-tune signature parameters',
          'Update pattern matching logic',
          'Monitor for additional changes'
        ]
      });
    }

    // Always recommend monitoring
    recommendations.push({
      priority: 'LOW',
      action: 'Increase monitoring frequency',
      description: 'Monitor for additional changes and stability',
      commands: [
        'Run algorithm monitoring every 15 minutes',
        'Set up additional alert channels',
        'Document changes for future reference'
      ]
    });

    return recommendations;
  }

  /**
   * Helper methods
   */

  extractPattern(str) {
    if (!str) return null;
    
    return {
      length: str.length,
      hasNumbers: /\d/.test(str),
      hasLetters: /[a-zA-Z]/.test(str),
      hasSpecialChars: /[^a-zA-Z0-9]/.test(str),
      startsWithUnderscore: str.startsWith('_'),
      base64Like: /^[A-Za-z0-9+/=]+$/.test(str)
    };
  }

  countUrlParameters(url) {
    if (!url) return 0;
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.size;
    } catch {
      return 0;
    }
  }

  async detectAlgorithmVersion() {
    // Try to detect SignTok version or TikTok algorithm version
    try {
      const packageJson = require('../../package.json');
      return {
        signtokVersion: packageJson.dependencies?.signtok || 'unknown',
        detectedAt: new Date().toISOString()
      };
    } catch {
      return null;
    }
  }

  loadBaseline() {
    try {
      if (fs.existsSync(this.baselineFile)) {
        const data = fs.readFileSync(this.baselineFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.logger.error('Failed to load baseline', { error: error.message });
    }
    return null;
  }

  async fetchTikTokWebClient() {
    // In a real implementation, this would fetch TikTok's web client JavaScript
    // For demonstration, we'll simulate it
    
    const mockWebClient = {
      timestamp: new Date().toISOString(),
      version: '1.0.' + Math.floor(Math.random() * 100),
      signatureAlgorithm: 'mock_algorithm_v' + Math.floor(Math.random() * 10),
      xBogusAlgorithm: 'mock_xbogus_v' + Math.floor(Math.random() * 10),
      navigatorRequirements: ['user_agent', 'language', 'platform']
    };
    
    return mockWebClient;
  }

  loadCachedWebClient() {
    try {
      if (fs.existsSync(this.webClientCacheFile)) {
        const data = fs.readFileSync(this.webClientCacheFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.logger.error('Failed to load cached web client', { error: error.message });
    }
    return null;
  }

  cacheWebClient(webClientData) {
    try {
      fs.writeFileSync(this.webClientCacheFile, JSON.stringify(webClientData, null, 2));
    } catch (error) {
      this.logger.error('Failed to cache web client', { error: error.message });
    }
  }

  compareWebClientVersions(cached, current) {
    const comparison = {
      timestamp: new Date().toISOString(),
      versionChanged: cached.version !== current.version,
      algorithmChanges: [],
      newRequirements: [],
      recommendations: []
    };

    if (cached.signatureAlgorithm !== current.signatureAlgorithm) {
      comparison.algorithmChanges.push({
        component: 'signature_algorithm',
        old: cached.signatureAlgorithm,
        new: current.signatureAlgorithm
      });
    }

    if (cached.xBogusAlgorithm !== current.xBogusAlgorithm) {
      comparison.algorithmChanges.push({
        component: 'x_bogus_algorithm',
        old: cached.xBogusAlgorithm,
        new: current.xBogusAlgorithm
      });
    }

    // Generate recommendations based on changes
    if (comparison.algorithmChanges.length > 0) {
      comparison.recommendations.push('Update SignTok library to handle algorithm changes');
      comparison.recommendations.push('Test signature generation with new algorithms');
    }

    return comparison;
  }

  detectPatternChanges(baseline, currentState) {
    const changes = [];
    
    // Compare successful cases for pattern changes
    const baselineSuccessful = baseline.testCases.filter(tc => tc.success);
    const currentSuccessful = currentState.testCases.filter(tc => tc.success);
    
    if (baselineSuccessful.length > 0 && currentSuccessful.length > 0) {
      // Compare signature lengths
      const baselineLengths = baselineSuccessful.map(tc => tc.signatureAnalysis?.signature?.length || 0);
      const currentLengths = currentSuccessful.map(tc => tc.signatureAnalysis?.signature?.length || 0);
      
      const baselineAvg = baselineLengths.reduce((a, b) => a + b, 0) / baselineLengths.length;
      const currentAvg = currentLengths.reduce((a, b) => a + b, 0) / currentLengths.length;
      
      if (Math.abs(baselineAvg - currentAvg) > 10) {
        changes.push('signature_length_pattern');
      }
    }
    
    return changes;
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateAnalysisReport() {
    this.logger.info('Generating comprehensive algorithm analysis report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      sections: {}
    };

    try {
      // Algorithm change analysis
      report.sections.algorithmAnalysis = await this.analyzeAlgorithmChanges();
      
      // Web client analysis
      report.sections.webClientAnalysis = await this.analyzeWebClientChanges();
      
      // Generate summary
      report.summary = this.generateAnalysisSummary(report.sections);
      
      // Save report
      const reportFile = path.join(this.analysisDir, `comprehensive-analysis-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      this.logger.info('Analysis report generated', { reportFile });
      
      return report;
      
    } catch (error) {
      this.logger.error('Failed to generate analysis report', { error: error.message });
      report.error = error.message;
      return report;
    }
  }

  generateAnalysisSummary(sections) {
    const summary = {
      overallStatus: 'unknown',
      criticalIssues: 0,
      recommendedActions: [],
      nextSteps: []
    };

    // Analyze algorithm analysis section
    if (sections.algorithmAnalysis) {
      const algAnalysis = sections.algorithmAnalysis;
      
      if (algAnalysis.changesDetected) {
        summary.overallStatus = 'changes_detected';
        summary.criticalIssues += algAnalysis.changeTypes.length;
        
        algAnalysis.recommendations.forEach(rec => {
          if (rec.priority === 'CRITICAL' || rec.priority === 'HIGH') {
            summary.recommendedActions.push(rec.action);
          }
        });
      } else {
        summary.overallStatus = 'stable';
      }
    }

    // Analyze web client section
    if (sections.webClientAnalysis && sections.webClientAnalysis.algorithmChanges) {
      summary.criticalIssues += sections.webClientAnalysis.algorithmChanges.length;
      summary.recommendedActions.push(...(sections.webClientAnalysis.recommendations || []));
    }

    // Generate next steps
    if (summary.criticalIssues > 0) {
      summary.nextSteps = [
        'Implement recommended actions immediately',
        'Increase monitoring frequency',
        'Test fixes thoroughly before deployment',
        'Document changes for future reference'
      ];
    } else {
      summary.nextSteps = [
        'Continue regular monitoring',
        'Maintain current baseline',
        'Stay updated with SignTok community'
      ];
    }

    return summary;
  }
}

// Command line interface
if (require.main === module) {
  const analyzer = new AlgorithmChangeAnalyzer();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('TikTok Algorithm Change Analyzer');
    console.log('');
    console.log('Usage:');
    console.log('  node src/analysis/algorithm-change-analyzer.js [command] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  baseline    Create baseline signature patterns');
    console.log('  analyze     Analyze current algorithm vs baseline');
    console.log('  webclient   Analyze TikTok web client changes');
    console.log('  report      Generate comprehensive analysis report');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h  Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node src/analysis/algorithm-change-analyzer.js baseline');
    console.log('  node src/analysis/algorithm-change-analyzer.js analyze');
    console.log('  node src/analysis/algorithm-change-analyzer.js report');
    process.exit(0);
  }
  
  async function runCommand() {
    try {
      switch (command) {
        case 'baseline':
          console.log('🔧 Creating algorithm baseline...');
          const baseline = await analyzer.createBaseline();
          console.log('✅ Baseline created successfully');
          console.log(`Test cases: ${baseline.testCases.length}`);
          console.log(`Successful: ${baseline.testCases.filter(tc => tc.success).length}`);
          break;
          
        case 'analyze':
          console.log('🔍 Analyzing algorithm changes...');
          const analysis = await analyzer.analyzeAlgorithmChanges();
          console.log('📊 Analysis Results:');
          console.log(`Changes detected: ${analysis.changesDetected ? '🚨 YES' : '✅ NO'}`);
          console.log(`Change types: ${analysis.changeTypes.join(', ') || 'None'}`);
          console.log(`Affected components: ${analysis.affectedComponents.join(', ') || 'None'}`);
          console.log(`Recommendations: ${analysis.recommendations.length}`);
          break;
          
        case 'webclient':
          console.log('🌐 Analyzing web client changes...');
          const webAnalysis = await analyzer.analyzeWebClientChanges();
          console.log('📊 Web Client Analysis:');
          console.log(JSON.stringify(webAnalysis, null, 2));
          break;
          
        case 'report':
          console.log('📋 Generating comprehensive analysis report...');
          const report = await analyzer.generateAnalysisReport();
          console.log('✅ Report generated successfully');
          console.log(`Overall status: ${report.summary?.overallStatus || 'unknown'}`);
          console.log(`Critical issues: ${report.summary?.criticalIssues || 0}`);
          break;
          
        default:
          console.log(`Unknown command: ${command}`);
          console.log('Run with --help for usage information');
          process.exit(1);
      }
    } catch (error) {
      console.error('Command failed:', error.message);
      process.exit(1);
    }
  }
  
  runCommand();
}

module.exports = AlgorithmChangeAnalyzer;