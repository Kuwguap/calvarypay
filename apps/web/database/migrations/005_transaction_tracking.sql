-- Transaction Tracking System for CalvaryPay
-- Migration: 005_transaction_tracking.sql

-- Main transactions table for all financial activities
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction details
    transaction_reference VARCHAR(255) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'deposit', 'withdrawal', 'transfer_sent', 'transfer_received', 
        'budget_allocation', 'budget_spent', 'fee_charge', 'refund'
    )),
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS' CHECK (currency IN ('GHS', 'NGN', 'USD', 'EUR', 'GBP', 'ZAR')),
    
    -- Parties involved
    sender_id UUID REFERENCES calvary_users(id) ON DELETE SET NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('employee', 'merchant', 'company', 'system')),
    recipient_id UUID REFERENCES calvary_users(id) ON DELETE SET NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('employee', 'merchant', 'company', 'system')),
    
    -- Transfer-specific details
    transfer_id UUID REFERENCES employee_transfers(id) ON DELETE SET NULL,
    fee_amount_minor INTEGER DEFAULT 0,
    net_amount_minor INTEGER NOT NULL,
    
    -- Business context
    reason TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Status and processing
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit and tracking
    created_by UUID NOT NULL REFERENCES calvary_users(id),
    approved_by UUID REFERENCES calvary_users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction audit log for detailed tracking
CREATE TABLE IF NOT EXISTS transaction_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    
    -- Audit details
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'approved', 'processed', 'completed', 'failed', 'cancelled', 'reversed')),
    performed_by UUID NOT NULL REFERENCES calvary_users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Action details
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Balance history table for tracking balance changes over time
CREATE TABLE IF NOT EXISTS balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES calvary_users(id) ON DELETE CASCADE,
    
    -- Balance details
    previous_balance_minor INTEGER NOT NULL,
    new_balance_minor INTEGER NOT NULL,
    change_amount_minor INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
    
    -- Transaction reference
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    transaction_reference VARCHAR(255),
    
    -- Context
    change_reason TEXT,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
        'deposit', 'withdrawal', 'transfer', 'allocation', 'fee', 'adjustment'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction ON transaction_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_performed_by ON transaction_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_performed_at ON transaction_audit_log(performed_at);

CREATE INDEX IF NOT EXISTS idx_balance_history_user ON balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_transaction ON balance_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_created_at ON balance_history(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_transactions_updated_at();

-- Function to generate transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference(transaction_type VARCHAR)
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN UPPER(transaction_type) || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
           SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Function to log balance change
CREATE OR REPLACE FUNCTION log_balance_change(
    p_user_id UUID,
    p_previous_balance_minor INTEGER,
    p_new_balance_minor INTEGER,
    p_transaction_id UUID DEFAULT NULL,
    p_transaction_reference VARCHAR DEFAULT NULL,
    p_change_reason TEXT DEFAULT NULL,
    p_change_type VARCHAR DEFAULT 'adjustment'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO balance_history (
        user_id, previous_balance_minor, new_balance_minor, change_amount_minor,
        transaction_id, transaction_reference, change_reason, change_type
    ) VALUES (
        p_user_id, p_previous_balance_minor, p_new_balance_minor, 
        p_new_balance_minor - p_previous_balance_minor,
        p_transaction_id, p_transaction_reference, p_change_reason, p_change_type
    );
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE transactions IS 'Main transactions table for all financial activities in CalvaryPay';
COMMENT ON TABLE transaction_audit_log IS 'Detailed audit log for all transaction status changes';
COMMENT ON TABLE balance_history IS 'Historical record of all balance changes for audit purposes';
COMMENT ON COLUMN transactions.transaction_reference IS 'Unique reference for the transaction (auto-generated)';
COMMENT ON COLUMN transactions.amount_minor IS 'Transaction amount in smallest currency unit (e.g., pesewas for GHS)';
COMMENT ON COLUMN transactions.net_amount_minor IS 'Amount after deducting fees';
COMMENT ON COLUMN transactions.metadata IS 'Additional transaction data in JSON format'; 