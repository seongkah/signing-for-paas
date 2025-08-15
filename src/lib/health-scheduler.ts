import { healthMonitor } from './health-monitor'
import { alertingSystem } from './alerting-system'
import { quotaMonitor } from './quota-monitor'

/**
 * Health monitoring scheduler that runs periodic checks
 */
export class HealthScheduler {
  private static instance: HealthScheduler
  private healthCheckInterval: NodeJS.Timeout | null = null
  private alertCheckInterval: NodeJS.Timeout | null = null
  private quotaCheckInterval: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {}

  public static getInstance(): HealthScheduler {
    if (!HealthScheduler.instance) {
      HealthScheduler.instance = new HealthScheduler()
    }
    return HealthScheduler.instance
  }

  /**
   * Start all monitoring services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Health scheduler is already running')
      return
    }

    console.log('Starting health monitoring scheduler...')

    try {
      // Initialize systems
      await alertingSystem.initialize()
      
      // Start periodic health checks (every 2 minutes)
      this.healthCheckInterval = setInterval(async () => {
        try {
          console.log('Running scheduled health check...')
          const healthResult = await healthMonitor.performHealthCheck()
          
          // Log overall status
          console.log(`Health check completed: ${healthResult.overall} (${healthResult.components.length} components checked)`)
          
          // Log any unhealthy components
          const unhealthyComponents = healthResult.components.filter(c => c.status === 'unhealthy')
          if (unhealthyComponents.length > 0) {
            console.warn('Unhealthy components detected:', unhealthyComponents.map(c => c.name))
          }

        } catch (error) {
          console.error('Scheduled health check failed:', error)
        }
      }, 2 * 60 * 1000) // 2 minutes

      // Start periodic alert checks (every 5 minutes)
      this.alertCheckInterval = setInterval(async () => {
        try {
          console.log('Running scheduled alert check...')
          await alertingSystem.checkAlerts()
        } catch (error) {
          console.error('Scheduled alert check failed:', error)
        }
      }, 5 * 60 * 1000) // 5 minutes

      // Start periodic quota checks (every 15 minutes)
      this.quotaCheckInterval = setInterval(async () => {
        try {
          console.log('Running scheduled quota check...')
          const quotaAlerts = await quotaMonitor.checkQuotaAlerts()
          
          if (quotaAlerts.length > 0) {
            console.warn(`Quota alerts generated: ${quotaAlerts.length}`)
            quotaAlerts.forEach(alert => {
              console.warn(`Quota Alert [${alert.severity}]: ${alert.message}`)
            })
          }

        } catch (error) {
          console.error('Scheduled quota check failed:', error)
        }
      }, 15 * 60 * 1000) // 15 minutes

      this.isRunning = true
      console.log('Health monitoring scheduler started successfully')

      // Run initial checks
      setTimeout(async () => {
        try {
          await healthMonitor.performHealthCheck()
          await alertingSystem.checkAlerts()
          await quotaMonitor.checkQuotaAlerts()
          console.log('Initial monitoring checks completed')
        } catch (error) {
          console.error('Initial monitoring checks failed:', error)
        }
      }, 5000) // Wait 5 seconds before first check

    } catch (error) {
      console.error('Failed to start health monitoring scheduler:', error)
      this.stop()
    }
  }

  /**
   * Stop all monitoring services
   */
  stop(): void {
    console.log('Stopping health monitoring scheduler...')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval)
      this.alertCheckInterval = null
    }

    if (this.quotaCheckInterval) {
      clearInterval(this.quotaCheckInterval)
      this.quotaCheckInterval = null
    }

    this.isRunning = false
    console.log('Health monitoring scheduler stopped')
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean
    healthCheckInterval: boolean
    alertCheckInterval: boolean
    quotaCheckInterval: boolean
  } {
    return {
      isRunning: this.isRunning,
      healthCheckInterval: this.healthCheckInterval !== null,
      alertCheckInterval: this.alertCheckInterval !== null,
      quotaCheckInterval: this.quotaCheckInterval !== null
    }
  }

  /**
   * Trigger manual health check
   */
  async triggerHealthCheck(): Promise<any> {
    console.log('Triggering manual health check...')
    try {
      const result = await healthMonitor.performHealthCheck()
      console.log('Manual health check completed:', result.overall)
      return result
    } catch (error) {
      console.error('Manual health check failed:', error)
      throw error
    }
  }

  /**
   * Trigger manual alert check
   */
  async triggerAlertCheck(): Promise<void> {
    console.log('Triggering manual alert check...')
    try {
      await alertingSystem.checkAlerts()
      console.log('Manual alert check completed')
    } catch (error) {
      console.error('Manual alert check failed:', error)
      throw error
    }
  }

  /**
   * Trigger manual quota check
   */
  async triggerQuotaCheck(): Promise<any[]> {
    console.log('Triggering manual quota check...')
    try {
      const alerts = await quotaMonitor.checkQuotaAlerts()
      console.log(`Manual quota check completed: ${alerts.length} alerts`)
      return alerts
    } catch (error) {
      console.error('Manual quota check failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const healthScheduler = HealthScheduler.getInstance()

// Auto-start in server environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Start scheduler after a short delay to ensure all modules are loaded
  setTimeout(() => {
    healthScheduler.start().catch(error => {
      console.error('Failed to auto-start health scheduler:', error)
    })
  }, 10000) // 10 second delay

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping health scheduler...')
    healthScheduler.stop()
  })

  process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping health scheduler...')
    healthScheduler.stop()
  })
}