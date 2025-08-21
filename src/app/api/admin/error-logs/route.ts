import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-wrapper';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/error-logs - Fetch error logs with filtering and pagination
async function getErrorLogs(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const severity = searchParams.get('severity');
  const type = searchParams.get('type');
  const endpoint = searchParams.get('endpoint');
  const userId = searchParams.get('userId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search');

  try {
    // Build query
    let query = supabase
      .from('error_logs')
      .select(`
        *,
        users:user_id(email),
        api_keys:api_key_id(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (severity) {
      query = query.eq('severity', severity);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (endpoint) {
      query = query.ilike('endpoint', `%${endpoint}%`);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    if (search) {
      query = query.or(`message.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('error_logs')
      .select('severity, type, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const summary = {
      total: count || 0,
      last24h: stats?.length || 0,
      bySeverity: stats?.reduce((acc: any, log: any) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      }, {}) || {},
      byType: stats?.reduce((acc: any, log: any) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        summary
      }
    });

  } catch (error) {
    throw error;
  }
}

// DELETE /api/admin/error-logs - Clear old error logs
async function clearErrorLogs(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const olderThan = searchParams.get('olderThan') || '30'; // days
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));

    const { error } = await supabase
      .from('error_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Error logs older than ${olderThan} days have been cleared`
    });

  } catch (error) {
    throw error;
  }
}

export const GET = withErrorHandling(getErrorLogs, '/api/admin/error-logs');
export const DELETE = withErrorHandling(clearErrorLogs, '/api/admin/error-logs');