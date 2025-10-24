import { QueryResultRow } from 'pg';
import { DatabaseManager } from './database/DatabaseManager';
import { RedisManager } from './cache/RedisManager';
import { QueryBuilder } from './query/QueryBuilder';
import { BaseRepository } from './repository/BaseRepository';
import { DatabaseConfig, RedisConfig, TransactionCallback } from './types';
import { getDatabaseConfig, getRedisConfig } from './config';
import logger from './utils/logger';

/**
 * DBCore
 * Main class that combines database and cache functionality
 */
export class DBCore {
  private db: DatabaseManager;
  private cache?: RedisManager;
  private isInitialized: boolean = false;

  constructor(dbConfig?: DatabaseConfig, redisConfig?: RedisConfig) {
    // Use provided config or load from environment
    const finalDbConfig = dbConfig || getDatabaseConfig();
    const finalRedisConfig = redisConfig || getRedisConfig();

    this.db = new DatabaseManager(finalDbConfig);
    
    // Only initialize Redis if config is provided or exists in environment
    if (redisConfig || process.env.REDIS_HOST) {
      this.cache = new RedisManager(finalRedisConfig);
    }
  }

  /**
   * Initialize database and cache connections
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('DBCore already initialized');
      return;
    }

    try {
      // Connect to database
      await this.db.connect();

      // Connect to Redis if available
      if (this.cache) {
        try {
          await this.cache.connect();
        } catch (error) {
          logger.warn('Redis connection failed, continuing without cache', { error });
          this.cache = undefined;
        }
      }

      this.isInitialized = true;
      logger.info('DBCore initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DBCore', { error });
      throw error;
    }
  }

  /**
   * Close all connections
   */
  public async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.disconnect();
      }

      if (this.cache) {
        await this.cache.disconnect();
      }

      this.isInitialized = false;
      logger.info('DBCore closed successfully');
    } catch (error) {
      logger.error('Error closing DBCore', { error });
      throw error;
    }
  }

  /**
   * Get database manager
   */
  public getDatabase(): DatabaseManager {
    this.ensureInitialized();
    return this.db;
  }

  /**
   * Get cache manager
   */
  public getCache(): RedisManager | undefined {
    return this.cache;
  }

  /**
   * Create a query builder for a table
   */
  public table<T = any>(tableName: string): QueryBuilder<T> {
    this.ensureInitialized();
    return new QueryBuilder<T>(tableName, this.db, this.cache);
  }

  /**
   * Create a repository for a table
   */
  public repository<T = any>(
    tableName: string,
    cachePrefix?: string
  ): BaseRepository<T> {
    this.ensureInitialized();
    // Create a concrete implementation of BaseRepository
    class ConcreteRepository extends BaseRepository<T> {}
    return new ConcreteRepository(tableName, this.db, this.cache, cachePrefix);
  }

  /**
   * Execute a transaction
   */
  public async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    this.ensureInitialized();
    return this.db.transaction(callback);
  }

  /**
   * Execute a raw query
   */
  public async query<T extends QueryResultRow = any>(sql: string, params?: any[]) {
    this.ensureInitialized();
    return this.db.query<T>(sql, params);
  }

  /**
   * Execute a raw query and return first row
   */
  public async queryOne<T extends QueryResultRow = any>(sql: string, params?: any[]) {
    this.ensureInitialized();
    return this.db.queryOne<T>(sql, params);
  }

  /**
   * Execute a raw query and return all rows
   */
  public async queryMany<T extends QueryResultRow = any>(sql: string, params?: any[]) {
    this.ensureInitialized();
    return this.db.queryMany<T>(sql, params);
  }

  /**
   * Check if DBCore is initialized
   */
  public initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get database pool stats
   */
  public getPoolStats() {
    return this.db.getPoolStats();
  }

  /**
   * Ensure DBCore is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DBCore not initialized. Call initialize() first.');
    }
  }

  /**
   * Add event listener to database
   */
  public on(event: 'connect' | 'disconnect' | 'error' | 'query', listener: (data?: any) => void) {
    this.db.on(event, listener);
  }
}

export default DBCore;
