-- n8n Workflow Builder v3.0 Database Schema
-- PostgreSQL Database Setup with GDPR Compliance
-- Created: 2025-01-17

-- ==========================================
-- DATABASE SETUP
-- ==========================================

CREATE DATABASE IF NOT EXISTS n8n_workflows_prod
    WITH
    OWNER = n8n_workflow_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

\c n8n_workflows_prod;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ==========================================
-- MAIN TABLES
-- ==========================================

-- Workflow Audit Log (GDPR Compliant)
CREATE TABLE IF NOT EXISTS workflow_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,
    email VARCHAR(255),
    email_hash VARCHAR(64) GENERATED ALWAYS AS (encode(digest(email, 'sha256'), 'hex')) STORED,
    brief TEXT,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    gdpr_consent BOOLEAN DEFAULT false,
    ip_address INET,
    ip_country VARCHAR(2),
    user_agent TEXT,
    company VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'Medium',
    processing_time_ms INTEGER,
    workflow_generated BOOLEAN DEFAULT false,
    workflow_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retention_date DATE GENERATED ALWAYS AS (DATE(created_at) + INTERVAL '365 days') STORED,
    anonymized BOOLEAN DEFAULT false,
    anonymized_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    INDEX idx_request_id (request_id),
    INDEX idx_email_hash (email_hash),
    INDEX idx_timestamp (timestamp),
    INDEX idx_retention_date (retention_date),
    INDEX idx_gdpr_consent (gdpr_consent)
);

-- Workflow Errors Table
CREATE TABLE IF NOT EXISTS workflow_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL UNIQUE,
    request_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    stage VARCHAR(100),
    error_type VARCHAR(100),
    error_message TEXT,
    severity VARCHAR(20),
    client_email VARCHAR(255),
    stack_trace TEXT,
    context JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    CONSTRAINT fk_request_id FOREIGN KEY (request_id)
        REFERENCES workflow_audit_log(request_id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_incident_id (incident_id),
    INDEX idx_error_request_id (request_id),
    INDEX idx_error_timestamp (timestamp),
    INDEX idx_severity (severity),
    INDEX idx_resolved (resolved)
);

-- Workflow Metrics Table
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC,
    unit VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    node_count INTEGER,
    connection_count INTEGER,
    execution_time_ms INTEGER,
    memory_usage_mb NUMERIC,
    cpu_usage_percent NUMERIC,
    api_calls_count INTEGER,
    api_response_time_ms INTEGER,
    cache_hit_rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    CONSTRAINT fk_metrics_request_id FOREIGN KEY (request_id)
        REFERENCES workflow_audit_log(request_id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_metrics_request_id (request_id),
    INDEX idx_metrics_timestamp (timestamp),
    INDEX idx_metric_type (metric_type)
);

-- GDPR Consent Records
CREATE TABLE IF NOT EXISTS gdpr_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    email_hash VARCHAR(64) GENERATED ALWAYS AS (encode(digest(email, 'sha256'), 'hex')) STORED,
    consent_given BOOLEAN NOT NULL,
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consent_version VARCHAR(20) DEFAULT '1.0',
    ip_address INET,
    purposes JSONB DEFAULT '["workflow_generation", "email_communication"]',
    withdrawal_timestamp TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    data_retention_days INTEGER DEFAULT 365,
    marketing_consent BOOLEAN DEFAULT false,
    analytics_consent BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_consent_email_hash (email_hash),
    INDEX idx_consent_given (consent_given),
    INDEX idx_consent_timestamp (consent_timestamp)
);

-- Generated Workflows Storage
CREATE TABLE IF NOT EXISTS generated_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,
    workflow_name VARCHAR(500),
    workflow_json JSONB NOT NULL,
    workflow_version VARCHAR(20),
    node_count INTEGER,
    connection_count INTEGER,
    complexity_score NUMERIC,
    qa_score NUMERIC,
    security_score NUMERIC,
    performance_score NUMERIC,
    compliance_score NUMERIC,
    s3_location TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    client_email VARCHAR(255),
    company VARCHAR(255),
    priority VARCHAR(20),
    tags TEXT[],
    active BOOLEAN DEFAULT true,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,
    retention_date DATE,

    -- Foreign key
    CONSTRAINT fk_workflow_request_id FOREIGN KEY (request_id)
        REFERENCES workflow_audit_log(request_id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_workflow_request_id (request_id),
    INDEX idx_workflow_generated_at (generated_at),
    INDEX idx_workflow_active (active),
    INDEX idx_workflow_tags USING GIN (tags)
);

-- Data Retention Policy Table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    retention_days INTEGER NOT NULL,
    deletion_strategy VARCHAR(50) DEFAULT 'hard_delete', -- hard_delete, soft_delete, anonymize
    last_cleanup_at TIMESTAMP WITH TIME ZONE,
    next_cleanup_at TIMESTAMP WITH TIME ZONE,
    records_deleted INTEGER DEFAULT 0,
    records_anonymized INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    UNIQUE(table_name),
    INDEX idx_next_cleanup (next_cleanup_at)
);

-- API Rate Limiting Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_identifier VARCHAR(255) NOT NULL, -- email or IP
    endpoint VARCHAR(255),
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    window_end TIMESTAMP WITH TIME ZONE,
    limit_exceeded BOOLEAN DEFAULT false,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_client_identifier (client_identifier),
    INDEX idx_window_start (window_start),
    INDEX idx_blocked_until (blocked_until)
);

-- ==========================================
-- VIEWS
-- ==========================================

-- Active Workflows View
CREATE OR REPLACE VIEW v_active_workflows AS
SELECT
    w.id,
    w.request_id,
    w.workflow_name,
    w.node_count,
    w.generated_at,
    w.client_email,
    w.company,
    w.priority,
    w.qa_score,
    w.security_score,
    al.source,
    al.gdpr_consent
FROM generated_workflows w
JOIN workflow_audit_log al ON w.request_id = al.request_id
WHERE w.active = true AND w.archived = false;

-- Error Analytics View
CREATE OR REPLACE VIEW v_error_analytics AS
SELECT
    DATE(timestamp) as error_date,
    stage,
    error_type,
    severity,
    COUNT(*) as error_count,
    COUNT(DISTINCT request_id) as affected_requests,
    AVG(CASE WHEN resolved THEN
        EXTRACT(EPOCH FROM (resolved_at - timestamp))/3600
    END) as avg_resolution_hours
FROM workflow_errors
GROUP BY DATE(timestamp), stage, error_type, severity;

-- Metrics Dashboard View
CREATE OR REPLACE VIEW v_metrics_dashboard AS
SELECT
    DATE(timestamp) as metric_date,
    AVG(execution_time_ms) as avg_execution_time_ms,
    AVG(memory_usage_mb) as avg_memory_mb,
    AVG(cpu_usage_percent) as avg_cpu_percent,
    SUM(api_calls_count) as total_api_calls,
    AVG(api_response_time_ms) as avg_api_response_ms,
    AVG(cache_hit_rate) as avg_cache_hit_rate,
    COUNT(DISTINCT request_id) as unique_requests
FROM workflow_metrics
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY metric_date DESC;

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to anonymize old records (GDPR compliance)
CREATE OR REPLACE FUNCTION anonymize_old_records()
RETURNS void AS $$
BEGIN
    -- Anonymize audit logs older than retention period
    UPDATE workflow_audit_log
    SET
        email = 'anonymized@example.com',
        brief = '[ANONYMIZED]',
        ip_address = '0.0.0.0'::inet,
        user_agent = '[ANONYMIZED]',
        company = '[ANONYMIZED]',
        anonymized = true,
        anonymized_at = CURRENT_TIMESTAMP
    WHERE
        retention_date < CURRENT_DATE
        AND anonymized = false;

    -- Anonymize consent records
    UPDATE gdpr_consent
    SET
        email = 'anonymized@example.com',
        ip_address = '0.0.0.0'::inet
    WHERE
        created_at < CURRENT_TIMESTAMP - INTERVAL '3 years';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate workflow complexity
CREATE OR REPLACE FUNCTION calculate_workflow_complexity(workflow_json JSONB)
RETURNS NUMERIC AS $$
DECLARE
    node_count INTEGER;
    connection_count INTEGER;
    complexity NUMERIC;
BEGIN
    node_count := jsonb_array_length(workflow_json->'nodes');
    connection_count := jsonb_array_length(workflow_json->'connections');

    complexity := (node_count * 1.0) + (connection_count * 0.5);

    -- Add complexity for specific node types
    IF workflow_json::text LIKE '%httpRequest%' THEN
        complexity := complexity + 2;
    END IF;

    IF workflow_json::text LIKE '%code%' THEN
        complexity := complexity + 3;
    END IF;

    RETURN complexity;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audit_log_timestamp
    BEFORE UPDATE ON workflow_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_consent_timestamp
    BEFORE UPDATE ON gdpr_consent
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Composite indexes for common queries
CREATE INDEX idx_audit_log_composite ON workflow_audit_log(timestamp DESC, email_hash, gdpr_consent);
CREATE INDEX idx_errors_composite ON workflow_errors(timestamp DESC, severity, resolved);
CREATE INDEX idx_metrics_composite ON workflow_metrics(timestamp DESC, metric_type, request_id);
CREATE INDEX idx_workflows_composite ON generated_workflows(generated_at DESC, active, priority);

-- ==========================================
-- SECURITY POLICIES
-- ==========================================

-- Row Level Security for multi-tenant support
ALTER TABLE workflow_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_workflows ENABLE ROW LEVEL SECURITY;

-- Create policies (example for company-based isolation)
CREATE POLICY company_isolation_audit ON workflow_audit_log
    FOR ALL
    USING (company = current_setting('app.current_company', true));

CREATE POLICY company_isolation_workflows ON generated_workflows
    FOR ALL
    USING (company = current_setting('app.current_company', true));

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert default retention policies
INSERT INTO data_retention_policies (table_name, retention_days, deletion_strategy)
VALUES
    ('workflow_audit_log', 365, 'anonymize'),
    ('workflow_errors', 90, 'hard_delete'),
    ('workflow_metrics', 30, 'hard_delete'),
    ('gdpr_consent', 1095, 'anonymize'),
    ('generated_workflows', 180, 'soft_delete'),
    ('api_rate_limits', 7, 'hard_delete')
ON CONFLICT (table_name) DO NOTHING;

-- ==========================================
-- GRANTS
-- ==========================================

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_workflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_workflow_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO n8n_workflow_user;