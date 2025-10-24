import { RedisManager } from './RedisManager';
import logger from '../utils/logger';

/**
 * Cache Invalidation Strategies
 * Handles different approaches to cache invalidation
 */

export type InvalidationStrategy = 'broad' | 'granular' | 'ttl' | 'versioned' | 'tag-based';

export interface InvalidationOptions {
  strategy: InvalidationStrategy;
  tableName: string;
  cachePrefix?: string;
  affectedIds?: (string | number)[];
  tags?: string[];
  version?: number;
}

/**
 * Cache Invalidation Manager
 * Provides multiple strategies for cache invalidation
 */
export class CacheInvalidationManager {
  constructor(private cache: RedisManager) {}

  /**
   * Strategy 1: Broad Invalidation (Current)
   * Deletes all cached queries for a table
   * 
   * Pros: Simple, safe, no stale data
   * Cons: Deletes too much, reduces cache hit rate
   */
  async broadInvalidation(tableName: string, cachePrefix: string = 'query'): Promise<void> {
    const pattern = `${cachePrefix}:*${tableName}*`;
    await this.cache.delPattern(pattern);
    logger.debug('Broad cache invalidation', { pattern });
  }

  /**
   * Strategy 2: Granular Invalidation
   * Only deletes cache for specific records
   * 
   * Pros: Precise, keeps unrelated caches
   * Cons: More complex, needs to track keys
   */
  async granularInvalidation(
    tableName: string,
    affectedIds: (string | number)[],
    cachePrefix: string = 'query'
  ): Promise<void> {
    // Delete specific record caches
    const keys = affectedIds.map(id => `${cachePrefix}:${tableName}:${id}`);
    
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Also delete list caches that might contain these records
    await this.cache.delPattern(`${cachePrefix}:${tableName}:list:*`);
    
    logger.debug('Granular cache invalidation', { tableName, affectedIds });
  }

  /**
   * Strategy 3: TTL-Based (Time to Live)
   * Caches expire automatically, no manual invalidation
   * 
   * Pros: Simple, automatic cleanup
   * Cons: Stale data until expiry, less control
   * 
   * Use: Set short TTL for frequently updated data
   */
  async ttlBasedInvalidation(
    key: string,
    ttl: number = 60
  ): Promise<void> {
    // Cache already has TTL, just log
    logger.debug('TTL-based cache', { key, ttl, note: 'Will expire automatically' });
  }

  /**
   * Strategy 4: Versioned Cache Keys
   * Include version number in cache key
   * 
   * Pros: No deletion needed, version bump invalidates all
   * Cons: Need to track version, can accumulate old caches
   */
  async versionedInvalidation(
    tableName: string,
    cachePrefix: string = 'query'
  ): Promise<number> {
    // Increment version number
    const versionKey = `${cachePrefix}:${tableName}:version`;
    const newVersion = await this.cache.incr(versionKey);
    
    logger.debug('Version-based cache invalidation', { tableName, newVersion });
    return newVersion;
  }

  /**
   * Strategy 5: Tag-Based Invalidation
   * Tag caches and invalidate by tag
   * 
   * Pros: Flexible, can invalidate related caches
   * Cons: Need to maintain tag mappings
   */
  async tagBasedInvalidation(
    tags: string[],
    cachePrefix: string = 'query'
  ): Promise<void> {
    for (const tag of tags) {
      // Get all keys with this tag
      const tagKey = `${cachePrefix}:tag:${tag}`;
      const keys = await this.cache.get(tagKey);
      
      if (keys) {
        const keyList = JSON.parse(keys) as string[];
        for (const key of keyList) {
          await this.cache.del(key);
        }
      }
      
      // Delete tag mapping
      await this.cache.del(tagKey);
    }
    
    logger.debug('Tag-based cache invalidation', { tags });
  }

  /**
   * Smart invalidation - chooses best strategy
   */
  async invalidate(options: InvalidationOptions): Promise<void> {
    switch (options.strategy) {
      case 'broad':
        await this.broadInvalidation(options.tableName, options.cachePrefix);
        break;

      case 'granular':
        if (options.affectedIds && options.affectedIds.length > 0) {
          await this.granularInvalidation(
            options.tableName,
            options.affectedIds,
            options.cachePrefix
          );
        } else {
          // Fallback to broad
          await this.broadInvalidation(options.tableName, options.cachePrefix);
        }
        break;

      case 'ttl':
        // Nothing to do, cache will expire
        logger.debug('Using TTL-based invalidation');
        break;

      case 'versioned':
        await this.versionedInvalidation(options.tableName, options.cachePrefix);
        break;

      case 'tag-based':
        if (options.tags && options.tags.length > 0) {
          await this.tagBasedInvalidation(options.tags, options.cachePrefix);
        }
        break;

      default:
        await this.broadInvalidation(options.tableName, options.cachePrefix);
    }
  }
}

/**
 * Cache Key Builder with Version Support
 */
export class CacheKeyBuilder {
  constructor(private cache: RedisManager) {}

  /**
   * Build cache key with version
   */
  async buildVersionedKey(
    tableName: string,
    queryHash: string,
    cachePrefix: string = 'query'
  ): Promise<string> {
    const versionKey = `${cachePrefix}:${tableName}:version`;
    let version = await this.cache.get(versionKey);
    
    if (!version) {
      version = '1';
      await this.cache.set(versionKey, version);
    }
    
    return `${cachePrefix}:${tableName}:v${version}:${queryHash}`;
  }

  /**
   * Build cache key with tags
   */
  buildTaggedKey(
    tableName: string,
    queryHash: string,
    tags: string[],
    cachePrefix: string = 'query'
  ): { key: string; tags: string[] } {
    const key = `${cachePrefix}:${tableName}:${queryHash}`;
    return { key, tags };
  }

  /**
   * Register tagged cache
   */
  async registerTaggedCache(
    key: string,
    tags: string[],
    cachePrefix: string = 'query'
  ): Promise<void> {
    for (const tag of tags) {
      const tagKey = `${cachePrefix}:tag:${tag}`;
      let keys = await this.cache.get(tagKey);
      
      let keyList: string[] = keys ? JSON.parse(keys) : [];
      if (!keyList.includes(key)) {
        keyList.push(key);
        await this.cache.set(tagKey, JSON.stringify(keyList));
      }
    }
  }
}

export default CacheInvalidationManager;
