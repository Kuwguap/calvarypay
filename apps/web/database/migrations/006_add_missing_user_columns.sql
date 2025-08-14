-- Migration: 006_add_missing_user_columns.sql
-- Add missing columns to calvary_users table for merchant dashboard functionality

-- Add company_id column to link employees to merchants
ALTER TABLE calvary_users 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES calvary_users(id) ON DELETE SET NULL;

-- Add status column (replaces is_active with more granular status)
ALTER TABLE calvary_users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));

-- Add department column for employee organization
ALTER TABLE calvary_users 
ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'General';

-- Add spending_limit column for employee budget management
ALTER TABLE calvary_users 
ADD COLUMN IF NOT EXISTS spending_limit_minor INTEGER DEFAULT 0;

-- Add last_login column for activity tracking
ALTER TABLE calvary_users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add metadata column for additional employee data
ALTER TABLE calvary_users 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calvary_users_company_id ON calvary_users(company_id);
CREATE INDEX IF NOT EXISTS idx_calvary_users_status ON calvary_users(status);
CREATE INDEX IF NOT EXISTS idx_calvary_users_department ON calvary_users(department);
CREATE INDEX IF NOT EXISTS idx_calvary_users_last_login ON calvary_users(last_login);

-- Update existing users to have proper status
UPDATE calvary_users 
SET status = CASE 
  WHEN is_active = true THEN 'active'
  ELSE 'inactive'
END
WHERE status IS NULL;

-- Add comment to table
COMMENT ON TABLE calvary_users IS 'Enhanced user table with company, department, and status information for merchant dashboard functionality'; 