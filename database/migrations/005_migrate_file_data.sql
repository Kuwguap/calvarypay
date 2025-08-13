-- ========================================
-- DATA MIGRATION SCRIPT
-- Migrates existing file-based balance data to database tables
-- ========================================

-- This script should be run after the balance system migration (004_balance_system.sql)
-- It will migrate existing data from the JSON files to the new database structure

-- ========================================
-- MIGRATION FUNCTIONS
-- ========================================

-- Function to migrate company balances from file data
CREATE OR REPLACE FUNCTION balance_schema.migrate_company_balances_from_file(
    p_file_data JSONB
) RETURNS INTEGER AS $$
DECLARE
    v_company_id UUID;
    v_balance_data JSONB;
    v_transaction_data JSONB;
    v_transaction JSONB;
    v_migrated_count INTEGER := 0;
BEGIN
    -- Loop through each company in the file data
    FOR v_company_id, v_balance_data IN 
        SELECT * FROM jsonb_each(p_file_data)
    LOOP
        -- Insert or update company balance
        INSERT INTO balance_schema.company_balances (
            company_id,
            balance_minor,
            currency,
            total_deposits_minor,
            total_withdrawals_minor,
            total_allocations_minor,
            last_updated,
            created_at,
            updated_at
        ) VALUES (
            v_company_id::UUID,
            COALESCE((v_balance_data->>'balance')::BIGINT * 100, 0), -- Convert to minor units
            COALESCE(v_balance_data->>'currency', 'GHS'),
            COALESCE((v_balance_data->>'totalDeposits')::BIGINT * 100, 0),
            COALESCE((v_balance_data->>'totalWithdrawals')::BIGINT * 100, 0),
            0, -- Will be calculated from transactions
            COALESCE((v_balance_data->>'lastUpdated')::TIMESTAMPTZ, NOW()),
            NOW(),
            NOW()
        )
        ON CONFLICT (company_id) DO UPDATE SET
            balance_minor = EXCLUDED.balance_minor,
            currency = EXCLUDED.currency,
            total_deposits_minor = EXCLUDED.total_deposits_minor,
            total_withdrawals_minor = EXCLUDED.total_withdrawals_minor,
            last_updated = EXCLUDED.last_updated,
            updated_at = NOW();
        
        -- Migrate transactions if they exist
        IF v_balance_data ? 'transactions' THEN
            v_transaction_data := v_balance_data->'transactions';
            
            -- Loop through transactions
            FOR v_transaction IN 
                SELECT * FROM jsonb_array_elements(v_transaction_data)
            LOOP
                -- Insert transaction record
                INSERT INTO balance_schema.balance_transactions (
                    transaction_reference,
                    entity_id,
                    entity_type,
                    transaction_type,
                    amount_minor,
                    currency,
                    previous_balance_minor,
                    new_balance_minor,
                    net_amount_minor,
                    purpose,
                    description,
                    processed_at,
                    created_at
                ) VALUES (
                    COALESCE(v_transaction->>'reference', v_transaction->>'id'),
                    v_company_id::UUID,
                    'company',
                    CASE 
                        WHEN v_transaction->>'type' = 'credit' THEN 'deposit'
                        WHEN v_transaction->>'type' = 'debit' THEN 'withdrawal'
                        ELSE 'adjustment'
                    END,
                    COALESCE((v_transaction->>'amount')::BIGINT * 100, 0),
                    COALESCE(v_transaction->>'currency', 'GHS'),
                    0, -- Previous balance not available in file data
                    COALESCE((v_transaction->>'amount')::BIGINT * 100, 0), -- New balance
                    COALESCE((v_transaction->>'amount')::BIGINT * 100, 0),
                    COALESCE(v_transaction->>'purpose', 'Migrated from file'),
                    COALESCE(v_transaction->>'description', 'Transaction migrated from file data'),
                    COALESCE((v_transaction->>'timestamp')::TIMESTAMPTZ, NOW()),
                    NOW()
                );
            END LOOP;
        END IF;
        
        v_migrated_count := v_migrated_count + 1;
    END LOOP;
    
    RETURN v_migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate employee balances from file data
CREATE OR REPLACE FUNCTION balance_schema.migrate_employee_balances_from_file(
    p_file_data JSONB
) RETURNS INTEGER AS $$
DECLARE
    v_employee_id UUID;
    v_balance_data JSONB;
    v_transaction_data JSONB;
    v_allocation_data JSONB;
    v_transaction JSONB;
    v_allocation JSONB;
    v_migrated_count INTEGER := 0;
BEGIN
    -- Loop through each employee in the file data
    FOR v_employee_id, v_balance_data IN 
        SELECT * FROM jsonb_each(p_file_data)
    LOOP
        -- Insert or update employee balance
        INSERT INTO balance_schema.employee_balances (
            employee_id,
            company_id,
            balance_minor,
            currency,
            total_received_minor,
            total_sent_minor,
            total_allocations_minor,
            last_updated,
            created_at,
            updated_at
        ) VALUES (
            v_employee_id::UUID,
            COALESCE((v_balance_data->>'companyId')::UUID, 
                     (SELECT company_id FROM balance_schema.employee_balances WHERE employee_id = v_employee_id::UUID LIMIT 1)),
            COALESCE((v_balance_data->>'balance')::BIGINT * 100, 0), -- Convert to minor units
            COALESCE(v_balance_data->>'currency', 'GHS'),
            COALESCE((v_balance_data->>'totalReceived')::BIGINT * 100, 0),
            COALESCE((v_balance_data->>'totalSent')::BIGINT * 100, 0),
            COALESCE((v_balance_data->>'totalAllocations')::BIGINT * 100, 0),
            COALESCE((v_balance_data->>'lastUpdated')::TIMESTAMPTZ, NOW()),
            NOW(),
            NOW()
        )
        ON CONFLICT (employee_id) DO UPDATE SET
            balance_minor = EXCLUDED.balance_minor,
            currency = EXCLUDED.currency,
            total_received_minor = EXCLUDED.total_received_minor,
            total_sent_minor = EXCLUDED.total_sent_minor,
            total_allocations_minor = EXCLUDED.total_allocations_minor,
            last_updated = EXCLUDED.last_updated,
            updated_at = NOW();
        
        -- Migrate allocations if they exist
        IF v_balance_data ? 'allocations' THEN
            v_allocation_data := v_balance_data->'allocations';
            
            -- Loop through allocations
            FOR v_allocation IN 
                SELECT * FROM jsonb_array_elements(v_allocation_data)
            LOOP
                -- Insert allocation record
                INSERT INTO balance_schema.budget_allocations (
                    allocation_reference,
                    employee_id,
                    company_id,
                    amount_minor,
                    currency,
                    budget_type,
                    description,
                    status,
                    allocated_by,
                    allocated_at,
                    accepted_at,
                    created_at,
                    updated_at
                ) VALUES (
                    COALESCE(v_allocation->>'allocationId', v_allocation->>'reference'),
                    v_employee_id::UUID,
                    COALESCE((v_allocation->>'companyId')::UUID, 
                             (SELECT company_id FROM balance_schema.employee_balances WHERE employee_id = v_employee_id::UUID LIMIT 1)),
                    COALESCE((v_allocation->>'amount')::BIGINT * 100, 0),
                    COALESCE(v_allocation->>'currency', 'GHS'),
                    COALESCE(v_allocation->>'budgetType', 'general'),
                    COALESCE(v_allocation->>'description', 'Budget allocation migrated from file'),
                    COALESCE(v_allocation->>'status', 'accepted'),
                    COALESCE((v_allocation->>'allocatedBy')::UUID, 
                             (SELECT company_id FROM balance_schema.employee_balances WHERE employee_id = v_employee_id::UUID LIMIT 1)),
                    COALESCE((v_allocation->>'timestamp')::TIMESTAMPTZ, NOW()),
                    CASE WHEN v_allocation->>'status' = 'accepted' THEN 
                        COALESCE((v_allocation->>'timestamp')::TIMESTAMPTZ, NOW())
                    ELSE NULL END,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (allocation_reference) DO NOTHING;
            END LOOP;
        END IF;
        
        -- Migrate transactions if they exist
        IF v_balance_data ? 'transactions' THEN
            v_transaction_data := v_balance_data->'transactions';
            
            -- Loop through transactions
            FOR v_transaction IN 
                SELECT * FROM jsonb_array_elements(v_transaction_data)
            LOOP
                -- Insert transaction record
                INSERT INTO balance_schema.balance_transactions (
                    transaction_reference,
                    entity_id,
                    entity_type,
                    transaction_type,
                    amount_minor,
                    currency,
                    previous_balance_minor,
                    new_balance_minor,
                    net_amount_minor,
                    purpose,
                    description,
                    processed_at,
                    created_at
                ) VALUES (
                    COALESCE(v_transaction->>'reference', v_transaction->>'id'),
                    v_employee_id::UUID,
                    'employee',
                    CASE 
                        WHEN v_transaction->>'type' = 'credit' THEN 'budget_credit'
                        WHEN v_transaction->>'type' = 'debit' THEN 'budget_debit'
                        ELSE 'adjustment'
                    END,
                    COALESCE((v_transaction->>'amount')::BIGINT * 100, 0),
                    COALESCE(v_transaction->>'currency', 'GHS'),
                    0, -- Previous balance not available in file data
                    COALESCE((v_transaction->>'amount')::BIGINT * 100, 0), -- New balance
                    COALESCE((v_transaction->>'amount')::BIGINT * 100, 0),
                    'Transaction migrated from file',
                    COALESCE(v_transaction->>'description', 'Transaction migrated from file data'),
                    COALESCE((v_transaction->>'timestamp')::TIMESTAMPTZ, NOW()),
                    NOW()
                )
                ON CONFLICT (transaction_reference) DO NOTHING;
            END LOOP;
        END IF;
        
        v_migrated_count := v_migrated_count + 1;
    END LOOP;
    
    RETURN v_migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION EXECUTION
-- ========================================

-- Note: This section contains placeholder calls that should be executed
-- with actual file data. In a real migration, you would:
-- 1. Read the JSON files
-- 2. Parse the data
-- 3. Call the migration functions with the parsed data

-- Example migration calls (commented out for safety):
/*
-- Migrate company balances
SELECT balance_schema.migrate_company_balances_from_file(
    '{"company_id_here": {"balance": 500, "currency": "GHS", ...}}'::jsonb
);

-- Migrate employee balances  
SELECT balance_schema.migrate_employee_balances_from_file(
    '{"employee_id_here": {"balance": 98.99, "currency": "GHS", ...}}'::jsonb
);
*/

-- ========================================
-- MIGRATION VERIFICATION
-- ========================================

-- Function to verify migration success
CREATE OR REPLACE FUNCTION balance_schema.verify_migration() RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    migration_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'company_balances'::TEXT as table_name,
        COUNT(*)::BIGINT as record_count,
        CASE WHEN COUNT(*) > 0 THEN 'MIGRATED' ELSE 'EMPTY' END as migration_status
    FROM balance_schema.company_balances
    
    UNION ALL
    
    SELECT 
        'employee_balances'::TEXT as table_name,
        COUNT(*)::BIGINT as record_count,
        CASE WHEN COUNT(*) > 0 THEN 'MIGRATED' ELSE 'EMPTY' END as migration_status
    FROM balance_schema.employee_balances
    
    UNION ALL
    
    SELECT 
        'balance_transactions'::TEXT as table_name,
        COUNT(*)::BIGINT as record_count,
        CASE WHEN COUNT(*) > 0 THEN 'MIGRATED' ELSE 'EMPTY' END as migration_status
    FROM balance_schema.balance_transactions
    
    UNION ALL
    
    SELECT 
        'budget_allocations'::TEXT as table_name,
        COUNT(*)::BIGINT as record_count,
        CASE WHEN COUNT(*) > 0 THEN 'MIGRATED' ELSE 'EMPTY' END as migration_status
    FROM balance_schema.budget_allocations;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CLEANUP FUNCTIONS (USE WITH CAUTION)
-- ========================================

-- Function to rollback migration (removes all migrated data)
CREATE OR REPLACE FUNCTION balance_schema.rollback_migration() RETURNS TEXT AS $$
BEGIN
    -- Delete all migrated data
    DELETE FROM balance_schema.balance_history;
    DELETE FROM balance_schema.budget_allocations;
    DELETE FROM balance_schema.balance_transactions;
    DELETE FROM balance_schema.employee_balances;
    DELETE FROM balance_schema.company_balances;
    
    RETURN 'Migration rolled back successfully. All migrated data removed.';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

COMMENT ON FUNCTION balance_schema.migrate_company_balances_from_file IS 'Migrates company balance data from JSON file format to database tables';
COMMENT ON FUNCTION balance_schema.migrate_employee_balances_from_file IS 'Migrates employee balance data from JSON file format to database tables';
COMMENT ON FUNCTION balance_schema.verify_migration IS 'Verifies the success of the migration by counting records in each table';
COMMENT ON FUNCTION balance_schema.rollback_migration IS 'Rolls back the migration by removing all migrated data (USE WITH CAUTION)';

-- Migration script completed successfully!
-- Next steps:
-- 1. Execute the migration functions with actual file data
-- 2. Verify migration success using verify_migration()
-- 3. Test the new database-based balance system
-- 4. Remove or archive the old JSON files once migration is verified 