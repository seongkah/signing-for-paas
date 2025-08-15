-- Row Level Security (RLS) policies for TikTok Signing PaaS
-- This migration sets up security policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- API Keys table policies
CREATE POLICY "Users can view their own API keys" ON public.api_keys
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own API keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own API keys" ON public.api_keys
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own API keys" ON public.api_keys
    FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all API keys" ON public.api_keys
    FOR ALL USING (auth.role() = 'service_role');

-- Usage logs table policies
CREATE POLICY "Users can view their own usage logs" ON public.usage_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all usage logs" ON public.usage_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Quota usage table policies
CREATE POLICY "Users can view their own quota usage" ON public.quota_usage
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all quota usage" ON public.quota_usage
    FOR ALL USING (auth.role() = 'service_role');

-- System metrics table policies (admin only)
CREATE POLICY "Service role can manage system metrics" ON public.system_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- Error logs table policies (admin only)
CREATE POLICY "Service role can manage error logs" ON public.error_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND metadata->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for viewing system data
CREATE POLICY "Admins can view all usage logs" ON public.usage_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all quota usage" ON public.quota_usage
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view system metrics" ON public.system_metrics
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view error logs" ON public.error_logs
    FOR SELECT USING (public.is_admin());