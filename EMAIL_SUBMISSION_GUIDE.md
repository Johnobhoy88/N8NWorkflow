# 📧 Email Submission Guide - n8n Workflow Builder

## Quick Start

**Want to submit your workflow brief via email instead of a form?** You can now do it!

### Three Simple Steps:

1. **Compose an email** to: `workflows@yourdomain.com`
2. **Subject line** must include: `[WORKFLOW]`
3. **Email body**: Describe your workflow requirements
4. **Hit send** - You'll receive your generated workflow in 45-90 seconds

---

## 📧 Email Format

### Subject Line (REQUIRED)

The subject line **MUST** include `[WORKFLOW]` for the system to recognize it.

**Valid Examples:**
- ✅ `[WORKFLOW] HubSpot to Asana sync`
- ✅ `[WORKFLOW] Customer feedback automation`
- ✅ `[WORKFLOW] Create API data pipeline`
- ✅ `[WORKFLOW] Email parser with AI`

**Invalid Examples:**
- ❌ `HubSpot to Asana sync` (missing [WORKFLOW])
- ❌ `[workflow] sync` (lowercase - must be uppercase)
- ❌ `WORKFLOW HubSpot sync` (missing brackets)

### Email Body (REQUIRED)

The email body contains your workflow brief - describe what you want:

**Example 1: Simple Brief**
```
When a customer fills out a form on our website, send them a
confirmation email and save their info to our database. If they
already exist, skip the confirmation but update their record.
```

**Example 2: Detailed Brief**
```
I need to automate our customer onboarding process:

1. When someone signs up via our web form, send a welcome email
2. Create a new contact in our CRM
3. Add them to a Slack channel for the account team
4. Create a project in Asana for account setup
5. Send a welcome package via email with login info

The process should handle:
- Duplicate customer detection (don't re-add)
- Failed emails (retry 3 times)
- Team notification for VIP customers
```

**Example 3: Complex Requirement**
```
We need multi-stage automation:

Stage 1 - Lead Processing (triggered by form):
- Extract lead info and send acknowledgment email
- Log to database
- Send to sales team Slack

Stage 2 - Qualification (triggered by sales activity):
- Check if qualified (database lookup)
- Send follow-up emails based on status
- Update CRM

Stage 3 - Reporting (scheduled weekly):
- Generate sales report
- Send to management email
- Archive metrics in database

Need error handling for all API calls and fallbacks if services are down.
```

---

## 🎯 Tips for Better Results

### Be Specific

Instead of:
- ❌ "Make an automation"
- ❌ "Connect systems"
- ❌ "Send emails"

Write:
- ✅ "When a customer submits a contact form, send them a confirmation email and notify our team on Slack"
- ✅ "Sync new deals from HubSpot to Asana as projects"
- ✅ "Every morning at 9am, fetch yesterday's orders and email a summary to management"

### Describe the Flow

Tell the system:
1. **What triggers it?** (form submission, schedule, API call, email received)
2. **What data do you need?** (customer info, product details, API responses)
3. **What should happen?** (send emails, save to database, post to Slack)
4. **Any edge cases?** (duplicates, errors, conditionals)

### Include Constraints

Mention:
- Budget/complexity limits (e.g., "5 nodes max")
- Integration requirements (e.g., "Must work with our PostgreSQL database")
- Performance needs (e.g., "Must complete in < 30 seconds")
- Error handling (e.g., "Retry failed email sends 3 times")

---

## 📨 What Happens After You Send

```
You send email
      ↓
System detects [WORKFLOW] in subject
      ↓
Email is marked as read
      ↓
Your brief is extracted from email body
      ↓
Gemini AI analyzes requirements
      ↓
Workflow architect designs the nodes
      ↓
Synthesis engine generates all nodes
      ↓
QA validator checks the workflow
      ↓
Complete workflow sent to your email
      ↓
⏱️ Total time: 45-90 seconds
```

---

## 📧 Example Complete Email

```
To: workflows@yourdomain.com
From: your@email.com
Subject: [WORKFLOW] Sales CRM to Email Notifications

Body:
---

Hi,

We need to automate our sales notifications:

When a new lead comes in through our web form:
1. Send the lead a thank you email with our brochure
2. Add them to our Salesforce CRM
3. Send our sales team an alert in Slack
4. Add their email to our email marketing list
5. Create a follow-up reminder for 3 days later

Also, every Monday morning:
1. Fetch all leads from the past week
2. Generate a summary email for the sales manager
3. Log metrics to our analytics database

Error handling:
- If email send fails, retry 3 times
- If CRM is down, queue the request for later
- If Slack is down, send alert to email instead

Thanks!
Sarah
```

---

## ✅ You'll Receive

After your email is processed, you'll get a response email containing:

1. **Workflow JSON** - Complete, ready-to-import n8n workflow
2. **Architecture Overview** - How the nodes connect
3. **Node Configuration** - All settings and parameters
4. **QA Validation** - Whether the workflow is production-ready
5. **Usage Instructions** - How to import and deploy

**Example response email preview:**
```
Subject: Your n8n Workflow is Ready!

Your Sales CRM automation workflow has been generated successfully:

📊 Workflow Summary:
- 8 nodes configured
- Form Trigger → Notification Pipeline → Database Logging
- Error handling on all API calls
- Ready for deployment

Attached: complete workflow JSON

To import:
1. Log into n8n
2. Create new workflow
3. Paste the JSON from this email
4. Connect your actual databases/APIs
5. Deploy!
```

---

## 🆚 Email vs Form Submission

Both methods do exactly the same thing - pick whichever is easier for you:

| Feature | Email | Form |
|---------|-------|------|
| **Easiest Access** | Anywhere (email client) | Web browser |
| **Best for** | Mobile users, quick submissions | Detailed requirements |
| **Rich formatting** | Basic text | Textarea |
| **Subject/context** | Email subject captures intent | Must be in body |
| **Attachments** | Not used (yet) | Not supported |
| **Response time** | 45-90 seconds | 45-90 seconds |

---

## ❌ Troubleshooting

### Email Not Processed
- ❌ **Forgot `[WORKFLOW]` in subject?** Add it and resend
- ❌ **Sent to wrong address?** Make sure it's workflows@yourdomain.com
- ❌ **Email went to spam?** Check spam folder, mark as "not spam"

### Didn't Receive Response
- ⏱️ **Wait 90 seconds** - Some workflows take longer
- 📧 **Check spam folder** - Responses might be filtered
- 🔄 **Try again** - Sometimes the system gets busy
- 📞 **Contact us** - If still nothing after 5 minutes

### Response Says "Error"
- 📝 **Read the error message** - It will say what went wrong
- 📧 **Try with simpler brief** - Too complex requests might fail
- 🎯 **Provide more context** - Vague briefs are harder to process
- 💬 **Ask for help** - Include the error message when contacting support

---

## 🔐 Privacy & Security

- ✅ Your emails are processed securely
- ✅ Email bodies are NOT stored after processing
- ✅ Only your brief is analyzed - no metadata is logged
- ✅ Generated workflows are sent directly to your email
- ✅ System uses standard n8n encryption

---

## 📋 Email Submission Checklist

Before sending, make sure:

- [ ] Email to: `workflows@yourdomain.com`
- [ ] Subject includes: `[WORKFLOW]` in UPPERCASE
- [ ] Email body has your brief
- [ ] Subject includes a brief title after `[WORKFLOW]`
- [ ] Body describes what you want (triggers, actions, integrations)
- [ ] Sent from the email address that should receive the response

---

## 🎓 Real-World Examples

### Example 1: Customer Signup Automation

```
To: workflows@yourdomain.com
Subject: [WORKFLOW] Customer onboarding automation

When customers sign up via our contact form:
1. Send them a welcome email with our onboarding guide PDF
2. Create contact in HubSpot
3. Add to email newsletter list
4. Send our team a Slack notification
5. Schedule 7-day follow-up email

Handle duplicates by checking HubSpot first before adding.
```

### Example 2: Weekly Reporting

```
To: workflows@yourdomain.com
Subject: [WORKFLOW] Weekly sales report automation

Every Friday at 5pm:
1. Query our database for this week's orders
2. Calculate totals by product category
3. Generate HTML email report
4. Send to all managers (team distribution list)
5. Save report to Google Drive

Include charts/metrics for: revenue, order count, top products.
```

### Example 3: Error Alert System

```
To: workflows@yourdomain.com
Subject: [WORKFLOW] Production error monitoring

Monitor our API endpoint every 5 minutes:
1. Check if endpoint responds with 200
2. If fails, send immediate Slack alert with status code
3. After 3 consecutive failures, email ops team
4. Log all failures to our monitoring database
5. When restored, send "all clear" notification

Include timestamp and error details in all alerts.
```

---

## 📞 Need Help?

If you have questions about:
- **Email format?** → Review the "Email Format" section above
- **What to write in the brief?** → Check "Tips for Better Results"
- **Email not working?** → See "Troubleshooting" section
- **Want to use the form instead?** → https://highlandai.app.n8n.cloud/form/workflow-builder

---

## 🚀 Ready?

Send your first workflow brief via email today!

**Steps:**
1. Open your email client
2. New message to: workflows@yourdomain.com
3. Subject: [WORKFLOW] [your title]
4. Body: [your requirements]
5. Send!
6. Check your inbox in ~60 seconds

Happy automating! 🎉

---

**Last Updated:** November 5, 2025
**Features:** Email Trigger v1.0, Data Normalizer, Input Validation
**Status:** Production Ready
