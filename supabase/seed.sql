-- Seed data for TikTok Signing PaaS
-- This file contains initial data for development and testing

-- Insert sample admin user (for development only)
INSERT INTO public.users (id, email, tier, metadata) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin@tiktok-signing-paas.com',
    'api_key',
    '{"role": "admin", "created_by": "system"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Insert sample regular user (for development only)
INSERT INTO public.users (id, email, tier, metadata) VALUES
(
    '00000000-0000-0000-0000-000000000002',
    'user@example.com',
    'free',
    '{"created_by": "system"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Insert sample API key for admin user
INSERT INTO public.api_keys (id, user_id, key_hash, name, metadata) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    crypt('admin-api-key-12345', gen_salt('bf')),
    'Admin Development Key',
    '{"environment": "development", "created_by": "system"}'::jsonb
) ON CONFLICT (key_hash) DO NOTHING;

-- Insert sample API key for regular user
INSERT INTO public.api_keys (id, user_id, key_hash, name, metadata) VALUES
(
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    crypt('user-api-key-67890', gen_salt('bf')),
    'User Development Key',
    '{"environment": "development", "created_by": "system"}'::jsonb
) ON CONFLICT (key_hash) DO NOTHING;

-- Insert sample usage data for analytics testing
INSERT INTO public.usage_logs (user_id, api_key_id, room_url, success, response_time_ms, created_at) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'https://www.tiktok.com/@username/live',
    true,
    1250,
    NOW() - INTERVAL '1 hour'
),
(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'https://www.tiktok.com/@username2/live',
    true,
    980,
    NOW() - INTERVAL '2 hours'
),
(
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'https://www.tiktok.com/@username3/live',
    false,
    5000,
    NOW() - INTERVAL '3 hours'
);

-- Insert sample quota usage data
INSERT INTO public.quota_usage (user_id, date, request_count, success_count, error_count) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    2,
    2,
    0
),
(
    '00000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    1,
    0,
    1
);

-- Insert sample system metrics
INSERT INTO public.system_metrics (metric_name, metric_value, metric_type, tags) VALUES
('api_requests_total', 100, 'counter', '{"endpoint": "/api/signature"}'::jsonb),
('response_time_avg', 1200, 'gauge', '{"endpoint": "/api/signature"}'::jsonb),
('active_users', 25, 'gauge', '{"period": "daily"}'::jsonb),
('error_rate', 0.05, 'gauge', '{"period": "hourly"}'::jsonb);

-- Insert sample error logs
INSERT INTO public.error_logs (error_type, error_message, severity, user_id) VALUES
(
    'SIGNATURE_GENERATION_ERROR',
    'Failed to generate signature for TikTok URL',
    'error',
    '00000000-0000-0000-0000-000000000002'
),
(
    'RATE_LIMIT_ERROR',
    'User exceeded daily quota limit',
    'warn',
    '00000000-0000-0000-0000-000000000002'
);

-- Create a view for user dashboard data
CREATE OR REPLACE VIEW public.user_dashboard_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.tier,
    COUNT(ak.id) as api_key_count,
    COALESCE(qu.request_count, 0) as today_requests,
    COALESCE(qu.success_count, 0) as today_success,
    COALESCE(qu.error_count, 0) as today_errors,
    CASE 
        WHEN COALESCE(qu.request_count, 0) = 0 THEN 0
        ELSE ROUND((qu.success_count * 100.0 / qu.request_count), 2)
    END as today_success_rate
FROM public.users u
LEFT JOIN public.api_keys ak ON u.id = ak.user_id AND ak.is_active = true
LEFT JOIN public.quota_usage qu ON u.id = qu.user_id AND qu.date = CURRENT_DATE
GROUP BY u.id, u.email, u.tier, qu.request_count, qu.success_count, qu.error_count;

-- Grant permissions for the view
GRANT SELECT ON public.user_dashboard_stats TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can view their own dashboard stats" ON public.user_dashboard_stats
    FOR SELECT USING (auth.uid()::text = user_id::text);