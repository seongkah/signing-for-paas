#!/usr/bin/env node

/**
 * TikTok Algorithm Change Detection System
 * 
 * This script continuously monitors the SignTok library for algorithm changes
 * by testing signature generation with known test cases and detecting failures.
 */

const SignatureGenerator = require('../SignatureGenerator');
const Logger = require('../Logger');
const fs = require('fs');
const path = require('path');

/**
 * Algorithm Change Monitor
 */
class AlgorithmMonitor {
  constructor() {
    this.logger = new Logger('INFO');
    this.generator = new SignatureGenerator('ERROR'); // Reduce noise
    this.testCases = [
      'https://www.tiktok.com/@test1/live',
      'https://www.tiktok.com/@test2/live', 
      'https://www.tiktok.com/@test3/live',
      'https://www.tiktok.com/@charlidamelio/live',
      'https://www.tiktok.com/@addisonre/live',
      'https://www.tiktok.com/@bellapoarch/live',
      'https://www.tiktok.com/@username/live',
      'https://www.tiktok.com/@testuser/live'
    ];
    this.alertThreshold = 2; // Alert if 2+ test cases fail (improved sensitivity)
    this.historyFile = path.join(__dirname, 'algorithm-history.json');
    this.lastKnownGood = null;
  }

  /**
   * Load historical data
   */
  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        const history = JSON.parse(data);
        this.lastKnownGood = history.lastKnownGood;
        return history;
      }
    } catch (error) {
      this.logger.warn('Failed to load history file', { error: error.message });
    }
    return { tests: [], lastKnownGood: null };
  }

  /**
   * Save test results to history
   */
  saveHistory(testResult) {
    try {
      const history = this.loadHistory();
      history.tests = history.tests || [];
      history.tests.push(testResult);
      
      // Keep only last 100 test results
      if (history.tests.length > 100) {
        history.tests = history.tests.slice(-100);
      }
      
      // Update last known good if this test was successful
      if (testResult.overallSuccess) {
        history.lastKnownGood = testResult;
      }
      
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      this.logger.error('Failed to save history', { error: error.message });
    }
  }

  /**
   * Test signature generation with a single URL
   */
  async testSingleSignature(url) {
    const startTime = Date.now();
    
    try {
      const result = this.generator.generateSignature(url);
      const responseTime = Date.now() - startTime;
      
      if (result.success) {
        // Enhanced validation for signature format changes
        const validationResult = this.validateSignatureFormat(result.data);
        
        return {
          url: url,
          success: validationResult.valid,
          responseTime: responseTime,
          signature: result.data.signature?.substring(0, 20) + '...',
          xBogus: result.data['X-Bogus']?.substring(0, 20) + '...',
          error: validationResult.valid ? null : validationResult.error,
          formatIssues: validationResult.issues,
          rawData: result.data // Store for format analysis
        };
      } else {
        return {
          url: url,
          success: false,
          responseTime: responseTime,
          signature: null,
          xBogus: null,
          error: result.error,
          formatIssues: []
        };
      }
    } catch (error) {
      return {
        url: url,
        success: false,
        responseTime: Date.now() - startTime,
        signature: null,
        xBogus: null,
        error: error.message,
        formatIssues: []
      };
    }
  }

  /**
   * Validate signature format for algorithm changes
   */
  validateSignatureFormat(data) {
    const issues = [];
    let valid = true;

    // Check for required fields
    if (!data.signature) {
      issues.push('Missing signature field');
      valid = false;
    }

    if (!data['X-Bogus']) {
      issues.push('Missing X-Bogus parameter');
      valid = false;
    }

    if (!data.signed_url) {
      issues.push('Missing signed_url field');
      valid = false;
    }

    // Check signature format patterns
    if (data.signature) {
      // Check for simulation markers (indicates test scenario)
      if (data.signature.includes('SIM_') || data.signature.includes('_CHANGED')) {
        issues.push('Signature format appears modified (contains simulation markers)');
        valid = false;
      }

      // Check signature length (typical TikTok signatures are 40-60 chars)
      if (data.signature.length < 20 || data.signature.length > 100) {
        issues.push(`Unusual signature length: ${data.signature.length} characters`);
        valid = false;
      }
    }

    // Check X-Bogus format
    if (data['X-Bogus']) {
      if (data['X-Bogus'].includes('MODIFIED_') || data['X-Bogus'].includes('SIM_')) {
        issues.push('X-Bogus parameter appears modified');
        valid = false;
      }
    }

    // Check signed URL format
    if (data.signed_url) {
      if (data.signed_url.includes('simulated_change=true')) {
        issues.push('Signed URL contains simulation parameters');
        valid = false;
      }

      // Check for missing X-Bogus in URL
      if (!data.signed_url.includes('X-Bogus=')) {
        issues.push('X-Bogus parameter missing from signed URL');
        valid = false;
      }
    }

    // Check navigator data if present
    if (data.navigator) {
      if (data.navigator.user_agent === 'SIMULATED_CHANGED_USER_AGENT' ||
          data.navigator.browser_name === 'SimulatedBrowser') {
        issues.push('Navigator fingerprint appears modified');
        valid = false;
      }
    }

    return {
      valid: valid,
      issues: issues,
      error: issues.length > 0 ? issues.join('; ') : null
    };
  }

  /**
   * Run comprehensive algorithm test
   */
  async runAlgorithmTest() {
    this.logger.info('Starting algorithm change detection test');
    
    const testResult = {
      timestamp: new Date().toISOString(),
      testCases: [],
      successCount: 0,
      failureCount: 0,
      overallSuccess: false,
      averageResponseTime: 0,
      algorithmChangeDetected: false,
      alerts: []
    };

    // Test SignatureGenerator initialization
    if (!this.generator.isReady()) {
      testResult.alerts.push({
        level: 'CRITICAL',
        message: 'SignatureGenerator failed to initialize',
        details: this.generator.getInitError()?.message
      });
      testResult.algorithmChangeDetected = true;
      return testResult;
    }

    // Test each URL
    const responseTimes = [];
    
    for (const url of this.testCases) {
      const result = await this.testSingleSignature(url);
      testResult.testCases.push(result);
      responseTimes.push(result.responseTime);
      
      if (result.success) {
        testResult.successCount++;
      } else {
        testResult.failureCount++;
        
        // Log failure details
        this.logger.warn('Signature generation failed', {
          url: url,
          error: result.error,
          responseTime: result.responseTime
        });
      }
    }

    // Calculate metrics
    testResult.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    testResult.overallSuccess = testResult.failureCount < this.alertThreshold;

    // Detect algorithm changes
    if (testResult.failureCount >= this.alertThreshold) {
      testResult.algorithmChangeDetected = true;
      testResult.alerts.push({
        level: 'CRITICAL',
        message: `Algorithm change detected: ${testResult.failureCount}/${this.testCases.length} test cases failed`,
        details: `Failure threshold (${this.alertThreshold}) exceeded`
      });
    }

    // Check for format issues (signature format changes, X-Bogus issues, etc.)
    const formatIssueCount = testResult.testCases.filter(tc => tc.formatIssues && tc.formatIssues.length > 0).length;
    if (formatIssueCount >= this.alertThreshold) {
      testResult.algorithmChangeDetected = true;
      testResult.alerts.push({
        level: 'HIGH',
        message: `Signature format changes detected: ${formatIssueCount}/${this.testCases.length} test cases have format issues`,
        details: `Format validation threshold (${this.alertThreshold}) exceeded`
      });
    }

    // Performance degradation detection
    if (this.lastKnownGood && testResult.averageResponseTime > this.lastKnownGood.averageResponseTime * 2) {
      testResult.algorithmChangeDetected = true;
      testResult.alerts.push({
        level: 'WARNING',
        message: 'Significant performance degradation detected',
        details: `Response time increased from ${this.lastKnownGood.averageResponseTime.toFixed(0)}ms to ${testResult.averageResponseTime.toFixed(0)}ms`
      });
    }

    // Pattern analysis
    const errorPatterns = this.analyzeErrorPatterns(testResult.testCases);
    if (errorPatterns.length > 0) {
      testResult.alerts.push({
        level: 'INFO',
        message: 'Error patterns detected',
        details: errorPatterns.join(', ')
      });
    }

    return testResult;
  }

  /**
   * Analyze error patterns to identify algorithm changes
   */
  analyzeErrorPatterns(testCases) {
    const patterns = [];
    const errors = testCases.filter(tc => !tc.success).map(tc => tc.error);
    
    // Common error patterns that indicate algorithm changes
    const algorithmChangeIndicators = [
      'Invalid signature format',
      'X-Bogus generation failed',
      'Navigator fingerprint rejected',
      'Signature validation failed',
      'Anti-bot detection triggered',
      'WebSocket handshake failed',
      'Missing signature field',
      'Missing X-Bogus parameter',
      'Signature format appears modified',
      'X-Bogus parameter appears modified',
      'Navigator fingerprint appears modified'
    ];

    for (const indicator of algorithmChangeIndicators) {
      const matchingErrors = errors.filter(error => error && error.includes(indicator));
      if (matchingErrors.length > 0) {
        patterns.push(`${indicator} (${matchingErrors.length} cases)`);
      }
    }

    // Analyze format issues separately
    const formatIssues = [];
    testCases.forEach(tc => {
      if (tc.formatIssues && tc.formatIssues.length > 0) {
        tc.formatIssues.forEach(issue => {
          if (!formatIssues.includes(issue)) {
            formatIssues.push(issue);
          }
        });
      }
    });

    if (formatIssues.length > 0) {
      patterns.push(`Format issues detected: ${formatIssues.join(', ')}`);
    }

    return patterns;
  }

  /**
   * Send alerts for algorithm changes
   */
  async sendAlerts(testResult) {
    for (const alert of testResult.alerts) {
      this.logger.error('ALGORITHM ALERT', {
        level: alert.level,
        message: alert.message,
        details: alert.details,
        timestamp: testResult.timestamp,
        successRate: `${testResult.successCount}/${this.testCases.length}`
      });

      // In a production environment, you would send these alerts via:
      // - Slack webhook
      // - Email notifications  
      // - SMS alerts
      // - Dashboard updates
      // - PagerDuty/OpsGenie

      if (alert.level === 'CRITICAL') {
        await this.sendCriticalAlert(alert, testResult);
      }
    }
  }

  /**
   * Send critical alert (implement with your alerting system)
   */
  async sendCriticalAlert(alert, testResult) {
    // Example implementation - replace with your alerting system
    console.log('\n🚨 CRITICAL ALGORITHM ALERT 🚨');
    console.log('=' .repeat(60));
    console.log(`Time: ${testResult.timestamp}`);
    console.log(`Message: ${alert.message}`);
    console.log(`Details: ${alert.details}`);
    console.log(`Success Rate: ${testResult.successCount}/${this.testCases.length}`);
    console.log(`Average Response Time: ${testResult.averageResponseTime.toFixed(0)}ms`);
    console.log('');
    console.log('Immediate Actions Required:');
    console.log('1. Check SignTok library for updates');
    console.log('2. Review TikTok web client changes');
    console.log('3. Activate backup signing providers');
    console.log('4. Notify development team');
    console.log('=' .repeat(60));

    // TODO: Implement actual alerting
    // await this.sendSlackAlert(alert, testResult);
    // await this.sendEmailAlert(alert, testResult);
    // await this.updateStatusPage(alert, testResult);
  }

  /**
   * Generate monitoring report
   */
  generateReport(testResult) {
    console.log('\n📊 Algorithm Monitoring Report');
    console.log('=' .repeat(50));
    console.log(`Timestamp: ${testResult.timestamp}`);
    console.log(`Overall Status: ${testResult.overallSuccess ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
    console.log(`Success Rate: ${testResult.successCount}/${this.testCases.length} (${((testResult.successCount / this.testCases.length) * 100).toFixed(1)}%)`);
    console.log(`Average Response Time: ${testResult.averageResponseTime.toFixed(0)}ms`);
    console.log(`Algorithm Change Detected: ${testResult.algorithmChangeDetected ? '🚨 YES' : '✅ NO'}`);
    
    if (testResult.alerts.length > 0) {
      console.log(`\n🚨 Alerts (${testResult.alerts.length}):`);
      testResult.alerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. [${alert.level}] ${alert.message}`);
        if (alert.details) {
          console.log(`      Details: ${alert.details}`);
        }
      });
    }

    console.log('\n📋 Test Case Results:');
    testResult.testCases.forEach((testCase, index) => {
      const status = testCase.success ? '✅' : '❌';
      console.log(`   ${status} ${testCase.url} (${testCase.responseTime}ms)`);
      if (!testCase.success) {
        console.log(`      Error: ${testCase.error}`);
      }
      if (testCase.formatIssues && testCase.formatIssues.length > 0) {
        console.log(`      Format Issues: ${testCase.formatIssues.join(', ')}`);
      }
    });

    console.log('');
  }

  /**
   * Run monitoring cycle
   */
  async runMonitoring() {
    try {
      // Load historical data
      const history = this.loadHistory();
      this.lastKnownGood = history.lastKnownGood;

      // Run algorithm test
      const testResult = await this.runAlgorithmTest();

      // Save results
      this.saveHistory(testResult);

      // Send alerts if needed
      if (testResult.alerts.length > 0) {
        await this.sendAlerts(testResult);
      }

      // Generate report
      this.generateReport(testResult);

      return testResult;
    } catch (error) {
      this.logger.error('Monitoring cycle failed', { error: error.message });
      throw error;
    }
  }
}

// Command line interface
if (require.main === module) {
  const monitor = new AlgorithmMonitor();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('TikTok Algorithm Change Detection System');
    console.log('');
    console.log('Usage:');
    console.log('  node src/monitoring/algorithm-monitor.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --continuous    Run continuous monitoring (every 5 minutes)');
    console.log('  --once          Run single monitoring cycle (default)');
    console.log('  --help, -h      Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node src/monitoring/algorithm-monitor.js                # Single test');
    console.log('  node src/monitoring/algorithm-monitor.js --continuous   # Continuous monitoring');
    console.log('');
    console.log('Cron job example (run every hour):');
    console.log('  0 * * * * cd /path/to/project && node src/monitoring/algorithm-monitor.js');
    process.exit(0);
  }
  
  if (args.includes('--continuous')) {
    console.log('🔄 Starting continuous algorithm monitoring...');
    console.log('Press Ctrl+C to stop');
    
    const runContinuous = async () => {
      try {
        await monitor.runMonitoring();
      } catch (error) {
        console.error('Monitoring error:', error.message);
      }
      
      // Schedule next run in 5 minutes
      setTimeout(runContinuous, 5 * 60 * 1000);
    };
    
    runContinuous();
  } else {
    // Single run
    monitor.runMonitoring()
      .then((result) => {
        const exitCode = result.algorithmChangeDetected ? 1 : 0;
        process.exit(exitCode);
      })
      .catch((error) => {
        console.error('Monitoring failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = AlgorithmMonitor;