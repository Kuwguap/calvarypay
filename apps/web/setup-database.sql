-- CalvaryPay Database Setup for Supabase
-- Run this in the Supabase SQL Editor to create the required tables

-- Create calvary_users table (separate from Supabase auth.users)
CREATE TABLE IF NOT EXISTS calvary_users (
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

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_calvary_users_role ON calvary_users(role);
CREATE INDEX IF NOT EXISTS idx_calvary_users_email ON calvary_users(email);

-- Enable Row Level Security
ALTER TABLE calvary_users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (more permissive for CalvaryPay)
-- Allow public access for registration and authentication
CREATE POLICY "Allow public access to calvary_users" ON calvary_users
    FOR ALL USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON calvary_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON calvary_users TO authenticated;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_calvary_users_updated_at ON calvary_users;
CREATE TRIGGER update_calvary_users_updated_at
    BEFORE UPDATE ON calvary_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
