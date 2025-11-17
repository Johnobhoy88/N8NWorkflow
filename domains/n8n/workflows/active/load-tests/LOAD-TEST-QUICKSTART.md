# Load Testing Quick Start Guide
## Workflow Builder v3.0 OPTIMIZED

This guide helps you run comprehensive load tests on the optimized workflow builder.

---

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows (via Chocolatey):**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

### Set Environment Variable

```bash
export N8N_URL="https://your-n8n-instance.com"
```

---

## Test Scenarios

### 1. Baseline Performance Test (10 minutes)

**Purpose:** Validate optimizations under normal load

```bash
cd /home/user/N8NWorkflow/domains/n8n/workflows/active/load-tests
k6 run k6-baseline-test.js
```

**Expected Results:**
- ✅ Average response time: 9-10s
- ✅ P95: < 12s
- ✅ Success rate: > 95%
- ✅ Cache hit rate: 20-30%

**Output:**
- Console summary
- `summary.json` - Detailed metrics

---

### 2. Cache Performance Test (15 minutes)

**Purpose:** Measure cache effectiveness

```bash
k6 run k6-cache-test.js
```

**Expected Results:**
- ✅ Cache hit rate: > 75%
- ✅ Cache hit response time: 6-8s
- ✅ Cache miss response time: 9-12s
- ✅ Cost savings: > 40%

**Output:**
- Console summary with cache analysis
- `cache-test-summary.txt` - Formatted report
- `cache-test-data.json` - Raw data

---

### 3. Peak Load Stress Test (20 minutes)

**Purpose:** Find breaking points

```bash
k6 run k6-stress-test.js
```

**Expected Results:**
- ✅ Success rate: > 85% at 50 concurrent users
- ✅ P95: < 15s under stress
- ⚠️  Error rate: < 10% acceptable
- 🔍 Identify bottlenecks and limits

**Output:**
- Console summary with bottleneck analysis
- `stress-test-results.txt` - Detailed report
- `stress-test-data.json` - Raw data

---

## Running Tests in Docker

### Single Test
```bash
docker run --rm -i \
  -e N8N_URL="https://your-n8n-instance.com" \
  -v $(pwd):/scripts \
  grafana/k6 run /scripts/k6-baseline-test.js
```

### With Output to InfluxDB
```bash
docker run --rm -i \
  -e N8N_URL="https://your-n8n-instance.com" \
  -v $(pwd):/scripts \
  grafana/k6 run \
  --out influxdb=http://influxdb:8086/k6 \
  /scripts/k6-baseline-test.js
```

---

## Advanced Usage

### Run All Tests Sequentially

```bash
#!/bin/bash
# run-all-tests.sh

echo "Starting comprehensive load test suite..."

# 1. Baseline test
echo "\n=== Running Baseline Test ==="
k6 run k6-baseline-test.js

# Wait 5 minutes between tests
echo "\nWaiting 5 minutes before next test..."
sleep 300

# 2. Cache test
echo "\n=== Running Cache Performance Test ==="
k6 run k6-cache-test.js

# Wait 5 minutes
echo "\nWaiting 5 minutes before stress test..."
sleep 300

# 3. Stress test
echo "\n=== Running Stress Test ==="
k6 run k6-stress-test.js

echo "\n=== All tests completed ==="
echo "Check results in:"
echo "  - summary.json"
echo "  - cache-test-summary.txt"
echo "  - stress-test-results.txt"
```

Make executable and run:
```bash
chmod +x run-all-tests.sh
./run-all-tests.sh
```

---

### Custom Test Configuration

Create a custom test with your parameters:

```javascript
// custom-test.js
import { baseline } from './k6-baseline-test.js';

export const options = {
  stages: [
    { duration: '5m', target: 20 }, // Your custom load
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // Your custom threshold
  },
};

export default baseline; // Use baseline test function
```

Run:
```bash
k6 run custom-test.js
```

---

## Monitoring During Tests

### Real-time Monitoring with Grafana

1. **Start InfluxDB:**
```bash
docker run -d -p 8086:8086 \
  --name influxdb \
  influxdb:1.8
```

2. **Start Grafana:**
```bash
docker run -d -p 3000:3000 \
  --name grafana \
  --link influxdb \
  grafana/grafana
```

3. **Run test with output:**
```bash
k6 run --out influxdb=http://localhost:8086/k6 k6-baseline-test.js
```

4. **Open Grafana:** http://localhost:3000 (admin/admin)

5. **Add InfluxDB data source:**
   - URL: http://influxdb:8086
   - Database: k6

6. **Import k6 dashboard:**
   - Dashboard ID: 2587 (from grafana.com)

---

## Interpreting Results

### Success Criteria

✅ **PASS** - All thresholds met:
```
✅ P95 response time < 12s
✅ Success rate > 95%
✅ Cache hit rate > 20%
✅ Error rate < 5%
```

⚠️  **MARGINAL** - Some thresholds missed:
```
⚠️  P95 = 13s (slightly over)
⚠️  Cache hit rate = 18% (slightly under)
```
**Action:** Review logs, tune cache TTL, check API limits

❌ **FAIL** - Critical thresholds missed:
```
❌ P95 > 15s
❌ Success rate < 90%
❌ Error rate > 10%
```
**Action:** Investigate bottlenecks, check server resources, review error logs

---

### Common Issues and Solutions

#### Issue: High Error Rate (>5%)

**Symptoms:**
```
http_req_failed: rate > 0.05
Many 429 (Rate Limit) or 500 errors
```

**Solutions:**
1. Check Gemini API quota and rate limits
2. Review n8n execution queue depth
3. Verify database connection pool size
4. Check server CPU/memory utilization

#### Issue: Slow Response Times (P95 > 12s)

**Symptoms:**
```
http_req_duration p(95) > 12000ms
Many slow requests in logs
```

**Solutions:**
1. Check if cache is working (`cache_hits` metric)
2. Review Gemini API latency (check Google Cloud Console)
3. Optimize database queries
4. Increase n8n worker threads

#### Issue: Low Cache Hit Rate (<20%)

**Symptoms:**
```
cache_hits: rate < 0.20
Most requests taking full 9-12s
```

**Solutions:**
1. Verify cache mechanism is enabled
2. Check cache TTL settings (default 1 hour)
3. Review cache key generation (MD5 hash)
4. Consider increasing TTL for stable workflows

---

## Performance Benchmarks

### Target Metrics (v3.0 OPTIMIZED)

| Metric | Target | Good | Acceptable | Poor |
|--------|--------|------|------------|------|
| Avg Response Time | <10s | <9s | 10-12s | >12s |
| P95 Response Time | <12s | <11s | 12-14s | >14s |
| Success Rate | >95% | >98% | 95-98% | <95% |
| Cache Hit Rate | >20% | >30% | 20-30% | <20% |
| Error Rate | <5% | <2% | 2-5% | >5% |
| Cost per Execution | <$0.008 | <$0.007 | $0.008-$0.009 | >$0.009 |

### Comparison to v2.0

| Metric | v2.0 (Before) | v3.0 (After) | Improvement |
|--------|---------------|--------------|-------------|
| Avg Response Time | 20s | 10s | **50% faster** |
| P95 Response Time | 25s | 12s | **52% faster** |
| API Calls | 4 | 3 (miss) / 2 (hit) | **25-50% fewer** |
| Cost per Execution | $0.0136 | $0.0091 (miss) / $0.0065 (hit) | **33-52% cheaper** |
| Memory Usage | 8.5KB | 6.0KB | **30% less** |

---

## Automated Testing Pipeline

### GitHub Actions Workflow

Create `.github/workflows/load-test.yml`:

```yaml
name: Weekly Load Tests

on:
  schedule:
    - cron: '0 2 * * 1' # Every Monday at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  load-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run baseline test
        env:
          N8N_URL: ${{ secrets.N8N_URL }}
        run: |
          cd domains/n8n/workflows/active/load-tests
          k6 run k6-baseline-test.js

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: domains/n8n/workflows/active/load-tests/*.json
```

---

## Troubleshooting

### k6 Installation Issues

**Error:** `k6: command not found`

**Solution:**
```bash
# Verify installation
which k6

# If not found, reinstall
brew reinstall k6  # macOS
```

### Connection Issues

**Error:** `connection refused`

**Solution:**
```bash
# Verify n8n is accessible
curl -I https://your-n8n-instance.com/form/workflow-builder

# Check SSL certificate
curl -v https://your-n8n-instance.com
```

### Out of Memory Errors

**Error:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Run test
k6 run k6-baseline-test.js
```

---

## Next Steps

After running load tests:

1. ✅ **Review results** - Check all threshold validations
2. ✅ **Compare to baselines** - Ensure improvements vs v2.0
3. ✅ **Document findings** - Add to optimization report
4. ✅ **Tune parameters** - Adjust cache TTL, token limits based on results
5. ✅ **Schedule regular tests** - Set up CI/CD pipeline
6. ✅ **Monitor production** - Compare test results to real-world usage

---

## Support

For questions or issues:

- 📖 k6 Documentation: https://k6.io/docs/
- 💬 k6 Community: https://community.k6.io/
- 🐛 Report Issues: Create issue in repository

---

**Last Updated:** 2025-11-17
**Version:** 1.0
**Workflow:** v3.0 OPTIMIZED
