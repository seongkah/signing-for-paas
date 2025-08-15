'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorLog {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  code: string;
  endpoint?: string;
  user_id?: string;
  api_key_id?: string;
  request_id?: string;
  details?: any;
  stack_trace?: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
  users?: { email: string };
  api_keys?: { name: string };
}

interface ErrorAlert {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  endpoint?: string;
  acknowledged: boolean;
  created_at: string;
}

interface ErrorLogSummary {
  total: number;
  last24h: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

interface ErrorLogViewerProps {
  userId?: string;
  maxEntries?: number;
  className?: string;
  showAlerts?: boolean;
}

export function ErrorLogViewer({
  userId,
  maxEntries = 50,
  className,
  showAlerts = true
}: ErrorLogViewerProps) {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [alerts, setAlerts] = useState<ErrorAlert[]>([]);
  const [summary, setSummary] = useState<ErrorLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [endpointFilter, setEndpointFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('24h');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = maxEntries;

  // Active tab
  const [activeTab, setActiveTab] = useState<'logs' | 'alerts'>('logs');

  useEffect(() => {
    fetchErrorLogs();
  }, [currentPage, severityFilter, typeFilter, endpointFilter, searchTerm, dateRange]);

  useEffect(() => {
    if (activeTab === 'alerts' && showAlerts) {
      fetchErrorAlerts();
    }
  }, [activeTab, showAlerts]);

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (endpointFilter) params.append('endpoint', endpointFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (userId) params.append('userId', userId);
      
      // Add date range
      const now = new Date();
      let startDate: Date;
      switch (dateRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      params.append('startDate', startDate.toISOString());

      const response = await fetch(`/api/admin/error-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setSummary(data.data.summary);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        console.error('Failed to fetch error logs:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorAlerts = async () => {
    try {
      setAlertsLoading(true);
      
      const response = await fetch('/api/admin/error-alerts');
      const data = await response.json();

      if (data.success) {
        setAlerts(data.data.alerts);
      } else {
        console.error('Failed to fetch error alerts:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch error alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  const acknowledgeAlerts = async (alertIds: string[]) => {
    try {
      const response = await fetch('/api/admin/error-alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertIds,
          userId: userId || 'current-user-id'
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchErrorAlerts(); // Refresh alerts
      }
    } catch (error) {
      console.error('Failed to acknowledge alerts:', error);
    }
  };

  const clearOldLogs = async () => {
    try {
      const response = await fetch('/api/admin/error-logs?olderThan=30', {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchErrorLogs(); // Refresh logs
      }
    } catch (error) {
      console.error('Failed to clear old logs:', error);
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

  const getTypeColor = (type: string) => {
    const colors = {
      'AUTHENTICATION_ERROR': 'bg-purple-100 text-purple-800',
      'AUTHORIZATION_ERROR': 'bg-orange-100 text-orange-800',
      'VALIDATION_ERROR': 'bg-blue-100 text-blue-800',
      'RATE_LIMIT_ERROR': 'bg-yellow-100 text-yellow-800',
      'SIGNATURE_GENERATION_ERROR': 'bg-red-100 text-red-800',
      'DATABASE_ERROR': 'bg-pink-100 text-pink-800',
      'INTERNAL_SERVER_ERROR': 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-gray-600">Total Errors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.last24h}</div>
              <div className="text-sm text-gray-600">Last 24 Hours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {summary.bySeverity.CRITICAL || 0}
              </div>
              <div className="text-sm text-gray-600">Critical Errors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {unacknowledgedAlerts.length}
              </div>
              <div className="text-sm text-gray-600">Unacknowledged Alerts</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Banner */}
      {showAlerts && unacknowledgedAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {unacknowledgedAlerts.length} unacknowledged alert(s) require attention
              </span>
              <Button
                size="sm"
                onClick={() => acknowledgeAlerts(unacknowledgedAlerts.map(a => a.id))}
                className="ml-4"
              >
                Acknowledge All
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Error Monitoring</CardTitle>
            {showAlerts && (
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'logs' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('logs')}
                >
                  Error Logs
                </Button>
                <Button
                  variant={activeTab === 'alerts' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('alerts')}
                >
                  Alerts ({unacknowledgedAlerts.length})
                </Button>
              </div>
            )}
          </div>

          {/* Filters */}
          {activeTab === 'logs' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Types</option>
                <option value="AUTHENTICATION_ERROR">Auth Error</option>
                <option value="SIGNATURE_GENERATION_ERROR">Signature Error</option>
                <option value="DATABASE_ERROR">Database Error</option>
                <option value="RATE_LIMIT_ERROR">Rate Limit</option>
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <div className="flex gap-2">
                <Button onClick={fetchErrorLogs} variant="outline" size="sm">
                  Refresh
                </Button>
                <Button onClick={clearOldLogs} variant="outline" size="sm">
                  Clear Old
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {activeTab === 'logs' ? (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No error logs found</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="border rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(log.severity)}`}
                            >
                              {log.severity}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(log.type)}`}
                            >
                              {log.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>

                        <div className="text-sm font-medium mb-2">{log.message}</div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-2">
                          <div>Code: {log.code}</div>
                          {log.endpoint && <div>Endpoint: {log.endpoint}</div>}
                          {log.users?.email && <div>User: {log.users.email}</div>}
                          {log.request_id && <div>Request ID: {log.request_id}</div>}
                        </div>

                        {(log.details || log.stack_trace) && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700 mb-2">
                              View Details
                            </summary>
                            {log.details && (
                              <div className="mb-2">
                                <strong>Details:</strong>
                                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.stack_trace && (
                              <div>
                                <strong>Stack Trace:</strong>
                                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                  {log.stack_trace}
                                </pre>
                              </div>
                            )}
                          </details>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-2 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            showAlerts && (
              <div className="space-y-4">
                {alertsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : alerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No error alerts found</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`border rounded-lg p-4 ${
                          alert.acknowledged ? 'bg-gray-50' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}
                            >
                              {alert.severity}
                            </span>
                            {!alert.acknowledged && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                UNACKNOWLEDGED
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(alert.created_at)}
                          </span>
                        </div>

                        <div className="text-sm font-medium mb-2">{alert.message}</div>
                        
                        {alert.endpoint && (
                          <div className="text-xs text-gray-600 mb-2">
                            Endpoint: {alert.endpoint}
                          </div>
                        )}

                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlerts([alert.id])}
                            className="mt-2"
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export both named and default exports for compatibility
export default ErrorLogViewer;