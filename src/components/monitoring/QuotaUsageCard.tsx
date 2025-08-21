'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface QuotaUsageCardProps {
  title: string
  used: number
  limit: number
  resetTime?: Date
  type: 'daily' | 'monthly' | 'bandwidth' | 'storage'
  className?: string
}

export function QuotaUsageCard({
  title,
  used,
  limit,
  resetTime,
  type,
  className
}: QuotaUsageCardProps) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0
  const remaining = Math.max(0, limit - used)

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStatusText = (percentage: number) => {
    if (percentage >= 100) return 'Limit Exceeded'
    if (percentage >= 90) return 'Critical Usage'
    if (percentage >= 75) return 'High Usage'
    if (percentage >= 50) return 'Moderate Usage'
    return 'Low Usage'
  }

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'bandwidth':
      case 'storage':
        if (value >= 1024 * 1024 * 1024) {
          return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
        }
        if (value >= 1024 * 1024) {
          return `${(value / (1024 * 1024)).toFixed(1)} MB`
        }
        if (value >= 1024) {
          return `${(value / 1024).toFixed(1)} KB`
        }
        return `${value} B`
      default:
        return value.toLocaleString()
    }
  }

  const formatResetTime = (resetTime: Date) => {
    const now = new Date()
    const diff = resetTime.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription>
          {formatValue(used, type)} of {formatValue(limit, type)} used
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{getStatusText(percentage)}</span>
            <span>{percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(percentage)}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Usage Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Used</p>
            <p className="font-medium">{formatValue(used, type)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className="font-medium">{formatValue(remaining, type)}</p>
          </div>
        </div>

        {/* Reset Time */}
        {resetTime && (
          <div className="text-sm">
            <p className="text-muted-foreground">Resets in</p>
            <p className="font-medium">{formatResetTime(resetTime)}</p>
          </div>
        )}

        {/* Alerts */}
        {percentage >= 90 && (
          <Alert variant={percentage >= 100 ? 'destructive' : 'default'}>
            <AlertDescription>
              {percentage >= 100
                ? 'Quota limit exceeded. Service may be restricted.'
                : 'Approaching quota limit. Consider upgrading or optimizing usage.'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}