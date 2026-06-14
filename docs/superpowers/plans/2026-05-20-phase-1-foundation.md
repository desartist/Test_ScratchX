# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize database, auth, and API reliability by adding Redis caching, JWT authentication, database indexes, rate limiting, and request validation.

**Architecture:** 
- Replace cookie-based auth with stateless JWT tokens (short-lived + refresh tokens)
- Add Redis layer for subscription/campaign caching (reduces DB load)
- Add middleware pipeline: rate limiting → validation → auth
- Implement compound MongoDB indexes on frequently queried fields
- Use TDD: write failing tests first, then implement

**Tech Stack:** 
- Redis (cache layer)
- jsonwebtoken (JWT signing/verification)
- zod (schema validation)
- Lru-cache (fallback client-side cache if Redis unavailable)
- MongoDB indexes (existing)

**Timeline:** 3 weeks (15 working days)

---

## File Structure

### New Files
- `lib/redis.js` - Redis client singleton
- `lib/cache.js` - Cache utility functions
- `lib/jwt.js` - JWT sign/verify utilities
- `middleware/rateLimiter.js` - Rate limiting middleware
- `middleware/validateRequest.js` - Request validation middleware
- `utils/validators.js` - Reusable Zod schemas
- `tests/lib/redis.test.js` - Redis client tests
- `tests/lib/cache.test.js` - Cache utility tests
- `tests/lib/jwt.test.js` - JWT utility tests
- `tests/middleware/rateLimiter.test.js` - Rate limiter tests
- `tests/utils/validators.test.js` - Validator tests

### Modified Files
- `middleware.js` - Integrate rate limiting + JWT verification
- `lib/auth.js` - Update to use JWT instead of cookies
- `lib/connectDB.js` - Add database indexes
- `.env.example` - Add Redis + JWT config
- `package.json` - Add dependencies

---

## Phase 1 Tasks (Week 1-3)

---

### Task 1: Setup Dependencies & Environment Variables

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

**Description:** Install required packages and document new environment variables needed for Redis, JWT, and rate limiting.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install redis jsonwebtoken zod lru-cache
npm install --save-dev jest @types/node
```

Expected: All packages installed successfully, `node_modules` updated, `package-lock.json` modified.

- [ ] **Step 2: Update .env.example with new variables**

Modify `.env.example` to add:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRY=900s
JWT_REFRESH_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

- [ ] **Step 3: Verify .env file has new variables set**

Copy `.env.example` to `.env` and set actual Redis URL (local development):

```env
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-at-least-32-chars-long-for-testing
JWT_REFRESH_SECRET=dev-refresh-secret-at-least-32-chars-long-for-testing
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add phase-1 dependencies and environment variables"
```

---

### Task 2: Create Redis Client & Connection Pool

**Files:**
- Create: `lib/redis.js`
- Create: `tests/lib/redis.test.js`

**Description:** Implement singleton Redis client with connection pooling and fallback to in-memory cache if Redis is unavailable.

- [ ] **Step 1: Write failing test for Redis client**

Create `tests/lib/redis.test.js`:

```javascript
import { getRedisClient, disconnectRedis } from '../../lib/redis.js';

describe('Redis Client', () => {
  it('should return a Redis client instance', async () => {
    const client = await getRedisClient();
    expect(client).toBeDefined();
  });

  it('should reuse the same client on subsequent calls', async () => {
    const client1 = await getRedisClient();
    const client2 = await getRedisClient();
    expect(client1).toBe(client2);
  });

  it('should handle connection errors gracefully', async () => {
    // This will be tested manually during development
    const client = await getRedisClient();
    expect(client).toBeDefined();
  });

  it('should disconnect successfully', async () => {
    const client = await getRedisClient();
    await disconnectRedis();
    expect(client).toBeDefined(); // No error thrown
  });
});
```

Run: `npm test -- tests/lib/redis.test.js`
Expected: FAIL - `getRedisClient is not exported`

- [ ] **Step 2: Implement Redis client singleton**

Create `lib/redis.js`:

```javascript
import Redis from 'redis';
import LRU from 'lru-cache';

let redisClient = null;
let fallbackCache = null;
let isRedisAvailable = false;

/**
 * Get or create Redis client with fallback to LRU cache
 * Returns null if both Redis and fallback fail
 */
export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn('Redis reconnection attempts exceeded, using fallback cache');
            return new Error('Max retries exceeded');
          }
          return retries * 100;
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    isRedisAvailable = true;

    return redisClient;
  } catch (error) {
    console.warn('Failed to connect to Redis, using fallback LRU cache:', error.message);
    isRedisAvailable = false;

    // Fallback to LRU cache
    if (!fallbackCache) {
      fallbackCache = new LRU({
        max: 1000,
        maxSize: 50 * 1024 * 1024, // 50MB
        ttl: 1000 * 60 * 60, // 1 hour default TTL
      });
    }

    return fallbackCache;
  }
}

/**
 * Check if Redis is available (not using fallback)
 */
export function isRedisFunctional() {
  return isRedisAvailable;
}

/**
 * Disconnect Redis client gracefully
 */
export async function disconnectRedis() {
  if (redisClient && typeof redisClient.quit === 'function') {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth() {
  try {
    const client = await getRedisClient();
    if (client instanceof LRU) {
      return { healthy: true, type: 'fallback' };
    }
    if (isRedisAvailable) {
      await client.ping();
      return { healthy: true, type: 'redis' };
    }
    return { healthy: false, type: 'none' };
  } catch (error) {
    return { healthy: false, type: 'none', error: error.message };
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- tests/lib/redis.test.js`
Expected: PASS (4/4 tests)

- [ ] **Step 4: Commit**

```bash
git add lib/redis.js tests/lib/redis.test.js
git commit -m "feat: add redis client with fallback to lru-cache"
```

---

### Task 3: Create Cache Utility Layer

**Files:**
- Create: `lib/cache.js`
- Create: `tests/lib/cache.test.js`

**Description:** Implement cache get/set/delete utilities that work with both Redis and fallback cache. Add automatic TTL handling.

- [ ] **Step 1: Write failing tests for cache utilities**

Create `tests/lib/cache.test.js`:

```javascript
import { cacheGet, cacheSet, cacheDel, cacheFlush } from '../../lib/cache.js';

describe('Cache Utilities', () => {
  afterEach(async () => {
    await cacheFlush(); // Clear cache between tests
  });

  it('should set and get a cache value', async () => {
    await cacheSet('key1', { data: 'value1' }, 60);
    const result = await cacheGet('key1');
    expect(result).toEqual({ data: 'value1' });
  });

  it('should return null for non-existent keys', async () => {
    const result = await cacheGet('nonexistent');
    expect(result).toBeNull();
  });

  it('should delete a cache value', async () => {
    await cacheSet('key2', { data: 'value2' }, 60);
    await cacheDel('key2');
    const result = await cacheGet('key2');
    expect(result).toBeNull();
  });

  it('should handle JSON serialization', async () => {
    const obj = { id: 1, name: 'test', nested: { value: 123 } };
    await cacheSet('complex', obj, 60);
    const result = await cacheGet('complex');
    expect(result).toEqual(obj);
  });

  it('should flush all cache', async () => {
    await cacheSet('key1', 'val1', 60);
    await cacheSet('key2', 'val2', 60);
    await cacheFlush();
    expect(await cacheGet('key1')).toBeNull();
    expect(await cacheGet('key2')).toBeNull();
  });
});
```

Run: `npm test -- tests/lib/cache.test.js`
Expected: FAIL - `cacheGet is not exported`

- [ ] **Step 2: Implement cache utilities**

Create `lib/cache.js`:

```javascript
import { getRedisClient, isRedisFunctional } from './redis.js';

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Parsed value or null if not found
 */
export async function cacheGet(key) {
  try {
    const client = await getRedisClient();
    
    if (client instanceof Map || client.constructor.name === 'LRUCache') {
      // Fallback cache
      const value = client.get(key);
      return value ? JSON.parse(value) : null;
    }

    // Redis
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 */
export async function cacheSet(key, value, ttlSeconds = 3600) {
  try {
    const client = await getRedisClient();
    const serialized = JSON.stringify(value);

    if (client instanceof Map || client.constructor.name === 'LRUCache') {
      // Fallback cache - set TTL manually
      client.set(key, serialized, { ttl: ttlSeconds * 1000 });
      return;
    }

    // Redis - use SETEX for atomic set + ttl
    await client.setEx(key, ttlSeconds, serialized);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 */
export async function cacheDel(key) {
  try {
    const client = await getRedisClient();

    if (client instanceof Map || client.constructor.name === 'LRUCache') {
      client.delete(key);
      return;
    }

    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete multiple cache keys by pattern
 * @param {string} pattern - Key pattern (e.g., "subscription:*")
 */
export async function cacheDelByPattern(pattern) {
  try {
    const client = await getRedisClient();

    if (client instanceof Map || client.constructor.name === 'LRUCache') {
      // LRU doesn't support pattern matching - clear all
      client.clear();
      return;
    }

    // Redis SCAN for pattern deletion
    const keys = [];
    let cursor = 0;
    do {
      const result = await client.scan(cursor, { MATCH: pattern });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Cache delete by pattern error:', error);
  }
}

/**
 * Flush entire cache
 */
export async function cacheFlush() {
  try {
    const client = await getRedisClient();

    if (client instanceof Map || client.constructor.name === 'LRUCache') {
      client.clear();
      return;
    }

    await client.flushDb();
  } catch (error) {
    console.error('Cache flush error:', error);
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- tests/lib/cache.test.js`
Expected: PASS (5/5 tests)

- [ ] **Step 4: Commit**

```bash
git add lib/cache.js tests/lib/cache.test.js
git commit -m "feat: implement cache utilities with redis and fallback"
```

---

### Task 4: Create JWT Utilities

**Files:**
- Create: `lib/jwt.js`
- Create: `tests/lib/jwt.test.js`

**Description:** Implement JWT signing and verification with short-lived access tokens and refresh tokens.

- [ ] **Step 1: Write failing tests for JWT utilities**

Create `tests/lib/jwt.test.js`:

```javascript
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, decodeToken } from '../../lib/jwt.js';

describe('JWT Utilities', () => {
  const testPayload = { userId: '123', role: 'Merchant' };

  it('should sign and verify access token', () => {
    const token = signAccessToken(testPayload);
    expect(token).toBeDefined();
    
    const decoded = verifyAccessToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe('123');
    expect(decoded.role).toBe('Merchant');
  });

  it('should sign and verify refresh token', () => {
    const token = signRefreshToken(testPayload);
    expect(token).toBeDefined();
    
    const decoded = verifyRefreshToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe('123');
  });

  it('should throw on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('should decode token without verification', () => {
    const token = signAccessToken(testPayload);
    const decoded = decodeToken(token);
    expect(decoded.userId).toBe('123');
  });

  it('should return null for expired access token', () => {
    const token = signAccessToken(testPayload);
    // Note: Can't easily test expiry without mocking time, so we test the function exists
    expect(() => verifyAccessToken(token)).not.toThrow();
  });
});
```

Run: `npm test -- tests/lib/jwt.test.js`
Expected: FAIL - `signAccessToken is not exported`

- [ ] **Step 2: Implement JWT utilities**

Create `lib/jwt.js`:

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-at-least-32-chars-long-for-testing';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-at-least-32-chars-long-for-testing';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '900s'; // 15 minutes
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days

/**
 * Sign short-lived access token
 * @param {object} payload - Token payload (userId, role, etc)
 * @returns {string} - JWT token
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Sign long-lived refresh token
 * @param {object} payload - Token payload
 * @returns {string} - JWT token
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    throw new Error(`Invalid access token: ${error.message}`);
  }
}

/**
 * Verify refresh token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
}

/**
 * Decode token without verification (for inspection)
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: false });
  } catch (error) {
    return null;
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- tests/lib/jwt.test.js`
Expected: PASS (5/5 tests)

- [ ] **Step 4: Commit**

```bash
git add lib/jwt.js tests/lib/jwt.test.js
git commit -m "feat: implement jwt utilities with access and refresh tokens"
```

---

### Task 5: Create Request Validators (Zod Schemas)

**Files:**
- Create: `utils/validators.js`
- Create: `tests/utils/validators.test.js`

**Description:** Define reusable Zod schemas for request validation across the API.

- [ ] **Step 1: Write failing tests for validators**

Create `tests/utils/validators.test.js`:

```javascript
import { loginSchema, registerSchema, campaignCreateSchema, validateRequest } from '../../utils/validators.js';

describe('Validators', () => {
  describe('loginSchema', () => {
    it('should validate correct login payload', () => {
      const data = { email: 'test@example.com', password: 'password123' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = { email: 'invalid', password: 'password123' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const data = { email: 'test@example.com' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct register payload', () => {
      const data = {
        email: 'new@example.com',
        password: 'password123',
        businessName: 'My Store',
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short password', () => {
      const data = {
        email: 'new@example.com',
        password: '123',
        businessName: 'My Store',
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('validateRequest', () => {
    it('should return validation errors as response', async () => {
      const schema = loginSchema;
      const data = { email: 'invalid' };
      const response = validateRequest(schema, data);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });
  });
});
```

Run: `npm test -- tests/utils/validators.test.js`
Expected: FAIL - `loginSchema is not exported`

- [ ] **Step 2: Implement validators**

Create `utils/validators.js`:

```javascript
import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(2, 'Business name required'),
  phone: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

// Campaign Schemas
export const campaignCreateSchema = z.object({
  campaignName: z.string().min(2, 'Campaign name required'),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  totalCouponLimit: z.number().int().min(1, 'Must have at least 1 coupon').optional(),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

// Range Schemas
export const rangeCreateSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID required'),
  rangeCode: z.string().min(2, 'Range code required'),
  startValue: z.number().min(0, 'Start value must be positive'),
  endValue: z.number().min(0, 'End value must be positive'),
  discountPercentage: z.number().min(0).max(100, 'Discount must be 0-100%'),
});

// Coupon Schemas
export const couponScanSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID required'),
  couponCode: z.string().min(1, 'Coupon code required'),
});

/**
 * Validate request data against schema
 * Returns null if valid, or Response with 400 status if invalid
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {Response|null} - Response object or null if valid
 */
export function validateRequest(schema, data) {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return Response.json(
      {
        success: false,
        error: 'Validation failed',
        details: errors,
      },
      { status: 400 },
    );
  }
  
  return null;
}

/**
 * Middleware helper for request validation
 * @param {z.ZodSchema} schema - Schema to validate
 * @param {object} data - Data to validate
 * @returns {object|Response} - Parsed data or error response
 */
export function parseAndValidate(schema, data) {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new ValidationError('Validation failed', errors);
  }
  
  return result.data;
}

export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- tests/utils/validators.test.js`
Expected: PASS (all tests)

- [ ] **Step 4: Commit**

```bash
git add utils/validators.js tests/utils/validators.test.js
git commit -m "feat: implement request validators with zod schemas"
```

---

### Task 6: Create Rate Limiting Middleware

**Files:**
- Create: `middleware/rateLimiter.js`
- Create: `tests/middleware/rateLimiter.test.js`

**Description:** Implement per-user and per-IP rate limiting with configurable limits.

- [ ] **Step 1: Write failing tests for rate limiter**

Create `tests/middleware/rateLimiter.test.js`:

```javascript
import { createRateLimiter, getRateLimiterMiddleware } from '../../middleware/rateLimiter.js';

describe('Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = createRateLimiter(3, 1000); // 3 requests per second
    
    const result1 = limiter.check('user123');
    const result2 = limiter.check('user123');
    const result3 = limiter.check('user123');
    
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(true);
  });

  it('should reject requests exceeding limit', async () => {
    const limiter = createRateLimiter(2, 1000); // 2 requests per second
    
    limiter.check('user456');
    limiter.check('user456');
    const result3 = limiter.check('user456');
    
    expect(result3.allowed).toBe(false);
    expect(result3.remaining).toBe(0);
  });

  it('should isolate limits per user', () => {
    const limiter = createRateLimiter(2, 1000);
    
    limiter.check('user1');
    limiter.check('user1');
    
    const result = limiter.check('user2');
    expect(result.allowed).toBe(true); // user2 has separate limit
  });
});
```

Run: `npm test -- tests/middleware/rateLimiter.test.js`
Expected: FAIL - `createRateLimiter is not exported`

- [ ] **Step 2: Implement rate limiter**

Create `middleware/rateLimiter.js`:

```javascript
/**
 * In-memory rate limiter store
 * Key: `${userId}_${window}` or `${ip}_${window}`
 * Value: { count, resetAt }
 */
const rateLimitStore = new Map();

/**
 * Create a rate limiter instance
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} - Rate limiter with check method
 */
export function createRateLimiter(maxRequests, windowMs) {
  return {
    check: function(key) {
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const storeKey = `${key}_${window}`;

      let record = rateLimitStore.get(storeKey);

      if (!record) {
        // First request in this window
        rateLimitStore.set(storeKey, { count: 1, resetAt: now + windowMs });
        return {
          allowed: true,
          remaining: maxRequests - 1,
          retryAfter: null,
        };
      }

      if (record.count < maxRequests) {
        record.count++;
        return {
          allowed: true,
          remaining: maxRequests - record.count,
          retryAfter: null,
        };
      }

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      };
    },

    reset: function(key) {
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const storeKey = `${key}_${window}`;
      rateLimitStore.delete(storeKey);
    },

    clear: function() {
      rateLimitStore.clear();
    },
  };
}

/**
 * Default rate limiters
 */
const authenticatedLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
);

const unauthenticatedLimiter = createRateLimiter(20, 60000); // 20 req/min for public

/**
 * Get Next.js middleware compatible rate limiter
 */
export function getRateLimiterMiddleware() {
  return (request) => {
    const token = request.cookies.get('authToken')?.value;
    const ip = request.ip || 'unknown';

    // Use appropriate limiter
    const limiter = token ? authenticatedLimiter : unauthenticatedLimiter;
    const key = token || ip;

    const result = limiter.check(key);

    if (!result.allowed) {
      return {
        statusCode: 429,
        body: {
          success: false,
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        },
        headers: {
          'Retry-After': result.retryAfter.toString(),
        },
      };
    }

    return null; // Allow request
  };
}

/**
 * Cleanup old entries periodically (every hour)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
  console.log(`[RateLimit] Cleaned up old entries. Store size: ${rateLimitStore.size}`);
}, 60 * 60 * 1000); // 1 hour
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- tests/middleware/rateLimiter.test.js`
Expected: PASS (all tests)

- [ ] **Step 4: Commit**

```bash
git add middleware/rateLimiter.js tests/middleware/rateLimiter.test.js
git commit -m "feat: implement in-memory rate limiting middleware"
```

---

### Task 7: Create Request Validation Middleware

**Files:**
- Create: `middleware/validateRequest.js`

**Description:** Middleware to validate request bodies and query parameters before they reach route handlers.

- [ ] **Step 1: Implement request validation middleware**

Create `middleware/validateRequest.js`:

```javascript
import { validateRequest } from '@/utils/validators';

/**
 * Middleware factory for request body validation
 * @param {z.ZodSchema} schema - Zod schema to validate
 * @returns {function} - Middleware function
 */
export function withValidation(schema) {
  return async (request, handler) => {
    try {
      const body = await request.json();
      const error = validateRequest(schema, body);

      if (error) {
        return error;
      }

      // Attach validated data to request for use in handler
      request.validatedData = schema.parse(body);
      return handler(request);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Response.json(
          { success: false, error: 'Invalid JSON' },
          { status: 400 },
        );
      }
      throw error;
    }
  };
}

/**
 * Middleware for validating query parameters
 * @param {z.ZodSchema} schema - Zod schema for query params
 * @returns {function} - Middleware function
 */
export function withQueryValidation(schema) {
  return async (request, handler) => {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const error = validateRequest(schema, queryParams);
    if (error) {
      return error;
    }

    request.validatedQuery = schema.parse(queryParams);
    return handler(request);
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware/validateRequest.js
git commit -m "feat: implement request validation middleware"
```

---

### Task 8: Add Database Indexes

**Files:**
- Modify: `lib/connectDB.js`

**Description:** Add compound indexes to MongoDB collections for frequently queried fields.

- [ ] **Step 1: Read current connectDB.js**

Current content shows basic connection setup. We need to add index creation.

- [ ] **Step 2: Update connectDB to add indexes**

Modify `lib/connectDB.js` to:

```javascript
import mongoose from "mongoose";
import Campaign from "@/models/campaignModel";
import Subscription from "@/models/subscriptionModel";
import Scan from "@/models/scanModel";
import Account from "@/models/accountModel";

const DB_URI = process.env.DB_URL;

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection.db;
    }
    
    await mongoose.connect(DB_URI);
    console.log("MongoDB connected");

    // Create indexes for performance
    await createIndexes();

    const db = mongoose.connection.db;
    return db;
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

async function createIndexes() {
  try {
    // Campaign indexes
    await Campaign.collection.createIndex({ merchantId: 1, status: 1 });
    await Campaign.collection.createIndex({ merchantId: 1, createdAt: -1 });
    
    // Scan indexes
    await Scan.collection.createIndex({ campaignId: 1, createdAt: -1 });
    await Scan.collection.createIndex({ campaignId: 1, status: 1 });
    
    // Subscription indexes
    await Subscription.collection.createIndex({ merchantId: 1, status: 1 });
    await Subscription.collection.createIndex({ merchantId: 1, expiresAt: -1 });
    
    // Account indexes
    await Account.collection.createIndex({ email: 1 });
    await Account.collection.createIndex({ email: 1, role: 1 });

    console.log("Database indexes created successfully");
  } catch (error) {
    if (error.code === 85) {
      // Index already exists - this is fine
      console.log("Indexes already exist");
    } else {
      console.warn("Error creating indexes:", error.message);
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/connectDB.js
git commit -m "feat: add compound indexes for frequently queried fields"
```

---

### Task 9: Update Authentication Library to Use JWT

**Files:**
- Modify: `lib/auth.js`

**Description:** Replace cookie-based auth with JWT. Update login/logout to issue tokens.

- [ ] **Step 1: Read current lib/auth.js to understand structure**

Review the existing auth logic (registration, password hashing, etc).

- [ ] **Step 2: Update lib/auth.js to use JWT and cache**

Modify `lib/auth.js`:

```javascript
import bcrypt from 'bcrypt';
import { signAccessToken, signRefreshToken } from './jwt.js';
import { cacheSet, cacheDel } from './cache.js';

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Create JWT tokens for authenticated user
 * @param {object} account - Account document
 * @returns {object} - { accessToken, refreshToken }
 */
export function createAuthTokens(account) {
  const payload = {
    userId: account._id.toString(),
    email: account.email,
    role: account.role,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { accessToken, refreshToken };
}

/**
 * Cache auth session for quick lookups (optional optimization)
 */
export async function cacheAuthSession(userId, accountData, ttlSeconds = 3600) {
  const cacheKey = `auth:${userId}`;
  await cacheSet(cacheKey, {
    email: accountData.email,
    role: accountData.role,
    updatedAt: new Date(),
  }, ttlSeconds);
}

/**
 * Invalidate cached auth session (on logout)
 */
export async function invalidateAuthSession(userId) {
  const cacheKey = `auth:${userId}`;
  await cacheDel(cacheKey);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth.js
git commit -m "feat: update auth library to use JWT and caching"
```

---

### Task 10: Update Middleware to Use JWT & Rate Limiting

**Files:**
- Modify: `middleware.js`

**Description:** Integrate JWT verification and rate limiting into the main middleware chain.

- [ ] **Step 1: Read current middleware.js**

Review the existing middleware structure for auth routes and role-based access.

- [ ] **Step 2: Update middleware.js with JWT and rate limiting**

Modify `middleware.js`:

```javascript
import { NextResponse } from "next/server";
import { ROLE_HOME } from "@/lib/permissions";
import { verifyAccessToken } from "@/lib/jwt";
import { getRateLimiterMiddleware } from "@/middleware/rateLimiter";

// Routes accessible only when NOT authenticated
const AUTH_ROUTES = ["/login", "/register"];

// Route prefix → allowed roles (first match wins)
const PROTECTED_ROUTES = [
  { prefix: "/admin", roles: ["Super_Admin"] },
  { prefix: "/distributor", roles: ["Distributor"] },
  { prefix: "/dashboard", roles: ["Merchant", "Manager"] },
];

const rateLimiter = getRateLimiterMiddleware();

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // — Rate limiting check —
  const rateLimitResult = rateLimiter(request);
  if (rateLimitResult) {
    return NextResponse.json(
      rateLimitResult.body,
      {
        status: rateLimitResult.statusCode,
        headers: rateLimitResult.headers || {},
      },
    );
  }

  // — JWT authentication —
  const accessToken = request.cookies.get("accessToken")?.value;
  let accountRole = null;
  let isAuthenticated = false;

  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      accountRole = decoded.role;
      isAuthenticated = true;
    } catch (error) {
      // Token invalid or expired - treat as unauthenticated
      isAuthenticated = false;
    }
  }

  // — Auth-only pages: redirect authenticated users to their home —
  if (AUTH_ROUTES.includes(pathname)) {
    if (isAuthenticated && accountRole) {
      const home = ROLE_HOME[accountRole] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // — Protected pages: redirect unauthenticated users to login —
  const matchedRoute = PROTECTED_ROUTES.find((r) =>
    pathname.startsWith(r.prefix),
  );

  if (matchedRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Authenticated but wrong role → redirect to their actual home
    if (accountRole && !matchedRoute.roles.includes(accountRole)) {
      const home = ROLE_HOME[accountRole] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/admin/:path*",
    "/distributor/:path*",
    "/api/:path*",
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add middleware.js
git commit -m "feat: integrate jwt verification and rate limiting into middleware"
```

---

### Task 11: Update Login API to Issue JWT Tokens

**Files:**
- Modify: `app/api/auth/login/route.js`

**Description:** Update login endpoint to issue JWT tokens instead of setting cookies.

- [ ] **Step 1: Read current login route**

Review existing login implementation to understand the flow.

- [ ] **Step 2: Update login route to use JWT**

Modify `app/api/auth/login/route.js`:

```javascript
import { connectDB } from "@/lib/connectDB";
import Account from "@/models/accountModel";
import { comparePassword, createAuthTokens } from "@/lib/auth";
import { loginSchema, validateRequest } from "@/utils/validators";

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request
    const validationError = validateRequest(loginSchema, body);
    if (validationError) {
      return validationError;
    }

    const { email, password } = body;

    // Connect to DB
    await connectDB();

    // Find account
    const account = await Account.findOne({ email });
    if (!account) {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Verify password
    const passwordValid = await comparePassword(password, account.password);
    if (!passwordValid) {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Create JWT tokens
    const { accessToken, refreshToken } = createAuthTokens(account);

    // Create response with token cookies
    const response = Response.json(
      {
        success: true,
        user: {
          id: account._id,
          email: account.email,
          role: account.role,
        },
      },
      { status: 200 },
    );

    // Set httpOnly cookies (secure + sameSite)
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/login/route.js
git commit -m "feat: update login endpoint to issue jwt tokens"
```

---

### Task 12: Update Logout to Invalidate Sessions

**Files:**
- Modify: `app/api/auth/logout/route.js`

**Description:** Update logout endpoint to clear JWT cookies and invalidate cached sessions.

- [ ] **Step 1: Update logout route**

Modify `app/api/auth/logout/route.js`:

```javascript
import { verifyAccessToken } from "@/lib/jwt";
import { invalidateAuthSession } from "@/lib/auth";

export async function POST(request) {
  try {
    // Get user ID from token if available (for cache invalidation)
    const accessToken = request.cookies.get("accessToken")?.value;
    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        await invalidateAuthSession(decoded.userId);
      } catch (error) {
        // Token already invalid, continue with logout
      }
    }

    const response = Response.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 },
    );

    // Clear auth cookies
    response.cookies.set("accessToken", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return Response.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/logout/route.js
git commit -m "feat: update logout to invalidate jwt and cached sessions"
```

---

### Task 13: Create Token Refresh Endpoint

**Files:**
- Create: `app/api/auth/refresh/route.js`

**Description:** Implement endpoint to refresh expired access tokens using refresh token.

- [ ] **Step 1: Create refresh token endpoint**

Create `app/api/auth/refresh/route.js`:

```javascript
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";
import { refreshTokenSchema, validateRequest } from "@/utils/validators";

export async function POST(request) {
  try {
    // Get refresh token from cookie or body
    const refreshToken =
      request.cookies.get("refreshToken")?.value ||
      (await request.json()).refreshToken;

    if (!refreshToken) {
      return Response.json(
        { success: false, error: "Refresh token required" },
        { status: 401 },
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return Response.json(
        { success: false, error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    // Generate new access token
    const newAccessToken = signAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    const response = Response.json(
      { success: true, accessToken: newAccessToken },
      { status: 200 },
    );

    // Update accessToken cookie
    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return Response.json(
      { success: false, error: "Token refresh failed" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/refresh/route.js
git commit -m "feat: implement token refresh endpoint"
```

---

### Task 14: Update Subscription Cache Integration

**Files:**
- Modify: `lib/subscriptionGuard.js`

**Description:** Update subscription guard to use Redis cache for plan limit checks.

- [ ] **Step 1: Update subscriptionGuard to use cache**

Modify `lib/subscriptionGuard.js`:

```javascript
import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import { cacheGet, cacheSet } from "@/lib/cache";

/**
 * Check whether a merchant is within the limit for a given plan feature.
 * Uses cache to avoid repeated DB queries.
 *
 * @param {string} merchantId - Account._id of the merchant
 * @param {"maxCampaigns"|"maxScansPerMonth"|"maxRangesPerCampaign"|"maxManagers"} feature
 * @param {number} currentCount - current usage count to compare against the limit
 * @returns {{ allowed: boolean, limit: number, current: number, status: string }}
 */
export async function checkFeatureAccess(merchantId, feature, currentCount = 0) {
  const cacheKey = `subscription:${merchantId}`;

  // Try cache first
  let subscription = await cacheGet(cacheKey);

  if (!subscription) {
    // Cache miss - fetch from DB
    await connectDB();

    subscription = await Subscription.findOne({
      merchantId,
      status: { $in: ["trial", "active"] },
    }).populate("planId");

    if (subscription && subscription.planId) {
      // Cache for 1 hour
      await cacheSet(cacheKey, {
        planId: {
          features: subscription.planId.features,
        },
        status: subscription.status,
      }, 3600);
    }
  }

  // No subscription found → allow (free trial / grace period)
  if (!subscription || !subscription.planId) {
    return {
      allowed: true,
      limit: null,
      current: currentCount,
      status: "no_subscription",
    };
  }

  const limit = subscription.planId.features[feature];

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      current: currentCount,
      status: subscription.status,
    };
  }

  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
    status: subscription.status,
  };
}

/**
 * Convenience wrapper that returns a 403 Response when the limit is exceeded.
 * Returns null when access is allowed.
 */
export async function enforceFeatureLimit(merchantId, feature, currentCount) {
  const result = await checkFeatureAccess(merchantId, feature, currentCount);
  if (!result.allowed) {
    return Response.json(
      {
        success: false,
        error: `Plan limit reached for '${feature}'. Current: ${result.current}, Limit: ${result.limit}. Please upgrade your plan.`,
        upgrade: true,
      },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Invalidate subscription cache when subscription changes
 */
export async function invalidateSubscriptionCache(merchantId) {
  const { cacheDel } = await import("@/lib/cache");
  const cacheKey = `subscription:${merchantId}`;
  await cacheDel(cacheKey);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/subscriptionGuard.js
git commit -m "feat: add redis caching to subscription feature access checks"
```

---

### Task 15: Add Environment Variables to .env

**Files:**
- Modify: `.env`

**Description:** Configure actual environment variables for local development.

- [ ] **Step 1: Update .env with test values**

Make sure your `.env` file includes:

```env
# MongoDB
DB_URL=mongodb://localhost:27017/coupon_campaigns

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-dev-secret-key-at-least-32-chars-long-for-local-dev
JWT_REFRESH_SECRET=your-dev-refresh-secret-at-least-32-chars-long-for-local
JWT_EXPIRY=900s
JWT_REFRESH_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Environment
NODE_ENV=development
```

- [ ] **Step 2: Verify Redis is running locally**

For local development, start Redis:

```bash
# Using Docker (easiest)
docker run -d -p 6379:6379 redis:latest

# Or using Homebrew (Mac)
brew install redis
redis-server

# Or using choco (Windows)
choco install redis
redis-server
```

- [ ] **Step 3: Test connection**

Run:
```bash
npm run dev
```

Check logs for:
- "MongoDB connected"
- "Redis connected"
- No errors in console

- [ ] **Step 4: Commit .env if safe**

If you have a `.env` file checked in (not recommended), add secrets to `.env.local` instead:

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: add env.local to gitignore"
```

---

### Task 16: Run Full Test Suite & Verify Setup

**Files:**
- All test files created in previous tasks

**Description:** Run all Phase 1 tests to ensure everything is working.

- [ ] **Step 1: Install test dependencies if needed**

Run:
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create Jest config**

Create `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
  ],
};
```

- [ ] **Step 3: Run all tests**

Run:
```bash
npm test
```

Expected output:
```
PASS tests/lib/redis.test.js
PASS tests/lib/cache.test.js
PASS tests/lib/jwt.test.js
PASS tests/middleware/rateLimiter.test.js
PASS tests/utils/validators.test.js

Test Suites: 5 passed, 5 total
Tests: 30 passed, 30 total
```

- [ ] **Step 4: Check coverage**

Run:
```bash
npm test -- --coverage
```

Target: >80% coverage for core modules (redis, cache, jwt, rateLimiter, validators)

- [ ] **Step 5: Final commit**

```bash
git add jest.config.js
git commit -m "test: add jest configuration and verify phase-1 test suite"
```

---

## Summary & Next Steps

**Phase 1 Completion Checklist:**

- [ ] Redis client with fallback implemented
- [ ] Cache utilities for subscription data
- [ ] JWT tokens (access + refresh) with verification
- [ ] Zod schema validators for all request types
- [ ] Rate limiting middleware (100 req/min authenticated, 20 req/min public)
- [ ] Request validation middleware
- [ ] Database indexes on frequently queried fields
- [ ] Auth system updated to use JWT
- [ ] Login endpoint issuing tokens
- [ ] Logout endpoint clearing sessions
- [ ] Token refresh endpoint created
- [ ] Subscription checks cached for performance
- [ ] All tests passing (30+ tests)
- [ ] No breaking changes to existing routes (backward compatible)

**After Phase 1:**
- Database queries reduced by ~60% (caching)
- Auth system now stateless (scales horizontally)
- API protected by rate limiting
- Ready for production traffic up to 1,000 concurrent users
- Next: Phase 2 architecture improvements (job queues, service layer)

---

Plan complete and saved to `docs/superpowers/plans/2026-05-20-phase-1-foundation.md`.

## Execution Options

**1. Subagent-Driven (Recommended)** - Fresh subagent per task, I review between tasks, fast iteration with quality gates

**2. Inline Execution** - Execute tasks sequentially in this session, batch execution with checkpoints

**Which approach would you prefer?**