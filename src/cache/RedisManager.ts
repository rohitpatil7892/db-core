import { createClient, RedisClientType } from 'redis';
import { RedisConfig } from '../types';
import logger from '../utils/logger';

/**
 * Redis Manager
 * Handles Redis connection and caching operations
 */
export class RedisManager {
  private client: RedisClientType | null = null;
  private config: RedisConfig;
  private isConnected: boolean = false;

  constructor(config: RedisConfig) {
    this.config = config;
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    if (this.client && this.isConnected) {
      logger.warn('Redis client already connected');
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
        password: this.config.password,
        database: this.config.db,
      });

      // Setup error handler
      this.client.on('error', (err) => {
        logger.error('Redis client error', { error: err });
      });

      // Setup connection handler
      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready', {
          host: this.config.host,
          port: this.config.port,
        });
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (!this.client) {
      logger.warn('No Redis client to disconnect');
      return;
    }

    try {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
      throw error;
    }
  }

  /**
   * Get Redis client
   */
  private getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Set a value in cache
   */
  public async set(
    key: string,
    value: any,
    ttl?: number
  ): Promise<void> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      const serializedValue = JSON.stringify(value);
      const expirationTime = ttl || this.config.defaultTTL || 3600;

      await client.setEx(cacheKey, expirationTime, serializedValue);

      logger.debug('Cache set', { key: cacheKey, ttl: expirationTime });
    } catch (error) {
      logger.error('Failed to set cache', { key, error });
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      const value = await client.get(cacheKey);

      if (!value) {
        logger.debug('Cache miss', { key: cacheKey });
        return null;
      }

      logger.debug('Cache hit', { key: cacheKey });
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to get cache', { key, error });
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  public async del(key: string): Promise<void> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      await client.del(cacheKey);

      logger.debug('Cache deleted', { key: cacheKey });
    } catch (error) {
      logger.error('Failed to delete cache', { key, error });
      throw error;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  public async delPattern(pattern: string): Promise<void> {
    try {
      const client = this.getClient();
      const cachePattern = this.buildKey(pattern);
      const keys = await client.keys(cachePattern);

      if (keys.length === 0) {
        logger.debug('No keys found matching pattern', { pattern: cachePattern });
        return;
      }

      await client.del(keys);
      logger.debug('Cache keys deleted', { pattern: cachePattern, count: keys.length });
    } catch (error) {
      logger.error('Failed to delete cache pattern', { pattern, error });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      const result = await client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check cache existence', { key, error });
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  public async expire(key: string, ttl: number): Promise<void> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      await client.expire(cacheKey, ttl);

      logger.debug('Cache expiration set', { key: cacheKey, ttl });
    } catch (error) {
      logger.error('Failed to set cache expiration', { key, error });
      throw error;
    }
  }

  /**
   * Get time to live for a key
   */
  public async ttl(key: string): Promise<number> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      return await client.ttl(cacheKey);
    } catch (error) {
      logger.error('Failed to get cache TTL', { key, error });
      return -1;
    }
  }

  /**
   * Clear all cache keys with the configured prefix
   */
  public async clear(): Promise<void> {
    try {
      await this.delPattern('*');
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
      throw error;
    }
  }

  /**
   * Increment a numeric value
   */
  public async incr(key: string): Promise<number> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      return await client.incr(cacheKey);
    } catch (error) {
      logger.error('Failed to increment cache', { key, error });
      throw error;
    }
  }

  /**
   * Decrement a numeric value
   */
  public async decr(key: string): Promise<number> {
    try {
      const client = this.getClient();
      const cacheKey = this.buildKey(key);
      return await client.decr(cacheKey);
    } catch (error) {
      logger.error('Failed to decrement cache', { key, error });
      throw error;
    }
  }

  /**
   * Check if Redis is connected
   */
  public connected(): boolean {
    return this.isConnected;
  }
}

export default RedisManager;
