-- GDPR Audit Logging Database Schema
-- Phase 2: Comprehensive audit trail for GDPR compliance
-- Created: 2025-11-17
-- Purpose: Track all data processing activities, consent records, and user requests

-- ============================================================================
-- TABLE: gdpr_audit_log
-- Purpose: Main audit log for all data processing events
-- Retention: 5 years (legal requirement for GDPR compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gdpr_audit_log (
    -- Primary identification
    id SERIAL PRIMARY KEY,
    event_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,

    -- Event details
    event_type VARCHAR(100) NOT NULL,  -- e.g., 'consent_validated', 'data_access', 'international_transfer_initiated'
    user_email VARCHAR(320) NOT NULL,  -- RFC 5321 max email length

    -- Event data (JSON for flexibility)
    event_data JSONB NOT NULL DEFAULT '{}',

    -- Request metadata (for audit trail)
    ip_address INET,
    user_agent TEXT,
    request_headers JSONB,

    -- Timing
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_duration_ms INTEGER,

    -- Consent tracking
    consent_status VARCHAR(50) NOT NULL,  -- 'valid', 'rejected', 'expired', 'withdrawn', 'error'
    consent_id UUID,  -- Reference to consent record

    -- Data classification
    data_categories TEXT[],  -- e.g., ['personal_identifiable', 'contact_info', 'workflow_brief']
    processing_purpose VARCHAR(200),  -- e.g., 'workflow_generation', 'ai_processing'

    -- Legal basis (GDPR Article 6)
    legal_basis VARCHAR(50) DEFAULT 'consent',  -- 'consent', 'contract', 'legal_obligation', 'legitimate_interest'

    -- International transfer tracking
    data_transferred_to VARCHAR(200),  -- e.g., 'Google Gemini AI (United States)'
    transfer_mechanism VARCHAR(100),  -- e.g., 'Standard Contractual Clauses', 'Adequacy Decision'

    -- System tracking
    workflow_execution_id VARCHAR(100),
    node_name VARCHAR(200),

    -- Indexes for performance
    CONSTRAINT valid_consent_status CHECK (consent_status IN ('valid', 'rejected', 'expired', 'withdrawn', 'error', 'pending')),
    CONSTRAINT valid_legal_basis CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'legitimate_interest', 'vital_interest', 'public_task'))
);

-- Performance indexes
CREATE INDEX idx_gdpr_audit_user_email ON gdpr_audit_log(user_email);
CREATE INDEX idx_gdpr_audit_event_type ON gdpr_audit_log(event_type);
CREATE INDEX idx_gdpr_audit_timestamp ON gdpr_audit_log(timestamp DESC);
CREATE INDEX idx_gdpr_audit_consent_status ON gdpr_audit_log(consent_status);
CREATE INDEX idx_gdpr_audit_event_id ON gdpr_audit_log(event_id);
CREATE INDEX idx_gdpr_audit_consent_id ON gdpr_audit_log(consent_id);

-- GIN index for JSONB event_data searching
CREATE INDEX idx_gdpr_audit_event_data ON gdpr_audit_log USING GIN (event_data);

-- ============================================================================
-- TABLE: consent_records
-- Purpose: Store detailed consent records with full audit trail
-- Retention: 5 years after consent withdrawal (legal requirement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    -- Primary identification
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identification
    user_email VARCHAR(320) NOT NULL,
    user_id VARCHAR(100),  -- Optional internal user ID

    -- Consent details
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_withdrawn BOOLEAN DEFAULT false,
    withdrawal_timestamp TIMESTAMPTZ,

    -- Granular consent tracking
    consent_processing BOOLEAN NOT NULL DEFAULT false,
    consent_processing_timestamp TIMESTAMPTZ,

    consent_ai_processing BOOLEAN NOT NULL DEFAULT false,
    consent_ai_processing_timestamp TIMESTAMPTZ,

    consent_international_transfer BOOLEAN NOT NULL DEFAULT false,
    consent_international_transfer_timestamp TIMESTAMPTZ,

    consent_email_communication BOOLEAN NOT NULL DEFAULT false,
    consent_email_communication_timestamp TIMESTAMPTZ,

    consent_data_retention BOOLEAN NOT NULL DEFAULT false,
    consent_data_retention_timestamp TIMESTAMPTZ,

    consent_rights_acknowledgment BOOLEAN NOT NULL DEFAULT false,
    consent_rights_acknowledgment_timestamp TIMESTAMPTZ,

    -- Consent capture metadata
    ip_address INET NOT NULL,
    user_agent TEXT,
    form_version VARCHAR(50),  -- Track which version of consent form was used
    consent_text_hash VARCHAR(64),  -- SHA-256 hash of exact consent text shown

    -- Proof of consent
    consent_method VARCHAR(50) NOT NULL,  -- 'web_form', 'email', 'api', 'manual'
    consent_evidence JSONB,  -- Store screenshots, form data, etc.

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active', 'withdrawn', 'expired'
    expiry_date TIMESTAMPTZ,

    -- Record keeping
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_consent_status CHECK (status IN ('active', 'withdrawn', 'expired', 'pending')),
    CONSTRAINT valid_consent_method CHECK (consent_method IN ('web_form', 'email', 'api', 'manual', 'import'))
);

-- Performance indexes
CREATE INDEX idx_consent_user_email ON consent_records(user_email);
CREATE INDEX idx_consent_status ON consent_records(status);
CREATE INDEX idx_consent_timestamp ON consent_records(consent_timestamp DESC);
CREATE INDEX idx_consent_withdrawn ON consent_records(consent_withdrawn);

-- Unique constraint: one active consent per user
CREATE UNIQUE INDEX idx_consent_active_per_user ON consent_records(user_email)
WHERE status = 'active' AND consent_withdrawn = false;

-- ============================================================================
-- TABLE: data_retention_schedule
-- Purpose: Track data retention and automatic deletion schedules
-- Retention: Permanent (metadata only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_schedule (
    -- Primary identification
    retention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User and data identification
    user_email VARCHAR(320) NOT NULL,
    data_type VARCHAR(100) NOT NULL,  -- e.g., 'workflow_generation_request', 'audit_log', 'consent_record'
    data_identifier VARCHAR(200),  -- Reference ID for the actual data

    -- Retention schedule
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_days INTEGER NOT NULL DEFAULT 30,
    expires_at TIMESTAMPTZ NOT NULL,

    -- Deletion tracking
    auto_delete BOOLEAN DEFAULT true,
    deletion_scheduled BOOLEAN DEFAULT false,
    deletion_scheduled_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deletion_method VARCHAR(50),  -- 'automatic', 'manual', 'user_request'

    -- Verification
    deletion_verified BOOLEAN DEFAULT false,
    verification_timestamp TIMESTAMPTZ,

    -- Legal holds (prevent deletion if under investigation)
    legal_hold BOOLEAN DEFAULT false,
    legal_hold_reason TEXT,
    legal_hold_set_at TIMESTAMPTZ,
    legal_hold_set_by VARCHAR(200),

    -- Record keeping
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active', 'scheduled_deletion', 'deleted', 'legal_hold'

    CONSTRAINT valid_retention_status CHECK (status IN ('active', 'scheduled_deletion', 'deleted', 'legal_hold', 'expired'))
);

-- Performance indexes
CREATE INDEX idx_retention_user_email ON data_retention_schedule(user_email);
CREATE INDEX idx_retention_expires_at ON data_retention_schedule(expires_at);
CREATE INDEX idx_retention_status ON data_retention_schedule(status);
CREATE INDEX idx_retention_auto_delete ON data_retention_schedule(auto_delete) WHERE auto_delete = true AND deleted = false;
CREATE INDEX idx_retention_deletion_scheduled ON data_retention_schedule(deletion_scheduled_at) WHERE deletion_scheduled = true AND deleted = false;

-- ============================================================================
-- TABLE: data_subject_requests
-- Purpose: Track GDPR data subject access requests (DSAR)
-- Retention: 5 years (legal requirement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
    -- Primary identification
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identification
    user_email VARCHAR(320) NOT NULL,
    user_verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'verified', 'failed'
    verification_method VARCHAR(100),

    -- Request details
    request_type VARCHAR(50) NOT NULL,  -- 'access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'
    request_description TEXT,

    -- Timing
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,  -- GDPR: 30 days to respond
    completed_at TIMESTAMPTZ,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'rejected', 'cancelled'
    status_reason TEXT,

    -- Assignment
    assigned_to VARCHAR(200),
    assigned_at TIMESTAMPTZ,

    -- Response tracking
    response_sent BOOLEAN DEFAULT false,
    response_sent_at TIMESTAMPTZ,
    response_method VARCHAR(50),  -- 'email', 'secure_download', 'postal_mail'
    response_data JSONB,

    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    submission_method VARCHAR(50),  -- 'web_form', 'email', 'phone', 'postal_mail'

    -- Notes and communication log
    notes TEXT,
    communication_log JSONB DEFAULT '[]',

    -- Record keeping
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_request_type CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'withdraw_consent')),
    CONSTRAINT valid_request_status CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled', 'overdue')),
    CONSTRAINT valid_verification_status CHECK (user_verification_status IN ('pending', 'verified', 'failed'))
);

-- Performance indexes
CREATE INDEX idx_dsar_user_email ON data_subject_requests(user_email);
CREATE INDEX idx_dsar_status ON data_subject_requests(status);
CREATE INDEX idx_dsar_request_type ON data_subject_requests(request_type);
CREATE INDEX idx_dsar_due_date ON data_subject_requests(due_date);
CREATE INDEX idx_dsar_requested_at ON data_subject_requests(requested_at DESC);

-- ============================================================================
-- TABLE: international_data_transfers
-- Purpose: Track all international data transfers for GDPR Article 44-50
-- Retention: 5 years (legal requirement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS international_data_transfers (
    -- Primary identification
    transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identification
    user_email VARCHAR(320) NOT NULL,
    consent_id UUID REFERENCES consent_records(consent_id),

    -- Transfer details
    transfer_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_country VARCHAR(2) NOT NULL,  -- ISO 3166-1 alpha-2
    destination_country VARCHAR(2) NOT NULL,  -- ISO 3166-1 alpha-2
    destination_organization VARCHAR(200) NOT NULL,
    destination_purpose TEXT NOT NULL,

    -- Legal basis for transfer
    transfer_mechanism VARCHAR(100) NOT NULL,  -- 'scc', 'adequacy_decision', 'bcr', 'derogation', 'consent'
    scc_version VARCHAR(50),  -- e.g., '2021' for new EU SCCs
    adequacy_decision_date DATE,

    -- Data transferred
    data_categories TEXT[] NOT NULL,
    data_sensitivity VARCHAR(50),  -- 'normal', 'sensitive', 'special_category'
    data_volume_kb INTEGER,

    -- Processing details
    processing_purpose TEXT NOT NULL,
    retention_period_days INTEGER,

    -- Risk assessment
    transfer_risk_level VARCHAR(50),  -- 'low', 'medium', 'high'
    risk_assessment_date DATE,
    supplementary_measures TEXT,  -- Additional safeguards beyond SCCs

    -- Audit reference
    audit_log_id UUID REFERENCES gdpr_audit_log(event_id),
    workflow_execution_id VARCHAR(100),

    -- Record keeping
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_transfer_mechanism CHECK (transfer_mechanism IN ('scc', 'adequacy_decision', 'bcr', 'derogation', 'consent', 'public_interest')),
    CONSTRAINT valid_data_sensitivity CHECK (data_sensitivity IN ('normal', 'sensitive', 'special_category', 'criminal'))
);

-- Performance indexes
CREATE INDEX idx_transfer_user_email ON international_data_transfers(user_email);
CREATE INDEX idx_transfer_destination_country ON international_data_transfers(destination_country);
CREATE INDEX idx_transfer_timestamp ON international_data_transfers(transfer_timestamp DESC);
CREATE INDEX idx_transfer_mechanism ON international_data_transfers(transfer_mechanism);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- View: Active Consents Summary
CREATE OR REPLACE VIEW v_active_consents AS
SELECT
    user_email,
    consent_id,
    consent_timestamp,
    consent_processing,
    consent_ai_processing,
    consent_international_transfer,
    consent_email_communication,
    form_version,
    ip_address,
    EXTRACT(DAY FROM (NOW() - consent_timestamp)) as days_since_consent
FROM consent_records
WHERE status = 'active' AND consent_withdrawn = false;

-- View: Pending Deletions
CREATE OR REPLACE VIEW v_pending_deletions AS
SELECT
    retention_id,
    user_email,
    data_type,
    expires_at,
    EXTRACT(DAY FROM (expires_at - NOW())) as days_until_deletion,
    auto_delete,
    legal_hold
FROM data_retention_schedule
WHERE deleted = false
  AND expires_at < NOW() + INTERVAL '7 days'
  AND legal_hold = false
ORDER BY expires_at ASC;

-- View: Overdue DSAR Requests
CREATE OR REPLACE VIEW v_overdue_dsar AS
SELECT
    request_id,
    user_email,
    request_type,
    requested_at,
    due_date,
    EXTRACT(DAY FROM (NOW() - due_date)) as days_overdue,
    status,
    assigned_to
FROM data_subject_requests
WHERE status NOT IN ('completed', 'cancelled')
  AND due_date < NOW()
ORDER BY days_overdue DESC;

-- View: International Transfer Summary
CREATE OR REPLACE VIEW v_international_transfers_summary AS
SELECT
    destination_country,
    destination_organization,
    transfer_mechanism,
    COUNT(*) as transfer_count,
    COUNT(DISTINCT user_email) as unique_users,
    MAX(transfer_timestamp) as last_transfer,
    SUM(data_volume_kb) as total_data_kb
FROM international_data_transfers
WHERE transfer_timestamp > NOW() - INTERVAL '30 days'
GROUP BY destination_country, destination_organization, transfer_mechanism
ORDER BY transfer_count DESC;

-- ============================================================================
-- FUNCTIONS FOR AUTOMATED COMPLIANCE
-- ============================================================================

-- Function: Auto-update consent record timestamp
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consent_timestamp
BEFORE UPDATE ON consent_records
FOR EACH ROW
EXECUTE FUNCTION update_consent_timestamp();

-- Function: Auto-update DSAR timestamp
CREATE OR REPLACE FUNCTION update_dsar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dsar_timestamp
BEFORE UPDATE ON data_subject_requests
FOR EACH ROW
EXECUTE FUNCTION update_dsar_timestamp();

-- Function: Calculate DSAR due date (30 days from request)
CREATE OR REPLACE FUNCTION set_dsar_due_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date IS NULL THEN
        NEW.due_date = NEW.requested_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_dsar_due_date
BEFORE INSERT ON data_subject_requests
FOR EACH ROW
EXECUTE FUNCTION set_dsar_due_date();

-- ============================================================================
-- SAMPLE DATA FOR TESTING (COMMENT OUT IN PRODUCTION)
-- ============================================================================

-- Sample audit log entry
-- INSERT INTO gdpr_audit_log (event_type, user_email, event_data, consent_status, legal_basis)
-- VALUES ('consent_validated', 'test@example.com', '{"consents": ["processing", "ai", "transfer"]}', 'valid', 'consent');

-- Sample consent record
-- INSERT INTO consent_records (
--     user_email, consent_given, consent_processing, consent_ai_processing,
--     consent_international_transfer, consent_email_communication,
--     consent_data_retention, consent_rights_acknowledgment,
--     ip_address, consent_method, form_version
-- ) VALUES (
--     'test@example.com', true, true, true, true, true, true, true,
--     '192.168.1.1', 'web_form', '1.0.0-gdpr'
-- );

-- ============================================================================
-- GRANT PERMISSIONS (Adjust based on your setup)
-- ============================================================================

-- Grant read-only access to reporting role
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO gdpr_reporting_role;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO gdpr_reporting_role;

-- Grant full access to application role
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_application_role;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_application_role;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Query to find all data for a specific user (DSAR access request)
-- SELECT
--     'audit_log' as source, event_id as record_id, timestamp as created_at
-- FROM gdpr_audit_log WHERE user_email = 'user@example.com'
-- UNION ALL
-- SELECT
--     'consent_records' as source, consent_id as record_id, consent_timestamp as created_at
-- FROM consent_records WHERE user_email = 'user@example.com'
-- UNION ALL
-- SELECT
--     'retention_schedule' as source, retention_id as record_id, created_at
-- FROM data_retention_schedule WHERE user_email = 'user@example.com'
-- ORDER BY created_at DESC;

-- Query to delete all data for a user (DSAR erasure request - USE WITH EXTREME CAUTION)
-- BEGIN;
-- DELETE FROM international_data_transfers WHERE user_email = 'user@example.com';
-- DELETE FROM data_retention_schedule WHERE user_email = 'user@example.com';
-- UPDATE consent_records SET status = 'withdrawn', consent_withdrawn = true, withdrawal_timestamp = NOW() WHERE user_email = 'user@example.com';
-- -- Note: Audit logs should generally NOT be deleted per GDPR Article 17(3)(b) - legal obligation
-- -- INSERT INTO gdpr_audit_log (event_type, user_email, event_data, consent_status)
-- -- VALUES ('data_erasure_completed', 'user@example.com', '{"reason": "user_request", "method": "manual"}', 'withdrawn');
-- COMMIT;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
