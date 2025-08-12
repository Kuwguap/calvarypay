-- EliteEpay Database Schema Creation
-- This file creates all the necessary schemas and tables for the EliteEpay system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- CREATE SCHEMAS
-- ========================================

CREATE SCHEMA IF NOT EXISTS user_schema;
CREATE SCHEMA IF NOT EXISTS payment_schema;
CREATE SCHEMA IF NOT EXISTS audit_schema;
CREATE SCHEMA IF NOT EXISTS pricing_schema;

-- ========================================
-- USER SCHEMA TABLES
-- ========================================

-- Users table
CREATE TABLE user_schema.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles table
CREATE TABLE user_schema.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE user_schema.user_roles (
    user_id UUID REFERENCES user_schema.users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES user_schema.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES user_schema.users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Refresh tokens table
CREATE TABLE user_schema.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_schema.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table
CREATE TABLE user_schema.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_schema.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- PAYMENT SCHEMA TABLES
-- ========================================

-- Transactions table
CREATE TABLE payment_schema.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_schema.users(id),
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount_minor INTEGER NOT NULL, -- Amount in minor units (kobo, cents)
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
    provider_reference VARCHAR(100),
    authorization_url TEXT,
    payment_method VARCHAR(50),
    channel VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    fees_minor INTEGER DEFAULT 0,
    settled_amount_minor INTEGER,
    settlement_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);



-- Pricing snapshots table
CREATE TABLE payment_schema.pricing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES payment_schema.transactions(id),
    price_key VARCHAR(100) NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logbook entries table
CREATE TABLE payment_schema.logbook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_schema.users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('fuel', 'cash', 'misc')),
    amount_minor INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    note TEXT,
    photo_url TEXT,
    location JSONB,
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_transaction_id UUID REFERENCES payment_schema.transactions(id),
    client_id VARCHAR(100), -- For offline sync
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation reports table
CREATE TABLE payment_schema.reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    matched_transactions INTEGER DEFAULT 0,
    unmatched_transactions INTEGER DEFAULT 0,
    total_amount_minor BIGINT DEFAULT 0,
    discrepancies JSONB DEFAULT '[]',
    generated_by UUID REFERENCES user_schema.users(id),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- AUDIT SCHEMA TABLES
-- ========================================

-- Audit logs table
CREATE TABLE audit_schema.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_time TIMESTAMPTZ DEFAULT NOW(),
    actor_user_id UUID REFERENCES user_schema.users(id),
    event_type VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}',
    signature_hmac VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    service_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System events table
CREATE TABLE audit_schema.system_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warn, error, critical
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    service_name VARCHAR(50),
    correlation_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs table
CREATE TABLE audit_schema.error_logs (
    id BIGSERIAL PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_data JSONB,
    user_id UUID REFERENCES user_schema.users(id),
    correlation_id VARCHAR(100),
    service_name VARCHAR(50),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation matches table
CREATE TABLE audit_schema.reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logbook_entry_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    user_id UUID REFERENCES user_schema.users(id),
    match_score DECIMAL(3,2) NOT NULL,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('automatic', 'manual')),
    match_criteria JSONB NOT NULL,
    time_difference_minutes INTEGER NOT NULL,
    amount_difference_minor INTEGER NOT NULL,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    matched_by UUID REFERENCES user_schema.users(id),
    notes TEXT
);

-- Reconciliation reports table
CREATE TABLE audit_schema.reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    date_range JSONB NOT NULL,
    summary JSONB NOT NULL,
    matches JSONB NOT NULL DEFAULT '[]',
    unmatched_transactions JSONB NOT NULL DEFAULT '[]',
    unmatched_logbook_entries JSONB NOT NULL DEFAULT '[]',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES user_schema.users(id),
    correlation_id VARCHAR(100) NOT NULL
);

-- ========================================
-- PRICING SCHEMA TABLES
-- ========================================

-- Prices table
CREATE TABLE pricing_schema.prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    amount_minor INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES user_schema.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history table
CREATE TABLE pricing_schema.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_id UUID REFERENCES pricing_schema.prices(id),
    key VARCHAR(100) NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    previous_amount_minor INTEGER,
    change_reason TEXT,
    changed_by UUID REFERENCES user_schema.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Currency rates table
CREATE TABLE pricing_schema.currency_rates (
    id BIGSERIAL PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    quote_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15, 8) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(base_currency, quote_currency, fetched_at)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- User schema indexes
CREATE INDEX idx_users_email ON user_schema.users(email);
CREATE INDEX idx_users_phone ON user_schema.users(phone);
CREATE INDEX idx_users_active ON user_schema.users(is_active);
CREATE INDEX idx_refresh_tokens_user_id ON user_schema.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON user_schema.refresh_tokens(expires_at);

-- Payment schema indexes
CREATE INDEX idx_transactions_user_id ON payment_schema.transactions(user_id);
CREATE INDEX idx_transactions_reference ON payment_schema.transactions(reference);
CREATE INDEX idx_transactions_status ON payment_schema.transactions(status);
CREATE INDEX idx_transactions_created_at ON payment_schema.transactions(created_at);
CREATE INDEX idx_logbook_entries_user_id ON payment_schema.logbook_entries(user_id);
CREATE INDEX idx_logbook_entries_created_at ON payment_schema.logbook_entries(created_at);
CREATE INDEX idx_logbook_entries_type ON payment_schema.logbook_entries(type);
CREATE INDEX idx_logbook_entries_currency ON payment_schema.logbook_entries(currency);
CREATE INDEX idx_logbook_entries_is_reconciled ON payment_schema.logbook_entries(is_reconciled);
CREATE INDEX idx_logbook_entries_client_id ON payment_schema.logbook_entries(client_id);
CREATE INDEX idx_logbook_entries_user_created ON payment_schema.logbook_entries(user_id, created_at);
CREATE INDEX idx_pricing_snapshots_transaction ON payment_schema.pricing_snapshots(transaction_id);

-- Audit schema indexes
CREATE INDEX idx_audit_logs_event_type ON audit_schema.audit_logs(event_type);
CREATE INDEX idx_audit_logs_correlation_id ON audit_schema.audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_schema.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_event_time ON audit_schema.audit_logs(event_time);
CREATE INDEX idx_system_events_severity ON audit_schema.system_events(severity);
CREATE INDEX idx_error_logs_resolved ON audit_schema.error_logs(resolved);
CREATE INDEX idx_reconciliation_matches_transaction_id ON audit_schema.reconciliation_matches(transaction_id);
CREATE INDEX idx_reconciliation_matches_logbook_entry_id ON audit_schema.reconciliation_matches(logbook_entry_id);
CREATE INDEX idx_reconciliation_matches_user_id ON audit_schema.reconciliation_matches(user_id);
CREATE INDEX idx_reconciliation_matches_matched_at ON audit_schema.reconciliation_matches(matched_at);
CREATE INDEX idx_reconciliation_reports_report_date ON audit_schema.reconciliation_reports(report_date);
CREATE INDEX idx_reconciliation_reports_generated_at ON audit_schema.reconciliation_reports(generated_at);

-- Pricing schema indexes
CREATE INDEX idx_prices_key ON pricing_schema.prices(key);
CREATE INDEX idx_prices_is_active ON pricing_schema.prices(is_active);
CREATE INDEX idx_prices_currency ON pricing_schema.prices(currency);
CREATE INDEX idx_prices_valid_from ON pricing_schema.prices(valid_from);
CREATE INDEX idx_prices_valid_to ON pricing_schema.prices(valid_to);
CREATE INDEX idx_price_history_price_id ON pricing_schema.price_history(price_id);
CREATE INDEX idx_price_history_key ON pricing_schema.price_history(key);
CREATE INDEX idx_currency_rates_base_quote ON pricing_schema.currency_rates(base_currency, quote_currency);

-- GIN indexes for JSONB columns
CREATE INDEX idx_audit_logs_payload_gin ON audit_schema.audit_logs USING GIN(payload);
CREATE INDEX idx_transactions_metadata_gin ON payment_schema.transactions USING GIN(metadata);
CREATE INDEX idx_prices_metadata_gin ON pricing_schema.prices USING GIN(metadata);
