-- Migration 001: Initial Schema
-- Version: 3.0.0
-- Date: 2025-01-17
-- Description: Creates initial database schema for n8n Workflow Builder v3.0

-- Migration metadata
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Initial schema creation')
ON CONFLICT (version) DO NOTHING;

-- Run the main schema
\i ../schema.sql

-- Verification
DO $$
BEGIN
    -- Check if all tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_audit_log') THEN
        RAISE EXCEPTION 'Migration failed: workflow_audit_log table not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_errors') THEN
        RAISE EXCEPTION 'Migration failed: workflow_errors table not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_metrics') THEN
        RAISE EXCEPTION 'Migration failed: workflow_metrics table not created';
    END IF;

    RAISE NOTICE 'Migration 001 completed successfully';
END $$;