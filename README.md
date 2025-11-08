# Automation Consulting Monorepo

**Multi-platform automation consulting toolkit** - Domain-driven monorepo for n8n, Airtable, Make.com, databases, and integrations.

---

## 🎯 Overview

This monorepo contains everything needed to deliver professional automation consulting across multiple platforms. Each domain is self-contained with its own agents, skills, workflows, and knowledge bases.

### Supported Platforms

- **n8n** - Workflow automation and integrations ✅ **Active**
- **Airtable** - Low-code database and workflows 🚧 Coming soon
- **Make.com** - Visual automation scenarios 🚧 Coming soon
- **Databases** - ETL, sync, and migrations 🚧 Coming soon
- **Integrations** - Cross-platform automation 🚧 Coming soon

---

## 📁 Repository Structure

```
automation-monorepo/
├── domains/              # Platform-specific automation
│   ├── n8n/             # n8n workflows, skills, agents
│   ├── airtable/        # Airtable bases and automations
│   ├── make-com/        # Make.com scenarios
│   ├── databases/       # Database workflows
│   └── integrations/    # Cross-platform integrations
├── shared/              # Cross-domain resources
│   ├── agents/          # Generic automation agents
│   ├── skills/          # Platform-agnostic skills
│   ├── knowledge/       # Common patterns and practices
│   └── templates/       # Reusable templates
├── automation/          # Build and deployment
│   ├── scripts/         # Automation scripts
│   ├── src/             # Shared source code
│   └── config/          # Configuration
├── docs/                # Documentation
│   ├── architecture/    # Design docs
│   ├── guides/          # How-to guides
│   ├── references/      # API references
│   └── audits/          # Security and quality audits
└── tests/               # Integration and E2E tests
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- n8n instance (Cloud or self-hosted)
- API keys for platforms you're using

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd N8NWorkflow

# Install dependencies
npm install

# Copy environment template
cp automation/config/.env.example .env

# Add your API keys to .env
```

### For n8n Development

```bash
# Navigate to n8n domain
cd domains/n8n

# Deploy a workflow
node scripts/deploy/deploy-workflow.js

# Test a workflow
node scripts/test/test-form-webhook.js

# Validate workflows
node scripts/validate/validate-workflow.js
```

---

## 📖 Documentation

### Getting Started
- [n8n Setup Guide](docs/guides/n8n-setup.md)
- [Form Testing Guide](docs/guides/form-testing.md)
- [Email Submission Guide](docs/guides/email-submission.md)

### Architecture
- [Monorepo Design](docs/architecture/monorepo-design.md)
- [Domain Structure](docs/architecture/domain-structure.md)
- [Technology Stack](docs/architecture/technology-stack.md)

### References
- [API Skills Reference](docs/references/api-skills.md)
- [Skill Patterns](docs/references/skill-patterns.md)
- [Implementation Patterns](docs/references/implementation-patterns.md)

### Audits
- [2025-11-08 Security Audit](docs/audits/2025-11-08-workflow-security-audit.md)
- [2025-11-08 Baseline](docs/audits/2025-11-08-baseline.md)

---

## 🎨 Domain Guides

Each domain has its own comprehensive guide:

- [n8n Domain Guide](domains/n8n/README.md) ✅ **Active**
- [Airtable Domain Guide](domains/airtable/README.md) 🚧 Placeholder
- [Make.com Domain Guide](domains/make-com/README.md) 🚧 Placeholder
- [Database Domain Guide](domains/databases/README.md) 🚧 Placeholder
- [Integrations Guide](domains/integrations/README.md) 🚧 Placeholder

---

## 🤖 Claude Code Integration

This repository is optimized for Claude Code with:

- **Agents:** Domain-specific automation agents in `.claude/agents/`
- **Skills:** Platform-specific skills in each domain
- **MCP Servers:** Configured for n8n and other platforms
- **Hooks:** Automated workflows on file changes

### Using Claude Code

The repository includes Claude-specific configurations:
- `.claude/CLAUDE.md` - Claude instructions
- `.claude/INSTRUCTIONS.md` - Detailed usage guide
- `.claude/agents/` - Specialized agents
- Domain-specific skills in `domains/*/skills/`

---

## 🔐 Security

**Important:** This repository uses environment variables for all sensitive data.

### Environment Variables Required

```bash
# n8n
N8N_API_URL=https://your-n8n-instance.app.n8n.cloud
N8N_API_KEY=your-api-key

# AI APIs
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Database (if using)
DATABASE_URL=postgresql://...
```

**Never commit API keys or credentials!** They are automatically excluded via `.gitignore`.

---

## 📊 What's Included

### n8n Domain (Active)

- **3 Agents:** Architect, Debugger, Deployment
- **3 Skills:** Error Handling, Deployment, Troubleshooter
- **2 Active Workflows:** Meta-workflow builders with QA
- **5 Templates:** AI orchestration, API sync, error handling, GitHub PR review, monitoring
- **4 Knowledge Bases:** Nodes, patterns, best practices, validation rules
- **10 Scripts:** Deploy, test, and validate workflows

### Other Domains (Placeholders)

- **Airtable:** Base design, formulas, automations, API integration
- **Make.com:** Scenario building, router logic, modules, data structures
- **Databases:** PostgreSQL, MySQL, MongoDB, migrations
- **Integrations:** API patterns, webhook handling, OAuth flows

---

## 🛠️ Development

### Monorepo Workspaces

This repository uses npm workspaces for efficient dependency management:

```bash
# Install all dependencies
npm install

# Run tests across all domains
npm run test

# Lint all code
npm run lint
```

### Adding a New Domain

1. Create directory structure in `domains/your-domain/`
2. Add `package.json` to the domain
3. Create agents, skills, and knowledge bases
4. Update root `package.json` workspaces
5. Add domain README

---

## 📈 Roadmap

### Phase 1: n8n Foundation ✅ Complete
- [x] Domain structure
- [x] Agents and skills
- [x] Workflow templates
- [x] Knowledge bases
- [x] Scripts and tools
- [x] Security fixes (no hardcoded credentials)

### Phase 2: Airtable Expansion 📅 Planned
- [ ] Airtable agents
- [ ] Base design skills
- [ ] Formula patterns
- [ ] API integration templates

### Phase 3: Make.com Integration 📅 Planned
- [ ] Scenario templates
- [ ] Router logic patterns
- [ ] Module catalog

### Phase 4: Database Workflows 📅 Planned
- [ ] ETL templates
- [ ] Sync workflows
- [ ] Backup automation

### Phase 5: Cross-Platform Integrations 📅 Planned
- [ ] n8n ↔ Airtable sync
- [ ] Make.com ↔ Database workflows
- [ ] Multi-platform orchestration

---

## 🆘 Support

- Check [docs/guides/](docs/guides/) for how-to documentation
- Review [docs/references/](docs/references/) for API details
- Consult domain-specific READMEs for detailed guides
- See [docs/audits/](docs/audits/) for security and baseline reports

---

**Built with Claude Code** - Domain-driven automation consulting toolkit for professional service delivery.

**Last updated:** 2025-11-08
**Restructure:** Domain-driven monorepo v1.0
