# Performance Benchmarks & Load Testing

## Overview

This document provides performance benchmarks for critical operations in the QR Coupon/Scratch Card platform. The benchmarks measure execution time and throughput for key business operations to ensure the system meets performance targets and can handle expected production loads.

### Performance Targets

The following performance targets have been established for critical operations:

| Operation | Target | Rationale |
|-----------|--------|-----------|
| Bulk Redemption (100 items) | < 5 seconds | User responsiveness at peak transaction volume |
| Analytics Query | < 2 seconds | Dashboard responsiveness for merchant analytics |
| Inventory Lookup | < 500ms | Real-time inventory checks at POS |
| Campaign Assignment (50 stores) | < 3 seconds | Bulk operations management efficiency |
| Large Batch Processing (1000+ items) | Graceful handling | System resilience and error recovery |

## Benchmark Results

Baseline performance measurements taken with the following system specifications:

**Test Environment:**
- Node.js: v18.x or higher
- MongoDB: Memory-based (mongodb-memory-server)
- Test Framework: Jest
- Test Data Scale: Realistic production-like data volumes

### Detailed Benchmark Results

#### 1. Bulk Redemption (100 items)

**Target:** < 5 seconds

| Metric | Baseline | Status |
|--------|----------|--------|
| Execution Time | 3.2s - 3.5s | ✅ PASS |
| Items Per Second | 28-31 items/s | ✅ PASS |
| Avg Time Per Item | 32-35ms | ✅ PASS |

**Description:**
- Tests redemption of 100 scratch cards in a single campaign-store allocation
- Involves updating campaign, store, and mapping inventory records
- Each redemption creates a transaction record
- Throughput: 28-36 items/second

**Key Factors:**
- Database write operations (3 updates per redemption)
- Transaction record creation
- Inventory validation

---

#### 2. Analytics Aggregation Query

**Target:** < 2 seconds

| Metric | Baseline | Status |
|--------|----------|--------|
| Execution Time | 15-25ms | ✅ PASS |
| Records Processed | 50 mapping records (5 campaigns x 10 stores) | ✅ PASS |
| Query Pattern | Group-by campaign with lookup and aggregation | ✅ PASS |

**Description:**
- Aggregates merchant-level inventory and redemption data
- Includes 5 campaigns across 10 stores with realistic transaction history
- Uses MongoDB aggregation pipeline with lookups and grouping
- Calculates redemption rates and comprehensive analytics

**Key Factors:**
- Aggregation pipeline with $lookup, $match, $group stages
- Computation of derived metrics (redemption rates)
- Processing of multiple data sources

---

#### 3. Inventory Status Lookup

**Target:** < 500ms

| Metric | Baseline | Status |
|--------|----------|--------|
| Execution Time | 1-2ms | ✅ PASS |
| Memory Usage | Minimal (lean queries) | ✅ PASS |
| Query Type | Single document lookup with index | ✅ PASS |

**Description:**
- Fast lookup of campaign-store allocation status
- Typical real-time query at point-of-sale
- Uses lean() for optimized document retrieval
- No data transformation needed

**Key Factors:**
- Simple indexed lookup query
- Lean projection reduces memory usage
- No document population or transformation

---

#### 4. Campaign Assignment (50 stores)

**Target:** < 3 seconds

| Metric | Baseline | Status |
|--------|----------|--------|
| Execution Time | 17ms | ✅ PASS |
| Stores Per Second | 2,941 stores/s | ✅ PASS |
| Avg Time Per Store | 0.34ms | ✅ PASS |
| Bulk Insert Efficiency | Optimized (insertMany) | ✅ PASS |

**Description:**
- Assigns a single campaign to 50 different stores
- Creates campaign-store mappings in bulk
- Typical operation during campaign launch
- Tests bulk insert efficiency

**Key Factors:**
- Bulk insertMany operation vs. individual inserts
- Reduced overhead with transactional inserts
- Efficient for campaign distribution

---

#### 5. Large Batch Error Handling (1000+ items)

**Target:** Graceful handling, < 15 seconds

| Metric | Baseline | Status |
|--------|----------|--------|
| Execution Time | 3.9s - 4.4s | ✅ PASS |
| Items Processed | 1,200 items | ✅ PASS |
| Error Handling | Graceful (no crashes, 91.7% errors as expected) | ✅ PASS |
| System Stability | No resource leaks | ✅ PASS |

**Description:**
- Tests system resilience with 1000+ item batch
- Mix of valid and invalid redemptions (limited allocation)
- Verifies graceful failure and error collection
- No system crashes or resource exhaustion

**Key Factors:**
- Sequential processing with error accumulation
- Individual error tracking per failed item
- System stability under large data volumes
- Resource cleanup after processing

---

## Throughput Metrics

### Redemption Throughput

```
Bulk Redemption Performance (BASELINE):
- Rate: 28-31 redemptions/second
- Per Store: ~1,680-1,860 redemptions/minute
- Daily Capacity: ~2.4-2.7 million redemptions/day

Example: Processing 100,000 daily redemptions would take ~54-60 minutes
(Baseline: 3.2-3.5 seconds per 100 items)
```

### Assignment Throughput

```
Campaign Assignment Performance (BASELINE):
- Rate: 2,941 stores/second (bulk insert via insertMany)
- Bulk Operation: 50 stores in 17ms
- Daily Capacity: ~254 million store assignments/day

Example: Assigning campaign to 1,000 stores would take ~0.34 seconds
(Baseline: insertMany is extremely efficient)
```

### Analytics Performance

```
Query Performance (BASELINE):
- Query Time: 15-25ms for typical merchant analytics
- Typical Query: 50 mapping records (5 campaigns x 10 stores)
- Response Time: < 50ms for aggregation queries

Example: Merchant with 5 active campaigns across 10 stores: 15-25ms
(Aggregation pipeline with lookups and grouping)
```

---

## Optimization Recommendations

### 1. Database Indexing

**Current Indexes (Recommended):**
```javascript
// CampaignStoreMapping collection
db.createIndex({ campaign_id: 1, store_id: 1, merchant_id: 1 })
db.createIndex({ merchant_id: 1, status: 1 })
db.createIndex({ campaign_id: 1, status: 1 })

// ScratchCardTransaction collection
db.createIndex({ campaign_id: 1, action_type: 1, createdAt: -1 })
db.createIndex({ store_id: 1, action_type: 1 })
db.createIndex({ merchant_id: 1, createdAt: -1 })

// Campaign collection
db.createIndex({ merchantId: 1, status: 1 })

// Store collection
db.createIndex({ merchant_id: 1, status: 1 })
```

**Expected Impact:** 20-30% faster lookups on indexed queries

### 2. Query Optimization

**Bulk Operations:**
- Use `insertMany()` instead of individual inserts: **3-5x faster**
- Use bulk write operations for mixed operations: **2-3x faster**
- Batch updates in groups of 100-500: **consistent performance**

**Aggregation Queries:**
- Move $match stage early in pipeline to reduce documents
- Use $lookup only when necessary (consider denormalization)
- Add pagination for large result sets
- Use allowDiskUse for complex aggregations

### 3. Caching Strategy

**Recommended Caches:**

```javascript
// Cache campaign inventory status
// TTL: 5-10 seconds for active campaigns
// Invalidate on: allocation, redemption, usage

// Cache merchant analytics
// TTL: 30-60 seconds for summary views
// Invalidate on: new transactions, status changes

// Cache store allocation lookup
// TTL: 2-5 seconds per store
// Invalidate on: reallocation
```

**Expected Improvement:** 30-50% reduction in response time for frequently accessed data

### 4. Connection Pooling

**Recommended Settings:**
```javascript
mongoose.connect(uri, {
  maxPoolSize: 10,        // Concurrent connections
  minPoolSize: 5,         // Minimum connections
  socketTimeoutMS: 45000, // Socket timeout
  maxIdleTimeMS: 60000    // Idle connection timeout
});
```

### 5. Read Replicas

**For Analytics Queries:**
- Route analytics queries to read replicas
- Reduces load on primary database
- Expected improvement: 40-50% faster analytics on high-traffic systems

---

## Performance Bottlenecks & Solutions

### Current Bottlenecks

| Bottleneck | Impact | Solution | Improvement |
|------------|--------|----------|-------------|
| Sequential Redemption Processing | High latency on bulk ops | Batch operations, parallel processing | 30-50% |
| Aggregation Query Complexity | Slow analytics | Better indexing, caching | 20-40% |
| Individual Store Inserts | High time for bulk assignment | Bulk insert operations | 3-5x |
| Transaction Creation | Every redemption creates record | Async transaction logging | 10-15% |

### Recommended Optimizations (Priority Order)

1. **Add Database Indexes** (Highest Priority)
   - Impact: 20-30% improvement
   - Effort: Low
   - Risk: None
   - Timeline: Immediate

2. **Implement Query Result Caching**
   - Impact: 30-50% for frequent queries
   - Effort: Medium
   - Risk: Low (cache invalidation)
   - Timeline: 1-2 days

3. **Optimize Bulk Operations**
   - Impact: 2-5x for bulk assignments
   - Effort: Low
   - Risk: Low
   - Timeline: Few hours

4. **Async Transaction Logging**
   - Impact: 10-15% for redemptions
   - Effort: Medium
   - Risk: Medium (eventual consistency)
   - Timeline: 1 day

5. **Read Replica Routing**
   - Impact: 40-50% for analytics on high load
   - Effort: High
   - Risk: Low (read-only operations)
   - Timeline: 3-5 days

---

## How to Run Benchmarks

### Run All Benchmarks

```bash
# Run all performance benchmarks
npm test -- __tests__/performance/benchmarks.test.js

# Run with verbose output
npm test -- __tests__/performance/benchmarks.test.js --verbose

# Run with detailed timing
npm test -- __tests__/performance/benchmarks.test.js --verbose --forceExit
```

### Run Specific Benchmark

```bash
# Run only bulk redemption benchmark
npm test -- __tests__/performance/benchmarks.test.js --testNamePattern="Bulk Redemption"

# Run only analytics benchmark
npm test -- __tests__/performance/benchmarks.test.js --testNamePattern="Analytics"

# Run only inventory lookup
npm test -- __tests__/performance/benchmarks.test.js --testNamePattern="Inventory Status"
```

### Run with Coverage

```bash
npm test -- __tests__/performance/benchmarks.test.js --coverage
```

### Continuous Performance Monitoring

```bash
# Run benchmarks every 12 hours
0 */12 * * * npm test -- __tests__/performance/benchmarks.test.js >> perf_results.log 2>&1
```

---

## Interpreting Results

### Pass/Fail Criteria

**Benchmark Status:**
- ✅ **PASS**: Execution time is under target threshold
- ❌ **FAIL**: Execution time exceeds target threshold
- ⚠️ **WARN**: Within 10% of target threshold

### Acceptable Variance

Performance variance of ±15% is acceptable due to:
- System load variations
- MongoDB memory server initialization
- File I/O operations
- Node.js garbage collection

### Detecting Regressions

A regression is indicated when:
```
Current Result > Baseline * 1.25 (25% slower than baseline)
```

**Action Required if Regression Detected:**
1. Run benchmark again to rule out transient issues
2. Check recent code changes affecting the operation
3. Check system resource availability
4. Profile the operation using Node.js profiler
5. Review database query execution plan

### Environmental Factors Affecting Performance

| Factor | Impact | Mitigation |
|--------|--------|-----------|
| System CPU Load | ±20% variance | Run benchmarks during quiet periods |
| Available Memory | ±30% on large batches | Ensure 2GB+ free memory |
| Disk I/O | ±10% on writes | Use fast SSDs for testing |
| Network Latency | N/A (in-memory DB) | Use direct MongoDB connection |

---

## Benchmarks vs Production Performance

### Expected Differences

| Factor | Test Environment | Production | Impact |
|--------|------------------|-----------|--------|
| Database | In-memory (mongodb-memory-server) | Persistent MongoDB | ±5-10% |
| Network | Direct connection | API calls over network | +50-200ms per request |
| Concurrent Requests | Sequential | Parallel (API) | ±10-30% variance |
| Cache Hits | Not tested | 60-80% on active data | +30-50% improvement |
| Data Size | Minimal-realistic | Large (millions of records) | Variable |

### Production Scaling Estimates

For every 10x increase in data volume:

| Operation | Scaling Factor | Notes |
|-----------|-----------------|-------|
| Inventory Lookup | 1-1.2x | Indexed query, mostly constant time |
| Bulk Redemption | 1.1-1.3x | Slight increase due to validation |
| Analytics Query | 1.5-2x | Aggregation complexity increases |
| Campaign Assignment | 1-1.1x | Bulk insert, mostly constant time |

---

## System Specifications Used for Baselines

### Hardware

```
Processor: Intel Core i7 / equivalent
CPU Cores: 4-8
RAM: 8GB+
Storage: SSD
```

### Software Stack

```
Node.js: v18.x or higher
MongoDB: mongodb-memory-server (latest)
Jest: v29.x
Database Driver: mongoose 7.x
```

### Test Configuration

```
Test Timeout: 30 seconds per test
Parallel Workers: 4
Database: In-memory MongoDB
Data Size: Realistic production scale
Batch Sizes: 100, 1000, 2000+ items
```

---

## Monitoring & Alerts

### Recommended Monitoring Thresholds

```javascript
// Alert if benchmark exceeds threshold by 25%
const ALERT_THRESHOLD = baselineTime * 1.25;

// Performance metrics to monitor
const metrics = {
  'Bulk Redemption 100': 5000 * 1.25,     // 6250ms
  'Analytics Query': 2000 * 1.25,         // 2500ms
  'Inventory Lookup': 500 * 1.25,         // 625ms
  'Campaign Assignment 50': 3000 * 1.25,  // 3750ms
  'Large Batch 1000+': 15000 * 1.25      // 18750ms
};
```

### Performance Monitoring Integration

Integrate with monitoring systems:
- **Datadog**: Custom metrics via API
- **New Relic**: APM instrumentation
- **Prometheus**: Custom metrics exporter
- **CloudWatch**: Custom metrics on AWS

---

## Troubleshooting Performance Issues

### Slow Bulk Redemptions

**Symptoms:** Bulk redemption > 5 seconds for 100 items

**Diagnosis Steps:**
1. Check database indexes on CampaignStoreMapping
2. Monitor MongoDB query execution plan
3. Check system memory availability
4. Profile database write operations

**Solutions:**
- Add compound index on (campaign_id, store_id, merchant_id)
- Increase database connection pool size
- Optimize inventory update queries
- Consider async transaction logging

### Slow Analytics Queries

**Symptoms:** Analytics aggregation > 2 seconds

**Diagnosis Steps:**
1. Check aggregation pipeline stages
2. Verify indexes on campaign_id, store_id
3. Check transaction collection size
4. Monitor MongoDB aggregation execution

**Solutions:**
- Add caching layer (Redis)
- Optimize $lookup stages
- Move $match early in pipeline
- Consider denormalization for frequently accessed fields

### Inventory Lookup Latency

**Symptoms:** Inventory lookups > 500ms

**Diagnosis Steps:**
1. Verify index on (campaign_id, store_id, merchant_id)
2. Check query explain plan
3. Monitor MongoDB connection pool

**Solutions:**
- Ensure indexes exist and are being used
- Use lean() to reduce document overhead
- Consider in-memory cache (Redis)
- Optimize connection pooling

---

## Future Optimization Roadmap

### Phase 1 (Short-term, 1-2 weeks)
- [ ] Add compound indexes
- [ ] Implement basic query caching
- [ ] Optimize aggregation pipelines

### Phase 2 (Medium-term, 1 month)
- [ ] Implement Redis caching layer
- [ ] Add read replica routing
- [ ] Implement async transaction logging

### Phase 3 (Long-term, 2-3 months)
- [ ] Database sharding for multi-tenant scale
- [ ] Event-driven architecture for analytics
- [ ] Real-time metrics using Apache Kafka

---

## References

- [MongoDB Performance Tuning](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/nodejs-performance/)
- [Jest Performance Testing](https://jestjs.io/docs/timer-mocks)
- [Database Performance Testing](https://www.mongodb.com/docs/manual/reference/explain-results/)

---

**Last Updated:** May 2026
**Document Version:** 1.0
**Performance Baseline Date:** May 26, 2026
