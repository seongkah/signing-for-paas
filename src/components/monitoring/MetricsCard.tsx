'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MetricsCardProps {
  title: string
  description?: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period: string
  }
  status?: 'success' | 'warning' | 'error' | 'info'
  icon?: React.ReactNode
  className?: string
}

export function MetricsCard({
  title,
  description,
  value,
  change,
  status,
  icon,
  className
}: MetricsCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return ''
    }
  }

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return '↗'
      case 'decrease':
        return '↘'
      default:
        return '→'
    }
  }

  return (
    <Card className={`${className} ${status ? getStatusColor(status) : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription className="text-xs text-muted-foreground">
            {description}
          </CardDescription>
        )}
        {change && (
          <p className={`text-xs ${getChangeColor(change.type)} flex items-center mt-1`}>
            <span className="mr-1">{getChangeIcon(change.type)}</span>
            {Math.abs(change.value)}% from {change.period}
          </p>
        )}
      </CardContent>
    </Card>
  )
}