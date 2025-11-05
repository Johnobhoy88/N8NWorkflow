# n8n Development Standards

## Progressive Disclosure
Load only necessary information:
1. Start with skill descriptions (already loaded)
2. Load specific skill content when activated
3. Use MCP for detailed node documentation only when needed

## Template-First Approach
1. Always search existing templates for similar use cases
2. Use proven patterns from templates as foundation
3. Adapt template structure to specific requirements
4. Credit template patterns in comments

## Validation Protocol
Before delivering any workflow:
1. Run `validate_workflow` MCP tool
2. Check all node connections
3. Verify expression syntax
4. Test error handling paths

## Code Quality in Code Nodes

### JavaScript
- Use async/await for HTTP requests
- Leverage `$input`, `$node`, `$json` correctly
- Wrap in try/catch with meaningful errors
- Use `$helpers.httpRequest()` for API calls

### Python
- Stay within standard library (no pip install available)
- Handle exceptions explicitly
- Return proper data structure
- Mind Python limitations in n8n environment

---

## Workflow Architecture Patterns

### Pattern: Webhook → Process → Response
```
Webhook Trigger
  ↓
Parse/Validate Input
  ↓
Process Data
  ↓
Send Response / Store Result
```

### Pattern: HTTP Request → Transform → Output
```
HTTP Request Node
  ↓
Code Node (transform)
  ↓
Output Node (Email/Slack/DB)
```

### Pattern: Database Trigger → Query → Update
```
DB Trigger
  ↓
Query Data
  ↓
Transform
  ↓
Update/Insert
```

### Pattern: AI Agent → Tools → Response
```
Trigger
  ↓
AI Agent Decision
  ↓
Execute Tools (API/DB)
  ↓
Format Response
```

### Pattern: Scheduled → Fetch → Process → Store
```
Schedule Trigger
  ↓
Fetch Data (API/DB)
  ↓
Transform/Aggregate
  ↓
Store Results
```

## Node Configuration Checklist

- [ ] Node type selected
- [ ] Required fields populated
- [ ] Correct typeVersion specified
- [ ] Credentials configured (if needed)
- [ ] Expression syntax valid (if using)
- [ ] Optional fields reviewed
- [ ] Node renamed descriptively
- [ ] Connection paths defined

## Error Handling Checklist

- [ ] Code nodes have try/catch
- [ ] External API calls have continueOnFail
- [ ] Error paths routed to handler
- [ ] User-friendly error messages defined
- [ ] Errors logged (if applicable)
- [ ] Fallback values defined
- [ ] Edge cases considered
- [ ] **Success and error paths both reach appropriate output nodes** ✓ NEW
- [ ] **No orphaned nodes - all nodes reachable from trigger** ✓ NEW
- [ ] **All IF node branches (true/false) have destinations** ✓ NEW

## Output Node Connectivity Checklist

Every output node (Email, Slack, Database, Webhook Response) must be reachable:

- [ ] All output nodes have at least one incoming connection
- [ ] No empty connection arrays: `[]` on critical nodes
- [ ] IF/Switch nodes have connections for BOTH branches (main[0] and main[1])
- [ ] Success path reaches success notification nodes
- [ ] Error path reaches error handler → error notification nodes
- [ ] No dead-ends: every non-trigger node has upstream connection
- [ ] Validate with Node Reachability Validator: `npm run validate-workflow`

### Anti-Pattern ❌

```
Process → Check Status → Error Handler → Success Email
          (true: taken)  ↓
                      Error Path

(Success Email never receives data - unreachable from success path)
```

### Correct Pattern ✅

```
Process → Check Status
          ├─ true → Success Email
          └─ false → Error Handler → Error Email

(Both branches reach appropriate output nodes)
```

## Expression Syntax Reference

| Task | Syntax | Example |
|------|--------|---------|
| Access field | `{{$json.fieldName}}` | `{{$json.email}}` |
| Nested field | `{{$json.user.name}}` | `{{$json.user.profile.name}}` |
| Previous node | `{{$node["Node Name"].json}}` | `{{$node["HTTP Request"].json.data}}` |
| First output | `{{$node["Node Name"].json.items[0]}}` | `{{$node["Query"].json.users[0]}}` |
| Current time | `{{$now}}` | For timestamps |
| Environment | `{{$env.VAR_NAME}}` | `{{$env.API_KEY}}` |
| Conditional | `{{$json.status === "active" ? "yes" : "no"}}` | `{{$json.count > 10 ? "many" : "few"}}` |
| Array length | `{{$json.items.length}}` | `{{$json.users.length}}` |
| String concat | `{{$json.firstName + " " + $json.lastName}}` | Names combined |

## Debugging Tips

### When Validation Fails
1. Check node IDs are unique
2. Verify connection node names match
3. Look for special characters in expressions
4. Check typeVersion is correct for node type
5. Use MCP `get_node_info` for exact requirements

### When Execution Fails
1. Check execution logs in n8n UI
2. Verify input data matches expected format
3. Test Code nodes independently
4. Check API credentials are valid
5. Review error messages for hints

### When Expression Doesn't Work
1. Verify correct syntax: `{{...}}`
2. Check field names exist in data
3. Use single quotes in nested expressions
4. Test with sample data first
5. Use MCP tool to validate syntax

## Performance Tips

- Avoid N+1 queries (fetch once, loop)
- Use SplitInBatches for large datasets
- Cache API responses when possible
- Set HTTP timeouts appropriately
- Monitor execution duration trends

## Security Best Practices

- Never hardcode API keys
- Use credentials for authentication
- Sanitize user input
- Use HTTPS for external APIs
- Limit error message details to users
- Audit workflow permissions
- Review node access requirements

## Testing Strategy

1. **Unit Tests** - Test individual Code nodes
2. **Integration Tests** - Test node connections
3. **End-to-End** - Test complete workflow
4. **Error Cases** - Test with invalid data
5. **Load Tests** - Test with realistic volumes

## Deployment Checklist

- [ ] All nodes have descriptive names
- [ ] Workflow has clear documentation
- [ ] Error handling paths tested
- [ ] Credentials properly configured
- [ ] Performance acceptable
- [ ] Security review complete
- [ ] Logging/monitoring in place
- [ ] Rollback plan exists

---

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Status:** Active
