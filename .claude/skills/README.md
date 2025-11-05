# Claude Skills for n8n Workflows

This directory contains specialized Claude skills for building production-ready n8n workflows.

## Available Skills

### 1. n8n-error-handling
**Path:** `.claude/skills/n8n-error-handling/SKILL.md`

Expert in error handling patterns, retry logic, and resilient workflow design.

**Capabilities:**
- Exponential backoff retry logic
- Error detection and routing
- Error logging to databases
- Slack/email notifications
- Circuit breaker patterns
- Graceful degradation

**Use When:**
- Building production workflows that need resilience
- Implementing retry logic for API calls
- Setting up error monitoring and alerting
- Designing fault-tolerant systems

## Skill Development Guidelines

All skills in this directory follow the **Claude Skills Implementation Patterns** defined in:
- `/home/user/N8NWorkflow/docs/CLAUDE_SKILL_IMPLEMENTATION_PATTERNS.json`
- `/home/user/N8NWorkflow/docs/CLAUDE_SKILL_PATTERNS_GUIDE.md`

### Required Skill Structure

Each skill must include:

1. **Metadata Header**
```yaml
---
name: skill-name
description: One-line description
model: sonnet|opus
version: 1.0.0
tags: [n8n, category, use-case]
---
```

2. **Role Definition**
   - Clear expertise statement (2-3 sentences)

3. **Capabilities**
   - Bulleted list of specific tasks

4. **Output Format**
   - JSON schema or example output

5. **Patterns Section**
   - Code patterns and examples
   - Anti-patterns (what NOT to do)

6. **Context Requirements**
   - What information the skill needs

7. **Validation Rules**
   - Pre-return validation checks

8. **Constraints**
   - Explicit limitations and rules

9. **Examples**
   - Complete working examples

10. **Testing Guidelines**
    - How to verify skill output

### Creating New Skills

1. **Create Directory**
   ```bash
   mkdir .claude/skills/n8n-{domain}
   ```

2. **Create SKILL.md**
   - Follow the structure above
   - Reference existing templates
   - Include concrete examples
   - Document validation rules

3. **Test Thoroughly**
   - Test with diverse inputs
   - Verify edge cases
   - Validate output quality

4. **Document**
   - Add to this README
   - Update skills registry
   - Include usage examples

### Naming Conventions

- **Directory:** `n8n-{domain}` (kebab-case)
- **File:** `SKILL.md` (uppercase)
- **Skill Name:** `n8n-{domain}` (matches directory)

### Best Practices

1. **Keep skills focused** - One domain per skill
2. **Include anti-patterns** - Show what NOT to do
3. **Reference templates** - Point to working examples
4. **Provide context** - Explain when to use the skill
5. **Validate output** - Include validation rules
6. **Test thoroughly** - Verify with edge cases
7. **Version control** - Track changes in git
8. **Document well** - Clear examples and explanations

## Recommended Skills to Create

Based on n8n workflow patterns, consider creating skills for:

### High Priority
- [ ] **n8n-api-integration** - HTTP Request nodes, authentication, API patterns
- [ ] **n8n-data-transformation** - Code nodes, data mapping, transformations
- [ ] **n8n-workflow-architect** - Overall workflow design and structure
- [ ] **n8n-ai-integration** - Claude, GPT, Gemini integration patterns

### Medium Priority
- [ ] **n8n-database-operations** - PostgreSQL, MySQL, MongoDB patterns
- [ ] **n8n-batch-processing** - SplitInBatches, aggregation, chunking
- [ ] **n8n-scheduling** - Cron triggers, timing, coordination
- [ ] **n8n-webhook-handling** - Webhook triggers, responses, security

### Low Priority
- [ ] **n8n-notification-systems** - Slack, email, SMS patterns
- [ ] **n8n-file-operations** - File handling, uploads, processing
- [ ] **n8n-monitoring** - Health checks, metrics, observability
- [ ] **n8n-security** - Credential management, data sanitization

## Usage Example

To use a skill in Claude Code:

```bash
# Activate the skill context
@skill n8n-error-handling

# Then ask Claude to generate workflows with error handling
"Create a workflow that calls an external API with retry logic"
```

Or reference directly in prompts:

```
Following the n8n-error-handling skill patterns, create a workflow that:
1. Calls a weather API
2. Retries up to 3 times with exponential backoff
3. Logs errors to PostgreSQL
4. Sends Slack alerts on failure
```

## Skill Validation

All skills should be validated against:
- JSON syntax correctness
- n8n workflow structure compliance
- Pattern consistency with templates
- Security best practices
- Production readiness checklist

Use the validation rules defined in:
`/home/user/N8NWorkflow/docs/CLAUDE_SKILL_IMPLEMENTATION_PATTERNS.json`

## Resources

- **Implementation Patterns:** `/docs/CLAUDE_SKILL_IMPLEMENTATION_PATTERNS.json`
- **Patterns Guide:** `/docs/CLAUDE_SKILL_PATTERNS_GUIDE.md`
- **Templates:** `/workflow-templates/`
- **Best Practices:** `/BEST_PRACTICES.md`
- **Lessons Learned:** `/LESSONS_LEARNED.md`
- **API Reference:** `/docs/API_SKILLS_REFERENCE.md`

## Contributing

To contribute a new skill:

1. Fork the repository
2. Create skill following structure guidelines
3. Test thoroughly with diverse inputs
4. Add documentation and examples
5. Update this README
6. Submit pull request

## Support

For questions about skills:
- Check existing skill documentation
- Review pattern guides
- Consult workflow templates
- Open an issue on GitHub

---

**Last Updated:** 2025-11-05
**Total Skills:** 1
**Status:** Active Development
