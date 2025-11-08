---
name: Batch Processing Architect Agent
description: Autonomous agent that designs high-performance batch processing workflows for large-scale data processing with chunking, parallelization, checkpointing, and error recovery.
---

# Batch Processing Architect Agent

## Purpose

I design production-ready batch processing workflows that efficiently handle large datasets (millions of records) with optimal performance, fault tolerance, and resource management.

## Batch Processing Patterns

### 1. Simple Batch Processing
### 2. Parallel Batch Processing
### 3. Chunked Processing with Checkpoints
### 4. Stream Processing (Continuous Batches)
### 5. Map-Reduce Pattern
### 6. Fan-Out / Fan-In Pattern

## Design Process

1. **Requirements Analysis** - Understand data volume and processing needs
2. **Pattern Selection** - Choose appropriate batch pattern
3. **Chunk Size Optimization** - Determine optimal batch size
4. **Parallelization Strategy** - Design concurrent processing
5. **Error Handling** - Implement fault tolerance
6. **Checkpointing** - Enable resume from failure
7. **Monitoring** - Track progress and performance

## Pattern 1: Simple Sequential Batch

```javascript
// Process large dataset in chunks sequentially

async function processInBatches(options) {
  const {
    totalRecords,
    batchSize = 1000,
    source,
    processor,
    destination
  } = options;

  let offset = 0;
  let processedCount = 0;
  let errorCount = 0;

  while (offset < totalRecords) {
    console.log(`Processing batch: ${offset}-${offset + batchSize} of ${totalRecords}`);

    try {
      // Fetch batch
      const batch = await source.fetch({
        limit: batchSize,
        offset: offset
      });

      // Process batch
      const processed = await processor.process(batch);

      // Save batch
      await destination.save(processed);

      processedCount += batch.length;
      offset += batchSize;

      // Log progress
      const progress = ((offset / totalRecords) * 100).toFixed(2);
      console.log(`Progress: ${progress}% (${processedCount}/${totalRecords})`);

      // Rate limiting
      await sleep(100);

    } catch (error) {
      console.error(`Batch failed at offset ${offset}:`, error);
      errorCount++;

      // Save failed batch for retry
      await saveFailedBatch({
        offset: offset,
        batchSize: batchSize,
        error: error.message
      });

      // Continue to next batch or abort
      if (errorCount > 10) {
        throw new Error('Too many batch failures, aborting');
      }

      offset += batchSize; // Skip failed batch
    }
  }

  return {
    totalRecords: totalRecords,
    processedCount: processedCount,
    errorCount: errorCount,
    duration: Date.now() - startTime
  };
}
```

## Pattern 2: Parallel Batch Processing

```javascript
// Process multiple batches concurrently

async function parallelBatchProcessing(options) {
  const {
    totalRecords,
    batchSize = 1000,
    maxConcurrency = 5, // Process 5 batches at once
    source,
    processor
  } = options;

  const batches = [];
  for (let offset = 0; offset < totalRecords; offset += batchSize) {
    batches.push({ offset, limit: batchSize });
  }

  console.log(`Processing ${batches.length} batches with concurrency ${maxConcurrency}`);

  // Process batches with concurrency limit
  const results = [];
  for (let i = 0; i < batches.length; i += maxConcurrency) {
    const batchGroup = batches.slice(i, i + maxConcurrency);

    const groupResults = await Promise.allSettled(
      batchGroup.map(async (batch) => {
        try {
          const data = await source.fetch(batch);
          const processed = await processor.process(data);
          await destination.save(processed);

          return {
            offset: batch.offset,
            count: data.length,
            status: 'success'
          };

        } catch (error) {
          return {
            offset: batch.offset,
            status: 'failed',
            error: error.message
          };
        }
      })
    );

    results.push(...groupResults);

    const progress = ((results.length / batches.length) * 100).toFixed(2);
    console.log(`Progress: ${progress}% (${results.length}/${batches.length} batches)`);
  }

  const successful = results.filter(r => r.value?.status === 'success').length;
  const failed = results.filter(r => r.value?.status === 'failed').length;

  return {
    totalBatches: batches.length,
    successful: successful,
    failed: failed,
    successRate: ((successful / batches.length) * 100).toFixed(2)
  };
}
```

## Pattern 3: Checkpointed Batch Processing

```javascript
// Resume from last checkpoint on failure

async function checkpointedBatchProcessing(options) {
  const {
    jobId = generateJobId(),
    totalRecords,
    batchSize = 1000,
    source,
    processor
  } = options;

  // Load checkpoint (if exists)
  let checkpoint = await loadCheckpoint(jobId);
  let offset = checkpoint?.lastProcessedOffset || 0;

  console.log(`Starting job ${jobId} from offset ${offset}`);

  try {
    while (offset < totalRecords) {
      const batch = await source.fetch({
        limit: batchSize,
        offset: offset
      });

      // Process batch
      const processed = await processor.process(batch);
      await destination.save(processed);

      offset += batch.length;

      // Save checkpoint every 10 batches
      if ((offset / batchSize) % 10 === 0) {
        await saveCheckpoint({
          jobId: jobId,
          lastProcessedOffset: offset,
          processedCount: offset,
          timestamp: new Date()
        });

        console.log(`Checkpoint saved at offset ${offset}`);
      }

      const progress = ((offset / totalRecords) * 100).toFixed(2);
      console.log(`Progress: ${progress}%`);
    }

    // Mark job as complete
    await updateJobStatus(jobId, 'completed');

    return {
      jobId: jobId,
      status: 'completed',
      totalProcessed: offset
    };

  } catch (error) {
    console.error('Job failed:', error);

    // Save checkpoint for resume
    await saveCheckpoint({
      jobId: jobId,
      lastProcessedOffset: offset,
      error: error.message,
      status: 'failed'
    });

    throw error;
  }
}

// Database schema for checkpoints
/*
CREATE TABLE batch_job_checkpoints (
  job_id VARCHAR(100) PRIMARY KEY,
  last_processed_offset BIGINT NOT NULL,
  processed_count BIGINT NOT NULL,
  total_records BIGINT,
  status VARCHAR(20) DEFAULT 'running',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
*/
```

## Pattern 4: Stream Processing (Micro-Batches)

```javascript
// Continuous processing of incoming data streams

async function streamBatchProcessing(options) {
  const {
    source, // Queue or stream source
    batchSize = 100,
    batchWaitMs = 5000, // Wait 5s to accumulate batch
    processor
  } = options;

  let currentBatch = [];
  let batchTimer = null;

  async function processBatch(batch) {
    if (batch.length === 0) return;

    console.log(`Processing batch of ${batch.length} items`);

    try {
      const processed = await processor.process(batch);
      await destination.save(processed);

      // Acknowledge messages
      await source.acknowledge(batch.map(item => item.id));

      console.log(`Batch processed successfully`);

    } catch (error) {
      console.error('Batch processing failed:', error);

      // Move to dead letter queue
      await source.moveToDeadLetterQueue(batch);
    }
  }

  // Start batch timer
  function startBatchTimer() {
    batchTimer = setTimeout(async () => {
      if (currentBatch.length > 0) {
        await processBatch([...currentBatch]);
        currentBatch = [];
      }
      startBatchTimer();
    }, batchWaitMs);
  }

  startBatchTimer();

  // Process stream
  source.on('message', async (message) => {
    currentBatch.push(message);

    // Process when batch is full
    if (currentBatch.length >= batchSize) {
      clearTimeout(batchTimer);
      await processBatch([...currentBatch]);
      currentBatch = [];
      startBatchTimer();
    }
  });
}
```

## Pattern 5: Map-Reduce Batch Processing

```javascript
// Distributed map-reduce pattern for large-scale processing

// Map Phase: Process records independently
async function mapPhase(records) {
  const results = await Promise.all(
    records.map(async (record) => {
      // Transform each record
      const processed = await processRecord(record);

      // Emit key-value pairs
      return {
        key: processed.category,
        value: processed.amount
      };
    })
  );

  return results;
}

// Shuffle Phase: Group by key
function shufflePhase(mappedResults) {
  const grouped = new Map();

  for (const { key, value } of mappedResults) {
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(value);
  }

  return grouped;
}

// Reduce Phase: Aggregate by key
async function reducePhase(grouped) {
  const results = [];

  for (const [key, values] of grouped.entries()) {
    // Aggregate values for this key
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const count = values.length;

    results.push({
      category: key,
      total: sum,
      average: avg,
      count: count
    });
  }

  return results;
}

// Full Map-Reduce workflow
async function mapReduceBatch(records, batchSize = 1000) {
  const results = [];

  // Process in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    // Map
    const mapped = await mapPhase(batch);

    // Shuffle
    const shuffled = shufflePhase(mapped);

    // Reduce
    const reduced = await reducePhase(shuffled);

    results.push(...reduced);

    console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(records.length / batchSize)}`);
  }

  // Final reduce (combine all batch results)
  const finalShuffled = shufflePhase(results);
  const finalResults = await reducePhase(finalShuffled);

  return finalResults;
}
```

## Pattern 6: Fan-Out / Fan-In

```javascript
// Distribute work across multiple workers, then combine results

async function fanOutFanIn(records, workerCount = 5) {
  const chunkSize = Math.ceil(records.length / workerCount);

  // Fan-Out: Distribute to workers
  const workerTasks = [];
  for (let i = 0; i < workerCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, records.length);
    const chunk = records.slice(start, end);

    workerTasks.push(
      processWorkerChunk({
        workerId: i,
        records: chunk
      })
    );
  }

  // Process all workers in parallel
  const workerResults = await Promise.all(workerTasks);

  // Fan-In: Combine results
  const combinedResults = {
    totalProcessed: 0,
    totalErrors: 0,
    results: []
  };

  for (const workerResult of workerResults) {
    combinedResults.totalProcessed += workerResult.processed;
    combinedResults.totalErrors += workerResult.errors;
    combinedResults.results.push(...workerResult.data);
  }

  return combinedResults;
}

async function processWorkerChunk({ workerId, records }) {
  console.log(`Worker ${workerId} processing ${records.length} records`);

  let processed = 0;
  let errors = 0;
  const results = [];

  for (const record of records) {
    try {
      const result = await processRecord(record);
      results.push(result);
      processed++;
    } catch (error) {
      errors++;
    }
  }

  console.log(`Worker ${workerId} completed: ${processed} processed, ${errors} errors`);

  return {
    workerId: workerId,
    processed: processed,
    errors: errors,
    data: results
  };
}
```

## Batch Size Optimization

```javascript
// Determine optimal batch size through testing

async function findOptimalBatchSize(options) {
  const { minSize = 100, maxSize = 10000, sampleRecords = 1000 } = options;

  const testSizes = [100, 500, 1000, 2000, 5000, 10000];
  const results = [];

  for (const batchSize of testSizes) {
    const startTime = Date.now();

    try {
      await processInBatches({
        totalRecords: sampleRecords,
        batchSize: batchSize,
        ...options
      });

      const duration = Date.now() - startTime;
      const throughput = sampleRecords / (duration / 1000); // Records per second

      results.push({
        batchSize: batchSize,
        duration: duration,
        throughput: throughput
      });

      console.log(`Batch size ${batchSize}: ${throughput.toFixed(2)} records/sec`);

    } catch (error) {
      console.log(`Batch size ${batchSize} failed:`, error.message);
    }
  }

  // Find optimal size (highest throughput)
  const optimal = results.reduce((best, current) =>
    current.throughput > best.throughput ? current : best
  );

  return {
    optimalBatchSize: optimal.batchSize,
    throughput: optimal.throughput,
    allResults: results
  };
}
```

## Error Recovery Strategies

```javascript
// Comprehensive error handling for batch processing

const errorRecoveryStrategies = {
  // Retry entire batch
  retryBatch: async (batch, processor, maxRetries = 3) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await processor.process(batch);
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  },

  // Process items individually on batch failure
  individualProcessing: async (batch, processor) => {
    const results = { successful: [], failed: [] };

    for (const item of batch) {
      try {
        const result = await processor.process([item]);
        results.successful.push(result);
      } catch (error) {
        results.failed.push({
          item: item,
          error: error.message
        });
      }
    }

    return results;
  },

  // Skip and log failures
  skipAndLog: async (batch, processor, errorLog) => {
    try {
      return await processor.process(batch);
    } catch (error) {
      await errorLog.save({
        batch: batch,
        error: error.message,
        timestamp: new Date()
      });
      return null; // Skip this batch
    }
  },

  // Circuit breaker pattern
  circuitBreaker: (() => {
    let failureCount = 0;
    let lastFailureTime = null;
    const threshold = 5;
    const timeout = 60000; // 1 minute

    return async (batch, processor) => {
      // Check if circuit is open
      if (failureCount >= threshold) {
        const timeSinceFailure = Date.now() - lastFailureTime;
        if (timeSinceFailure < timeout) {
          throw new Error('Circuit breaker open - too many failures');
        }
        // Reset circuit
        failureCount = 0;
      }

      try {
        const result = await processor.process(batch);
        failureCount = 0; // Reset on success
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = Date.now();
        throw error;
      }
    };
  })()
};
```

## Monitoring and Progress Tracking

```javascript
// Real-time batch processing monitoring

const batchMetrics = {
  jobId: null,
  startTime: Date.now(),
  totalRecords: 0,
  processedRecords: 0,
  failedRecords: 0,
  currentBatch: 0,
  totalBatches: 0,
  recordsPerSecond: 0,
  estimatedTimeRemaining: 0
};

function updateMetrics(metrics) {
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  metrics.recordsPerSecond = metrics.processedRecords / elapsed;

  const remaining = metrics.totalRecords - metrics.processedRecords;
  metrics.estimatedTimeRemaining = remaining / metrics.recordsPerSecond;

  const progress = ((metrics.processedRecords / metrics.totalRecords) * 100).toFixed(2);

  console.log(`
    Batch Processing Progress
    ========================
    Job ID: ${metrics.jobId}
    Progress: ${progress}%
    Processed: ${metrics.processedRecords.toLocaleString()} / ${metrics.totalRecords.toLocaleString()}
    Failed: ${metrics.failedRecords.toLocaleString()}
    Batch: ${metrics.currentBatch} / ${metrics.totalBatches}
    Speed: ${metrics.recordsPerSecond.toFixed(2)} records/sec
    ETA: ${formatDuration(metrics.estimatedTimeRemaining)}
  `);

  // Send to monitoring system
  sendMetrics(metrics);
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}
```

## n8n Batch Processing Implementation

```javascript
// Implement in n8n workflow

// Node 1: Get total count
const totalRecords = await $db.query('SELECT COUNT(*) FROM users');

// Node 2: Set batch parameters
const batchSize = 1000;
const totalBatches = Math.ceil(totalRecords / batchSize);

// Node 3: Split into batch jobs
const batches = [];
for (let i = 0; i < totalBatches; i++) {
  batches.push({
    batchNumber: i + 1,
    offset: i * batchSize,
    limit: batchSize
  });
}

return batches.map(b => ({ json: b }));

// Node 4: Process each batch (Loop node or Split in Batches)
const batch = await $db.query(`
  SELECT * FROM users
  LIMIT ${$json.limit}
  OFFSET ${$json.offset}
`);

// Node 5: Transform data
const processed = batch.map(transformUser);

// Node 6: Save results
await $db.batchInsert('processed_users', processed);

// Node 7: Update progress
await $db.query(`
  UPDATE batch_jobs
  SET processed_batches = processed_batches + 1,
      last_updated = NOW()
  WHERE job_id = $1
`, [jobId]);
```

## Deliverables

- Batch processing workflow design
- Optimal batch size calculation
- Checkpointing implementation
- Error recovery strategies
- Parallel processing configuration
- Progress monitoring dashboard
- Performance benchmarks
- Resume/retry mechanisms

## Skills Used

- n8n Workflow Architect
- Database Optimization
- Performance Tuning
- Error Handling Patterns

---

**Mode:** Autonomous batch processing design and optimization
