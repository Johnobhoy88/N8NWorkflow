-- Seed Data for n8n Workflow Builder v3.0
-- For staging/testing environments only
-- DO NOT RUN IN PRODUCTION

-- ==========================================
-- TEST USERS AND REQUESTS
-- ==========================================

-- Insert test audit log entries
INSERT INTO workflow_audit_log (
    request_id,
    email,
    brief,
    source,
    gdpr_consent,
    ip_address,
    company,
    priority,
    processing_time_ms,
    workflow_generated
) VALUES
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'test1@example.com', 'Create a workflow to sync data from API to database', 'form', true, '192.168.1.1', 'Acme Corp', 'High', 1234, true),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'test2@example.com', 'Build automation for email notifications', 'email', true, '192.168.1.2', 'Tech Co', 'Medium', 2345, true),
    ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'test3@example.com', 'Generate reports from multiple data sources', 'webhook', true, '192.168.1.3', 'Data Inc', 'Low', 3456, false),
    ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'qa@example.com', 'Test workflow with error handling', 'form', true, '192.168.1.4', 'QA Team', 'High', 890, true),
    ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'demo@example.com', 'Demo workflow for presentation', 'form', true, '192.168.1.5', 'Sales Team', 'Medium', 1567, true);

-- Insert test workflows
INSERT INTO generated_workflows (
    request_id,
    workflow_name,
    workflow_json,
    workflow_version,
    node_count,
    connection_count,
    complexity_score,
    qa_score,
    security_score,
    performance_score,
    compliance_score,
    client_email,
    company,
    priority,
    tags
) VALUES
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'API to Database Sync', '{"nodes": [], "connections": {}}', '3.0.0', 5, 4, 7.5, 0.95, 0.92, 0.88, 1.0, 'test1@example.com', 'Acme Corp', 'High', ARRAY['api', 'database', 'sync']),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Email Notification System', '{"nodes": [], "connections": {}}', '3.0.0', 3, 2, 4.0, 0.98, 0.95, 0.90, 1.0, 'test2@example.com', 'Tech Co', 'Medium', ARRAY['email', 'notification']),
    ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'Error Handling Test', '{"nodes": [], "connections": {}}', '3.0.0', 7, 6, 10.0, 0.90, 0.88, 0.85, 1.0, 'qa@example.com', 'QA Team', 'High', ARRAY['test', 'error-handling']),
    ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'Demo Workflow', '{"nodes": [], "connections": {}}', '3.0.0', 4, 3, 5.5, 1.0, 1.0, 0.95, 1.0, 'demo@example.com', 'Sales Team', 'Medium', ARRAY['demo', 'presentation']);

-- Insert test errors
INSERT INTO workflow_errors (
    incident_id,
    request_id,
    stage,
    error_type,
    error_message,
    severity,
    client_email,
    context,
    resolved,
    resolved_at,
    resolved_by,
    resolution_notes
) VALUES
    ('650e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'synthesis', 'timeout', 'AI service timeout after 30 seconds', 'Medium', 'test3@example.com', '{"retry_count": 3}', true, CURRENT_TIMESTAMP, 'system', 'Auto-resolved after retry'),
    ('650e8400-e29b-41d4-a716-446655440002'::uuid, NULL, 'validation', 'invalid_input', 'Email format invalid', 'Low', 'invalid-email', '{}', false, NULL, NULL, NULL),
    ('650e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440004'::uuid, 'qa', 'validation_failed', 'Node connection missing', 'High', 'qa@example.com', '{"node": "http-request-1"}', true, CURRENT_TIMESTAMP - INTERVAL '2 hours', 'qa-team', 'Fixed connection mapping');

-- Insert test metrics
INSERT INTO workflow_metrics (
    request_id,
    metric_type,
    metric_name,
    metric_value,
    unit,
    node_count,
    connection_count,
    execution_time_ms,
    memory_usage_mb,
    cpu_usage_percent,
    api_calls_count,
    api_response_time_ms,
    cache_hit_rate
) VALUES
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'performance', 'execution_time', 1234, 'ms', 5, 4, 1234, 128.5, 45.2, 3, 456, 0.85),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'performance', 'execution_time', 2345, 'ms', 3, 2, 2345, 96.3, 32.1, 2, 234, 0.92),
    ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'performance', 'execution_time', 890, 'ms', 7, 6, 890, 156.7, 55.8, 5, 178, 0.78),
    ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'performance', 'execution_time', 1567, 'ms', 4, 3, 1567, 112.4, 38.9, 2, 312, 0.88);

-- Insert test GDPR consent records
INSERT INTO gdpr_consent (
    email,
    consent_given,
    consent_version,
    ip_address,
    purposes,
    marketing_consent,
    analytics_consent
) VALUES
    ('test1@example.com', true, '1.0', '192.168.1.1', '["workflow_generation", "email_communication", "analytics"]', false, true),
    ('test2@example.com', true, '1.0', '192.168.1.2', '["workflow_generation", "email_communication"]', true, true),
    ('test3@example.com', true, '1.0', '192.168.1.3', '["workflow_generation"]', false, false),
    ('qa@example.com', true, '1.0', '192.168.1.4', '["workflow_generation", "email_communication", "analytics", "testing"]', true, true),
    ('demo@example.com', true, '1.0', '192.168.1.5', '["workflow_generation", "demo_purposes"]', false, true);

-- Insert test rate limiting data
INSERT INTO api_rate_limits (
    client_identifier,
    endpoint,
    request_count,
    window_start,
    limit_exceeded,
    blocked_until
) VALUES
    ('test1@example.com', '/workflow-builder', 10, CURRENT_TIMESTAMP - INTERVAL '5 minutes', false, NULL),
    ('test2@example.com', '/workflow-builder', 50, CURRENT_TIMESTAMP - INTERVAL '10 minutes', false, NULL),
    ('192.168.1.100', '/workflow-builder', 101, CURRENT_TIMESTAMP - INTERVAL '1 minute', true, CURRENT_TIMESTAMP + INTERVAL '5 minutes');

-- ==========================================
-- TEST DATA GENERATORS
-- ==========================================

-- Function to generate random test workflows
CREATE OR REPLACE FUNCTION generate_test_workflows(count INTEGER)
RETURNS void AS $$
DECLARE
    i INTEGER;
    request_id UUID;
    email VARCHAR;
    company VARCHAR;
    priority VARCHAR;
    priorities VARCHAR[] := ARRAY['High', 'Medium', 'Low'];
    companies VARCHAR[] := ARRAY['Test Corp', 'Demo Inc', 'Sample Co', 'Example Ltd', 'Trial LLC'];
BEGIN
    FOR i IN 1..count LOOP
        request_id := uuid_generate_v4();
        email := 'test_' || i || '@example.com';
        company := companies[1 + floor(random() * 5)];
        priority := priorities[1 + floor(random() * 3)];

        -- Insert audit log
        INSERT INTO workflow_audit_log (
            request_id, email, brief, source, gdpr_consent,
            ip_address, company, priority, processing_time_ms, workflow_generated
        ) VALUES (
            request_id, email,
            'Test workflow ' || i || ' for automated testing',
            'form', true,
            ('10.0.0.' || (1 + floor(random() * 254)))::inet,
            company, priority,
            500 + floor(random() * 3000),
            random() > 0.2
        );

        -- Insert workflow if generated
        IF random() > 0.2 THEN
            INSERT INTO generated_workflows (
                request_id, workflow_name, workflow_json, workflow_version,
                node_count, connection_count, complexity_score,
                qa_score, security_score, performance_score, compliance_score,
                client_email, company, priority, tags
            ) VALUES (
                request_id,
                'Test Workflow ' || i,
                '{"nodes": [], "connections": {}}',
                '3.0.0',
                2 + floor(random() * 10),
                1 + floor(random() * 8),
                3 + (random() * 12),
                0.8 + (random() * 0.2),
                0.8 + (random() * 0.2),
                0.7 + (random() * 0.3),
                0.9 + (random() * 0.1),
                email, company, priority,
                ARRAY['test', 'automated']
            );

            -- Insert metrics
            INSERT INTO workflow_metrics (
                request_id, metric_type, metric_name, metric_value,
                unit, execution_time_ms, memory_usage_mb, cpu_usage_percent
            ) VALUES (
                request_id, 'performance', 'execution_time',
                500 + floor(random() * 3000),
                'ms',
                500 + floor(random() * 3000),
                50 + (random() * 200),
                10 + (random() * 80)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- GENERATE TEST DATA
-- ==========================================

-- Generate 50 test workflows
SELECT generate_test_workflows(50);

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Display test data statistics
SELECT 'Test Data Statistics' as info;
SELECT '-------------------' as separator;
SELECT 'Audit Log Records: ' || COUNT(*) FROM workflow_audit_log;
SELECT 'Generated Workflows: ' || COUNT(*) FROM generated_workflows;
SELECT 'Error Records: ' || COUNT(*) FROM workflow_errors;
SELECT 'Metrics Records: ' || COUNT(*) FROM workflow_metrics;
SELECT 'Consent Records: ' || COUNT(*) FROM gdpr_consent;
SELECT 'Rate Limit Records: ' || COUNT(*) FROM api_rate_limits;

-- Show sample data
SELECT '-------------------' as separator;
SELECT 'Sample Workflows:' as info;
SELECT workflow_name, node_count, qa_score, company, priority
FROM generated_workflows
LIMIT 5;

-- ==========================================
-- CLEANUP FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS void AS $$
BEGIN
    -- Delete only test data (preserve production data)
    DELETE FROM workflow_metrics WHERE request_id IN (
        SELECT request_id FROM workflow_audit_log WHERE email LIKE 'test%@example.com'
    );
    DELETE FROM generated_workflows WHERE client_email LIKE 'test%@example.com';
    DELETE FROM workflow_errors WHERE client_email LIKE 'test%@example.com';
    DELETE FROM workflow_audit_log WHERE email LIKE 'test%@example.com';
    DELETE FROM gdpr_consent WHERE email LIKE 'test%@example.com';
    DELETE FROM api_rate_limits WHERE client_identifier LIKE 'test%@example.com';

    RAISE NOTICE 'Test data cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- Note: Run cleanup_test_data() to remove all test data