-- Database functions for TikTok Signing PaaS
-- This migration creates utility functions for the application

-- Function to track API usage
CREATE OR REPLACE FUNCTION public.track_api_usage(
    p_user_id UUID,
    p_api_key_id UUID,
    p_room_url TEXT,
    p_success BOOLEAN,
    p_response_time_ms INTEGER,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Insert usage log
    INSERT INTO public.usage_logs (
        user_id, api_key_id, room_url, success, response_time_ms, 
        error_message, ip_address, user_agent
    )
    VALUES (
        p_user_id, p_api_key_id, p_room_url, p_success, p_response_time_ms,
        p_error_message, p_ip_address, p_user_agent
    )
    RETURNING id INTO log_id;

    -- Update quota usage
    INSERT INTO public.quota_usage (user_id, date, request_count, success_count, error_count)
    VALUES (
        p_user_id, 
        current_date, 
        1, 
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
        request_count = quota_usage.request_count + 1,
        success_count = quota_usage.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
        error_count = quota_usage.error_count + CASE WHEN p_success THEN 0 ELSE 1 END,
        updated_at = NOW();

    -- Update API key usage count if provided
    IF p_api_key_id IS NOT NULL THEN
        UPDATE public.api_keys 
        SET usage_count = usage_count + 1, last_used = NOW()
        WHERE id = p_api_key_id;
    END IF;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_max_requests_per_hour INTEGER DEFAULT 500,
    p_max_requests_per_day INTEGER DEFAULT 5000
)
RETURNS JSONB AS $$
DECLARE
    hourly_count INTEGER;
    daily_count INTEGER;
    result JSONB;
BEGIN
    -- Check hourly limit
    SELECT COUNT(*) INTO hourly_count
    FROM public.usage_logs
    WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 hour';

    -- Check daily limit
    SELECT COALESCE(request_count, 0) INTO daily_count
    FROM public.quota_usage
    WHERE user_id = p_user_id
    AND date = CURRENT_DATE;

    -- Build result
    result := jsonb_build_object(
        'allowed', (hourly_count < p_max_requests_per_hour AND daily_count < p_max_requests_per_day),
        'hourly_count', hourly_count,
        'hourly_limit', p_max_requests_per_hour,
        'daily_count', daily_count,
        'daily_limit', p_max_requests_per_day,
        'reset_time', (CURRENT_DATE + INTERVAL '1 day')::timestamp
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics
CREATE OR REPLACE FUNCTION public.get_user_analytics(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_requests INTEGER;
    success_rate NUMERIC;
    avg_response_time NUMERIC;
BEGIN
    -- Get total requests
    SELECT COUNT(*) INTO total_requests
    FROM public.usage_logs
    WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- Get success rate
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*)), 2)
        END INTO success_rate
    FROM public.usage_logs
    WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- Get average response time
    SELECT COALESCE(ROUND(AVG(response_time_ms), 2), 0) INTO avg_response_time
    FROM public.usage_logs
    WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND success = true;

    -- Build result
    result := jsonb_build_object(
        'total_requests', total_requests,
        'success_rate', success_rate,
        'avg_response_time_ms', avg_response_time,
        'period_days', p_days
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system metrics
CREATE OR REPLACE FUNCTION public.log_system_metric(
    p_metric_name TEXT,
    p_metric_value NUMERIC,
    p_metric_type TEXT DEFAULT 'gauge',
    p_tags JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO public.system_metrics (metric_name, metric_value, metric_type, tags)
    VALUES (p_metric_name, p_metric_value, p_metric_type, p_tags)
    RETURNING id INTO metric_id;

    RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log errors
CREATE OR REPLACE FUNCTION public.log_error(
    p_error_type TEXT,
    p_error_message TEXT,
    p_stack_trace TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_api_key_id UUID DEFAULT NULL,
    p_request_data JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'error'
)
RETURNS UUID AS $$
DECLARE
    error_id UUID;
BEGIN
    INSERT INTO public.error_logs (
        error_type, error_message, stack_trace, user_id, 
        api_key_id, request_data, severity
    )
    VALUES (
        p_error_type, p_error_message, p_stack_trace, p_user_id,
        p_api_key_id, p_request_data, p_severity
    )
    RETURNING id INTO error_id;

    RETURN error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old logs (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old usage logs
    DELETE FROM public.usage_logs
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete old error logs
    DELETE FROM public.error_logs
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

    -- Delete old system metrics
    DELETE FROM public.system_metrics
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;