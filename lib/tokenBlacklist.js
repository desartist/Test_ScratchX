import Redis from 'ioredis';

// Initialize Redis for token blacklist
let redis;
let redisAvailable = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
      if (times === 1) {
        console.warn('Redis unavailable — token blacklist disabled, running without it.');
      }
      if (times >= 3) return null; // stop retrying
      return Math.min(times * 200, 1000);
    },
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redis.on('error', () => {
    redisAvailable = false;
  });

  redis.on('connect', () => {
    console.log('Redis connected for token blacklist');
    redisAvailable = true;
  });

  redis.on('ready', () => {
    redisAvailable = true;
  });
} catch (err) {
  console.warn('Redis not available, token blacklist disabled');
  redis = null;
  redisAvailable = false;
}

class TokenBlacklist {
  /**
   * Add token to blacklist
   * @param {string} token - JWT token to blacklist
   * @param {number} expiresIn - TTL in seconds
   */
  async addToBlacklist(token, expiresIn = 604800) {
    try {
      if (!redis || !redisAvailable) {
        console.warn('Redis not available for token blacklist - token revocation disabled');
        return false;
      }

      const key = `blacklist:${token}`;
      await redis.setex(key, expiresIn, 'true');
      return true;
    } catch (error) {
      console.error('Error adding token to blacklist:', error);
      return false;
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} true if blacklisted, false otherwise
   */
  async isBlacklisted(token) {
    try {
      if (!redis || !redisAvailable) {
        return false; // Can't check without Redis, allow access
      }

      const key = `blacklist:${token}`;
      const result = await redis.get(key);
      return result !== null;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false; // On error, allow access rather than block
    }
  }

  /**
   * Clear blacklist (admin only - for testing)
   */
  async clearBlacklist() {
    try {
      if (!redis || !redisAvailable) return false;
      const keys = await redis.keys('blacklist:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Error clearing blacklist:', error);
      return false;
    }
  }
}

export default new TokenBlacklist();
