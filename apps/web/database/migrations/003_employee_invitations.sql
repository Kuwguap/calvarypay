-- CalvaryPay Employee Invitations Table
-- Migration: 003_employee_invitations.sql

-- Create employee_invitations table for merchant-to-employee invitations
CREATE TABLE IF NOT EXISTS employee_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_id UUID NOT NULL, -- References the merchant's user ID
    invited_by UUID NOT NULL, -- References the merchant who sent the invitation
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}', -- Store department, spending_limit, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE employee_invitations 
ADD CONSTRAINT fk_employee_invitations_company_id 
FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE employee_invitations 
ADD CONSTRAINT fk_employee_invitations_invited_by 
FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_employee_invitations_email ON employee_invitations(email);
CREATE INDEX idx_employee_invitations_company_id ON employee_invitations(company_id);
CREATE INDEX idx_employee_invitations_token ON employee_invitations(invitation_token);
CREATE INDEX idx_employee_invitations_status ON employee_invitations(status);
CREATE INDEX idx_employee_invitations_expires_at ON employee_invitations(expires_at);

-- Add unique constraint to prevent duplicate pending invitations
CREATE UNIQUE INDEX idx_employee_invitations_unique_pending 
ON employee_invitations(email, company_id) 
WHERE status = 'pending';

-- Add company_id column to users table to link employees to merchants
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add foreign key constraint for company_id
ALTER TABLE users 
ADD CONSTRAINT fk_users_company_id 
FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for company_id queries
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Add metadata column to users table for additional employee data
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add last_login column to users table for tracking activity
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE employee_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_employee_invitations_updated_at
    BEFORE UPDATE ON employee_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_invitations_updated_at();

-- Enable RLS on employee_invitations table
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee_invitations
CREATE POLICY "Merchants can view their own invitations" ON employee_invitations
    FOR SELECT USING (company_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "Merchants can create invitations" ON employee_invitations
    FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Merchants can update their own invitations" ON employee_invitations
    FOR UPDATE USING (company_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "Invited users can view their invitations" ON employee_invitations
    FOR SELECT USING (email = auth.email());

-- Create policy for users table to allow employees to see company members
CREATE POLICY "Company members can view each other" ON users
    FOR SELECT USING (
        company_id = auth.uid() OR -- Merchant can see their employees
        company_id = (SELECT company_id FROM users WHERE id = auth.uid()) -- Employees can see company members
    );

-- Add comments for documentation
COMMENT ON TABLE employee_invitations IS 'Stores invitations sent by merchants to potential employees';
COMMENT ON COLUMN employee_invitations.company_id IS 'ID of the merchant/company sending the invitation';
COMMENT ON COLUMN employee_invitations.invited_by IS 'ID of the user who sent the invitation';
COMMENT ON COLUMN employee_invitations.invitation_token IS 'Unique token for accepting the invitation';
COMMENT ON COLUMN employee_invitations.metadata IS 'Additional data like department, spending_limit, etc.';
COMMENT ON COLUMN users.company_id IS 'ID of the company/merchant this user belongs to (for employees)';
COMMENT ON COLUMN users.metadata IS 'Additional user data like department, spending_limit, etc.';

-- Insert sample data for testing (optional)
-- This can be removed in production
/*
INSERT INTO employee_invitations (
    email, 
    first_name, 
    last_name, 
    company_id, 
    invited_by, 
    invitation_token, 
    expires_at,
    metadata
) VALUES (
    'test.employee@example.com',
    'Test',
    'Employee',
    (SELECT id FROM users WHERE role = 'merchant' LIMIT 1),
    (SELECT id FROM users WHERE role = 'merchant' LIMIT 1),
    'test_invitation_token_123',
    NOW() + INTERVAL '7 days',
    '{"department": "operations", "spending_limit": 5000}'
) ON CONFLICT DO NOTHING;
*/
