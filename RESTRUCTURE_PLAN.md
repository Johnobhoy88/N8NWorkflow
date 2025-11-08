# Monorepo Restructure Execution Plan
**Created:** 2025-11-08
**Executor:** Claude Code
**Scope:** Full domain-driven monorepo restructure (Option C)
**Estimated Duration:** 1-2 hours of automated execution

---

## EXECUTION STRATEGY

### Approach: Safe Migration with Rollback Capability
1. Create new directory structure first (empty scaffolding)
2. Copy files to new locations (preserve originals)
3. Fix security issues during migration
4. Update all references and imports
5. Verify everything works
6. Commit as new baseline
7. (Optional) Remove old structure in separate commit

---

## PHASE 1: CREATE NEW DIRECTORY STRUCTURE

### Commands to Execute:
```bash
# Create domains
mkdir -p domains/{n8n,airtable,make-com,databases,integrations}

# n8n domain
mkdir -p domains/n8n/{agents,skills,workflows,knowledge,scripts,src,tests}
mkdir -p domains/n8n/workflows/{active,templates,examples}
mkdir -p domains/n8n/knowledge/{nodes,patterns,best-practices,validation}
mkdir -p domains/n8n/scripts/{deploy,test,validate}
mkdir -p domains/n8n/src/{client,deployers,validators}
mkdir -p domains/n8n/tests/{unit,integration,e2e}
mkdir -p domains/n8n/skills/{error-handling,deployment,expression-syntax,node-configuration,workflow-patterns}

# Airtable domain
mkdir -p domains/airtable/{agents,skills,bases,knowledge,scripts,src,tests}
mkdir -p domains/airtable/bases/{templates,schemas,examples}
mkdir -p domains/airtable/knowledge/{field-types,formulas,api-patterns,best-practices}
mkdir -p domains/airtable/skills/{base-design,formulas,automations,api-integration}

# Make.com domain
mkdir -p domains/make-com/{agents,skills,scenarios,knowledge,scripts,src,tests}
mkdir -p domains/make-com/scenarios/{templates,examples}
mkdir -p domains/make-com/knowledge/{modules,patterns,best-practices}
mkdir -p domains/make-com/skills/{scenario-building,router-logic,modules,data-structures}

# Databases domain
mkdir -p domains/databases/{agents,skills,workflows,knowledge,scripts,src,tests}
mkdir -p domains/databases/workflows/{etl,sync,backup}
mkdir -p domains/databases/knowledge/{query-patterns,optimization,best-practices}
mkdir -p domains/databases/skills/{postgresql,mysql,mongodb,migrations}

# Integrations domain
mkdir -p domains/integrations/{agents,skills,workflows,knowledge,scripts,src,tests}
mkdir -p domains/integrations/workflows/{n8n-airtable,make-database,multi-platform}
mkdir -p domains/integrations/knowledge/{api-patterns,authentication,rate-limiting}
mkdir -p domains/integrations/skills/{api-patterns,webhook-handling,oauth-flows,data-transformation}

# Shared
mkdir -p shared/{agents,skills,knowledge,templates,patterns}
mkdir -p shared/knowledge/{design-patterns,best-practices,methodologies,glossary}
mkdir -p shared/templates/{client-briefs,project-estimates,documentation}
mkdir -p shared/patterns/{error-handling,retry-logic,data-validation,monitoring}
mkdir -p shared/skills/{automation-design,client-delivery,testing-patterns,documentation}

# Automation
mkdir -p automation/{scripts,src,config}
mkdir -p automation/scripts/{deploy,test,validate,utils}
mkdir -p automation/src/{common,deployers,validators,loaders}
mkdir -p automation/config/defaults

# Docs
mkdir -p docs/{architecture,guides,references,audits}

# Tests
mkdir -p tests/{integration,e2e,test-utils}

# GitHub
mkdir -p .github/workflows
```

**Verification:** Check all directories created successfully

---

## PHASE 2: MIGRATE EXISTING FILES

### 2.1 Migrate n8n Agents

**Source:** `.claude/agents/*.md`
**Destination:** `domains/n8n/agents/`

```bash
# Map existing agents to new names
cp .claude/agents/n8n-workflow-architect.md domains/n8n/agents/architect.md
cp .claude/agents/n8n-workflow-debugger.md domains/n8n/agents/debugger.md
cp .claude/agents/n8n-deployment.md domains/n8n/agents/deployment.md

# Keep orchestrator agents in .claude/agents/
cp .claude/agents/claude-cc.md .claude/agents/orchestrator.md
# Remove old n8n-specific agents from .claude/agents/ later
```

**Files to Migrate:**
- ✅ n8n-workflow-architect.md → architect.md
- ✅ n8n-workflow-debugger.md → debugger.md
- ✅ n8n-deployment.md → deployment.md
- ❌ n8narchitect.md (legacy, evaluate if needed)
- ✅ claude-cc.md → orchestrator.md (stays in .claude/agents/)

---

### 2.2 Migrate n8n Skills

**Source:** `.claude/skills/`
**Destination:** `domains/n8n/skills/`

```bash
# Move n8n skills to domain
cp -r .claude/skills/n8n-error-handling domains/n8n/skills/error-handling
cp -r .claude/skills/n8n-deployment domains/n8n/skills/deployment

# Keep generic skills in .claude/skills/
# (none currently, but future shared skills go there)
```

**Files to Migrate:**
- ✅ n8n-error-handling/ → domains/n8n/skills/error-handling/
- ✅ n8n-deployment/ → domains/n8n/skills/deployment/
- ✅ n8n-troubleshooter.md → domains/n8n/skills/troubleshooter/ (convert to dir)

---

### 2.3 Migrate n8n Workflows

**Source:** `n8n-workflows/`, `workflow-templates/`
**Destination:** `domains/n8n/workflows/`

```bash
# Active workflows
cp n8n-workflows/*.json domains/n8n/workflows/active/

# Templates
cp workflow-templates/*.json domains/n8n/workflows/templates/
```

**Files to Migrate:**
- ✅ workflow-builder-gemini-v2-with-qa.json → active/
- ✅ workflow-builder-gemini-v2-with-qa-enhanced.json → active/
- ✅ All workflow-templates/*.json → templates/

**⚠️ SECURITY FIX:** During migration, fix hardcoded API keys!

---

### 2.4 Migrate n8n Knowledge Bases

**Source:** `knowledge-bases/`
**Destination:** `domains/n8n/knowledge/`

```bash
# Organize knowledge bases by category
cp knowledge-bases/node-catalog.json domains/n8n/knowledge/nodes/catalog.json
cp knowledge-bases/patterns.json domains/n8n/knowledge/patterns/patterns.json
cp knowledge-bases/best-practices.json domains/n8n/knowledge/best-practices/practices.json
cp knowledge-bases/validation-rules.json domains/n8n/knowledge/validation/rules.json
```

**Files to Migrate:**
- ✅ node-catalog.json → knowledge/nodes/catalog.json
- ✅ patterns.json → knowledge/patterns/patterns.json
- ✅ best-practices.json → knowledge/best-practices/practices.json
- ✅ validation-rules.json → knowledge/validation/rules.json

---

### 2.5 Migrate n8n Scripts

**Source:** `scripts/`
**Destination:** `domains/n8n/scripts/` and `automation/scripts/`

**Categorization:**
- **n8n-specific** → `domains/n8n/scripts/`
- **Generic automation** → `automation/scripts/`

```bash
# n8n deployment scripts
cp scripts/deploy-workflow.js domains/n8n/scripts/deploy/deploy-workflow.js
cp scripts/deploy-enhanced-workflow.js domains/n8n/scripts/deploy/deploy-enhanced.js
cp scripts/deploy-original-fixed.js domains/n8n/scripts/deploy/deploy-original-fixed.js
cp scripts/activate-workflow.js domains/n8n/scripts/deploy/activate.js
cp scripts/update-workflow.js domains/n8n/scripts/deploy/update.js

# n8n testing scripts
cp scripts/test-form-webhook.js domains/n8n/scripts/test/test-form-webhook.js
cp scripts/test-real-workflow.js domains/n8n/scripts/test/test-real-workflow.js
cp scripts/submit-form-direct.js domains/n8n/scripts/test/submit-form.js

# n8n validation scripts
cp scripts/validate-workflow.js domains/n8n/scripts/validate/validate-workflow.js
cp scripts/check-credentials.js domains/n8n/scripts/validate/check-credentials.js
```

**Files to Migrate:**
- ✅ deploy-workflow.js → domains/n8n/scripts/deploy/
- ✅ deploy-enhanced-workflow.js → domains/n8n/scripts/deploy/
- ✅ deploy-original-fixed.js → domains/n8n/scripts/deploy/
- ✅ activate-workflow.js → domains/n8n/scripts/deploy/
- ✅ update-workflow.js → domains/n8n/scripts/deploy/
- ✅ test-form-webhook.js → domains/n8n/scripts/test/
- ✅ test-real-workflow.js → domains/n8n/scripts/test/
- ✅ submit-form-direct.js → domains/n8n/scripts/test/
- ✅ validate-workflow.js → domains/n8n/scripts/validate/
- ✅ check-credentials.js → domains/n8n/scripts/validate/

---

### 2.6 Migrate n8n Source Code

**Source:** `src/`
**Destination:** `domains/n8n/src/` and `automation/src/`

```bash
# n8n-specific source
cp src/n8n-setup.js domains/n8n/src/client/setup.js
cp src/n8n-mcp.js domains/n8n/src/client/mcp.js
cp src/deploy-phase1.js domains/n8n/src/deployers/phase1.js

# Shared source
cp src/knowledge-base-loader.js automation/src/loaders/knowledge-base-loader.js
cp src/index.js automation/src/index.js
```

**Files to Migrate:**
- ✅ n8n-setup.js → domains/n8n/src/client/setup.js
- ✅ n8n-mcp.js → domains/n8n/src/client/mcp.js
- ✅ deploy-phase1.js → domains/n8n/src/deployers/phase1.js
- ✅ knowledge-base-loader.js → automation/src/loaders/ (shared)
- ✅ index.js → automation/src/index.js

---

### 2.7 Migrate Documentation

**Source:** Root MD files, `docs/`
**Destination:** `docs/`

```bash
# Architecture docs
# (will create new)

# Guides
cp N8N_SETUP_GUIDE.md docs/guides/n8n-setup.md
cp FORM_TEST_GUIDE.md docs/guides/form-testing.md
cp EMAIL_SUBMISSION_GUIDE.md docs/guides/email-submission.md
cp README.md docs/guides/legacy-readme.md

# References
cp docs/API_SKILLS_REFERENCE.md docs/references/api-skills.md
cp docs/CLAUDE_SKILL_PATTERNS_GUIDE.md docs/references/skill-patterns.md
cp docs/IMPLEMENTATION_PATTERNS_SUMMARY.md docs/references/implementation-patterns.md
cp docs/CLAUDE_SKILL_IMPLEMENTATION_PATTERNS.json docs/references/skill-patterns.json

# Audits
cp WORKFLOW_AUDIT_REPORT.md docs/audits/2025-11-08-workflow-security-audit.md
cp CURRENT_STATE.md docs/audits/2025-11-08-baseline.md
```

**Files to Migrate:**
- ✅ N8N_SETUP_GUIDE.md → docs/guides/
- ✅ FORM_TEST_GUIDE.md → docs/guides/
- ✅ EMAIL_SUBMISSION_GUIDE.md → docs/guides/
- ✅ WORKFLOW_AUDIT_REPORT.md → docs/audits/
- ✅ CURRENT_STATE.md → docs/audits/
- ✅ docs/*.md → docs/references/

---

### 2.8 Migrate Configuration

**Source:** `config/`, root files
**Destination:** `automation/config/`

```bash
# Configuration files
cp config/.env.example automation/config/.env.example
# .env stays in root (gitignored)

# Keep package.json in root (monorepo root)
# Create new package.json files for each domain
```

---

## PHASE 3: FIX SECURITY ISSUES

### 3.1 Fix Hardcoded API Keys in Workflows

**Files to Fix:**
- `domains/n8n/workflows/active/workflow-builder-gemini-v2-with-qa.json`
- `domains/n8n/workflows/active/workflow-builder-gemini-v2-with-qa-enhanced.json`

**Strategy:**
1. Read workflow JSON
2. Find all occurrences of hardcoded API key
3. Replace with environment variable reference: `$env.GEMINI_API_KEY`
4. Save fixed version

**Code Pattern:**
```javascript
// Before:
"url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyDwHRrv4WHwHDDvK0KzdfpTfm1pnMBbNPk"

// After:
"url": "={{`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${$env.GEMINI_API_KEY}`}}"
```

**Nodes to Fix:**
1. Brief Parser
2. Architect Agent
3. Synthesis Agent
4. QA Validator Agent

---

## PHASE 4: UPDATE REFERENCES

### 4.1 Update Import Paths in Scripts

**Find all `require()` statements that reference old paths:**
```javascript
// Old:
require('../src/n8n-setup.js')
require('./src/knowledge-base-loader.js')

// New:
require('../../automation/src/loaders/knowledge-base-loader.js')
require('../src/client/setup.js')
```

**Strategy:**
- Use Grep to find all `require()` statements
- Update paths based on new structure
- Test each script to verify imports work

---

### 4.2 Update Agent References

**Files to Update:**
- `.claude/CLAUDE.md`
- Domain-specific agent files

**Changes:**
- Update agent references to new locations
- Update skill references to domain-specific paths

---

### 4.3 Update package.json

**Root package.json** - Convert to monorepo:
```json
{
  "name": "automation-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "domains/*",
    "automation",
    "shared"
  ],
  "scripts": {
    "install:all": "npm install",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  }
}
```

**Create domain-specific package.json files:**
- `domains/n8n/package.json`
- `domains/airtable/package.json`
- `domains/make-com/package.json`
- `domains/databases/package.json`
- `domains/integrations/package.json`
- `automation/package.json`
- `shared/package.json`

---

## PHASE 5: CREATE DOCUMENTATION

### 5.1 Create README.md Files

**Root README.md:**
- Project overview
- Monorepo structure
- Getting started
- Development workflow

**Domain READMEs:**
- `domains/n8n/README.md` - n8n domain guide
- `domains/airtable/README.md` - Airtable domain guide (placeholder)
- `domains/make-com/README.md` - Make.com domain guide (placeholder)
- `domains/databases/README.md` - Database domain guide (placeholder)
- `domains/integrations/README.md` - Integrations guide (placeholder)

**Shared README:**
- `shared/README.md` - Shared resources guide

**Automation README:**
- `automation/README.md` - Build & deployment guide

---

### 5.2 Create Architecture Documentation

**docs/architecture/monorepo-design.md:**
- Why monorepo?
- Domain-driven design principles
- Folder structure rationale
- Scalability considerations

**docs/architecture/domain-structure.md:**
- Domain organization
- Shared vs domain-specific
- Cross-domain dependencies

**docs/architecture/technology-stack.md:**
- Tools and platforms
- Dependencies
- MCP servers

---

### 5.3 Create WORKFLOW_GUIDE.md

**Comprehensive guide covering:**
- How to use the monorepo
- How to work with each domain
- How to use agents and skills
- Development workflow
- Deployment process
- Testing strategies

---

### 5.4 Create CC_WEB_PROMPT.md

**Claude Code Web expansion prompt:**
- Summary of what exists
- What needs to be built
- Focus areas for each domain
- Integration patterns
- Quality standards

---

## PHASE 6: GIT OPERATIONS

### 6.1 Create New Branch

```bash
git checkout -b restructure/monorepo-full
```

---

### 6.2 Stage All Changes

```bash
# Add all new files
git add domains/
git add shared/
git add automation/
git add docs/
git add tests/
git add .github/

# Add updated configuration
git add package.json
git add .gitignore

# Add documentation
git add README.md
git add WORKFLOW_GUIDE.md
git add CC_WEB_PROMPT.md
git add CHANGELOG.md
```

---

### 6.3 Commit Baseline

```bash
git commit -m "feat: Restructure to domain-driven monorepo

BREAKING CHANGE: Complete project restructure with domain separation

- Organize into domains: n8n, airtable, make-com, databases, integrations
- Create shared resources directory
- Centralize automation scripts and source
- Fix security issues (hardcoded API keys)
- Update all import paths and references
- Create comprehensive documentation
- Implement monorepo structure with workspaces

Domains created:
- domains/n8n: n8n workflow automation
- domains/airtable: Airtable automation (placeholder)
- domains/make-com: Make.com automation (placeholder)
- domains/databases: Database workflows (placeholder)
- domains/integrations: Cross-platform integrations (placeholder)

Shared:
- shared/agents: Generic automation agents
- shared/skills: Platform-agnostic skills
- shared/knowledge: Common automation knowledge
- shared/templates: Reusable templates
- shared/patterns: Design patterns

Automation:
- automation/scripts: Deployment and testing scripts
- automation/src: Shared source code
- automation/config: Configuration management

Security fixes:
- Removed hardcoded Gemini API key from workflows
- Migrated to environment variable references
- Updated 4 nodes across 2 workflow files

Documentation:
- docs/architecture: Monorepo design documentation
- docs/guides: How-to guides
- docs/references: API and pattern references
- docs/audits: Audit reports

Migration preserved all existing functionality while improving:
- Organization and discoverability
- Scalability for multi-platform automation
- Domain separation and boundaries
- Security and credential management

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## PHASE 7: VERIFICATION

### 7.1 Verify Directory Structure

```bash
tree -L 3 -I 'node_modules|.git'
```

**Check:**
- ✅ All domains created
- ✅ All subdirectories exist
- ✅ Files migrated to correct locations

---

### 7.2 Verify File Migrations

```bash
# Check file counts
find domains/n8n -type f | wc -l
find domains -type f | wc -l
find shared -type f | wc -l
find automation -type f | wc -l
```

**Expected:**
- domains/n8n: ~40+ files
- All domains: ~50+ files
- shared: ~5+ files (initial)
- automation: ~20+ files

---

### 7.3 Verify Security Fixes

```bash
# Verify no hardcoded API keys
grep -r "AIzaSyDwHRrv4WHwHDDvK0KzdfpTfm1pnMBbNPk" domains/n8n/workflows/
# Should return no results

# Verify environment variable usage
grep -r "GEMINI_API_KEY" domains/n8n/workflows/
# Should show references in workflow files
```

---

### 7.4 Test Scripts

```bash
# Test that scripts can still run
node domains/n8n/scripts/validate/validate-workflow.js --help

# Verify imports work
node automation/src/index.js
```

---

## PHASE 8: CLEANUP (Optional)

### 8.1 Archive Old Structure

**Option A: Keep for reference**
```bash
mkdir -p archive/pre-restructure
cp -r .claude/agents/*.md archive/pre-restructure/agents/
cp -r n8n-workflows archive/pre-restructure/
cp -r workflow-templates archive/pre-restructure/
cp -r knowledge-bases archive/pre-restructure/
cp -r scripts archive/pre-restructure/
cp -r src archive/pre-restructure/
```

**Option B: Remove old files**
```bash
# Only do this after verification!
# git rm -r n8n-workflows/
# git rm -r workflow-templates/
# git rm -r knowledge-bases/
# git rm -r scripts/
# git rm -r src/
```

---

## ROLLBACK PLAN

If something goes wrong:

```bash
# Abort restructure
git checkout master
git branch -D restructure/monorepo-full

# Restore working state
git status
git restore .
```

---

## SUCCESS CRITERIA

✅ All files migrated to new structure
✅ No hardcoded API keys in workflows
✅ All import paths updated
✅ Documentation complete
✅ Git commit successful
✅ Scripts can execute from new locations
✅ No broken references

---

## POST-RESTRUCTURE TASKS

1. Test deployment workflow end-to-end
2. Update CI/CD pipeline (if exists)
3. Update team documentation
4. Notify stakeholders of new structure
5. Begin expansion work (Airtable, Make, etc.)

---

**READY TO EXECUTE**
