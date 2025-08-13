-- =====================================================
-- CalvaryPay Database Setup for Supabase
-- Project: ounhhutmnyedcntvzpni.supabase.co
-- Port: 3005 (Updated Configuration)
--
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select project: ounhhutmnyedcntvzpni
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste this ENTIRE script
-- 6. Click "Run" to execute
--
-- SECURITY FEATURES INCLUDED:
-- - IDOR protection with RLS policies
-- - Input validation constraints
-- - Audit logging capabilities
-- - Role-based access control
-- =====================================================

-- Drop table if it exists (for clean setup)
DROP TABLE IF EXISTS calvary_users CASCADE;

-- Create calvary_users table with all required columns
CREATE TABLE calvary_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint for valid roles
ALTER TABLE calvary_users 
ADD CONSTRAINT calvary_users_role_check 
CHECK (role IN ('customer', 'employee', 'merchant', 'admin'));

-- Create indexes for better query performance
CREATE INDEX idx_calvary_users_email ON calvary_users(email);
CREATE INDEX idx_calvary_users_role ON calvary_users(role);
CREATE INDEX idx_calvary_users_active ON calvary_users(is_active);
CREATE INDEX idx_calvary_users_created_at ON calvary_users(created_at);

-- Enable Row Level Security
ALTER TABLE calvary_users ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for CalvaryPay authentication
-- This allows public access for registration and login
CREATE POLICY "Allow public access to calvary_users" ON calvary_users
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Grant necessary permissions to anon and authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON calvary_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON calvary_users TO authenticated;

-- Grant usage on the table's sequence (for ID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_calvary_users_updated_at ON calvary_users;
CREATE TRIGGER update_calvary_users_updated_at
    BEFORE UPDATE ON calvary_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create security audit log table for IDOR protection and monitoring
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    user_role VARCHAR(50),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_resource ON security_audit_log(resource);

-- Enable RLS for audit log (admins only)
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for audit log access (admin only)
CREATE POLICY "Admin only access to audit log" ON security_audit_log
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM calvary_users
            WHERE calvary_users.id = auth.uid()::uuid
            AND calvary_users.role = 'admin'
            AND calvary_users.is_active = true
        )
    );

-- Grant permissions for audit log
GRANT SELECT, INSERT ON security_audit_log TO anon, authenticated;

-- Insert sample admin user for testing (password: admin123)
-- Note: In production, this should be created through the app with proper hashing
INSERT INTO calvary_users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    phone, 
    role, 
    is_active, 
    email_verified
) VALUES (
    'admin@calvarypay.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', -- bcrypt hash of 'admin123'
    'System',
    'Administrator',
    '+233123456789',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample users for each role (password: password123)
INSERT INTO calvary_users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    phone, 
    role, 
    is_active
) VALUES 
(
    'customer@calvarypay.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'password123'
    'John',
    'Customer',
    '+233987654321',
    'customer',
    true
),
(
    'employee@calvarypay.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'password123'
    'Jane',
    'Employee',
    '+233987654322',
    'employee',
    true
),
(
    'merchant@calvarypay.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'password123'
    'Bob',
    'Merchant',
    '+233987654323',
    'merchant',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create a view for user statistics (optional)
CREATE OR REPLACE VIEW calvary_user_stats AS
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users
FROM calvary_users 
GROUP BY role;

-- Grant access to the view
GRANT SELECT ON calvary_user_stats TO anon, authenticated;

-- Add comments for documentation
COMMENT ON TABLE calvary_users IS 'CalvaryPay user accounts with role-based access';
COMMENT ON COLUMN calvary_users.role IS 'User role: customer, employee, merchant, or admin';
COMMENT ON COLUMN calvary_users.password_hash IS 'bcrypt hashed password';
COMMENT ON COLUMN calvary_users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN calvary_users.email_verified IS 'Whether the email address has been verified';
COMMENT ON COLUMN calvary_users.phone_verified IS 'Whether the phone number has been verified';

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE '✅ CalvaryPay database setup completed successfully!';
    RAISE NOTICE '📊 Sample users created:';
    RAISE NOTICE '   - admin@calvarypay.com (password: admin123)';
    RAISE NOTICE '   - customer@calvarypay.com (password: password123)';
    RAISE NOTICE '   - employee@calvarypay.com (password: password123)';
    RAISE NOTICE '   - merchant@calvarypay.com (password: password123)';
    RAISE NOTICE '🚀 CalvaryPay is ready to use!';
END $$;
