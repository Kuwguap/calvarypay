-- Migration: Add role field to users table for CalvaryPay signup integration
-- This migration adds a direct role field to the users table to match the signup form structure

-- Add role column to users table
ALTER TABLE user_schema.users 
ADD COLUMN role VARCHAR(50) DEFAULT 'customer';

-- Add check constraint for valid roles
ALTER TABLE user_schema.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('customer', 'employee', 'merchant', 'admin'));

-- Create index for role queries
CREATE INDEX idx_users_role ON user_schema.users(role);

-- Insert default roles into roles table if they don't exist
INSERT INTO user_schema.roles (name, description) VALUES 
('customer', 'Regular customer user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_schema.roles (name, description) VALUES 
('employee', 'Employee user with extended permissions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_schema.roles (name, description) VALUES 
('merchant', 'Merchant user with business features')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_schema.roles (name, description) VALUES 
('admin', 'Administrator with full system access')
ON CONFLICT (name) DO NOTHING;

-- Update existing users to have customer role if null
UPDATE user_schema.users 
SET role = 'customer' 
WHERE role IS NULL;

-- Make role NOT NULL after setting defaults
ALTER TABLE user_schema.users 
ALTER COLUMN role SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_schema.users.role IS 'Direct role assignment for user (customer, employee, merchant, admin)';

-- Create function to sync role changes to user_roles table (optional, for compatibility)
CREATE OR REPLACE FUNCTION sync_user_role() RETURNS TRIGGER AS $$
BEGIN
    -- Remove existing role assignments for this user
    DELETE FROM user_schema.user_roles WHERE user_id = NEW.id;
    
    -- Add new role assignment
    INSERT INTO user_schema.user_roles (user_id, role_id)
    SELECT NEW.id, r.id
    FROM user_schema.roles r
    WHERE r.name = NEW.role;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync role changes
DROP TRIGGER IF EXISTS trigger_sync_user_role ON user_schema.users;
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE OF role ON user_schema.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- Grant necessary permissions for web app
GRANT SELECT, INSERT, UPDATE ON user_schema.users TO anon;
GRANT SELECT ON user_schema.roles TO anon;
GRANT USAGE ON SCHEMA user_schema TO anon;
