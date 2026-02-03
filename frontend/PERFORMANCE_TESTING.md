# Performance Testing Configuration
# Database Interface Performance Benchmarks

## Lighthouse CI Configuration

Run Lighthouse audits on Database Interface screen to ensure optimal performance.

### Target Metrics

- **Performance Score**: ≥ 90/100
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 300ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Virtual Scrolling Performance

Test with large datasets (1000+ records):
- **Rendering Time**: < 500ms for initial 20 rows
- **Scroll FPS**: ≥ 60 FPS
- **Memory Usage**: < 100MB for 1000 records

### Bundle Size Analysis

- **Initial Bundle Size**: < 500KB (gzipped)
- **Code Split Chunks**: DatabaseInterfaceScreen lazy loaded
- **Tree Shaking**: Unused exports removed

## Testing Commands

```bash
# Run Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:8081/database-interface

# Bundle size analysis
npm run analyze

# Performance profiling with React DevTools
npm run start:profiler
```

## Performance Monitoring

### React Query Cache Performance

- **Cache Hit Rate**: > 80%
- **Stale Time**: 5 minutes
- **Background Refetch**: Enabled

### Network Performance

- **API Response Time**: < 200ms (p95)
- **Concurrent Requests**: < 3 at a time
- **ETag Caching**: Enabled for GET requests

## Automated Performance Tests

```javascript
// Example Lighthouse CI test
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);

  // Assert performance score
  const performanceScore = runnerResult.lhr.categories.performance.score * 100;
  console.log(`Performance score: ${performanceScore}`);

  if (performanceScore < 90) {
    throw new Error(`Performance score ${performanceScore} is below threshold 90`);
  }

  await chrome.kill();
}

runLighthouse('http://localhost:8081/database-interface');
```

## Load Testing

Test API endpoints under load:

```bash
# Apache Bench (ab)
ab -n 1000 -c 10 http://localhost:8000/api/database/users

# Expected Results:
# - Requests per second: > 100
# - Mean response time: < 100ms
# - 99th percentile: < 300ms
```

## Memory Leak Detection

Monitor for memory leaks with React DevTools Profiler:

1. Open React DevTools
2. Go to Profiler tab
3. Start recording
4. Perform CRUD operations (create, edit, delete 50+ times)
5. Stop recording
6. Check for growing memory usage

**Expected**: Memory should stabilize after initial operations (no continuous growth).

## Results Tracking

| Test | Target | Current | Status |
|------|--------|---------|--------|
| Performance Score | ≥90 | TBD | ⏳ |
| FCP | <1.8s | TBD | ⏳ |
| LCP | <2.5s | TBD | ⏳ |
| TTI | <3.8s | TBD | ⏳ |
| TBT | <300ms | TBD | ⏳ |
| CLS | <0.1 | TBD | ⏳ |
| Bundle Size | <500KB | TBD | ⏳ |
| Virtual Scroll FPS | ≥60 | TBD | ⏳ |
| Memory Usage (1000 records) | <100MB | TBD | ⏳ |
| API Response Time (p95) | <200ms | TBD | ⏳ |

Run tests and update results before production deployment.
