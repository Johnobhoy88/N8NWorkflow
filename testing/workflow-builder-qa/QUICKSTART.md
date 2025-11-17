# Quick Start Guide

Get up and running with the Workflow Builder QA Test Suite in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- n8n instance running (local or remote)
- Gemini API key

## Installation (2 minutes)

### 1. Install Dependencies

```bash
cd testing/workflow-builder-qa
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
GEMINI_API_KEY=your_gemini_api_key_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook/workflow-builder
```

## Run Tests (1 minute)

### Quick Test
Run all tests:
```bash
npm test
```

### Specific Tests
```bash
npm run test:integration    # Integration tests only
npm run test:security       # Security tests only
npm run test:e2e           # End-to-end tests only
```

## View Results (1 minute)

### Coverage Report
```bash
npm run coverage
npm run coverage:view  # Opens HTML report in browser
```

### Test Summary
```bash
node scripts/generate-test-report.js
```

## Complete Test Suite (Optional)

### With Load Testing

**Install k6:**
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

**Run all tests including load tests:**
```bash
./scripts/run-all-tests.sh
```

## Common Issues

### Tests Failing?

**Check n8n is running:**
```bash
curl http://localhost:5678
```

**Verify API key:**
```bash
echo $GEMINI_API_KEY
```

**Check workflow is active:**
- Open n8n
- Activate the workflow: "n8n Workflow Builder (Gemini) - Enhanced with Email Trigger"

### Load Tests Not Running?

Install k6:
```bash
brew install k6  # macOS
```

## Next Steps

- Read full documentation in [README.md](README.md)
- Set up CI/CD pipeline (see `.github/workflows/test-suite.yml`)
- Review test coverage reports
- Add custom test cases

## Test Structure

```
testing/workflow-builder-qa/
├── tests/
│   ├── integration/      # Main workflow tests
│   ├── e2e/             # End-to-end tests
│   └── security/        # Security tests
├── fixtures/            # Test data
├── mocks/              # API mocks
├── load-tests/         # k6 load tests
└── scripts/            # Utilities
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run coverage` | Generate coverage report |
| `npm run test:load` | Run load tests |
| `./scripts/run-all-tests.sh` | Complete test suite |

## Getting Help

- Check [README.md](README.md) for detailed documentation
- Review test examples in `tests/` directory
- Open an issue on GitHub

## Summary

1. ✅ Install: `npm install`
2. ✅ Configure: Edit `.env` file
3. ✅ Test: `npm test`
4. ✅ Report: `npm run coverage:view`

**Time to first test run: < 5 minutes** 🚀
