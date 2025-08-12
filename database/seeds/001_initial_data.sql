-- EliteEpay Initial Seed Data
-- This file populates the database with initial data for development and testing

-- ========================================
-- ROLES DATA
-- ========================================

INSERT INTO user_schema.roles (name, description, permissions) VALUES
('super_admin', 'Super Administrator with full system access', '["*"]'),
('admin', 'Administrator with management access', '["users:read", "users:write", "transactions:read", "audit:read", "pricing:write", "reports:read"]'),
('merchant', 'Merchant user with business features', '["transactions:read", "transactions:write", "logbook:read", "logbook:write", "pricing:read"]'),
('customer', 'Regular customer user', '["transactions:read", "transactions:write", "logbook:read", "logbook:write"]'),
('support', 'Support team member', '["users:read", "transactions:read", "audit:read"]')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- INITIAL ADMIN USER
-- ========================================

-- Create initial admin user (password: Admin123!)
INSERT INTO user_schema.users (
    id,
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    is_active,
    email_verified,
    phone_verified
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@eliteepay.com',
    '+234-800-000-0001',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlJO', -- Admin123!
    'System',
    'Administrator',
    true,
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Assign super_admin role to admin user
INSERT INTO user_schema.user_roles (user_id, role_id, assigned_by) 
SELECT 
    '00000000-0000-0000-0000-000000000001',
    r.id,
    '00000000-0000-0000-0000-000000000001'
FROM user_schema.roles r 
WHERE r.name = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ========================================
-- DEMO USERS
-- ========================================

-- Demo merchant user (password: Merchant123!)
INSERT INTO user_schema.users (
    id,
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    is_active,
    email_verified,
    phone_verified
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'merchant@demo.com',
    '+234-800-000-0002',
    '$2b$12$8Hqn5Z9QJ7XvK2L4M6N8O.P9Q0R1S2T3U4V5W6X7Y8Z9A0B1C2D3E4',
    'Demo',
    'Merchant',
    true,
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Assign merchant role
INSERT INTO user_schema.user_roles (user_id, role_id, assigned_by) 
SELECT 
    '00000000-0000-0000-0000-000000000002',
    r.id,
    '00000000-0000-0000-0000-000000000001'
FROM user_schema.roles r 
WHERE r.name = 'merchant'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Demo customer user (password: Customer123!)
INSERT INTO user_schema.users (
    id,
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    is_active,
    email_verified,
    phone_verified
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'customer@demo.com',
    '+234-800-000-0003',
    '$2b$12$F5G6H7I8J9K0L1M2N3O4P.Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0',
    'Demo',
    'Customer',
    true,
    true,
    false
) ON CONFLICT (email) DO NOTHING;

-- Assign customer role
INSERT INTO user_schema.user_roles (user_id, role_id, assigned_by) 
SELECT 
    '00000000-0000-0000-0000-000000000003',
    r.id,
    '00000000-0000-0000-0000-000000000001'
FROM user_schema.roles r 
WHERE r.name = 'customer'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ========================================
-- PRICING DATA
-- ========================================

-- Fuel prices
INSERT INTO pricing_schema.prices (
    id,
    key,
    name,
    description,
    amount_minor,
    currency,
    active,
    category,
    metadata,
    created_by
) VALUES 
(
    '10000000-0000-0000-0000-000000000001',
    'fuel_petrol_per_liter',
    'Petrol per Liter',
    'Current price of petrol per liter',
    61700, -- ₦617.00
    'NGN',
    true,
    'fuel',
    '{"unit": "liter", "type": "petrol"}',
    '00000000-0000-0000-0000-000000000001'
),
(
    '10000000-0000-0000-0000-000000000002',
    'fuel_diesel_per_liter',
    'Diesel per Liter',
    'Current price of diesel per liter',
    58500, -- ₦585.00
    'NGN',
    true,
    'fuel',
    '{"unit": "liter", "type": "diesel"}',
    '00000000-0000-0000-0000-000000000001'
),
(
    '10000000-0000-0000-0000-000000000003',
    'cooking_gas_per_kg',
    'Cooking Gas per KG',
    'Current price of cooking gas per kilogram',
    75000, -- ₦750.00
    'NGN',
    true,
    'gas',
    '{"unit": "kg", "type": "lpg"}',
    '00000000-0000-0000-0000-000000000001'
),
(
    '10000000-0000-0000-0000-000000000004',
    'transaction_fee_percentage',
    'Transaction Fee',
    'Percentage fee for transactions',
    150, -- 1.5%
    'NGN',
    true,
    'fees',
    '{"type": "percentage", "min_fee": 1000, "max_fee": 200000}',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- CURRENCY RATES
-- ========================================

INSERT INTO pricing_schema.currency_rates (
    base_currency,
    quote_currency,
    rate,
    source,
    fetched_at,
    expires_at
) VALUES 
('NGN', 'USD', 0.00067, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('NGN', 'EUR', 0.00061, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('NGN', 'GBP', 0.00053, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('NGN', 'KES', 0.086, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('NGN', 'GHS', 0.0080, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('NGN', 'ZAR', 0.012, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('USD', 'NGN', 1500.00, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('EUR', 'NGN', 1640.00, 'manual', NOW(), NOW() + INTERVAL '24 hours'),
('GBP', 'NGN', 1890.00, 'manual', NOW(), NOW() + INTERVAL '24 hours')
ON CONFLICT (base_currency, quote_currency, fetched_at) DO NOTHING;

-- ========================================
-- DEMO TRANSACTIONS
-- ========================================

-- Demo successful transaction
INSERT INTO payment_schema.transactions (
    id,
    user_id,
    reference,
    amount_minor,
    currency,
    status,
    provider,
    provider_reference,
    payment_method,
    channel,
    metadata,
    fees_minor,
    settled_amount_minor,
    created_at,
    updated_at
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'TXN_DEMO_001',
    5000000, -- ₦50,000.00
    'NGN',
    'success',
    'paystack',
    'PSK_DEMO_001',
    'card',
    'card',
    '{"customer_name": "Demo Merchant", "description": "Fuel purchase"}',
    75000, -- ₦750.00 fee
    4925000, -- ₦49,250.00 settled
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
) ON CONFLICT (reference) DO NOTHING;

-- Demo pending transaction
INSERT INTO payment_schema.transactions (
    id,
    user_id,
    reference,
    amount_minor,
    currency,
    status,
    provider,
    authorization_url,
    payment_method,
    channel,
    metadata,
    created_at,
    updated_at
) VALUES (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    'TXN_DEMO_002',
    2500000, -- ₦25,000.00
    'NGN',
    'pending',
    'paystack',
    'https://checkout.paystack.com/demo',
    'card',
    'card',
    '{"customer_name": "Demo Customer", "description": "Gas purchase"}',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT (reference) DO NOTHING;

-- ========================================
-- DEMO LOGBOOK ENTRIES
-- ========================================

-- Demo logbook entry for fuel
INSERT INTO payment_schema.logbook_entries (
    id,
    user_id,
    type,
    amount_minor,
    currency,
    note,
    location,
    is_reconciled,
    reconciled_transaction_id,
    created_at
) VALUES (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'fuel',
    5000000, -- ₦50,000.00
    'NGN',
    'Fuel purchase for delivery truck - 81 liters',
    '{"lat": 6.5244, "lng": 3.3792, "address": "Victoria Island, Lagos"}',
    true,
    '20000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- Demo unreconciled logbook entry
INSERT INTO payment_schema.logbook_entries (
    id,
    user_id,
    type,
    amount_minor,
    currency,
    note,
    location,
    is_reconciled,
    created_at
) VALUES (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'cash',
    15000000, -- ₦150,000.00
    'NGN',
    'Cash payment for goods - needs reconciliation',
    '{"lat": 6.4281, "lng": 3.4219, "address": "Ikeja, Lagos"}',
    false,
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- PRICING SNAPSHOTS
-- ========================================

INSERT INTO payment_schema.pricing_snapshots (
    transaction_id,
    price_key,
    amount_minor,
    currency,
    snapshot_at
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    'fuel_petrol_per_liter',
    61700,
    'NGN',
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- INITIAL AUDIT LOGS
-- ========================================

INSERT INTO audit_schema.audit_logs (
    event_type,
    actor_user_id,
    correlation_id,
    payload,
    service_name
) VALUES 
(
    'system.initialized',
    '00000000-0000-0000-0000-000000000001',
    'INIT_001',
    '{"message": "EliteEpay system initialized with seed data", "version": "1.0.0"}',
    'database'
),
(
    'user.created',
    '00000000-0000-0000-0000-000000000001',
    'USER_001',
    '{"user_id": "00000000-0000-0000-0000-000000000002", "email": "merchant@demo.com", "role": "merchant"}',
    'user-service'
),
(
    'user.created',
    '00000000-0000-0000-0000-000000000001',
    'USER_002',
    '{"user_id": "00000000-0000-0000-0000-000000000003", "email": "customer@demo.com", "role": "customer"}',
    'user-service'
);

-- ========================================
-- UPDATE SEQUENCES
-- ========================================

-- Update sequences to avoid conflicts with seed data
SELECT setval('user_schema.roles_id_seq', 100);
SELECT setval('audit_schema.audit_logs_id_seq', 1000);
SELECT setval('audit_schema.system_events_id_seq', 1000);
SELECT setval('audit_schema.error_logs_id_seq', 1000);
SELECT setval('pricing_schema.price_history_id_seq', 1000);
SELECT setval('pricing_schema.currency_rates_id_seq', 1000);
