# n8n Workflow Template Catalog

**Total Templates: 114**
**Last Updated: 2025-11-08**

This catalog contains production-ready n8n workflow templates for common automation scenarios. Each template includes:
- Complete n8n workflow JSON
- Setup documentation
- Environment variable configuration
- Error handling and retry logic
- Security best practices

---

## 📊 Data Integration Templates (15)

### 01. Salesforce to PostgreSQL Sync
**File:** `data-integration/01-salesforce-to-postgres.json`
**Use Case:** Sync Salesforce contacts, accounts, opportunities to PostgreSQL database
**Features:** Incremental sync, field mapping, upsert logic
**Schedule:** Hourly

### 02. Airtable to Database Sync
**File:** `data-integration/02-airtable-to-database.json`
**Use Case:** Replicate Airtable bases to PostgreSQL/MySQL
**Features:** Multi-table sync, relationship preservation
**Trigger:** Webhook + scheduled backup

### 03. Google Sheets to Database
**File:** `data-integration/03-sheets-to-database.json`
**Use Case:** Import Google Sheets data to database
**Features:** Column mapping, data validation, duplicate detection
**Schedule:** Every 30 minutes

### 04. REST API to Database Pipeline
**File:** `data-integration/04-api-to-database.json`
**Use Case:** Fetch data from REST API and store in database
**Features:** Pagination handling, rate limiting, checkpointing
**Schedule:** Configurable (default: 15 minutes)

### 05. Database to Database Replication
**File:** `data-integration/05-db-to-db-replication.json`
**Use Case:** Replicate data between PostgreSQL, MySQL, MongoDB
**Features:** CDC (change data capture), bidirectional sync
**Trigger:** Real-time or scheduled

### 06. CSV File Import to Database
**File:** `data-integration/06-csv-to-database.json`
**Use Case:** Import CSV files from S3/SFTP to database
**Features:** Schema validation, error rows logging, bulk insert
**Trigger:** File watcher or scheduled

### 07. Email Attachments to Database
**File:** `data-integration/07-email-attachments-to-db.json`
**Use Case:** Extract data from email attachments (CSV, Excel) to database
**Features:** Email filtering, file parsing, data transformation
**Trigger:** IMAP email trigger

### 08. Webhook to Multi-Database Writer
**File:** `data-integration/08-webhook-to-multi-db.json`
**Use Case:** Receive webhook and write to multiple databases
**Features:** Fanout writes, transaction support, rollback on failure
**Trigger:** Webhook

### 09. Shopify Orders to Data Warehouse
**File:** `data-integration/09-shopify-to-warehouse.json`
**Use Case:** Sync Shopify orders, products, customers to data warehouse
**Features:** Historical backfill, incremental updates
**Schedule:** Every 15 minutes

### 10. Stripe Payments to Database
**File:** `data-integration/10-stripe-to-database.json`
**Use Case:** Store Stripe transactions, customers, subscriptions in database
**Features:** Webhook + polling, idempotency, financial data validation
**Trigger:** Webhook + scheduled

### 11. TypeForm Responses to Database
**File:** `data-integration/11-typeform-to-database.json`
**Use Case:** Store TypeForm survey responses in database
**Features:** Dynamic field mapping, media file handling
**Trigger:** Webhook

### 12. Calendly Bookings to CRM & Database
**File:** `data-integration/12-calendly-to-crm-db.json`
**Use Case:** Sync Calendly bookings to Salesforce and database
**Features:** Dual write, timezone conversion, attendee management
**Trigger:** Webhook

### 13. Database Changes to CRM Sync
**File:** `data-integration/13-database-to-crm.json`
**Use Case:** Sync database changes to CRM (Salesforce, HubSpot)
**Features:** Change detection, field mapping, conflict resolution
**Trigger:** Database trigger or polling

### 14. Multi-Source Data Aggregation
**File:** `data-integration/14-multi-source-aggregation.json`
**Use Case:** Combine data from APIs, databases, files into single dataset
**Features:** Data merging, deduplication, master data management
**Schedule:** Daily

### 15. Real-Time Database Replication with Conflict Resolution
**File:** `data-integration/15-realtime-db-replication.json`
**Use Case:** Bidirectional real-time database sync with conflict detection
**Features:** Last-write-wins, vector clocks, conflict logging
**Trigger:** Real-time

---

## 🎯 Event Processing Templates (12)

### 16. Webhook to Multi-Channel Notifications
**File:** `event-processing/16-webhook-to-notifications.json`
**Use Case:** Receive event webhook, send to Slack, email, SMS, PagerDuty
**Features:** Severity routing, rate limiting, deduplication

### 17. API Event Stream Processor
**File:** `event-processing/17-api-event-stream.json`
**Use Case:** Process continuous stream of API events
**Features:** Batching, ordering, exactly-once delivery

### 18. Error Event Handler
**File:** `event-processing/18-error-event-handler.json`
**Use Case:** Centralized error event processing and alerting
**Features:** Error categorization, aggregation, auto-remediation

### 19. Payment Event Processor
**File:** `event-processing/19-payment-events.json`
**Use Case:** Process payment events (success, failure, refund)
**Features:** Idempotency, fraud detection, reconciliation

### 20. User Activity Event Logger
**File:** `event-processing/20-user-activity-logger.json`
**Use Case:** Log user activity events for analytics
**Features:** Event enrichment, PII masking, partitioning

### 21. System Event Correlation Engine
**File:** `event-processing/21-event-correlation.json`
**Use Case:** Correlate events across systems to detect patterns
**Features:** Time-window correlation, pattern matching

### 22. CloudWatch Logs to Alerting
**File:** `event-processing/22-cloudwatch-to-alerts.json`
**Use Case:** Process AWS CloudWatch logs and send alerts
**Features:** Log parsing, threshold detection, escalation

### 23. GitHub Webhook Event Router
**File:** `event-processing/23-github-webhook-router.json`
**Use Case:** Route GitHub events (PR, issues, deployments) to tools
**Features:** Event filtering, template-based routing

### 24. Webhook Event Replay System
**File:** `event-processing/24-webhook-replay.json`
**Use Case:** Store and replay webhook events for testing
**Features:** Event storage, search, selective replay

### 25. Dead Letter Queue Processor
**File:** `event-processing/25-dlq-processor.json`
**Use Case:** Process failed events from dead letter queue
**Features:** Retry with backoff, failure analysis, manual intervention

### 26. Event-Driven Workflow Orchestration
**File:** `event-processing/26-event-orchestration.json`
**Use Case:** Trigger complex workflows based on event patterns
**Features:** Event sequences, state machine, conditional flows

### 27. Real-Time Event Analytics Pipeline
**File:** `event-processing/27-realtime-analytics.json`
**Use Case:** Real-time event aggregation and metrics
**Features:** Windowing, aggregation, metric publishing

---

## 🤖 AI Workflow Templates (15)

### 28. Document Classification Pipeline
**File:** `ai-workflows/28-document-classification.json`
**Use Case:** Classify documents using AI (invoice, contract, receipt)
**Features:** OCR, GPT-4 classification, routing

### 29. Email Response Generator
**File:** `ai-workflows/29-email-response-generator.json`
**Use Case:** Generate AI responses to customer emails
**Features:** Context analysis, tone matching, template selection

### 30. Content Moderation System
**File:** `ai-workflows/30-content-moderation.json`
**Use Case:** Moderate user-generated content using AI
**Features:** Multi-model validation, escalation, appeal process

### 31. Customer Support Ticket Categorization
**File:** `ai-workflows/31-ticket-categorization.json`
**Use Case:** Auto-categorize and route support tickets
**Features:** Intent classification, priority assignment, SLA tracking

### 32. Data Extraction from Documents
**File:** `ai-workflows/32-document-data-extraction.json`
**Use Case:** Extract structured data from PDFs, images
**Features:** OCR, GPT-4 extraction, validation, storage

### 33. AI-Powered Lead Scoring
**File:** `ai-workflows/33-ai-lead-scoring.json`
**Use Case:** Score leads using AI analysis
**Features:** Multi-factor analysis, predictive scoring, CRM sync

### 34. Automated Content Generation
**File:** `ai-workflows/34-content-generation.json`
**Use Case:** Generate blog posts, social media, marketing copy
**Features:** SEO optimization, brand voice, multi-platform

### 35. Sentiment Analysis Pipeline
**File:** `ai-workflows/35-sentiment-analysis.json`
**Use Case:** Analyze sentiment of customer feedback, reviews
**Features:** Multi-language, aspect-based sentiment, trending

### 36. AI Meeting Summarizer
**File:** `ai-workflows/36-meeting-summarizer.json`
**Use Case:** Transcribe and summarize meetings
**Features:** Whisper transcription, GPT-4 summarization, action items

### 37. Product Description Generator
**File:** `ai-workflows/37-product-description-generator.json`
**Use Case:** Generate product descriptions from images/specs
**Features:** Vision AI, GPT-4 writing, SEO keywords

### 38. AI Code Review Assistant
**File:** `ai-workflows/38-code-review-assistant.json`
**Use Case:** Automated code review using Claude/GPT
**Features:** Bug detection, style checking, improvement suggestions

### 39. Invoice Processing with AI
**File:** `ai-workflows/39-invoice-processing.json`
**Use Case:** Extract and validate invoice data
**Features:** OCR, field extraction, validation, accounting system sync

### 40. Chatbot Conversation Handler
**File:** `ai-workflows/40-chatbot-handler.json`
**Use Case:** Handle chatbot conversations with AI
**Features:** Context management, function calling, fallback to human

### 41. AI Image Analysis Pipeline
**File:** `ai-workflows/41-image-analysis.json`
**Use Case:** Analyze images for objects, text, quality
**Features:** GPT-4 Vision, tagging, content safety

### 42. Resume Parsing and Matching
**File:** `ai-workflows/42-resume-parsing.json`
**Use Case:** Parse resumes and match to job descriptions
**Features:** Text extraction, skill matching, ranking

---

## 💼 Business Automation Templates (12)

### 43. Lead Management Automation
**File:** `business-automation/43-lead-management.json`
**Use Case:** Capture, qualify, and route leads
**Features:** Multi-source capture, scoring, CRM sync, nurturing

### 44. Customer Onboarding Workflow
**File:** `business-automation/44-customer-onboarding.json`
**Use Case:** Automated customer onboarding process
**Features:** Account creation, welcome emails, training scheduling

### 45. Invoice Generation and Delivery
**File:** `business-automation/45-invoice-generation.json`
**Use Case:** Generate and send invoices automatically
**Features:** PDF generation, email delivery, payment tracking

### 46. Contract Management System
**File:** `business-automation/46-contract-management.json`
**Use Case:** Manage contract lifecycle
**Features:** Template generation, e-signature, renewal reminders

### 47. Expense Approval Workflow
**File:** `business-automation/47-expense-approval.json`
**Use Case:** Employee expense submission and approval
**Features:** Receipt OCR, policy validation, multi-level approval

### 48. Project Management Automation
**File:** `business-automation/48-project-management.json`
**Use Case:** Automate project tasks, status updates
**Features:** Task creation, deadline tracking, stakeholder updates

### 49. Sales Pipeline Automation
**File:** `business-automation/49-sales-pipeline.json`
**Use Case:** Automate sales pipeline management
**Features:** Deal tracking, stage automation, forecasting

### 50. Customer Churn Prevention
**File:** `business-automation/50-churn-prevention.json`
**Use Case:** Detect and prevent customer churn
**Features:** Behavior analysis, engagement campaigns, win-back

### 51. Quote to Cash Automation
**File:** `business-automation/51-quote-to-cash.json`
**Use Case:** Automate quote generation to payment collection
**Features:** CPQ, approval workflows, invoicing, collections

### 52. Vendor Management System
**File:** `business-automation/52-vendor-management.json`
**Use Case:** Manage vendor onboarding, performance, payments
**Features:** Vendor portal, PO automation, invoice matching

### 53. SLA Management and Alerting
**File:** `business-automation/53-sla-management.json`
**Use Case:** Track and enforce SLA compliance
**Features:** Time tracking, breach alerting, escalation

### 54. Document Approval Workflow
**File:** `business-automation/54-document-approval.json`
**Use Case:** Multi-step document approval process
**Features:** Version control, reviewer routing, audit trail

---

## 📡 Monitoring & Operations Templates (10)

### 55. API Health Check Monitor
**File:** `monitoring/55-api-health-check.json`
**Use Case:** Monitor multiple API endpoints for availability
**Features:** Multi-endpoint, response time, status checks, alerting

### 56. Database Performance Monitor
**File:** `monitoring/56-database-monitor.json`
**Use Case:** Monitor database performance metrics
**Features:** Query performance, connection pool, slow query alerts

### 57. Website Uptime Monitor
**File:** `monitoring/57-website-uptime.json`
**Use Case:** Monitor website uptime and performance
**Features:** Multi-region checks, SSL expiry, broken links

### 58. SSL Certificate Expiry Monitor
**File:** `monitoring/58-ssl-expiry-monitor.json`
**Use Case:** Track SSL certificate expiration
**Features:** Certificate scanning, renewal reminders, alerting

### 59. Log Aggregation Pipeline
**File:** `monitoring/59-log-aggregation.json`
**Use Case:** Collect and process logs from multiple sources
**Features:** Parsing, filtering, storage, alerting

### 60. System Resource Monitor
**File:** `monitoring/60-resource-monitor.json`
**Use Case:** Monitor server CPU, memory, disk usage
**Features:** Threshold alerting, trending, capacity planning

### 61. Error Rate Alerting System
**File:** `monitoring/61-error-rate-alerts.json`
**Use Case:** Monitor error rates and send alerts
**Features:** Threshold detection, anomaly detection, incident creation

### 62. Backup Verification System
**File:** `monitoring/62-backup-verification.json`
**Use Case:** Verify database and file backups
**Features:** Backup testing, integrity checks, alerting

### 63. Security Event Monitor
**File:** `monitoring/63-security-monitor.json`
**Use Case:** Monitor security events and anomalies
**Features:** Login attempts, suspicious activity, threat detection

### 64. Workflow Health Dashboard
**File:** `monitoring/64-workflow-health.json`
**Use Case:** Monitor n8n workflow execution health
**Features:** Execution tracking, error rates, performance metrics

---

## 🛒 E-Commerce Templates (12)

### 65. Shopify Order Fulfillment
**File:** `e-commerce/65-shopify-fulfillment.json`
**Use Case:** Automate Shopify order processing and fulfillment
**Features:** Inventory check, shipping label, tracking updates

### 66. Abandoned Cart Recovery
**File:** `e-commerce/66-abandoned-cart.json`
**Use Case:** Send recovery emails for abandoned carts
**Features:** Cart tracking, email sequences, conversion tracking

### 67. Product Inventory Sync
**File:** `e-commerce/67-inventory-sync.json`
**Use Case:** Sync inventory across Shopify, WooCommerce, Amazon
**Features:** Real-time sync, low stock alerts, reconciliation

### 68. Customer Review Management
**File:** `e-commerce/68-review-management.json`
**Use Case:** Collect and manage product reviews
**Features:** Review requests, sentiment analysis, response automation

### 69. Price Monitoring and Updates
**File:** `e-commerce/69-price-monitoring.json`
**Use Case:** Monitor competitor prices and update pricing
**Features:** Web scraping, price rules, automated updates

### 70. Shipping Label Generation
**File:** `e-commerce/70-shipping-labels.json`
**Use Case:** Generate shipping labels for orders
**Features:** Multi-carrier support, address validation, tracking

### 71. Return and Refund Processing
**File:** `e-commerce/71-returns-refunds.json`
**Use Case:** Automate return requests and refunds
**Features:** RMA generation, refund processing, inventory updates

### 72. Product Data Enrichment
**File:** `e-commerce/72-product-enrichment.json`
**Use Case:** Enrich product data with AI and external sources
**Features:** Image analysis, description generation, categorization

### 73. Drop Shipping Automation
**File:** `e-commerce/73-dropshipping.json`
**Use Case:** Automate dropshipping order placement
**Features:** Supplier integration, order routing, tracking sync

### 74. Loyalty Program Management
**File:** `e-commerce/74-loyalty-program.json`
**Use Case:** Manage customer loyalty points and rewards
**Features:** Points calculation, tier management, redemption

### 75. Cross-Sell and Upsell Engine
**File:** `e-commerce/75-cross-sell-upsell.json`
**Use Case:** Recommend products based on purchase history
**Features:** AI recommendations, email campaigns, personalization

### 76. Stock Level Alerts
**File:** `e-commerce/76-stock-alerts.json`
**Use Case:** Alert when inventory reaches threshold
**Features:** Multi-product monitoring, supplier notifications, reorder

---

## 📧 Marketing Automation Templates (10)

### 77. Email Campaign Manager
**File:** `marketing/77-email-campaigns.json`
**Use Case:** Send personalized email campaigns
**Features:** Segmentation, A/B testing, performance tracking

### 78. Social Media Post Scheduler
**File:** `marketing/78-social-scheduler.json`
**Use Case:** Schedule posts to Twitter, LinkedIn, Facebook
**Features:** Multi-platform, optimal timing, analytics

### 79. Lead Magnet Delivery
**File:** `marketing/79-lead-magnet.json`
**Use Case:** Deliver lead magnets (ebooks, resources)
**Features:** Form submission, file delivery, CRM sync

### 80. Webinar Registration and Reminders
**File:** `marketing/80-webinar-automation.json`
**Use Case:** Manage webinar registrations and reminders
**Features:** Registration forms, reminder emails, attendance tracking

### 81. Blog Post Distribution
**File:** `marketing/81-blog-distribution.json`
**Use Case:** Distribute blog posts across channels
**Features:** RSS feeds, social sharing, email newsletters

### 82. Marketing Analytics Dashboard
**File:** `marketing/82-analytics-dashboard.json`
**Use Case:** Aggregate marketing data from multiple sources
**Features:** Multi-source data, KPI calculation, reporting

### 83. Landing Page Lead Capture
**File:** `marketing/83-landing-page-leads.json`
**Use Case:** Capture and process landing page leads
**Features:** Form handling, lead scoring, CRM sync, nurturing

### 84. Event Registration and Follow-up
**File:** `marketing/84-event-registration.json`
**Use Case:** Manage event registrations and follow-ups
**Features:** Registration, reminders, attendance, feedback

### 85. Influencer Outreach Campaign
**File:** `marketing/85-influencer-outreach.json`
**Use Case:** Automate influencer discovery and outreach
**Features:** Influencer search, email templates, tracking

### 86. Customer Win-Back Campaign
**File:** `marketing/86-winback-campaign.json`
**Use Case:** Re-engage inactive customers
**Features:** Inactivity detection, personalized offers, tracking

---

## 👥 HR & Operations Templates (8)

### 87. Employee Onboarding Automation
**File:** `hr-operations/87-employee-onboarding.json`
**Use Case:** Automate new employee onboarding
**Features:** Account creation, equipment requests, training scheduling

### 88. Time Off Request Management
**File:** `hr-operations/88-time-off-requests.json`
**Use Case:** Handle employee time-off requests
**Features:** Request submission, approval workflow, calendar sync

### 89. Expense Report Processing
**File:** `hr-operations/89-expense-reports.json`
**Use Case:** Process employee expense reports
**Features:** Receipt OCR, policy validation, reimbursement

### 90. Performance Review Automation
**File:** `hr-operations/90-performance-reviews.json`
**Use Case:** Manage performance review cycles
**Features:** Review scheduling, form distribution, feedback collection

### 91. Job Posting and Applicant Tracking
**File:** `hr-operations/91-job-posting-ats.json`
**Use Case:** Post jobs and track applicants
**Features:** Multi-platform posting, resume parsing, interview scheduling

### 92. Employee Birthday and Anniversary
**File:** `hr-operations/92-employee-celebrations.json`
**Use Case:** Send birthday and work anniversary messages
**Features:** Calendar tracking, personalized messages, team notifications

### 93. IT Support Ticket Automation
**File:** `hr-operations/93-it-support-tickets.json`
**Use Case:** Automate IT support ticket management
**Features:** Ticket creation, categorization, assignment, SLA tracking

### 94. Document Signing Workflow
**File:** `hr-operations/94-document-signing.json`
**Use Case:** Send documents for e-signature
**Features:** DocuSign/HelloSign integration, reminder emails, storage

---

## 🗄️ Database Operations Templates (10)

### 95. Automated Database Backup
**File:** `database-operations/95-database-backup.json`
**Use Case:** Schedule database backups to S3/GCS
**Features:** Compression, encryption, retention policies

### 96. Database Health Check
**File:** `database-operations/96-db-health-check.json`
**Use Case:** Monitor database health metrics
**Features:** Connection tests, query performance, disk space

### 97. Data Cleanup and Archival
**File:** `database-operations/97-data-cleanup.json`
**Use Case:** Archive or delete old data
**Features:** Retention rules, safe deletion, backup before delete

### 98. Database Migration Runner
**File:** `database-operations/98-migration-runner.json`
**Use Case:** Run database migrations safely
**Features:** Version tracking, rollback support, notifications

### 99. Incremental Data Sync
**File:** `database-operations/99-incremental-sync.json`
**Use Case:** Sync only changed data between databases
**Features:** Watermark tracking, CDC, conflict resolution

### 100. Database Index Optimization
**File:** `database-operations/100-index-optimization.json`
**Use Case:** Analyze and optimize database indexes
**Features:** Unused index detection, missing index suggestions

### 101. Query Performance Analyzer
**File:** `database-operations/101-query-analyzer.json`
**Use Case:** Identify slow queries and optimization opportunities
**Features:** Slow query log parsing, EXPLAIN analysis, suggestions

### 102. Data Quality Monitoring
**File:** `database-operations/102-data-quality.json`
**Use Case:** Monitor data quality and integrity
**Features:** Null checks, constraint validation, anomaly detection

### 103. Database User Management
**File:** `database-operations/103-user-management.json`
**Use Case:** Automate database user provisioning
**Features:** User creation, permission grants, access reviews

### 104. Database Replication Monitor
**File:** `database-operations/104-replication-monitor.json`
**Use Case:** Monitor database replication lag
**Features:** Lag detection, failover alerts, replica health

---

## 📋 Airtable Automation Templates (10)

### 105. Airtable Form to Multi-System Sync
**File:** `airtable-automation/105-airtable-form-sync.json`
**Use Case:** Sync Airtable form submissions to CRM, database, Slack
**Features:** Field mapping, multi-destination, notifications

### 106. Airtable to Google Calendar Sync
**File:** `airtable-automation/106-airtable-calendar-sync.json`
**Use Case:** Sync Airtable records to Google Calendar
**Features:** Bidirectional sync, reminder management

### 107. Airtable Project Management
**File:** `airtable-automation/107-airtable-project-mgmt.json`
**Use Case:** Manage projects with Airtable automation
**Features:** Task assignment, deadline reminders, status updates

### 108. Airtable CRM Automation
**File:** `airtable-automation/108-airtable-crm.json`
**Use Case:** Use Airtable as lightweight CRM
**Features:** Lead tracking, pipeline management, email sequences

### 109. Airtable Inventory Management
**File:** `airtable-automation/109-airtable-inventory.json`
**Use Case:** Track inventory in Airtable
**Features:** Stock level alerts, reorder automation, reporting

### 110. Airtable Content Calendar
**File:** `airtable-automation/110-content-calendar.json`
**Use Case:** Manage content publishing schedule
**Features:** Post scheduling, platform distribution, analytics

### 111. Airtable to Email Automation
**File:** `airtable-automation/111-airtable-email.json`
**Use Case:** Send emails based on Airtable triggers
**Features:** Template rendering, conditional sending, tracking

### 112. Airtable Approval Workflow
**File:** `airtable-automation/112-airtable-approvals.json`
**Use Case:** Multi-step approval process in Airtable
**Features:** Approval requests, notifications, audit trail

### 113. Airtable Data Enrichment
**File:** `airtable-automation/113-airtable-enrichment.json`
**Use Case:** Enrich Airtable records with external data
**Features:** API lookups, AI enrichment, field population

### 114. Airtable Reporting Dashboard
**File:** `airtable-automation/114-airtable-reporting.json`
**Use Case:** Generate reports from Airtable data
**Features:** Data aggregation, chart generation, email delivery

---

## 📖 Usage Guide

### Installation
1. Import JSON file into n8n
2. Configure environment variables
3. Update credentials
4. Test with sample data
5. Enable workflow

### Template Structure
Each template follows this structure:
```
template-name/
  ├── workflow.json          # n8n workflow
  ├── README.md              # Setup documentation
  ├── .env.example           # Environment variables
  └── test-data.json         # Sample test data
```

### Categories Guide
- **Data Integration**: Moving data between systems
- **Event Processing**: Handling real-time events
- **AI Workflows**: AI-powered automation
- **Business Automation**: Business process automation
- **Monitoring**: System and application monitoring
- **E-Commerce**: Online store automation
- **Marketing**: Marketing campaign automation
- **HR/Operations**: Human resources workflows
- **Database Operations**: Database management
- **Airtable Automation**: Airtable-specific workflows

### Support
For template issues or customization requests, refer to the knowledge base documentation in `domains/` directory.

---

**Version:** 1.0.0
**Maintained by:** Automation Toolkit Team
