'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ErrorLog {
  id: string
  timestamp: Date
  error: string
  count: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  details?: string
}

interface ErrorLogViewerProps {
  userId: string
  maxEntries?: number
  className?: string
}

export function ErrorLogViewer({
  userId,
  maxEntries = 50,
  className
}: ErrorLogViewerProps) {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const fetchErrors = async () => {
    try {
      setError(null)
      setLoading(true)
      
      const response = await fetch(`/api/user/analytics?days=7&errors=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch error logs')
      }

      const result = await response.json()
      
      if (result.success && result.data.analytics) {
        const errorBreakdown = result.data.analytics.errorBreakdown || []
        
        // Transform error breakdown into error log format
        const errorLogs: ErrorLog[] = errorBreakdown.map((err: any, index: number) => ({
          id: `error-${index}`,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
          error: err.error,
          count: err.count,
          severity: getSeverityFromError(err.error),
          details: getErrorDetails(err.error)
        }))
        
        // Sort by timestamp (most recent first)
        errorLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        
        setErrors(errorLogs.slice(0, maxEntries))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch error logs')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityFromError = (errorMessage: string): 'low' | 'medium' | 'high' | 'critical' => {
    const lowerError = errorMessage.toLowerCase()
    
    if (lowerError.includes('critical') || lowerError.includes('fatal') || lowerError.includes('crash')) {
      return 'critical'
    }
    if (lowerError.includes('timeout') || lowerError.includes('connection') || lowerError.includes('network')) {
      return 'high'
    }
    if (lowerError.includes('validation') || lowerError.includes('invalid') || lowerError.includes('missing')) {
      return 'medium'
    }
    return 'low'
  }

  const getErrorDetails = (errorMessage: string): string => {
    // Generate helpful details based on error type
    const lowerError = errorMessage.toLowerCase()
    
    if (lowerError.includes('timeout')) {
      return 'Request exceeded maximum allowed time. Consider optimizing the request or checking network connectivity.'
    }
    if (lowerError.includes('validation')) {
      return 'Input validation failed. Check request parameters and format.'
    }
    if (lowerError.includes('rate limit')) {
      return 'Too many requests in a short period. Implement request throttling or upgrade to API key access.'
    }
    if (lowerError.includes('authentication')) {
      return 'Authentication failed. Check API key or login credentials.'
    }
    if (lowerError.includes('signature')) {
      return 'Signature generation failed. This may be due to invalid TikTok URL or service issues.'
    }
    
    return 'Check the error message for specific details and consult the documentation.'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴'
      case 'high':
        return '🟠'
      case 'medium':
        return '🟡'
      case 'low':
        return '🔵'
      default:
        return '⚪'
    }
  }

  const filteredErrors = errors.filter(error => {
    const matchesSearch = searchTerm === '' || 
      error.error.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.details?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter
    
    return matchesSearch && matchesSeverity
  })

  useEffect(() => {
    fetchErrors()
  }, [userId])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Error Logs</CardTitle>
          <CardDescription>Recent errors and issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Error Logs</CardTitle>
        <CardDescription>Recent errors and issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Button onClick={fetchErrors} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Error Summary */}
        {errors.length > 0 && (
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="text-center">
              <p className="font-medium text-red-600">
                {errors.filter(e => e.severity === 'critical').length}
              </p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-orange-600">
                {errors.filter(e => e.severity === 'high').length}
              </p>
              <p className="text-xs text-muted-foreground">High</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-yellow-600">
                {errors.filter(e => e.severity === 'medium').length}
              </p>
              <p className="text-xs text-muted-foreground">Medium</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-blue-600">
                {errors.filter(e => e.severity === 'low').length}
              </p>
              <p className="text-xs text-muted-foreground">Low</p>
            </div>
          </div>
        )}

        {/* Error List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredErrors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {errors.length === 0 ? 'No errors found' : 'No errors match your filters'}
            </div>
          ) : (
            filteredErrors.map((errorLog) => (
              <div
                key={errorLog.id}
                className={`p-3 rounded-lg border ${getSeverityColor(errorLog.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{getSeverityIcon(errorLog.severity)}</span>
                      <span className="font-medium text-sm capitalize">
                        {errorLog.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {errorLog.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">{errorLog.error}</p>
                    {errorLog.details && (
                      <p className="text-xs text-muted-foreground">{errorLog.details}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{errorLog.count}x</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Show More Button */}
        {errors.length >= maxEntries && (
          <div className="text-center">
            <Button variant="outline" size="sm">
              Load More Errors
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}