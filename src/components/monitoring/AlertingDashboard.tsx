'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: string;
  cooldownMinutes: number;
  condition: {
    type: string;
    threshold: number;
    timeWindowMinutes: number;
  };
}

interface ActiveAlert {
  id: string;
  ruleId: string;
  message: string;
  severity: string;
  triggeredAt: string;
  acknowledged: boolean;
}

interface AlertingSummary {
  totalActiveAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  enabledRules: number;
  totalRules: number;
}

export default function AlertingDashboard() {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [summary, setSummary] = useState<AlertingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlertingData();
  }, []);

  const fetchAlertingData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/alerting');
      const data = await response.json();

      if (data.success) {
        setActiveAlerts(data.data.activeAlerts);
        setAlertRules(data.data.alertRules);
        setSummary(data.data.summary);
      } else {
        console.error('Failed to fetch alerting data:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch alerting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerManualCheck = async () => {
    try {
      const response = await fetch('/api/admin/alerting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check'
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchAlertingData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to trigger manual check:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/alerting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'acknowledge',
          alertId,
          userId: 'current-user-id' // This should come from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchAlertingData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/alerting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          updates: { enabled }
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchAlertingData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-800 bg-red-100 border-red-200';
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerting System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{summary.totalActiveAlerts}</div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-800">{summary.criticalAlerts}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{summary.highAlerts}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{summary.enabledRules}</div>
              <div className="text-sm text-gray-600">Enabled Rules</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.totalRules}</div>
              <div className="text-sm text-gray-600">Total Rules</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Alerts</CardTitle>
            <Button onClick={triggerManualCheck} variant="outline" size="sm">
              Check Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active alerts
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <Alert key={alert.id} className="border-red-200 bg-red-50">
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(alert.severity)}`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatDate(alert.triggeredAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{alert.message}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="ml-4"
                      >
                        Acknowledge
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertRules.map((rule) => (
              <div
                key={rule.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium">{rule.name}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(rule.severity)}`}
                      >
                        {rule.severity}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        Type: {rule.condition.type.replace(/_/g, ' ')} | 
                        Threshold: {rule.condition.threshold} | 
                        Window: {rule.condition.timeWindowMinutes}min
                      </div>
                      <div>Cooldown: {rule.cooldownMinutes} minutes</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleRule(rule.id, !rule.enabled)}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}