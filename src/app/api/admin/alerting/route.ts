import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-wrapper';
import { alertingSystem } from '@/lib/alerting-system';

// GET /api/admin/alerting - Get alerting system status and active alerts
async function getAlertingStatus(request: NextRequest) {
  try {
    const [activeAlerts, alertRules] = await Promise.all([
      alertingSystem.getActiveAlerts(),
      alertingSystem.getAlertRules()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        activeAlerts,
        alertRules,
        summary: {
          totalActiveAlerts: activeAlerts.length,
          criticalAlerts: activeAlerts.filter(alert => alert.severity === 'CRITICAL').length,
          highAlerts: activeAlerts.filter(alert => alert.severity === 'HIGH').length,
          enabledRules: alertRules.filter(rule => rule.enabled).length,
          totalRules: alertRules.length
        }
      }
    });

  } catch (error) {
    throw error;
  }
}

// POST /api/admin/alerting - Trigger manual alert check or acknowledge alerts
async function handleAlertingAction(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, userId } = body;

    switch (action) {
      case 'check':
        // Trigger manual alert check
        await alertingSystem.checkAlerts();
        return NextResponse.json({
          success: true,
          message: 'Alert check completed'
        });

      case 'acknowledge':
        if (!alertId || !userId) {
          throw new Error('validation: alertId and userId are required for acknowledge action');
        }

        const acknowledged = await alertingSystem.acknowledgeAlert(alertId, userId);
        if (!acknowledged) {
          throw new Error('Failed to acknowledge alert');
        }

        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged successfully'
        });

      default:
        throw new Error('validation: Invalid action. Supported actions: check, acknowledge');
    }

  } catch (error) {
    throw error;
  }
}

// PUT /api/admin/alerting - Update alert rule configuration
async function updateAlertRule(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId, updates } = body;

    if (!ruleId) {
      throw new Error('validation: ruleId is required');
    }

    const updated = await alertingSystem.updateAlertRule(ruleId, updates);
    if (!updated) {
      throw new Error('Alert rule not found');
    }

    return NextResponse.json({
      success: true,
      message: 'Alert rule updated successfully'
    });

  } catch (error) {
    throw error;
  }
}

export const GET = withErrorHandling(getAlertingStatus, '/api/admin/alerting');
export const POST = withErrorHandling(handleAlertingAction, '/api/admin/alerting');
export const PUT = withErrorHandling(updateAlertRule, '/api/admin/alerting');