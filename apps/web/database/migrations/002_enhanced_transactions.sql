-- Enhanced Transactions Table for CalvaryPay
-- Migration: 002_enhanced_transactions.sql

-- Drop existing transactions table if it exists (for development)
-- DROP TABLE IF EXISTS transactions CASCADE;

-- Enhanced transactions table with Paystack integration
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paystack_reference VARCHAR(255) UNIQUE NOT NULL,
    paystack_id BIGINT,
    paystack_access_code VARCHAR(255),
    authorization_url TEXT,
    
    -- Transaction details
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'GHS', 'KES', 'ZAR')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'cancelled')),
    
    -- Payment details
    payment_method VARCHAR(50),
    channel VARCHAR(50),
    gateway_response TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Fees and charges
    fees_minor INTEGER DEFAULT 0,
    transaction_charge_minor INTEGER DEFAULT 0,
    
    -- Additional information
    description TEXT,
    customer_email VARCHAR(255),
    ip_address INET,
    
    -- Metadata and audit
    metadata JSONB DEFAULT '{}',
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logbook entries table for expense tracking
CREATE TABLE IF NOT EXISTS logbook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Entry details
    type VARCHAR(50) NOT NULL CHECK (type IN ('fuel', 'maintenance', 'toll', 'parking', 'food', 'accommodation', 'other')),
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'GHS', 'KES', 'ZAR')),
    
    -- Description and notes
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    
    -- Location information
    location_name VARCHAR(255),
    location_coordinates POINT,
    location_address TEXT,
    
    -- Receipt and proof
    receipt_url TEXT,
    receipt_filename VARCHAR(255),
    receipt_size INTEGER,
    receipt_mime_type VARCHAR(100),
    
    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_transaction_id UUID REFERENCES transactions(id),
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by UUID REFERENCES users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Timestamps
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment reconciliation table for matching transactions with logbook entries
CREATE TABLE IF NOT EXISTS payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    logbook_entry_id UUID NOT NULL REFERENCES logbook_entries(id) ON DELETE CASCADE,
    
    -- Reconciliation details
    reconciliation_type VARCHAR(20) NOT NULL DEFAULT 'automatic' CHECK (reconciliation_type IN ('automatic', 'manual', 'bulk')),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Matching criteria
    amount_match BOOLEAN DEFAULT FALSE,
    time_match BOOLEAN DEFAULT FALSE,
    location_match BOOLEAN DEFAULT FALSE,
    description_match BOOLEAN DEFAULT FALSE,
    
    -- Reconciliation metadata
    reconciled_by UUID NOT NULL REFERENCES users(id),
    reconciliation_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique reconciliation pairs
    UNIQUE(transaction_id, logbook_entry_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_paystack_reference ON transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_paid_at ON transactions(paid_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled ON transactions(reconciled) WHERE reconciled = FALSE;

CREATE INDEX IF NOT EXISTS idx_logbook_entries_user_id ON logbook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_logbook_entries_type ON logbook_entries(type);
CREATE INDEX IF NOT EXISTS idx_logbook_entries_entry_date ON logbook_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_logbook_entries_reconciled ON logbook_entries(is_reconciled) WHERE is_reconciled = FALSE;
CREATE INDEX IF NOT EXISTS idx_logbook_entries_location ON logbook_entries USING GIST(location_coordinates);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_transaction_id ON payment_reconciliations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_logbook_entry_id ON payment_reconciliations(logbook_entry_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_type ON payment_reconciliations(reconciliation_type);

-- Row Level Security (RLS) policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Logbook entries policies
CREATE POLICY "Users can manage their own logbook entries" ON logbook_entries
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all logbook entries" ON logbook_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Payment reconciliations policies
CREATE POLICY "Users can view reconciliations for their transactions" ON payment_reconciliations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.id = payment_reconciliations.transaction_id 
            AND t.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM logbook_entries l 
            WHERE l.id = payment_reconciliations.logbook_entry_id 
            AND l.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reconciliations for their data" ON payment_reconciliations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.id = payment_reconciliations.transaction_id 
            AND t.user_id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM logbook_entries l 
            WHERE l.id = payment_reconciliations.logbook_entry_id 
            AND l.user_id = auth.uid()
        )
    );

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logbook_entries_updated_at
    BEFORE UPDATE ON logbook_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update reconciliation status
CREATE OR REPLACE FUNCTION update_reconciliation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update transaction reconciliation status
    UPDATE transactions 
    SET reconciled = TRUE, reconciled_at = NOW(), reconciled_by = NEW.reconciled_by
    WHERE id = NEW.transaction_id;
    
    -- Update logbook entry reconciliation status
    UPDATE logbook_entries 
    SET is_reconciled = TRUE, reconciled_transaction_id = NEW.transaction_id, 
        reconciled_at = NOW(), reconciled_by = NEW.reconciled_by
    WHERE id = NEW.logbook_entry_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic reconciliation status updates
CREATE TRIGGER update_reconciliation_status_trigger
    AFTER INSERT ON payment_reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION update_reconciliation_status();

-- Function to calculate reconciliation confidence score
CREATE OR REPLACE FUNCTION calculate_reconciliation_confidence(
    p_transaction_id UUID,
    p_logbook_entry_id UUID
) RETURNS DECIMAL(3,2) AS $$
DECLARE
    confidence_score DECIMAL(3,2) := 0;
    amount_match BOOLEAN := FALSE;
    time_match BOOLEAN := FALSE;
    location_match BOOLEAN := FALSE;
BEGIN
    -- Check amount match (within 1% tolerance)
    SELECT ABS(t.amount_minor - l.amount_minor) <= (t.amount_minor * 0.01)
    INTO amount_match
    FROM transactions t, logbook_entries l
    WHERE t.id = p_transaction_id AND l.id = p_logbook_entry_id;
    
    -- Check time match (within 24 hours)
    SELECT ABS(EXTRACT(EPOCH FROM (t.paid_at - l.created_at))) <= 86400
    INTO time_match
    FROM transactions t, logbook_entries l
    WHERE t.id = p_transaction_id AND l.id = p_logbook_entry_id;
    
    -- Calculate confidence score
    IF amount_match THEN confidence_score := confidence_score + 0.5; END IF;
    IF time_match THEN confidence_score := confidence_score + 0.3; END IF;
    
    -- Additional factors can be added here
    
    RETURN LEAST(confidence_score, 1.0);
END;
$$ LANGUAGE plpgsql;
