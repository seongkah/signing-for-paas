import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-wrapper';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/error-alerts - Fetch error alerts
async function getErrorAlerts(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const acknowledged = searchParams.get('acknowledged');
  const severity = searchParams.get('severity');

  try {
    let query = supabase
      .from('error_alerts')
      .select(`
        *,
        users:user_id(email),
        acknowledged_by_user:acknowledged_by(email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (acknowledged !== null) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }
    
    if (severity) {
      query = query.eq('severity', severity);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: alerts, error, count } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Get unacknowledged count
    const { count: unacknowledgedCount } = await supabase
      .from('error_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('acknowledged', false);

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        unacknowledgedCount: unacknowledgedCount || 0
      }
    });

  } catch (error) {
    throw error;
  }
}

// PUT /api/admin/error-alerts - Acknowledge alerts
async function acknowledgeAlerts(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertIds, userId } = body;

    if (!alertIds || !Array.isArray(alertIds)) {
      throw new Error('validation: alertIds must be an array');
    }

    const { error } = await supabase
      .from('error_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .in('id', alertIds);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `${alertIds.length} alert(s) acknowledged`
    });

  } catch (error) {
    throw error;
  }
}

export const GET = withErrorHandling(getErrorAlerts, '/api/admin/error-alerts');
export const PUT = withErrorHandling(acknowledgeAlerts, '/api/admin/error-alerts');