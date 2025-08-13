-- CalvaryPay Security Enhancement Tables
-- Migration: 001_security_tables.sql

-- Security audit log table for tracking all security events
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh tokens table for JWT token management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    token_family UUID NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table for tracking API usage
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Failed login attempts table for security monitoring
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    failure_reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp ON security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_risk_level ON security_audit_log(risk_level);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked) WHERE is_revoked = FALSE;

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_client_endpoint ON rate_limit_log(client_identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_window_end ON rate_limit_log(window_end);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_time ON failed_login_attempts(attempt_time);

-- Row Level Security (RLS) policies
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Security audit log policies
CREATE POLICY "Users can view their own audit logs" ON security_audit_log
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Admins can view all audit logs" ON security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON security_audit_log
    FOR INSERT WITH CHECK (true);

-- Refresh tokens policies
CREATE POLICY "Users can view their own refresh tokens" ON refresh_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own refresh tokens" ON refresh_tokens
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert refresh tokens" ON refresh_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can delete expired refresh tokens" ON refresh_tokens
    FOR DELETE USING (expires_at < NOW() OR is_revoked = true);

-- Rate limit log policies (admin only)
CREATE POLICY "Admins can view rate limit logs" ON rate_limit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "System can manage rate limit logs" ON rate_limit_log
    FOR ALL WITH CHECK (true);

-- Failed login attempts policies (admin only)
CREATE POLICY "Admins can view failed login attempts" ON failed_login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "System can insert failed login attempts" ON failed_login_attempts
    FOR INSERT WITH CHECK (true);

-- Functions for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    -- Keep audit logs for 1 year, except critical events (keep forever)
    DELETE FROM security_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND risk_level != 'critical';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_logs()
RETURNS void AS $$
BEGIN
    -- Keep rate limit logs for 30 days
    DELETE FROM rate_limit_log 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_failed_login_attempts()
RETURNS void AS $$
BEGIN
    -- Keep failed login attempts for 90 days
    DELETE FROM failed_login_attempts 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_refresh_tokens_updated_at
    BEFORE UPDATE ON refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a scheduled job to run cleanup functions (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_refresh_tokens();');
-- SELECT cron.schedule('cleanup-old-audit-logs', '0 3 * * 0', 'SELECT cleanup_old_audit_logs();');
-- SELECT cron.schedule('cleanup-rate-limit-logs', '0 4 * * *', 'SELECT cleanup_old_rate_limit_logs();');
-- SELECT cron.schedule('cleanup-failed-logins', '0 5 * * *', 'SELECT cleanup_old_failed_login_attempts();');
