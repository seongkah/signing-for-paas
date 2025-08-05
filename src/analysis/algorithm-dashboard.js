#!/usr/bin/env node

/**
 * Algorithm Change Detection Dashboard
 * 
 * This provides a unified dashboard for monitoring and analyzing TikTok algorithm changes:
 * 1. Real-time algorithm health monitoring
 * 2. Historical trend analysis
 * 3. Change detection and alerting
 * 4. Actionable recommendations
 */

const AlgorithmChangeAnalyzer = require('./algorithm-change-analyzer');
const TikTokWebClientMonitor = require('./tiktok-webclient-monitor');
const AlgorithmMonitor = require('../monitoring/algorithm-monitor');
const Logger = require('../Logger');
const fs = require('fs');
const path = require('path');

/**
 * Algorithm Dashboard
 */
class AlgorithmDashboard {
  constructor() {
    this.logger = new Logger('INFO');
    this.analyzer = new AlgorithmChangeAnalyzer();
    this.webMonitor = new TikTokWebClientMonitor();
    this.algorithmMonitor = new AlgorithmMonitor();
    this.dashboardDir = path.join(__dirname, 'dashboard-data');
    
    if (!fs.existsSync(this.dashboardDir)) {
      fs.mkdirSync(this.dashboardDir, { recursive: true });
    }
  }

  /**
   * Generate comprehensive algorithm status dashboard
   */
  async generateDashboard() {
    console.log('🎛️  TikTok Algorithm Change Detection Dashboard');
    console.log('=' .repeat(80));
    console.log(`Generated: ${new Date().toISOString()}\n`);

    const dashboard = {
      timestamp: new Date().toISOString(),
      sections: {},
      overallStatus: 'unknown',
      criticalAlerts: [],
      recommendations: []
    };

    try {
      // Section 1: Current Algorithm Health
      console.log('📊 Section 1: Current Algorithm Health');
      console.log('-' .repeat(50));
      
      const healthStatus = await this.getAlgorithmHealth();
      dashboard.sections.health = healthStatus;
      this.displayHealthStatus(healthStatus);

      // Section 2: Recent Changes Analysis
      console.log('\n🔍 Section 2: Recent Changes Analysis');
      console.log('-' .repeat(50));
      
      const changesAnalysis = await this.getRecentChanges();
      dashboard.sections.changes = changesAnalysis;
      this.displayChangesAnalysis(changesAnalysis);

      // Section 3: Web Client Monitoring
      console.log('\n🌐 Section 3: Web Client Monitoring');
      console.log('-' .repeat(50));
      
      const webClientStatus = await this.getWebClientStatus();
      dashboard.sections.webClient = webClientStatus;
      this.displayWebClientStatus(webClientStatus);

      // Section 4: Historical Trends
      console.log('\n📈 Section 4: Historical Trends');
      console.log('-' .repeat(50));
      
      const trends = await this.getHistoricalTrends();
      dashboard.sections.trends = trends;
      this.displayTrends(trends);

      // Section 5: Predictive Analysis
      console.log('\n🔮 Section 5: Predictive Analysis');
      console.log('-' .repeat(50));
      
      const predictions = await this.getPredictiveAnalysis();
      dashboard.sections.predictions = predictions;
      this.displayPredictions(predictions);

      // Overall Assessment
      const assessment = this.generateOverallAssessment(dashboard.sections);
      dashboard.overallStatus = assessment.status;
      dashboard.criticalAlerts = assessment.alerts;
      dashboard.recommendations = assessment.recommendations;

      console.log('\n🎯 Overall Assessment');
      console.log('-' .repeat(50));
      this.displayOverallAssessment(assessment);

      // Save dashboard data
      const dashboardFile = path.join(this.dashboardDir, `dashboard-${Date.now()}.json`);
      fs.writeFileSync(dashboardFile, JSON.stringify(dashboard, null, 2));

      return dashboard;

    } catch (error) {
      this.logger.error('Dashboard generation failed', { error: error.message });
      dashboard.error = error.message;
      return dashboard;
    }
  }

  /**
   * Get current algorithm health status
   */
  async getAlgorithmHealth() {
    try {
      const testResult = await this.algorithmMonitor.runAlgorithmTest();
      
      const health = {
        timestamp: new Date().toISOString(),
        overallHealthy: !testResult.algorithmChangeDetected,
        successRate: (testResult.successCount / testResult.testCases.length) * 100,
        averageResponseTime: testResult.averageResponseTime,
        alerts: testResult.alerts,
        testResults: testResult.testCases.map(tc => ({
          url: tc.url,
          success: tc.success,
          responseTime: tc.responseTime,
          error: tc.error
        }))
      };

      return health;
    } catch (error) {
      return {
        error: error.message,
        overallHealthy: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get recent algorithm changes analysis
   */
  async getRecentChanges() {
    try {
      // Check if baseline exists
      const baselineExists = fs.existsSync(path.join(this.analyzer.analysisDir, 'baseline-signatures.json'));
      
      if (!baselineExists) {
        return {
          status: 'no_baseline',
          message: 'No baseline found - run baseline creation first',
          recommendation: 'Create baseline with: node src/analysis/algorithm-change-analyzer.js baseline'
        };
      }

      const analysis = await this.analyzer.analyzeAlgorithmChanges();
      
      return {
        status: 'analyzed',
        changesDetected: analysis.changesDetected,
        changeTypes: analysis.changeTypes,
        affectedComponents: analysis.affectedComponents,
        recommendations: analysis.recommendations,
        comparison: analysis.comparison
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get web client monitoring status
   */
  async getWebClientStatus() {
    try {
      const monitoringResults = await this.webMonitor.monitorWebClientChanges();
      
      return {
        status: 'monitored',
        overallChanges: monitoringResults.overallChanges,
        algorithmChangeDetected: monitoringResults.algorithmChangeDetected,
        changeIndicators: monitoringResults.changeIndicators,
        urlsMonitored: monitoringResults.urls.length,
        urlsChanged: monitoringResults.urls.filter(u => u.contentChanged).length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get historical trends
   */
  async getHistoricalTrends() {
    try {
      const historyFile = path.join(this.algorithmMonitor.historyFile);
      
      if (!fs.existsSync(historyFile)) {
        return {
          status: 'no_history',
          message: 'No historical data available'
        };
      }

      const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      const tests = historyData.tests || [];
      
      if (tests.length < 2) {
        return {
          status: 'insufficient_data',
          message: 'Need more historical data for trend analysis'
        };
      }

      // Analyze trends
      const recentTests = tests.slice(-10); // Last 10 tests
      const successRates = recentTests.map(t => (t.successCount / t.testCases.length) * 100);
      const responseTimes = recentTests.map(t => t.averageResponseTime);

      const trends = {
        status: 'analyzed',
        totalTests: tests.length,
        recentTests: recentTests.length,
        successRateTrend: this.calculateTrend(successRates),
        responseTimeTrend: this.calculateTrend(responseTimes),
        recentAlerts: recentTests.reduce((sum, t) => sum + t.alerts.length, 0),
        lastKnownGood: historyData.lastKnownGood
      };

      return trends;
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get predictive analysis
   */
  async getPredictiveAnalysis() {
    try {
      const predictions = {
        status: 'analyzed',
        riskLevel: 'low',
        predictions: [],
        recommendations: []
      };

      // Analyze current patterns for prediction
      const health = await this.getAlgorithmHealth();
      const trends = await this.getHistoricalTrends();

      // Risk assessment based on current health
      if (health.successRate < 50) {
        predictions.riskLevel = 'critical';
        predictions.predictions.push('Immediate algorithm change likely');
      } else if (health.successRate < 80) {
        predictions.riskLevel = 'high';
        predictions.predictions.push('Algorithm change possible within 24 hours');
      } else if (health.averageResponseTime > 2000) {
        predictions.riskLevel = 'medium';
        predictions.predictions.push('Performance degradation may indicate upcoming changes');
      }

      // Trend-based predictions
      if (trends.status === 'analyzed') {
        if (trends.successRateTrend === 'declining') {
          predictions.predictions.push('Success rate declining - monitor closely');
          predictions.riskLevel = this.escalateRisk(predictions.riskLevel);
        }
        
        if (trends.responseTimeTrend === 'increasing') {
          predictions.predictions.push('Response times increasing - possible algorithm complexity increase');
        }
      }

      // Generate recommendations based on risk level
      switch (predictions.riskLevel) {
        case 'critical':
          predictions.recommendations = [
            'Activate emergency response procedures immediately',
            'Switch to backup providers',
            'Enable maintenance mode if necessary'
          ];
          break;
        case 'high':
          predictions.recommendations = [
            'Prepare backup providers for activation',
            'Increase monitoring frequency to every 5 minutes',
            'Alert development team'
          ];
          break;
        case 'medium':
          predictions.recommendations = [
            'Increase monitoring frequency to every 15 minutes',
            'Check for SignTok library updates',
            'Review backup provider status'
          ];
          break;
        default:
          predictions.recommendations = [
            'Continue normal monitoring',
            'Maintain current baseline',
            'Regular backup provider health checks'
          ];
      }

      return predictions;
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Display methods for dashboard sections
   */

  displayHealthStatus(health) {
    if (health.error) {
      console.log('❌ Health check failed:', health.error);
      return;
    }

    const statusIcon = health.overallHealthy ? '✅' : '🚨';
    console.log(`${statusIcon} Overall Health: ${health.overallHealthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
    console.log(`📊 Success Rate: ${health.successRate.toFixed(1)}%`);
    console.log(`⚡ Avg Response Time: ${health.averageResponseTime?.toFixed(0) || 'N/A'}ms`);
    console.log(`🚨 Active Alerts: ${health.alerts?.length || 0}`);

    if (health.alerts && health.alerts.length > 0) {
      console.log('\nActive Alerts:');
      health.alerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. [${alert.level}] ${alert.message}`);
      });
    }

    console.log('\nTest Results Summary:');
    const successful = health.testResults?.filter(tr => tr.success).length || 0;
    const total = health.testResults?.length || 0;
    console.log(`   Successful: ${successful}/${total}`);
    
    if (health.testResults) {
      health.testResults.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        console.log(`   ${icon} ${result.url} (${result.responseTime || 0}ms)`);
      });
    }
  }

  displayChangesAnalysis(changes) {
    switch (changes.status) {
      case 'no_baseline':
        console.log('⚠️  No baseline available for comparison');
        console.log(`💡 ${changes.recommendation}`);
        break;
      case 'error':
        console.log('❌ Changes analysis failed:', changes.error);
        break;
      case 'analyzed':
        const changesIcon = changes.changesDetected ? '🚨' : '✅';
        console.log(`${changesIcon} Changes Detected: ${changes.changesDetected ? 'YES' : 'NO'}`);
        
        if (changes.changesDetected) {
          console.log(`📋 Change Types: ${changes.changeTypes.join(', ')}`);
          console.log(`🔧 Affected Components: ${changes.affectedComponents.join(', ')}`);
          
          if (changes.recommendations && changes.recommendations.length > 0) {
            console.log('\nRecommended Actions:');
            changes.recommendations.slice(0, 3).forEach((rec, index) => {
              console.log(`   ${index + 1}. [${rec.priority}] ${rec.action}`);
            });
          }
        }
        break;
    }
  }

  displayWebClientStatus(webClient) {
    switch (webClient.status) {
      case 'error':
        console.log('❌ Web client monitoring failed:', webClient.error);
        break;
      case 'monitored':
        const changesIcon = webClient.overallChanges ? '🔄' : '✅';
        const algorithmIcon = webClient.algorithmChangeDetected ? '🚨' : '✅';
        
        console.log(`${changesIcon} Content Changes: ${webClient.overallChanges ? 'DETECTED' : 'NONE'}`);
        console.log(`${algorithmIcon} Algorithm Changes: ${webClient.algorithmChangeDetected ? 'DETECTED' : 'NONE'}`);
        console.log(`📊 URLs Monitored: ${webClient.urlsMonitored}`);
        console.log(`🔄 URLs Changed: ${webClient.urlsChanged}`);
        
        if (webClient.changeIndicators && webClient.changeIndicators.length > 0) {
          console.log('\nChange Indicators:');
          webClient.changeIndicators.slice(0, 3).forEach((indicator, index) => {
            console.log(`   ${index + 1}. ${indicator.type} (${indicator.significance})`);
          });
        }
        break;
    }
  }

  displayTrends(trends) {
    switch (trends.status) {
      case 'no_history':
      case 'insufficient_data':
        console.log('⚠️ ', trends.message);
        break;
      case 'error':
        console.log('❌ Trend analysis failed:', trends.error);
        break;
      case 'analyzed':
        console.log(`📊 Total Historical Tests: ${trends.totalTests}`);
        console.log(`📈 Success Rate Trend: ${this.getTrendIcon(trends.successRateTrend)} ${trends.successRateTrend.toUpperCase()}`);
        console.log(`⚡ Response Time Trend: ${this.getTrendIcon(trends.responseTimeTrend)} ${trends.responseTimeTrend.toUpperCase()}`);
        console.log(`🚨 Recent Alerts: ${trends.recentAlerts}`);
        
        if (trends.lastKnownGood) {
          const lastGoodDate = new Date(trends.lastKnownGood.timestamp).toLocaleString();
          console.log(`✅ Last Known Good: ${lastGoodDate}`);
        }
        break;
    }
  }

  displayPredictions(predictions) {
    if (predictions.status === 'error') {
      console.log('❌ Predictive analysis failed:', predictions.error);
      return;
    }

    const riskIcon = this.getRiskIcon(predictions.riskLevel);
    console.log(`${riskIcon} Risk Level: ${predictions.riskLevel.toUpperCase()}`);
    
    if (predictions.predictions.length > 0) {
      console.log('\nPredictions:');
      predictions.predictions.forEach((prediction, index) => {
        console.log(`   ${index + 1}. ${prediction}`);
      });
    }
    
    if (predictions.recommendations.length > 0) {
      console.log('\nRecommended Actions:');
      predictions.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }

  displayOverallAssessment(assessment) {
    const statusIcon = this.getStatusIcon(assessment.status);
    console.log(`${statusIcon} System Status: ${assessment.status.toUpperCase()}`);
    
    if (assessment.alerts.length > 0) {
      console.log(`\n🚨 Critical Alerts (${assessment.alerts.length}):`);
      assessment.alerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. ${alert}`);
      });
    }
    
    if (assessment.recommendations.length > 0) {
      console.log(`\n💡 Priority Recommendations:`);
      assessment.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log(`\n📅 Next Dashboard Update: ${new Date(Date.now() + 30 * 60 * 1000).toLocaleString()}`);
  }

  /**
   * Generate overall assessment
   */
  generateOverallAssessment(sections) {
    const assessment = {
      status: 'healthy',
      alerts: [],
      recommendations: []
    };

    // Health section assessment
    if (sections.health) {
      if (sections.health.error || !sections.health.overallHealthy) {
        assessment.status = 'critical';
        assessment.alerts.push('Algorithm health check failing');
        assessment.recommendations.push('Investigate signature generation failures immediately');
      } else if (sections.health.successRate < 80) {
        assessment.status = 'degraded';
        assessment.alerts.push('Success rate below 80%');
        assessment.recommendations.push('Monitor closely for further degradation');
      }
    }

    // Changes section assessment
    if (sections.changes && sections.changes.changesDetected) {
      assessment.status = this.escalateStatus(assessment.status, 'critical');
      assessment.alerts.push('Algorithm changes detected');
      assessment.recommendations.push('Implement algorithm change mitigation procedures');
    }

    // Web client section assessment
    if (sections.webClient && sections.webClient.algorithmChangeDetected) {
      assessment.status = this.escalateStatus(assessment.status, 'critical');
      assessment.alerts.push('TikTok web client algorithm changes detected');
      assessment.recommendations.push('Update SignTok library immediately');
    }

    // Trends section assessment
    if (sections.trends && sections.trends.successRateTrend === 'declining') {
      assessment.status = this.escalateStatus(assessment.status, 'degraded');
      assessment.alerts.push('Success rate trending downward');
      assessment.recommendations.push('Prepare backup providers for activation');
    }

    // Predictions section assessment
    if (sections.predictions) {
      if (sections.predictions.riskLevel === 'critical') {
        assessment.status = 'critical';
        assessment.alerts.push('Critical risk level predicted');
        assessment.recommendations.push(...sections.predictions.recommendations);
      } else if (sections.predictions.riskLevel === 'high') {
        assessment.status = this.escalateStatus(assessment.status, 'degraded');
        assessment.recommendations.push(...sections.predictions.recommendations);
      }
    }

    // Add general recommendations
    if (assessment.status === 'healthy') {
      assessment.recommendations.push('Continue normal monitoring');
      assessment.recommendations.push('Maintain current baseline');
    }

    return assessment;
  }

  /**
   * Helper methods
   */

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-3);
    const older = values.slice(0, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'declining';
    return 'stable';
  }

  escalateRisk(currentRisk) {
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = riskLevels.indexOf(currentRisk);
    const nextIndex = Math.min(currentIndex + 1, riskLevels.length - 1);
    return riskLevels[nextIndex];
  }

  escalateStatus(currentStatus, newStatus) {
    const statusLevels = { healthy: 0, degraded: 1, critical: 2 };
    const currentLevel = statusLevels[currentStatus] || 0;
    const newLevel = statusLevels[newStatus] || 0;
    
    const maxLevel = Math.max(currentLevel, newLevel);
    return Object.keys(statusLevels).find(key => statusLevels[key] === maxLevel);
  }

  getTrendIcon(trend) {
    switch (trend) {
      case 'increasing': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  }

  getRiskIcon(risk) {
    switch (risk) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return '✅';
      default: return '❓';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }
}

// Command line interface
if (require.main === module) {
  const dashboard = new AlgorithmDashboard();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('TikTok Algorithm Change Detection Dashboard');
    console.log('');
    console.log('Usage:');
    console.log('  node src/analysis/algorithm-dashboard.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --continuous    Run continuous dashboard updates (every 30 minutes)');
    console.log('  --once          Generate single dashboard (default)');
    console.log('  --help, -h      Show this help message');
    console.log('');
    console.log('Dashboard Sections:');
    console.log('  1. Current Algorithm Health - Real-time signature generation status');
    console.log('  2. Recent Changes Analysis - Algorithm change detection');
    console.log('  3. Web Client Monitoring - TikTok JavaScript change tracking');
    console.log('  4. Historical Trends - Performance and reliability trends');
    console.log('  5. Predictive Analysis - Risk assessment and predictions');
    console.log('');
    console.log('Examples:');
    console.log('  node src/analysis/algorithm-dashboard.js                # Single dashboard');
    console.log('  node src/analysis/algorithm-dashboard.js --continuous   # Continuous updates');
    process.exit(0);
  }
  
  if (args.includes('--continuous')) {
    console.log('🔄 Starting continuous algorithm dashboard...');
    console.log('Press Ctrl+C to stop\n');
    
    const runContinuous = async () => {
      try {
        await dashboard.generateDashboard();
        console.log('\n' + '='.repeat(80));
        console.log('Next update in 30 minutes...');
        console.log('='.repeat(80));
      } catch (error) {
        console.error('Dashboard error:', error.message);
      }
      
      // Schedule next run in 30 minutes
      setTimeout(runContinuous, 30 * 60 * 1000);
    };
    
    runContinuous();
  } else {
    // Single run
    dashboard.generateDashboard()
      .then((result) => {
        const exitCode = result.overallStatus === 'critical' ? 1 : 0;
        process.exit(exitCode);
      })
      .catch((error) => {
        console.error('Dashboard generation failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = AlgorithmDashboard;