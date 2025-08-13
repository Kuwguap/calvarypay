-- ========================================
-- BALANCE SYSTEM MIGRATION
-- This migration creates the proper database structure for balances
-- replacing the file-based system with robust database tables
-- ========================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- BALANCE SCHEMA
-- ========================================

CREATE SCHEMA IF NOT EXISTS balance_schema;

-- ========================================
-- COMPANY BALANCES TABLE
-- ========================================

CREATE TABLE balance_schema.company_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    balance_minor BIGINT NOT NULL DEFAULT 0, -- Balance in minor units (pesewas for GHS)
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
    total_deposits_minor BIGINT NOT NULL DEFAULT 0,
    total_withdrawals_minor BIGINT NOT NULL DEFAULT 0,
    total_allocations_minor BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_balance_non_negative CHECK (balance_minor >= 0),
    CONSTRAINT chk_currency_valid CHECK (currency IN ('GHS', 'NGN', 'USD', 'EUR')),
    CONSTRAINT chk_amounts_non_negative CHECK (
        total_deposits_minor >= 0 AND 
        total_withdrawals_minor >= 0 AND 
        total_allocations_minor >= 0
    )
);

-- ========================================
-- EMPLOYEE BALANCES TABLE
-- ========================================

CREATE TABLE balance_schema.employee_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    company_id UUID NOT NULL,
    balance_minor BIGINT NOT NULL DEFAULT 0, -- Balance in minor units
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
    total_received_minor BIGINT NOT NULL DEFAULT 0,
    total_sent_minor BIGINT NOT NULL DEFAULT 0,
    total_allocations_minor BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_employee_balance_non_negative CHECK (balance_minor >= 0),
    CONSTRAINT chk_employee_currency_valid CHECK (currency IN ('GHS', 'NGN', 'USD', 'EUR')),
    CONSTRAINT chk_employee_amounts_non_negative CHECK (
        total_received_minor >= 0 AND 
        total_sent_minor >= 0 AND 
        total_allocations_minor >= 0
    )
);

-- ========================================
-- BALANCE TRANSACTIONS TABLE
-- ========================================

CREATE TABLE balance_schema.balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    entity_id UUID NOT NULL, -- Company ID or Employee ID
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('company', 'employee')),
    transaction_type VARCHAR(50) NOT NULL CHECK (
        transaction_type IN (
            'deposit', 'withdrawal', 'allocation', 'transfer_sent', 'transfer_received',
            'budget_credit', 'budget_debit', 'fee_charge', 'refund', 'adjustment'
        )
    ),
    amount_minor BIGINT NOT NULL, -- Amount in minor units
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
    previous_balance_minor BIGINT NOT NULL,
    new_balance_minor BIGINT NOT NULL,
    fee_minor BIGINT DEFAULT 0,
    net_amount_minor BIGINT NOT NULL,
    purpose TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    related_transaction_id UUID, -- For linking related transactions
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_amount_positive CHECK (amount_minor > 0),
    CONSTRAINT chk_balance_consistency CHECK (new_balance_minor >= 0),
    CONSTRAINT chk_net_amount_positive CHECK (net_amount_minor > 0)
);

-- ========================================
-- BUDGET ALLOCATIONS TABLE
-- ========================================

CREATE TABLE balance_schema.budget_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_reference VARCHAR(100) UNIQUE NOT NULL,
    employee_id UUID NOT NULL,
    company_id UUID NOT NULL,
    amount_minor BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
    budget_type VARCHAR(50) NOT NULL DEFAULT 'general',
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')
    ),
    allocated_by UUID NOT NULL, -- User ID who allocated the budget
    allocated_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_allocation_amount_positive CHECK (amount_minor > 0),
    CONSTRAINT chk_allocation_currency_valid CHECK (currency IN ('GHS', 'NGN', 'USD', 'EUR'))
);

-- ========================================
-- BALANCE HISTORY TABLE
-- ========================================

CREATE TABLE balance_schema.balance_history (
    id BIGSERIAL PRIMARY KEY,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('company', 'employee')),
    previous_balance_minor BIGINT NOT NULL,
    new_balance_minor BIGINT NOT NULL,
    change_amount_minor BIGINT NOT NULL,
    change_type VARCHAR(20) NOT NULL CHECK (
        change_type IN ('credit', 'debit', 'adjustment', 'allocation', 'transfer')
    ),
    transaction_reference VARCHAR(100),
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_balance_change_consistency CHECK (
        (change_type = 'credit' AND new_balance_minor > previous_balance_minor) OR
        (change_type = 'debit' AND new_balance_minor < previous_balance_minor) OR
        (change_type = 'adjustment')
    )
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Company balances indexes
CREATE INDEX idx_company_balances_company_id ON balance_schema.company_balances(company_id);
CREATE INDEX idx_company_balances_currency ON balance_schema.company_balances(currency);
CREATE INDEX idx_company_balances_last_updated ON balance_schema.company_balances(last_updated);

-- Employee balances indexes
CREATE INDEX idx_employee_balances_employee_id ON balance_schema.employee_balances(employee_id);
CREATE INDEX idx_employee_balances_company_id ON balance_schema.employee_balances(company_id);
CREATE INDEX idx_employee_balances_currency ON balance_schema.employee_balances(currency);
CREATE INDEX idx_employee_balances_last_updated ON balance_schema.employee_balances(last_updated);

-- Balance transactions indexes
CREATE INDEX idx_balance_transactions_entity_id ON balance_schema.balance_transactions(entity_id);
CREATE INDEX idx_balance_transactions_entity_type ON balance_schema.balance_transactions(entity_type);
CREATE INDEX idx_balance_transactions_transaction_type ON balance_schema.balance_transactions(transaction_type);
CREATE INDEX idx_balance_transactions_reference ON balance_schema.balance_transactions(transaction_reference);
CREATE INDEX idx_balance_transactions_processed_at ON balance_schema.balance_transactions(processed_at);
CREATE INDEX idx_balance_transactions_created_at ON balance_schema.balance_transactions(created_at);
CREATE INDEX idx_balance_transactions_entity_processed ON balance_schema.balance_transactions(entity_id, processed_at);

-- Budget allocations indexes
CREATE INDEX idx_budget_allocations_employee_id ON balance_schema.budget_allocations(employee_id);
CREATE INDEX idx_budget_allocations_company_id ON balance_schema.budget_allocations(company_id);
CREATE INDEX idx_budget_allocations_status ON balance_schema.budget_allocations(status);
CREATE INDEX idx_budget_allocations_allocated_at ON balance_schema.budget_allocations(allocated_at);
CREATE INDEX idx_budget_allocations_reference ON balance_schema.budget_allocations(allocation_reference);

-- Balance history indexes
CREATE INDEX idx_balance_history_entity_id ON balance_schema.balance_history(entity_id);
CREATE INDEX idx_balance_history_entity_type ON balance_schema.balance_history(entity_type);
CREATE INDEX idx_balance_history_timestamp ON balance_schema.balance_history(timestamp);
CREATE INDEX idx_balance_history_change_type ON balance_schema.balance_history(change_type);

-- GIN indexes for JSONB columns
CREATE INDEX idx_balance_transactions_metadata_gin ON balance_schema.balance_transactions USING GIN(metadata);
CREATE INDEX idx_budget_allocations_metadata_gin ON balance_schema.budget_allocations USING GIN(metadata);

-- ========================================
-- FUNCTIONS FOR BALANCE MANAGEMENT
-- ========================================

-- Function to update company balance
CREATE OR REPLACE FUNCTION balance_schema.update_company_balance(
    p_company_id UUID,
    p_amount_minor BIGINT,
    p_transaction_type VARCHAR(50),
    p_reference VARCHAR(100),
    p_purpose TEXT DEFAULT NULL
) RETURNS balance_schema.company_balances AS $$
DECLARE
    v_current_balance balance_schema.company_balances;
    v_new_balance_minor BIGINT;
    v_transaction_id UUID;
BEGIN
    -- Get current balance or create new one
    SELECT * INTO v_current_balance 
    FROM balance_schema.company_balances 
    WHERE company_id = p_company_id;
    
    IF v_current_balance IS NULL THEN
        -- Create new balance record
        INSERT INTO balance_schema.company_balances (
            company_id, balance_minor, currency, total_deposits_minor, 
            total_withdrawals_minor, total_allocations_minor
        ) VALUES (
            p_company_id, 0, 'GHS', 0, 0, 0
        ) RETURNING * INTO v_current_balance;
    END IF;
    
    -- Calculate new balance based on transaction type
    CASE p_transaction_type
        WHEN 'deposit' THEN
            v_new_balance_minor := v_current_balance.balance_minor + p_amount_minor;
        WHEN 'withdrawal' THEN
            v_new_balance_minor := v_current_balance.balance_minor - p_amount_minor;
        WHEN 'allocation' THEN
            v_new_balance_minor := v_current_balance.balance_minor - p_amount_minor;
        ELSE
            RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
    END CASE;
    
    -- Update company balance
    UPDATE balance_schema.company_balances 
    SET 
        balance_minor = v_new_balance_minor,
        total_deposits_minor = CASE WHEN p_transaction_type = 'deposit' 
            THEN total_deposits_minor + p_amount_minor 
            ELSE total_deposits_minor END,
        total_withdrawals_minor = CASE WHEN p_transaction_type = 'withdrawal' 
            THEN total_withdrawals_minor + p_amount_minor 
            ELSE total_withdrawals_minor END,
        total_allocations_minor = CASE WHEN p_transaction_type = 'allocation' 
            THEN total_allocations_minor + p_amount_minor 
            ELSE total_allocations_minor END,
        last_updated = NOW(),
        updated_at = NOW()
    WHERE company_id = p_company_id
    RETURNING * INTO v_current_balance;
    
    -- Log transaction
    INSERT INTO balance_schema.balance_transactions (
        transaction_reference, entity_id, entity_type, transaction_type,
        amount_minor, currency, previous_balance_minor, new_balance_minor,
        net_amount_minor, purpose, description
    ) VALUES (
        p_reference, p_company_id, 'company', p_transaction_type,
        p_amount_minor, v_current_balance.currency, 
        v_current_balance.balance_minor - CASE WHEN p_transaction_type = 'deposit' THEN p_amount_minor ELSE -p_amount_minor END,
        v_new_balance_minor, p_amount_minor, p_purpose, 
        p_transaction_type || ' transaction: ' || p_reference
    ) RETURNING id INTO v_transaction_id;
    
    -- Log balance history
    INSERT INTO balance_schema.balance_history (
        entity_id, entity_type, previous_balance_minor, new_balance_minor,
        change_amount_minor, change_type, transaction_reference, reason
    ) VALUES (
        p_company_id, 'company', 
        v_current_balance.balance_minor - CASE WHEN p_transaction_type = 'deposit' THEN p_amount_minor ELSE -p_amount_minor END,
        v_new_balance_minor, p_amount_minor,
        CASE WHEN p_transaction_type = 'deposit' THEN 'credit' ELSE 'debit' END,
        p_reference, p_purpose
    );
    
    RETURN v_current_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to update employee balance
CREATE OR REPLACE FUNCTION balance_schema.update_employee_balance(
    p_employee_id UUID,
    p_company_id UUID,
    p_amount_minor BIGINT,
    p_transaction_type VARCHAR(50),
    p_reference VARCHAR(100),
    p_description TEXT DEFAULT NULL
) RETURNS balance_schema.employee_balances AS $$
DECLARE
    v_current_balance balance_schema.employee_balances;
    v_new_balance_minor BIGINT;
    v_transaction_id UUID;
BEGIN
    -- Get current balance or create new one
    SELECT * INTO v_current_balance 
    FROM balance_schema.employee_balances 
    WHERE employee_id = p_employee_id;
    
    IF v_current_balance IS NULL THEN
        -- Create new balance record
        INSERT INTO balance_schema.employee_balances (
            employee_id, company_id, balance_minor, currency,
            total_received_minor, total_sent_minor, total_allocations_minor
        ) VALUES (
            p_employee_id, p_company_id, 0, 'GHS', 0, 0, 0
        ) RETURNING * INTO v_current_balance;
    END IF;
    
    -- Calculate new balance based on transaction type
    CASE p_transaction_type
        WHEN 'budget_credit', 'transfer_received' THEN
            v_new_balance_minor := v_current_balance.balance_minor + p_amount_minor;
        WHEN 'budget_debit', 'transfer_sent' THEN
            v_new_balance_minor := v_current_balance.balance_minor - p_amount_minor;
        ELSE
            RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
    END CASE;
    
    -- Update employee balance
    UPDATE balance_schema.employee_balances 
    SET 
        balance_minor = v_new_balance_minor,
        total_received_minor = CASE WHEN p_transaction_type IN ('budget_credit', 'transfer_received') 
            THEN total_received_minor + p_amount_minor 
            ELSE total_received_minor END,
        total_sent_minor = CASE WHEN p_transaction_type IN ('budget_debit', 'transfer_sent') 
            THEN total_sent_minor + p_amount_minor 
            ELSE total_sent_minor END,
        total_allocations_minor = CASE WHEN p_transaction_type = 'budget_credit' 
            THEN total_allocations_minor + p_amount_minor 
            ELSE total_allocations_minor END,
        last_updated = NOW(),
        updated_at = NOW()
    WHERE employee_id = p_employee_id
    RETURNING * INTO v_current_balance;
    
    -- Log transaction
    INSERT INTO balance_schema.balance_transactions (
        transaction_reference, entity_id, entity_type, transaction_type,
        amount_minor, currency, previous_balance_minor, new_balance_minor,
        net_amount_minor, purpose, description
    ) VALUES (
        p_reference, p_employee_id, 'employee', p_transaction_type,
        p_amount_minor, v_current_balance.currency, 
        v_current_balance.balance_minor - CASE WHEN p_transaction_type IN ('budget_credit', 'transfer_received') THEN p_amount_minor ELSE -p_amount_minor END,
        v_new_balance_minor, p_amount_minor, 
        p_transaction_type || ' transaction', p_description
    ) RETURNING id INTO v_transaction_id;
    
    -- Log balance history
    INSERT INTO balance_schema.balance_history (
        entity_id, entity_type, previous_balance_minor, new_balance_minor,
        change_amount_minor, change_type, transaction_reference, reason
    ) VALUES (
        p_employee_id, 'employee', 
        v_current_balance.balance_minor - CASE WHEN p_transaction_type IN ('budget_credit', 'transfer_received') THEN p_amount_minor ELSE -p_amount_minor END,
        v_new_balance_minor, p_amount_minor,
        CASE WHEN p_transaction_type IN ('budget_credit', 'transfer_received') THEN 'credit' ELSE 'debit' END,
        p_reference, p_description
    );
    
    RETURN v_current_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get company balance with transactions
CREATE OR REPLACE FUNCTION balance_schema.get_company_balance_with_transactions(
    p_company_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    balance_minor BIGINT,
    currency VARCHAR(3),
    last_updated TIMESTAMPTZ,
    total_deposits_minor BIGINT,
    total_withdrawals_minor BIGINT,
    total_allocations_minor BIGINT,
    recent_transactions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cb.balance_minor,
        cb.currency,
        cb.last_updated,
        cb.total_deposits_minor,
        cb.total_withdrawals_minor,
        cb.total_allocations_minor,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', bt.id,
                    'reference', bt.transaction_reference,
                    'type', bt.transaction_type,
                    'amount_minor', bt.amount_minor,
                    'currency', bt.currency,
                    'purpose', bt.purpose,
                    'processed_at', bt.processed_at
                ) ORDER BY bt.processed_at DESC
            ) FROM balance_schema.balance_transactions bt 
            WHERE bt.entity_id = p_company_id AND bt.entity_type = 'company'
            LIMIT p_limit),
            '[]'::jsonb
        ) as recent_transactions
    FROM balance_schema.company_balances cb
    WHERE cb.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get employee balance with transactions
CREATE OR REPLACE FUNCTION balance_schema.get_employee_balance_with_transactions(
    p_employee_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    balance_minor BIGINT,
    currency VARCHAR(3),
    last_updated TIMESTAMPTZ,
    total_received_minor BIGINT,
    total_sent_minor BIGINT,
    total_allocations_minor BIGINT,
    recent_transactions JSONB,
    recent_allocations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eb.balance_minor,
        eb.currency,
        eb.last_updated,
        eb.total_received_minor,
        eb.total_sent_minor,
        eb.total_allocations_minor,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', bt.id,
                    'reference', bt.transaction_reference,
                    'type', bt.transaction_type,
                    'amount_minor', bt.amount_minor,
                    'currency', bt.currency,
                    'description', bt.description,
                    'processed_at', bt.processed_at
                ) ORDER BY bt.processed_at DESC
            ) FROM balance_schema.balance_transactions bt 
            WHERE bt.entity_id = p_employee_id AND bt.entity_type = 'employee'
            LIMIT p_limit),
            '[]'::jsonb
        ) as recent_transactions,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ba.id,
                    'reference', ba.allocation_reference,
                    'amount_minor', ba.amount_minor,
                    'currency', ba.currency,
                    'budget_type', ba.budget_type,
                    'description', ba.description,
                    'status', ba.status,
                    'allocated_at', ba.allocated_at
                ) ORDER BY ba.allocated_at DESC
            ) FROM balance_schema.budget_allocations ba 
            WHERE ba.employee_id = p_employee_id
            LIMIT p_limit),
            '[]'::jsonb
        ) as recent_allocations
    FROM balance_schema.employee_balances eb
    WHERE eb.employee_id = p_employee_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION balance_schema.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER update_company_balances_updated_at
    BEFORE UPDATE ON balance_schema.company_balances
    FOR EACH ROW EXECUTE FUNCTION balance_schema.update_updated_at_column();

CREATE TRIGGER update_employee_balances_updated_at
    BEFORE UPDATE ON balance_schema.employee_balances
    FOR EACH ROW EXECUTE FUNCTION balance_schema.update_updated_at_column();

CREATE TRIGGER update_budget_allocations_updated_at
    BEFORE UPDATE ON balance_schema.budget_allocations
    FOR EACH ROW EXECUTE FUNCTION balance_schema.update_updated_at_column();

-- ========================================
-- INITIAL DATA SEEDING
-- ========================================

-- Insert default currencies if they don't exist
-- (This assumes you have a currency table, if not, you can create one)

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

COMMENT ON SCHEMA balance_schema IS 'Schema for managing company and employee balances with full transaction history';
COMMENT ON TABLE balance_schema.company_balances IS 'Stores current balance information for companies/merchants';
COMMENT ON TABLE balance_schema.employee_balances IS 'Stores current balance information for employees';
COMMENT ON TABLE balance_schema.balance_transactions IS 'Audit trail of all balance changes and transactions';
COMMENT ON TABLE balance_schema.budget_allocations IS 'Tracks budget allocations from companies to employees';
COMMENT ON TABLE balance_schema.balance_history IS 'Historical record of all balance changes for auditing';

-- Migration completed successfully! 