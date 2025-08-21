'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

interface SimpleChartProps {
  title: string
  description?: string
  data: ChartDataPoint[]
  type: 'bar' | 'line' | 'area'
  height?: number
  className?: string
}

export function SimpleChart({
  title,
  description,
  data,
  type,
  height = 200,
  className
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1

  const getBarHeight = (value: number) => {
    return ((value - minValue) / range) * (height - 40)
  }

  const getLinePoints = () => {
    const width = 300
    const stepX = width / (data.length - 1 || 1)
    
    return data.map((point, index) => {
      const x = index * stepX
      const y = height - 20 - getBarHeight(point.value)
      return `${x},${y}`
    }).join(' ')
  }

  const getAreaPath = () => {
    const width = 300
    const stepX = width / (data.length - 1 || 1)
    
    let path = `M 0,${height - 20}`
    
    data.forEach((point, index) => {
      const x = index * stepX
      const y = height - 20 - getBarHeight(point.value)
      if (index === 0) {
        path += ` L ${x},${y}`
      } else {
        path += ` L ${x},${y}`
      }
    })
    
    path += ` L ${(data.length - 1) * stepX},${height - 20} Z`
    return path
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: `${height}px` }}>
          <svg width="100%" height="100%" viewBox={`0 0 300 ${height}`}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="30" height="20" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {type === 'bar' && (
              <g>
                {data.map((point, index) => {
                  const barWidth = 300 / data.length * 0.8
                  const x = (300 / data.length) * index + (300 / data.length - barWidth) / 2
                  const barHeight = getBarHeight(point.value)
                  const y = height - 20 - barHeight
                  
                  return (
                    <g key={index}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={point.color || '#3b82f6'}
                        className="hover:opacity-80 transition-opacity"
                      />
                      <text
                        x={x + barWidth / 2}
                        y={height - 5}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {point.label}
                      </text>
                    </g>
                  )
                })}
              </g>
            )}
            
            {type === 'line' && (
              <g>
                <polyline
                  points={getLinePoints()}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  className="hover:stroke-blue-700 transition-colors"
                />
                {data.map((point, index) => {
                  const width = 300
                  const stepX = width / (data.length - 1 || 1)
                  const x = index * stepX
                  const y = height - 20 - getBarHeight(point.value)
                  
                  return (
                    <g key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#3b82f6"
                        className="hover:r-4 transition-all"
                      />
                      <text
                        x={x}
                        y={height - 5}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {point.label}
                      </text>
                    </g>
                  )
                })}
              </g>
            )}
            
            {type === 'area' && (
              <g>
                <path
                  d={getAreaPath()}
                  fill="#3b82f6"
                  fillOpacity="0.3"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  className="hover:fill-opacity-40 transition-all"
                />
                {data.map((point, index) => {
                  const width = 300
                  const stepX = width / (data.length - 1 || 1)
                  const x = index * stepX
                  
                  return (
                    <text
                      key={index}
                      x={x}
                      y={height - 5}
                      textAnchor="middle"
                      className="text-xs fill-gray-600"
                    >
                      {point.label}
                    </text>
                  )
                })}
              </g>
            )}
            
            {/* Y-axis labels */}
            <g>
              <text x="5" y="15" className="text-xs fill-gray-600">
                {maxValue.toLocaleString()}
              </text>
              <text x="5" y={height - 25} className="text-xs fill-gray-600">
                {minValue.toLocaleString()}
              </text>
            </g>
          </svg>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {data.slice(0, 5).map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: point.color || '#3b82f6' }}
              />
              <span className="text-gray-600">{point.label}: {point.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}