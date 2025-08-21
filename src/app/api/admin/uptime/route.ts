import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { healthMonitor } from '@/lib/health-monitor'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ErrorType } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request)
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error
        },
        { status: 401 }
      )
    }

    const { user } = authResult.context
    const supabase = createServerSupabaseClient()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'User not found in context',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const hours = parseInt(url.searchParams.get('hours') || '24')
    const component = url.searchParams.get('component')

    // Get uptime data
    const uptimeHistory = healthMonitor.getUptimeHistory(hours)
    
    // Get historical health check data from database
    const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000)
    const { data: healthChecks, error: healthError } = await supabase
      .from('health_checks')
      .select('component, data, created_at')
      .gte('created_at', timeWindow.toISOString())
      .order('created_at', { ascending: false })

    if (healthError) {
      console.error('Failed to fetch health checks:', healthError)
    }

    // Process uptime statistics
    const uptimeStats = calculateUptimeStatistics(uptimeHistory, healthChecks || [])

    // Component-specific data
    let componentData = null
    if (component) {
      componentData = {
        name: component,
        availability: healthMonitor.getComponentAvailability(component, hours),
        history: uptimeHistory.map(record => ({
          timestamp: record.timestamp,
          status: record.components[component] ? 'up' : 'down',
          responseTime: record.responseTime
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        timeWindow: {
          hours,
          start: timeWindow.toISOString(),
          end: new Date().toISOString()
        },
        overall: uptimeStats.overall,
        components: uptimeStats.components,
        incidents: uptimeStats.incidents,
        component: componentData,
        summary: {
          totalChecks: uptimeHistory.length,
          uptime: uptimeStats.overall.percentage,
          meanTimeToRecovery: uptimeStats.overall.meanTimeToRecovery,
          longestDowntime: uptimeStats.overall.longestDowntime
        }
      }
    })

  } catch (error) {
    console.error('Uptime monitoring API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Internal server error while fetching uptime data',
          code: 'INTERNAL_ERROR',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}

interface UptimeRecord {
  timestamp: Date
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  components: Record<string, boolean>
}

interface Incident {
  start: Date
  end: Date | null
  duration: number
  affectedComponents: string[]
  severity: 'critical' | 'degraded'
}

function calculateUptimeStatistics(uptimeHistory: UptimeRecord[], healthChecks: any[]) {
  // Calculate overall uptime
  const totalChecks = uptimeHistory.length
  const upChecks = uptimeHistory.filter(record => record.status === 'up').length
  const overallPercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100

  // Find incidents (periods of downtime)
  const incidents: Incident[] = []
  let currentIncident: Incident | null = null

  for (let i = 0; i < uptimeHistory.length; i++) {
    const record = uptimeHistory[i]
    
    if (record.status !== 'up' && !currentIncident) {
      // Start of incident
      currentIncident = {
        start: record.timestamp,
        end: null,
        duration: 0,
        affectedComponents: Object.keys(record.components).filter(comp => !record.components[comp]),
        severity: record.status === 'down' ? 'critical' : 'degraded'
      }
    } else if (record.status === 'up' && currentIncident) {
      // End of incident
      currentIncident.end = record.timestamp
      currentIncident.duration = (currentIncident.start.getTime() - record.timestamp.getTime()) / (1000 * 60) // minutes
      incidents.push(currentIncident)
      currentIncident = null
    }
  }

  // If there's an ongoing incident
  if (currentIncident) {
    currentIncident.end = new Date()
    currentIncident.duration = (currentIncident.start.getTime() - new Date().getTime()) / (1000 * 60)
    incidents.push(currentIncident)
  }

  // Calculate MTTR (Mean Time To Recovery)
  const resolvedIncidents = incidents.filter((inc: Incident) => inc.end !== null)
  const meanTimeToRecovery = resolvedIncidents.length > 0
    ? resolvedIncidents.reduce((sum: number, inc: Incident) => sum + inc.duration, 0) / resolvedIncidents.length
    : 0

  // Find longest downtime
  const longestDowntime = incidents.length > 0
    ? Math.max(...incidents.map((inc: Incident) => inc.duration))
    : 0

  // Calculate component-specific uptime
  const componentStats: Record<string, any> = {}
  
  if (uptimeHistory.length > 0) {
    const allComponents = new Set<string>()
    uptimeHistory.forEach((record: UptimeRecord) => {
      Object.keys(record.components).forEach((comp: string) => allComponents.add(comp))
    })

    allComponents.forEach((componentName: string) => {
      const componentRecords = uptimeHistory.filter((record: UptimeRecord) => 
        record.components.hasOwnProperty(componentName)
      )
      const componentUpRecords = componentRecords.filter((record: UptimeRecord) => 
        record.components[componentName] === true
      )
      
      const availability = componentRecords.length > 0 
        ? (componentUpRecords.length / componentRecords.length) * 100 
        : 100

      componentStats[componentName] = {
        availability,
        totalChecks: componentRecords.length,
        upChecks: componentUpRecords.length,
        incidents: incidents.filter((inc: Incident) => inc.affectedComponents.includes(componentName)).length
      }
    })
  }

  return {
    overall: {
      percentage: overallPercentage,
      totalChecks,
      upChecks,
      meanTimeToRecovery,
      longestDowntime
    },
    components: componentStats,
    incidents: incidents.sort((a: Incident, b: Incident) => b.start.getTime() - a.start.getTime()).slice(0, 10) // Last 10 incidents
  }
}