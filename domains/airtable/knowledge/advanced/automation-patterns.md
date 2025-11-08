# Airtable Automation Patterns (2025)

## Table of Contents
- [Automation Overview](#automation-overview)
- [Trigger Types](#trigger-types)
- [Action Types](#action-types)
- [Common Patterns](#common-patterns)
- [Advanced Workflows](#advanced-workflows)
- [Integration Patterns](#integration-patterns)
- [Best Practices](#best-practices)

---

## Automation Overview

### Automation Structure

```
┌──────────────┐
│   TRIGGER    │ ──▶ When something happens
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  CONDITION   │ ──▶ Optional: filter which records
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   ACTIONS    │ ──▶ What to do (multiple actions possible)
└──────────────┘
```

### Limits (2025)

```
┌────────────────────────────────────────┐
│  Free Plan                             │
│  - 100 automation runs per month       │
│  - Basic triggers & actions            │
├────────────────────────────────────────┤
│  Team Plan                             │
│  - 25,000 runs per month per workspace │
│  - All triggers & actions              │
├────────────────────────────────────────┤
│  Business Plan                         │
│  - 100,000 runs per month per workspace│
│  - Advanced scripting                  │
└────────────────────────────────────────┘
```

---

## Trigger Types

### 1. When Record Created

**Use Cases:**
- Send welcome email to new customers
- Create related records in other tables
- Notify team in Slack
- Add to email marketing list

**Configuration:**
```
Trigger: When record created
Table: Contacts
View: (Optional - filter to specific view)
```

**Example: New Customer Onboarding**
```
TRIGGER: When record created in "Contacts"
CONDITION: {Customer Type} = "New"
ACTIONS:
  1. Send email (Welcome email template)
  2. Create record in "Onboarding Tasks"
  3. Send to Slack (#new-customers)
  4. Update field {Onboarding Status} to "Started"
```

---

### 2. When Record Updated

**Use Cases:**
- Status change notifications
- Approval workflows
- Data validation
- Audit logging

**Configuration:**
```
Trigger: When record updated
Table: Orders
View: (Optional)
Field: Status  // Only trigger when this field changes
```

**Example: Order Status Updates**
```
TRIGGER: When {Status} field updated in "Orders"
CONDITION: {Status} = "Shipped"
ACTIONS:
  1. Send email to {Customer Email} (Shipping notification)
  2. Update {Shipped Date} to NOW()
  3. Create record in "Shipment Log"
```

---

### 3. When Record Matches Conditions

**Use Cases:**
- Due date reminders
- Scheduled follow-ups
- SLA monitoring
- Recurring tasks

**Configuration:**
```
Trigger: When record matches conditions
Table: Tasks
Condition: AND(
  {Status} != "Completed",
  IS_SAME({Due Date}, TODAY(), 'day')
)
Run: Every hour (check interval)
```

**Example: Daily Task Reminders**
```
TRIGGER: When record matches conditions
  Table: Tasks
  Condition: {Due Date} = TODAY() AND {Status} = "Pending"
  Run: Every day at 9:00 AM
ACTIONS:
  1. Send email to {Assigned To} (Task reminder)
  2. Send to Slack (ping user)
```

---

### 4. When Record Enters View

**Use Cases:**
- Queue processing
- Approval workflows
- Stage transitions

**Configuration:**
```
Trigger: When record enters view
Table: Support Tickets
View: High Priority Queue
```

**Example: High Priority Escalation**
```
TRIGGER: When record enters "High Priority Queue" view
ACTIONS:
  1. Update {Priority} to "Critical"
  2. Assign to {Manager}
  3. Send to Slack (#urgent-alerts)
  4. Send email to management team
```

---

### 5. At Scheduled Time

**Use Cases:**
- Daily reports
- Batch processing
- Cleanup tasks
- Reminders

**Configuration:**
```
Trigger: At scheduled time
Frequency: Daily at 8:00 AM
Timezone: America/New_York
```

**Example: Daily Summary Report**
```
TRIGGER: Every day at 8:00 AM
ACTIONS:
  1. Find records (WHERE {Created Date} = YESTERDAY())
  2. Send email (Daily summary with record count)
  3. Update dashboard metrics
```

---

### 6. When Form Submitted

**Use Cases:**
- Form auto-responses
- Data validation
- Create related records
- Notifications

**Configuration:**
```
Trigger: When form submitted
Form: Contact Form
```

**Example: Form Submission Handling**
```
TRIGGER: When "Contact Form" submitted
ACTIONS:
  1. Send email to {Submitter Email} (Thank you message)
  2. Update {Status} to "New Lead"
  3. Create record in "Follow-up Tasks"
  4. Send to Slack (#new-leads) with record details
```

---

### 7. When Webhook Received

**Use Cases:**
- External integrations
- API triggers
- Third-party notifications

**Configuration:**
```
Trigger: When webhook received
Webhook URL: https://airtable.com/wh/...
```

**Example: Process External Data**
```
TRIGGER: When webhook received
ACTIONS:
  1. Parse webhook data
  2. Find existing record (by email)
  3. If found: Update record
     Else: Create new record
  4. Send confirmation response
```

---

## Action Types

### Update Record

```
Action: Update record
Record: Triggering record
Fields:
  - {Status}: "Processed"
  - {Processed Date}: NOW()
  - {Processed By}: Current user
```

---

### Create Record

```
Action: Create record
Table: Tasks
Fields:
  - {Title}: "Follow up with " & {Customer Name}
  - {Due Date}: DATEADD(TODAY(), 7, 'days')
  - {Assigned To}: {Account Manager}
  - {Related Contact}: Triggering record
```

---

### Delete Record

```
Action: Delete record
Record: Triggering record or found record
Confirmation: Are you sure?
```

---

### Find Records

```
Action: Find records
Table: Customers
Condition: {Email} = {Input Email}
Limit: 1

// Use found records in subsequent actions
```

---

### Send Email

```
Action: Send email
To: {Email} field
From: automated@company.com
Subject: "Order #" & {Order Number} & " Confirmation"
Body:
  Hello {Customer Name},

  Your order #{{Order Number}} has been confirmed!

  Items: {{Item Count}}
  Total: ${{Total Amount}}

  Thank you for your business!

Attachments: {Invoice} (from attachment field)
```

---

### Send to Slack

```
Action: Send to Slack
Workspace: Your Workspace
Channel: #notifications
Message:
  🆕 New order received!

  Customer: {{Customer Name}}
  Amount: ${{Total}}
  Status: {{Status}}

  View: {{Record URL}}
```

---

### Run Script

```
Action: Run script
Language: JavaScript

let table = base.getTable("Orders");
let record = input.config();

// Custom logic here
let total = record.quantity * record.price;
let discount = total * 0.1;

await table.updateRecordAsync(record.id, {
  "Total": total,
  "Discount": discount,
  "Final Amount": total - discount
});

output.set("processed", true);
```

---

### Make HTTP Request

```
Action: Make HTTP request
Method: POST
URL: https://api.example.com/webhooks/order
Headers:
  Authorization: Bearer {{API_KEY}}
  Content-Type: application/json
Body:
  {
    "orderId": "{{Order ID}}",
    "customer": "{{Customer Name}}",
    "total": {{Total Amount}},
    "items": "{{Item List}}"
  }

Response handling:
  - Store in field: {API Response}
```

---

## Common Patterns

### Pattern 1: New Record Auto-Setup

**Scenario:** Automatically set default values and create related records when new record created

```
TRIGGER: When record created in "Projects"

ACTIONS:
  1. Update record
     - {Status}: "Planning"
     - {Created Date}: NOW()
     - {Project ID}: "PROJ-" & RECORD_ID()

  2. Create record in "Tasks"
     - {Task Name}: "Initial Planning"
     - {Related Project}: Triggering record
     - {Due Date}: DATEADD(TODAY(), 3, 'days')

  3. Create record in "Tasks"
     - {Task Name}: "Kickoff Meeting"
     - {Related Project}: Triggering record
     - {Due Date}: DATEADD(TODAY(), 5, 'days')

  4. Send to Slack
     Channel: #projects
     Message: "🆕 New project created: {{Project Name}}"
```

---

### Pattern 2: Status Change Workflow

**Scenario:** Different actions based on status transitions

```
TRIGGER: When {Status} field updated in "Deals"

CONDITION: {Status} = "Won"

ACTIONS:
  1. Update record
     - {Close Date}: NOW()
     - {Won By}: Current user

  2. Create record in "Customers"
     - {Name}: {Company Name}
     - {Contact Email}: {Email}
     - {Source Deal}: Triggering record

  3. Create record in "Onboarding"
     - {Customer}: New customer record
     - {Start Date}: TODAY()

  4. Send email
     To: {Email}
     Subject: "Welcome to Our Service!"
     Template: Welcome email

  5. Send to Slack
     Channel: #sales-wins
     Message: "🎉 {{Rep Name}} closed {{Company Name}} - ${{Amount}}!"
```

---

### Pattern 3: Due Date Reminders

**Scenario:** Send reminders before due date

```
AUTOMATION 1: 3-Day Reminder
TRIGGER: When record matches conditions
  Table: Tasks
  Condition: AND(
    DATETIME_DIFF({Due Date}, TODAY(), 'days') = 3,
    {Status} != "Completed"
  )
  Run: Daily at 9:00 AM

ACTIONS:
  1. Send email to {Assigned To}
     Subject: "Reminder: {{Task Name}} due in 3 days"

  2. Update {Reminder Sent}: "3-day"

---

AUTOMATION 2: 1-Day Reminder
TRIGGER: When record matches conditions
  Table: Tasks
  Condition: AND(
    DATETIME_DIFF({Due Date}, TODAY(), 'days') = 1,
    {Status} != "Completed"
  )
  Run: Daily at 9:00 AM

ACTIONS:
  1. Send email to {Assigned To}
     Subject: "⚠️ Urgent: {{Task Name}} due tomorrow"

  2. Update {Reminder Sent}: "1-day"

---

AUTOMATION 3: Overdue Alert
TRIGGER: When record matches conditions
  Table: Tasks
  Condition: AND(
    IS_BEFORE({Due Date}, TODAY()),
    {Status} != "Completed"
  )
  Run: Daily at 10:00 AM

ACTIONS:
  1. Send email to {Assigned To} + {Manager}
     Subject: "🔴 OVERDUE: {{Task Name}}"

  2. Send to Slack
     Channel: #overdue-tasks

  3. Update {Status}: "Overdue"
```

---

### Pattern 4: Approval Workflow

**Scenario:** Multi-stage approval process

```
TRIGGER: When {Approval Status} updated in "Expenses"

CONDITION: {Approval Status} = "Pending Manager"

ACTIONS:
  1. Send email to {Manager Email}
     Subject: "Expense approval needed: {{Employee Name}}"
     Body: Details + approval link

  2. Update {Submitted Date}: NOW()

---

TRIGGER: When {Approval Status} updated

CONDITION: {Approval Status} = "Approved by Manager"

ACTIONS:
  1. IF {Amount} > 1000:
       Update {Approval Status}: "Pending Finance"
       Send email to finance@company.com
     ELSE:
       Update {Approval Status}: "Approved"
       Update {Final Approved Date}: NOW()
       Send email to {Employee Email}: "Approved!"

---

TRIGGER: When {Approval Status} updated

CONDITION: {Approval Status} = "Approved"

ACTIONS:
  1. Create record in "Payments"
     - {Amount}: {Amount}
     - {Payee}: {Employee Name}
     - {Related Expense}: Triggering record

  2. Update {Paid}: TRUE

  3. Send email confirmation to employee
```

---

### Pattern 5: Data Sync Between Tables

**Scenario:** Keep related records in sync

```
TRIGGER: When record updated in "Contacts"
Fields: {Company Name}, {Industry}, {Status}

ACTIONS:
  1. Find records in "Deals"
     Condition: {Related Contact} = Triggering record

  2. For each found record:
     Update record
     - {Company}: {Company Name} from contact
     - {Industry}: {Industry} from contact
     - {Contact Status}: {Status} from contact
```

---

### Pattern 6: Sequential Task Creation

**Scenario:** Create tasks in sequence with dependencies

```
TRIGGER: When record created in "Projects"

ACTIONS:
  1. Create record in "Tasks"
     - {Name}: "Phase 1: Discovery"
     - {Order}: 1
     - {Due Date}: DATEADD(TODAY(), 5, 'days')

  2. Create record in "Tasks"
     - {Name}: "Phase 2: Design"
     - {Order}: 2
     - {Due Date}: DATEADD(TODAY(), 15, 'days')

  3. Create record in "Tasks"
     - {Name}: "Phase 3: Development"
     - {Order}: 3
     - {Due Date}: DATEADD(TODAY(), 45, 'days')

  4. Create record in "Tasks"
     - {Name}: "Phase 4: Testing"
     - {Order}: 4
     - {Due Date}: DATEADD(TODAY(), 60, 'days')

  5. Create record in "Tasks"
     - {Name}: "Phase 5: Launch"
     - {Order}: 5
     - {Due Date}: DATEADD(TODAY(), 70, 'days')
```

---

## Advanced Workflows

### Advanced Pattern 1: Conditional Branching

```
TRIGGER: When record created in "Support Tickets"

ACTIONS:
  1. IF {Priority} = "Critical":
       - Assign to {Senior Support}
       - Send to Slack (#critical-support)
       - Send email to management
       - Update {SLA Hours}: 2

  2. ELSE IF {Priority} = "High":
       - Assign to {Team Lead}
       - Update {SLA Hours}: 8

  3. ELSE:
       - Assign using round-robin
       - Update {SLA Hours}: 24
```

---

### Advanced Pattern 2: Batch Processing

```
TRIGGER: At scheduled time
  Daily at 11:00 PM

ACTIONS:
  1. Find records in "Orders"
     Condition: AND(
       {Status} = "Pending",
       DATETIME_DIFF(NOW(), {Created}, 'hours') > 24
     )
     Limit: 100

  2. For each found record:
     - Update {Status}: "Processing"
     - Make HTTP request to fulfillment API
     - Update {API Response}

  3. Send email summary
     To: operations@company.com
     Subject: "Daily batch: {{Record Count}} orders processed"
```

---

### Advanced Pattern 3: Error Handling

```
TRIGGER: When {API Status} updated in "Sync Queue"

CONDITION: {API Status} = "Failed"

ACTIONS:
  1. IF {Retry Count} < 3:
       - Update {Retry Count}: {Retry Count} + 1
       - Update {Status}: "Retrying"
       - Make HTTP request (retry API call)

  2. ELSE:
       - Update {Status}: "Failed - Manual Review"
       - Send to Slack (#errors)
       - Create record in "Error Log"
       - Send email to dev team
```

---

## Integration Patterns

### Zapier/Make.com Integration

```
TRIGGER: When record created in "Integration Queue"

ACTIONS:
  1. Make HTTP request
     Method: POST
     URL: {Webhook URL} (from record)
     Body: Record data as JSON

  2. If successful:
       Update {Status}: "Sent"
       Update {Sent Date}: NOW()

  3. If failed:
       Update {Status}: "Failed"
       Update {Error}: Response error
```

---

### n8n Integration

```
// In Airtable:
TRIGGER: When record updated
  Field: {Needs Processing}

CONDITION: {Needs Processing} = TRUE

ACTIONS:
  1. Make HTTP request to n8n webhook
     URL: https://n8n.company.com/webhook/process-record
     Body: {
       "recordId": "{{RECORD_ID()}}",
       "data": "{{JSON of all fields}}"
     }

  2. Update {Processing Status}: "Sent to n8n"

// In n8n:
// Webhook receives data → Process → Call back to Airtable to update status
```

---

## Best Practices

### ✅ DO

1. **Test automations** on copies of data first
2. **Use descriptive names** for automations
3. **Add comments** explaining complex logic
4. **Monitor automation runs** regularly
5. **Set run limits** to prevent infinite loops
6. **Use conditions** to filter unnecessary runs
7. **Batch process** when possible
8. **Log errors** to a separate table
9. **Use views** to pre-filter trigger records
10. **Document dependencies** between automations

### ❌ DON'T

1. **Don't create circular dependencies** (A triggers B triggers A)
2. **Don't run hourly** if daily is sufficient
3. **Don't send emails** without rate limiting
4. **Don't ignore error notifications**
5. **Don't use automations** for complex logic (use scripts)
6. **Don't trigger on every update** if specific field is important
7. **Don't forget timezones** for scheduled triggers
8. **Don't exceed run limits** - optimize triggers
9. **Don't hardcode values** that might change
10. **Don't skip testing** before enabling

---

### Performance Optimization

**Reduce automation runs:**
```
❌ Bad: Trigger on any update
✅ Good: Trigger only when {Status} field changes

❌ Bad: Run every hour to check dates
✅ Good: Use "when record matches conditions" with smart scheduling

❌ Bad: Process all records daily
✅ Good: Process only records that need it (use view filter)
```

**Batch operations:**
```
❌ Bad: One automation per record
✅ Good: Find multiple records, loop through them

❌ Bad: Send individual emails
✅ Good: Batch email sends (digest format)
```

---

### Error Handling Patterns

```
1. Retry Logic
   - Track retry count
   - Exponential backoff
   - Max retry limit

2. Error Logging
   - Create error log table
   - Record failure details
   - Alert on repeated failures

3. Fallback Actions
   - Primary action fails → try alternative
   - API call fails → queue for manual review
   - Email fails → send Slack notification
```

---

**Last Updated:** January 2025
**Automation Version:** Airtable Automations 2.0
**Documentation:** https://support.airtable.com/docs/getting-started-with-airtable-automations
