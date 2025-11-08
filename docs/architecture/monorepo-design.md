# Monorepo Design

**Automation Consulting Toolkit** - Domain-driven monorepo architecture for multi-platform automation delivery.

---

## 🎯 Design Principles

### 1. Domain-Driven Design

Each automation platform gets its own domain with complete isolation:
- **n8n** - Workflow automation
- **Airtable** - Database and low-code automation
- **Make.com** - Visual scenario building
- **Databases** - ETL and data workflows
- **Integrations** - Cross-platform automation

### 2. Separation of Concerns

- **Domains:** Platform-specific code and resources
- **Shared:** Cross-platform reusable components
- **Automation:** Build, deploy, and test infrastructure
- **Docs:** Centralized documentation

### 3. Scalability

Each domain can:
- Scale independently
- Have its own dependencies
- Deploy separately
- Evolve without affecting other domains

---

## 📁 Structure Rationale

### Why Monorepo?

**Advantages:**
- **Single source of truth** - All automation code in one place
- **Shared resources** - Reuse agents, skills, patterns across domains
- **Consistent tooling** - Same build, test, and deploy processes
- **Atomic changes** - Update multiple domains in single commit
- **Easier refactoring** - Cross-domain changes are simpler

**Vs. Multiple Repositories:**
- ❌ Harder to share code between platforms
- ❌ Duplicate documentation and tooling
- ❌ Harder to maintain consistency
- ❌ More complex dependency management

### Why Domain-Driven?

Each domain (n8n, Airtable, etc.) has:
```
domain/
├── agents/       # Domain-specific Claude agents
├── skills/       # Domain-specific capabilities
├── workflows/    # Domain artifacts (workflows, scenarios, bases)
├── knowledge/    # Domain knowledge bases
├── scripts/      # Domain automation scripts
├── src/          # Domain source code
└── tests/        # Domain-specific tests
```

**Benefits:**
- Clear ownership and boundaries
- Easy to find resources for specific platform
- Can assign team members to domains
- Independent evolution of each platform

---

## 🔄 Workflow

### Development Flow

1. **Choose Domain** - Select platform you're working with
2. **Use Domain Resources** - Agents, skills, templates specific to that domain
3. **Share Common Patterns** - Use shared/ for cross-platform code
4. **Test in Domain** - Each domain has its own test suite
5. **Deploy from Domain** - Use domain-specific deployment scripts

### Integration Flow

When building cross-platform integrations:

1. **Start in integrations/** domain
2. **Reference other domains** - Import from n8n, Airtable, etc.
3. **Use shared patterns** - Authentication, error handling, etc.
4. **Test end-to-end** - Validate full integration chain

---

## 🏗️ Implementation Details

### npm Workspaces

Root `package.json`:
```json
{
  "workspaces": [
    "domains/*",
    "automation",
    "shared"
  ]
}
```

**Benefits:**
- Single `node_modules` at root
- Shared dependencies hoisted
- Per-domain dependencies isolated
- Single `npm install` for everything

### Directory Conventions

**Consistent structure across domains:**
- `agents/` - Claude Code agents
- `skills/` - Claude Code skills
- `workflows/` - Domain artifacts (named appropriately per platform)
- `knowledge/` - Knowledge bases and documentation
- `scripts/` - Automation scripts (deploy, test, validate)
- `src/` - Source code
- `tests/` - Tests

### Git Strategy

**Single Repository:**
- All domains in one repo
- Shared git history
- Atomic cross-domain changes

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `domain/platform/*` - Platform-specific features

---

## 🔐 Security

### Environment Variables

Single `.env` file at root:
```bash
# n8n
N8N_API_KEY=...

# Airtable
AIRTABLE_API_KEY=...

# Make.com
MAKE_API_KEY=...
```

All domains reference same environment file.

### Credentials Management

- **Never commit credentials** - .gitignore excludes .env
- **Use platform credential systems** - n8n credential store, Airtable personal access tokens
- **Environment variables only** - No hardcoded keys

---

## 📊 Scalability

### Adding New Domains

1. Create `domains/new-platform/` directory
2. Copy structure from existing domain
3. Add to `package.json` workspaces
4. Create domain README
5. Add agents, skills, templates

### Team Collaboration

- **Domain ownership** - Assign team members to specific domains
- **Shared resources** - Shared/ directory for cross-team code
- **Documentation** - Each domain documents its own resources

---

## 🎯 Success Metrics

A well-designed monorepo should provide:

- ✅ **Fast onboarding** - New team members can navigate easily
- ✅ **Code reuse** - Shared patterns reduce duplication
- ✅ **Independent deployment** - Domains deploy separately
- ✅ **Consistent quality** - Shared tooling ensures standards
- ✅ **Easy discovery** - Clear structure makes resources findable

---

## 📚 References

- [Domain Structure](./domain-structure.md)
- [Technology Stack](./technology-stack.md)
- [Getting Started Guide](../guides/getting-started.md)

---

**Last Updated:** 2025-11-08
**Version:** 1.0
