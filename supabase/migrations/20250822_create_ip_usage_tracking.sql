-- Create IP usage tracking table for daily limits
CREATE TABLE IF NOT EXISTS ip_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  date DATE NOT NULL,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ip_address, date)
);

-- Create IP usage logs table for detailed tracking
CREATE TABLE IF NOT EXISTS ip_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  room_url TEXT,
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ip_usage_tracking_ip_date ON ip_usage_tracking(ip_address, date);
CREATE INDEX IF NOT EXISTS idx_ip_usage_logs_ip_created ON ip_usage_logs(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_ip_usage_logs_created ON ip_usage_logs(created_at);

-- Create RPC function to increment IP usage (atomic operation)
CREATE OR REPLACE FUNCTION increment_ip_usage(
  p_ip_address TEXT,
  p_date DATE,
  p_increment INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update the usage count
  INSERT INTO ip_usage_tracking (ip_address, date, request_count, updated_at)
  VALUES (p_ip_address, p_date, p_increment, NOW())
  ON CONFLICT (ip_address, date) 
  DO UPDATE SET 
    request_count = ip_usage_tracking.request_count + p_increment,
    updated_at = NOW()
  RETURNING request_count INTO current_count;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE ip_usage_tracking IS 'Tracks daily usage per IP address for free tier rate limiting';
COMMENT ON TABLE ip_usage_logs IS 'Detailed logs of IP-based requests for analytics and debugging';
COMMENT ON FUNCTION increment_ip_usage IS 'Atomically increment IP usage count for a given date';