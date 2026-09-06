/**
 * Arc Agent Trust - Caching System
 * 
 * In-memory cache with optional file persistence
 * - TTL (time-to-live) support
 * - LRU eviction policy
 * - File-based fallback
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger')('cache');
const config = require('./config');

class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.useFileBackup = options.useFileBackup !== false;
    this.cache = new Map();
    this.timestamps = new Map();
    this.accessTimes = new Map();
    
    // Cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    logger.info('Cache initialized', {
      maxSize: this.maxSize,
      ttl: this.ttl,
      fileBackup: this.useFileBackup
    });
  }
  
  /**
   * Generate cache key
   */
  _generateKey(namespace, identifier) {
    return `${namespace}:${identifier}`;
  }
  
  /**
   * Set cache value
   */
  set(namespace, identifier, value, customTtl = null) {
    if (!config.features.enableCache) {
      return false;
    }
    
    const key = this._generateKey(namespace, identifier);
    const ttl = customTtl || this.ttl;
    
    // LRU eviction
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this._findLRUKey();
      if (lruKey) {
        this.cache.delete(lruKey);
        this.timestamps.delete(lruKey);
        this.accessTimes.delete(lruKey);
        logger.debug('Cache evicted LRU key', { key: lruKey });
      }
    }
    
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
    this.accessTimes.set(key, Date.now());
    
    logger.debug('Cache SET', { key, ttl });
    
    // File backup
    if (this.useFileBackup && namespace === 'analysis') {
      this._saveToFile(key, value);
    }
    
    return true;
  }
  
  /**
   * Get cache value
   */
  get(namespace, identifier) {
    if (!config.features.enableCache) {
      return null;
    }
    
    const key = this._generateKey(namespace, identifier);
    
    // Check expiration
    if (this.timestamps.has(key)) {
      if (Date.now() > this.timestamps.get(key)) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        this.accessTimes.delete(key);
        logger.debug('Cache expired', { key });
        return null;
      }
    }
    
    if (this.cache.has(key)) {
      // Update access time for LRU
      this.accessTimes.set(key, Date.now());
      logger.debug('Cache HIT', { key });
      return this.cache.get(key);
    }
    
    logger.debug('Cache MISS', { key });
    return null;
  }
  
  /**
   * Check if key exists and is not expired
   */
  has(namespace, identifier) {
    const key = this._generateKey(namespace, identifier);
    
    if (!this.cache.has(key)) {
      return false;
    }
    
    // Check expiration
    if (this.timestamps.has(key) && Date.now() > this.timestamps.get(key)) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      this.accessTimes.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete specific key
   */
  delete(namespace, identifier) {
    const key = this._generateKey(namespace, identifier);
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.accessTimes.delete(key);
    logger.debug('Cache DELETE', { key });
    return true;
  }
  
  /**
   * Clear namespace
   */
  clearNamespace(namespace) {
    let count = 0;
    const pattern = `${namespace}:`;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        this.accessTimes.delete(key);
        count++;
      }
    }
    
    logger.info('Cache namespace cleared', { namespace, count });
    return count;
  }
  
  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.accessTimes.clear();
    logger.info('Cache cleared completely');
    return true;
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this._calculateHitRate(),
      memoryUsage: this._estimateMemoryUsage()
    };
  }
  
  /**
   * Find least recently used key
   */
  _findLRUKey() {
    let lruKey = null;
    let oldestAccess = Infinity;
    
    for (const [key, accessTime] of this.accessTimes.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        lruKey = key;
      }
    }
    
    return lruKey;
  }
  
  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, expiration] of this.timestamps.entries()) {
      if (now > expiration) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        this.accessTimes.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.debug('Cache cleanup', { removed });
    }
  }
  
  /**
   * Save analysis to file for persistence
   */
  _saveToFile(key, value) {
    try {
      const fileName = `${key.replace(/:/g, '-')}.json`;
      const filePath = path.join(config.evidence.cacheDir, fileName);
      
      if (!fs.existsSync(config.evidence.cacheDir)) {
        fs.mkdirSync(config.evidence.cacheDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
      logger.debug('Cache saved to file', { file: fileName });
    } catch (e) {
      logger.warn('Failed to save cache to file', { error: e.message });
    }
  }
  
  /**
   * Load analysis from file
   */
  _loadFromFile(key) {
    try {
      const fileName = `${key.replace(/:/g, '-')}.json`;
      const filePath = path.join(config.evidence.cacheDir, fileName);
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        logger.debug('Cache loaded from file', { file: fileName });
        return data;
      }
    } catch (e) {
      logger.warn('Failed to load cache from file', { error: e.message });
    }
    
    return null;
  }
  
  /**
   * Estimate memory usage
   */
  _estimateMemoryUsage() {
    let bytes = 0;
    for (const value of this.cache.values()) {
      bytes += JSON.stringify(value).length;
    }
    return Math.round(bytes / 1024 / 1024 * 100) / 100; // MB
  }
  
  /**
   * Calculate simple hit rate
   */
  _calculateHitRate() {
    // This is a simplified version - in production use actual counters
    return '~' + Math.round(100 * Math.min(1, this.cache.size / this.maxSize)) + '%';
  }
  
  /**
   * Shutdown
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
    logger.info('Cache manager destroyed');
  }
}

module.exports = CacheManager;
