-- EliteEpay Row Level Security (RLS) Policies
-- This file creates RLS policies for secure multi-tenant access

-- ========================================
-- ENABLE RLS ON ALL TABLES
-- ========================================

-- User schema
ALTER TABLE user_schema.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schema.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schema.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schema.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schema.user_sessions ENABLE ROW LEVEL SECURITY;

-- Payment schema
ALTER TABLE payment_schema.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schema.logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schema.pricing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schema.reconciliation_reports ENABLE ROW LEVEL SECURITY;

-- Audit schema
ALTER TABLE audit_schema.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_schema.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_schema.error_logs ENABLE ROW LEVEL SECURITY;

-- Pricing schema
ALTER TABLE pricing_schema.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_schema.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_schema.currency_rates ENABLE ROW LEVEL SECURITY;

-- ========================================
-- HELPER FUNCTIONS FOR RLS
-- ========================================

-- Function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION auth.has_role(role_name TEXT) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_schema.user_roles ur
        JOIN user_schema.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.user_id()
        AND r.name = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.has_role('admin') OR auth.has_role('super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- USER SCHEMA POLICIES
-- ========================================

-- Users table policies
CREATE POLICY "Users can view their own profile" ON user_schema.users
    FOR SELECT USING (id = auth.user_id());

CREATE POLICY "Users can update their own profile" ON user_schema.users
    FOR UPDATE USING (id = auth.user_id());

CREATE POLICY "Admins can view all users" ON user_schema.users
    FOR SELECT USING (auth.is_admin());

CREATE POLICY "Admins can update all users" ON user_schema.users
    FOR UPDATE USING (auth.is_admin());

CREATE POLICY "Service role can manage users" ON user_schema.users
    FOR ALL USING (current_user = 'service_role');

-- Roles table policies
CREATE POLICY "Anyone can view roles" ON user_schema.roles
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage roles" ON user_schema.roles
    FOR ALL USING (auth.is_admin());

-- User roles policies
CREATE POLICY "Users can view their own roles" ON user_schema.user_roles
    FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "Admins can manage user roles" ON user_schema.user_roles
    FOR ALL USING (auth.is_admin());

-- Refresh tokens policies
CREATE POLICY "Users can manage their own refresh tokens" ON user_schema.refresh_tokens
    FOR ALL USING (user_id = auth.user_id());

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_schema.user_sessions
    FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "Users can delete their own sessions" ON user_schema.user_sessions
    FOR DELETE USING (user_id = auth.user_id());

-- ========================================
-- PAYMENT SCHEMA POLICIES
-- ========================================

-- Transactions table policies
CREATE POLICY "Users can view their own transactions" ON payment_schema.transactions
    FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "Users can create their own transactions" ON payment_schema.transactions
    FOR INSERT WITH CHECK (user_id = auth.user_id());

CREATE POLICY "Service can update transactions" ON payment_schema.transactions
    FOR UPDATE USING (current_user = 'service_role');

CREATE POLICY "Admins can view all transactions" ON payment_schema.transactions
    FOR SELECT USING (auth.is_admin());

-- Logbook entries policies
CREATE POLICY "Users can manage their own logbook entries" ON payment_schema.logbook_entries
    FOR ALL USING (user_id = auth.user_id());

CREATE POLICY "Admins can view all logbook entries" ON payment_schema.logbook_entries
    FOR SELECT USING (auth.is_admin());

-- Pricing snapshots policies
CREATE POLICY "Users can view pricing snapshots for their transactions" ON payment_schema.pricing_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payment_schema.transactions t
            WHERE t.id = transaction_id AND t.user_id = auth.user_id()
        )
    );

CREATE POLICY "Service can manage pricing snapshots" ON payment_schema.pricing_snapshots
    FOR ALL USING (current_user = 'service_role');

-- Reconciliation reports policies
CREATE POLICY "Admins can view reconciliation reports" ON payment_schema.reconciliation_reports
    FOR SELECT USING (auth.is_admin());

CREATE POLICY "Service can create reconciliation reports" ON payment_schema.reconciliation_reports
    FOR INSERT WITH CHECK (current_user = 'service_role');

-- ========================================
-- AUDIT SCHEMA POLICIES
-- ========================================

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON audit_schema.audit_logs
    FOR SELECT USING (actor_user_id = auth.user_id());

CREATE POLICY "Admins can view all audit logs" ON audit_schema.audit_logs
    FOR SELECT USING (auth.is_admin());

CREATE POLICY "Service can create audit logs" ON audit_schema.audit_logs
    FOR INSERT WITH CHECK (current_user = 'service_role');

-- System events policies
CREATE POLICY "Admins can view system events" ON audit_schema.system_events
    FOR SELECT USING (auth.is_admin());

CREATE POLICY "Service can create system events" ON audit_schema.system_events
    FOR INSERT WITH CHECK (current_user = 'service_role');

-- Error logs policies
CREATE POLICY "Admins can manage error logs" ON audit_schema.error_logs
    FOR ALL USING (auth.is_admin());

CREATE POLICY "Service can create error logs" ON audit_schema.error_logs
    FOR INSERT WITH CHECK (current_user = 'service_role');

-- ========================================
-- PRICING SCHEMA POLICIES
-- ========================================

-- Prices table policies
CREATE POLICY "Anyone can view active prices" ON pricing_schema.prices
    FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage prices" ON pricing_schema.prices
    FOR ALL USING (auth.is_admin());

CREATE POLICY "Service can manage prices" ON pricing_schema.prices
    FOR ALL USING (current_user = 'service_role');

-- Price history policies
CREATE POLICY "Admins can view price history" ON pricing_schema.price_history
    FOR SELECT USING (auth.is_admin());

CREATE POLICY "Service can create price history" ON pricing_schema.price_history
    FOR INSERT WITH CHECK (current_user = 'service_role');

-- Currency rates policies
CREATE POLICY "Anyone can view currency rates" ON pricing_schema.currency_rates
    FOR SELECT USING (true);

CREATE POLICY "Service can manage currency rates" ON pricing_schema.currency_rates
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Admins can manage currency rates" ON pricing_schema.currency_rates
    FOR ALL USING (auth.is_admin());

-- ========================================
-- GRANT PERMISSIONS TO ROLES
-- ========================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA user_schema TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA payment_schema TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA audit_schema TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA pricing_schema TO anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA user_schema TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA payment_schema TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA audit_schema TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pricing_schema TO service_role;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA user_schema TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA payment_schema TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA audit_schema TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pricing_schema TO service_role;

-- Grant limited permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_schema.users TO authenticated;
GRANT SELECT ON user_schema.roles TO authenticated;
GRANT SELECT ON user_schema.user_roles TO authenticated;
GRANT ALL ON user_schema.refresh_tokens TO authenticated;
GRANT ALL ON user_schema.user_sessions TO authenticated;

GRANT SELECT, INSERT, UPDATE ON payment_schema.transactions TO authenticated;
GRANT ALL ON payment_schema.logbook_entries TO authenticated;
GRANT SELECT ON payment_schema.pricing_snapshots TO authenticated;

GRANT SELECT ON audit_schema.audit_logs TO authenticated;

GRANT SELECT ON pricing_schema.prices TO authenticated;
GRANT SELECT ON pricing_schema.currency_rates TO authenticated;

-- Grant read-only access to anon for public data
GRANT SELECT ON pricing_schema.prices TO anon;
GRANT SELECT ON pricing_schema.currency_rates TO anon;
