-- Employee Transfers Table for CalvaryPay
-- Migration: 004_employee_transfers.sql

-- Employee transfers table for tracking employee-to-employee transfers
CREATE TABLE IF NOT EXISTS employee_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transfer details
    transfer_reference VARCHAR(255) UNIQUE NOT NULL,
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS' CHECK (currency IN ('GHS', 'NGN', 'USD', 'EUR', 'GBP', 'ZAR')),
    
    -- Sender information (employee)
    sender_id UUID NOT NULL REFERENCES calvary_users(id) ON DELETE CASCADE,
    sender_company_id UUID NOT NULL REFERENCES calvary_users(id) ON DELETE CASCADE,
    
    -- Recipient information (employee)
    recipient_id UUID NOT NULL REFERENCES calvary_users(id) ON DELETE CASCADE,
    recipient_company_id UUID,
    
    -- Transfer metadata
    reason TEXT,
    description TEXT,
    transfer_type VARCHAR(50) NOT NULL DEFAULT 'employee_to_employee' CHECK (transfer_type IN ('employee_to_employee', 'company_to_employee', 'employee_to_company')),
    
    -- Status and processing
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Fees and charges
    transfer_fee_minor INTEGER DEFAULT 0,
    net_amount_minor INTEGER NOT NULL,
    
    -- Audit and tracking
    created_by UUID NOT NULL REFERENCES calvary_users(id),
    approved_by UUID REFERENCES calvary_users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_transfers_sender_id ON employee_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_recipient_id ON employee_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_sender_company_id ON employee_transfers(sender_company_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_status ON employee_transfers(status);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_created_at ON employee_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_transfer_reference ON employee_transfers(transfer_reference);

-- Transfer audit log table for detailed tracking
CREATE TABLE IF NOT EXISTS transfer_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES employee_transfers(id) ON DELETE CASCADE,
    
    -- Audit details
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'approved', 'processed', 'completed', 'failed', 'cancelled')),
    performed_by UUID NOT NULL REFERENCES calvary_users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Action details
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_transfer_audit_log_transfer_id ON transfer_audit_log(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_audit_log_performed_by ON transfer_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_transfer_audit_log_performed_at ON transfer_audit_log(performed_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_employee_transfers_updated_at 
    BEFORE UPDATE ON employee_transfers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate transfer reference
CREATE OR REPLACE FUNCTION generate_transfer_reference()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN 'TRF_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
           SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Default value for transfer_reference
ALTER TABLE employee_transfers 
ALTER COLUMN transfer_reference SET DEFAULT generate_transfer_reference();

-- Comments for documentation
COMMENT ON TABLE employee_transfers IS 'Tracks employee-to-employee and company-to-employee transfers';
COMMENT ON TABLE transfer_audit_log IS 'Audit trail for all transfer actions and status changes';
COMMENT ON COLUMN employee_transfers.transfer_reference IS 'Unique reference for the transfer (auto-generated)';
COMMENT ON COLUMN employee_transfers.amount_minor IS 'Transfer amount in smallest currency unit (e.g., pesewas for GHS)';
COMMENT ON COLUMN employee_transfers.net_amount_minor IS 'Amount after deducting transfer fees';
COMMENT ON COLUMN employee_transfers.sender_company_id IS 'Company ID of the sender (for company-to-employee transfers)';
COMMENT ON COLUMN employee_transfers.recipient_company_id IS 'Company ID of the recipient (NULL for employee-to-employee)'; 