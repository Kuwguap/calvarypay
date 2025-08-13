-- CalvaryPay Simple Database Schema
-- Execute this in your Supabase SQL Editor: https://supabase.com/dashboard/project/diuaiagnlxsdqiaydghs/sql

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'customer',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage all users
CREATE POLICY IF NOT EXISTS "Service role can manage all users" 
ON users FOR ALL 
USING (auth.role() = 'service_role');

-- Create policy for authenticated users to read their own data
CREATE POLICY IF NOT EXISTS "Users can view their own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- Insert test users with hashed passwords
-- Password for admin@CalvaryPay.com: Admin123!
-- Password for test@CalvaryPay.com: Test123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'admin@CalvaryPay.com',
  '$2a$12$QYyJgDVX5eHZ3BBgGaMGPeQCM8jKjjnGFtPBvg7LwpIuS61ZP/jUu',
  'System',
  'Administrator',
  'admin',
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  'test@CalvaryPay.com',
  '$2a$12$Wa.qrvBKCy1D1aJEbcRPF.aVVXylUmDWgb0A6R83.KrCGcqquUv9y',
  'Test',
  'User',
  'customer',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;
