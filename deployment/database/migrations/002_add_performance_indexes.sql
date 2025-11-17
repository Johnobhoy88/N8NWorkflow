-- Migration 002: Add Performance Indexes
-- Version: 3.0.1
-- Date: 2025-01-18
-- Description: Adds additional indexes for performance optimization

-- Migration metadata
INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Add performance indexes')
ON CONFLICT (version) DO NOTHING;

-- Add partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_recent
    ON workflow_audit_log(timestamp DESC)
    WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_errors_unresolved
    ON workflow_errors(timestamp DESC, severity)
    WHERE resolved = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_active_recent
    ON generated_workflows(generated_at DESC)
    WHERE active = true AND generated_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Add covering indexes for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_dashboard_covering
    ON workflow_metrics(timestamp, execution_time_ms, memory_usage_mb, cpu_usage_percent)
    WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Add text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_text_search
    ON generated_workflows USING gin(to_tsvector('english', workflow_name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_errors_text_search
    ON workflow_errors USING gin(to_tsvector('english', error_message));

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration 002: Performance indexes added successfully';
END $$;