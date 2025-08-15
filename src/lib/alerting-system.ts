import { createClient } from '@supabase/supabase-js';
import { ErrorType, ErrorSeverity } from './error-handler';

interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: ErrorSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

interface AlertCondition {
  type: 'error_rate' | 'error_count' | 'response_time' | 'consecutive_failures';
  threshold: number;
  timeWindowMinutes: number;
  errorTypes?: ErrorType[];
  endpoints?: string[];
}

interface AlertNotification {
  id: string;
  ruleId: string;
  message: string;
  severity: ErrorSeverity;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata?: any;
}

export class AlertingSystem {
  private static instance: AlertingSystem;
  private supabase: any;
  private alertRules: AlertRule[] = [];
  private isInitialized = false;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  public static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
    }
    return AlertingSystem.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load default alert rules
      this.alertRules = [
        {
          id: 'high-error-rate',
          name: 'High Error Rate',
          condition: {
            type: 'error_rate',
            threshold: 0.1, // 10% error rate
            timeWindowMinutes: 15
          },
          severity: ErrorSeverity.HIGH,
          enabled: true,
          cooldownMinutes: 30
        },
        {
          id: 'critical-errors',
          name: 'Critical Errors',
          condition: {
            type: 'error_count',
            threshold: 1, // Any critical error
            timeWindowMinutes: 5,
            errorTypes: [ErrorType.INTERNAL_SERVER_ERROR]
          },
          severity: ErrorSeverity.CRITICAL,
          enabled: true,
          cooldownMinutes: 15
        },
        {
          id: 'signature-failures',
          name: 'Signature Generation Failures',
          condition: {
            type: 'error_count',
            threshold: 5,
            timeWindowMinutes: 10,
            errorTypes: [ErrorType.SIGNATURE_GENERATION_ERROR]
          },
          severity: ErrorSeverity.HIGH,
          enabled: true,
          cooldownMinutes: 20
        },
        {
          id: 'database-errors',
          name: 'Database Connection Issues',
          condition: {
            type: 'error_count',
            threshold: 3,
            timeWindowMinutes: 5,
            errorTypes: [ErrorType.DATABASE_ERROR]
          },
          severity: ErrorSeverity.CRITICAL,
          enabled: true,
          cooldownMinutes: 10
        },
        {
          id: 'consecutive-failures',
          name: 'Consecutive API Failures',
          condition: {
            type: 'consecutive_failures',
            threshold: 10,
            timeWindowMinutes: 5
          },
          severity: ErrorSeverity.HIGH,
          enabled: true,
          cooldownMinutes: 15
        },
        {
          id: 'slow-response-time',
          name: 'Slow Response Times',
          condition: {
            type: 'response_time',
            threshold: 5000, // 5 seconds
            timeWindowMinutes: 10
          },
          severity: ErrorSeverity.MEDIUM,
          enabled: true,
          cooldownMinutes: 30
        }
      ];

      this.isInitialized = true;
      console.log('Alerting system initialized with', this.alertRules.length, 'rules');

    } catch (error) {
      console.error('Failed to initialize alerting system:', error);
    }
  }

  async checkAlerts(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000);
        if (new Date() < cooldownEnd) {
          continue; // Still in cooldown
        }
      }

      try {
        const shouldTrigger = await this.evaluateRule(rule);
        if (shouldTrigger) {
          await this.triggerAlert(rule);
          rule.lastTriggered = new Date();
        }
      } catch (error) {
        console.error(`Failed to evaluate alert rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const { condition } = rule;
    const timeWindow = new Date(Date.now() - condition.timeWindowMinutes * 60 * 1000);

    switch (condition.type) {
      case 'error_rate':
        return await this.checkErrorRate(condition, timeWindow);
      
      case 'error_count':
        return await this.checkErrorCount(condition, timeWindow);
      
      case 'consecutive_failures':
        return await this.checkConsecutiveFailures(condition);
      
      case 'response_time':
        return await this.checkResponseTime(condition, timeWindow);
      
      default:
        return false;
    }
  }

  private async checkErrorRate(condition: AlertCondition, timeWindow: Date): Promise<boolean> {
    try {
      // Get total requests
      const { count: totalRequests } = await this.supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', timeWindow.toISOString());

      if (!totalRequests || totalRequests === 0) return false;

      // Get error requests
      const { count: errorRequests } = await this.supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('success', false)
        .gte('created_at', timeWindow.toISOString());

      const errorRate = (errorRequests || 0) / totalRequests;
      return errorRate >= condition.threshold;

    } catch (error) {
      console.error('Error checking error rate:', error);
      return false;
    }
  }

  private async checkErrorCount(condition: AlertCondition, timeWindow: Date): Promise<boolean> {
    try {
      let query = this.supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', timeWindow.toISOString());

      if (condition.errorTypes && condition.errorTypes.length > 0) {
        query = query.in('type', condition.errorTypes);
      }

      if (condition.endpoints && condition.endpoints.length > 0) {
        query = query.in('endpoint', condition.endpoints);
      }

      const { count } = await query;
      return (count || 0) >= condition.threshold;

    } catch (error) {
      console.error('Error checking error count:', error);
      return false;
    }
  }

  private async checkConsecutiveFailures(condition: AlertCondition): Promise<boolean> {
    try {
      const { data: recentLogs } = await this.supabase
        .from('usage_logs')
        .select('success, created_at')
        .order('created_at', { ascending: false })
        .limit(condition.threshold);

      if (!recentLogs || recentLogs.length < condition.threshold) return false;

      // Check if all recent requests failed
      return recentLogs.every((log: any) => !log.success);

    } catch (error) {
      console.error('Error checking consecutive failures:', error);
      return false;
    }
  }

  private async checkResponseTime(condition: AlertCondition, timeWindow: Date): Promise<boolean> {
    try {
      const { data: logs } = await this.supabase
        .from('usage_logs')
        .select('response_time_ms')
        .gte('created_at', timeWindow.toISOString())
        .not('response_time_ms', 'is', null);

      if (!logs || logs.length === 0) return false;

      const avgResponseTime = logs.reduce((sum: number, log: any) => sum + log.response_time_ms, 0) / logs.length;
      return avgResponseTime >= condition.threshold;

    } catch (error) {
      console.error('Error checking response time:', error);
      return false;
    }
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    try {
      const alertMessage = await this.generateAlertMessage(rule);
      
      const notification: Omit<AlertNotification, 'id'> = {
        ruleId: rule.id,
        message: alertMessage,
        severity: rule.severity,
        triggeredAt: new Date(),
        acknowledged: false,
        metadata: {
          ruleName: rule.name,
          condition: rule.condition
        }
      };

      // Store alert in database
      const { error } = await this.supabase
        .from('error_alerts')
        .insert({
          error_type: `ALERT_${rule.id.toUpperCase()}`,
          severity: rule.severity,
          message: alertMessage,
          acknowledged: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to store alert:', error);
        return;
      }

      // Log alert
      console.error(`🚨 ALERT TRIGGERED: ${rule.name}`, {
        severity: rule.severity,
        message: alertMessage,
        rule: rule.id
      });

      // Send notifications (implement based on your needs)
      await this.sendNotifications(notification);

    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  private async generateAlertMessage(rule: AlertRule): Promise<string> {
    const { condition } = rule;
    
    switch (condition.type) {
      case 'error_rate':
        return `Error rate exceeded ${(condition.threshold * 100).toFixed(1)}% in the last ${condition.timeWindowMinutes} minutes`;
      
      case 'error_count':
        const errorTypes = condition.errorTypes ? condition.errorTypes.join(', ') : 'all types';
        return `${condition.threshold} or more errors of type(s) ${errorTypes} occurred in the last ${condition.timeWindowMinutes} minutes`;
      
      case 'consecutive_failures':
        return `${condition.threshold} consecutive API failures detected`;
      
      case 'response_time':
        return `Average response time exceeded ${condition.threshold}ms in the last ${condition.timeWindowMinutes} minutes`;
      
      default:
        return `Alert condition met for rule: ${rule.name}`;
    }
  }

  private async sendNotifications(notification: Omit<AlertNotification, 'id'>): Promise<void> {
    // Implement notification sending based on your requirements
    // Examples:
    
    // 1. Email notifications
    // await this.sendEmailAlert(notification);
    
    // 2. Slack/Discord webhooks
    // await this.sendSlackAlert(notification);
    
    // 3. SMS alerts for critical issues
    // if (notification.severity === ErrorSeverity.CRITICAL) {
    //   await this.sendSMSAlert(notification);
    // }
    
    // 4. Push notifications
    // await this.sendPushNotification(notification);

    // For now, just log the notification
    console.log('📢 Alert notification:', {
      severity: notification.severity,
      message: notification.message,
      triggeredAt: notification.triggeredAt
    });
  }

  // Public methods for managing alerts
  async getActiveAlerts(): Promise<AlertNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('error_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((alert: any) => ({
        id: alert.id,
        ruleId: alert.error_type,
        message: alert.message,
        severity: alert.severity,
        triggeredAt: new Date(alert.created_at),
        acknowledged: alert.acknowledged,
        acknowledgedBy: alert.acknowledged_by,
        acknowledgedAt: alert.acknowledged_at ? new Date(alert.acknowledged_at) : undefined
      }));

    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('error_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      return !error;

    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return [...this.alertRules];
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean> {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return false;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    return true;
  }
}

// Export singleton instance
export const alertingSystem = AlertingSystem.getInstance();

// Auto-initialize and start periodic checks
if (typeof window === 'undefined') { // Server-side only
  alertingSystem.initialize().then(() => {
    // Check alerts every 5 minutes
    setInterval(() => {
      alertingSystem.checkAlerts().catch(error => {
        console.error('Alert check failed:', error);
      });
    }, 5 * 60 * 1000);
  });
}