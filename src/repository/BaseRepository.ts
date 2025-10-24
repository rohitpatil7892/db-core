import { QueryBuilder } from '../query/QueryBuilder';
import { DatabaseManager } from '../database/DatabaseManager';
import { RedisManager } from '../cache/RedisManager';
import { PaginationOptions, PaginatedResult } from '../types';

/**
 * Base Repository
 * Provides common CRUD operations for any table
 */
export abstract class BaseRepository<T = any> {
  protected tableName: string;
  protected db: DatabaseManager;
  protected cache?: RedisManager;
  protected cachePrefix: string;
  protected defaultCacheTTL: number = 3600;

  constructor(
    tableName: string,
    db: DatabaseManager,
    cache?: RedisManager,
    cachePrefix?: string
  ) {
    this.tableName = tableName;
    this.db = db;
    this.cache = cache;
    this.cachePrefix = cachePrefix || tableName;
  }

  /**
   * Create a new query builder for this table
   */
  protected query(): QueryBuilder<T> {
    return new QueryBuilder<T>(this.tableName, this.db, this.cache);
  }

  /**
   * Find a record by ID
   */
  public async findById(id: number | string): Promise<T | null> {
    const cacheKey = `${this.cachePrefix}:id:${id}`;

    // Check cache
    if (this.cache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.query()
      .where('id', '=', id)
      .first();

    // Store in cache
    if (result && this.cache) {
      await this.cache.set(cacheKey, result, this.defaultCacheTTL);
    }

    return result;
  }

  /**
   * Find all records
   */
  public async findAll(): Promise<T[]> {
    return this.query().get();
  }

  /**
   * Find records with pagination
   */
  public async findPaginated(options: PaginationOptions): Promise<PaginatedResult<T>> {
    return this.query().paginate(options);
  }

  /**
   * Find records by column value
   */
  public async findBy(column: string, value: any): Promise<T[]> {
    return this.query()
      .where(column, '=', value)
      .get();
  }

  /**
   * Find one record by column value
   */
  public async findOneBy(column: string, value: any): Promise<T | null> {
    return this.query()
      .where(column, '=', value)
      .first();
  }

  /**
   * Create a new record
   */
  public async create(data: Partial<T>): Promise<T> {
    const result = await this.query().insert(data);

    // Invalidate cache
    await this.invalidateCache();

    return result;
  }

  /**
   * Update a record by ID
   */
  public async update(id: number | string, data: Partial<T>): Promise<boolean> {
    const rowCount = await this.query()
      .where('id', '=', id)
      .update(data);

    if (rowCount > 0) {
      // Invalidate cache
      await this.invalidateCache(id);
      return true;
    }

    return false;
  }

  /**
   * Delete a record by ID
   */
  public async delete(id: number | string): Promise<boolean> {
    const rowCount = await this.query()
      .where('id', '=', id)
      .delete();

    if (rowCount > 0) {
      // Invalidate cache
      await this.invalidateCache(id);
      return true;
    }

    return false;
  }

  /**
   * Count records
   */
  public async count(): Promise<number> {
    return this.query().count();
  }

  /**
   * Check if record exists by ID
   */
  public async exists(id: number | string): Promise<boolean> {
    const count = await this.query()
      .where('id', '=', id)
      .count();

    return count > 0;
  }

  /**
   * Invalidate cache for this repository
   */
  protected async invalidateCache(id?: number | string): Promise<void> {
    if (!this.cache) {
      return;
    }

    if (id) {
      await this.cache.del(`${this.cachePrefix}:id:${id}`);
    }

    // Invalidate all query caches for this table
    await this.cache.delPattern(`${this.cachePrefix}:*`);
  }

  /**
   * Execute raw SQL query
   */
  protected async raw<R = any>(sql: string, params?: any[]): Promise<R[]> {
    return this.db.queryMany(sql, params) as Promise<R[]>;
  }

  /**
   * Execute raw SQL query and return first result
   */
  protected async rawOne<R = any>(sql: string, params?: any[]): Promise<R | null> {
    return this.db.queryOne(sql, params) as Promise<R | null>;
  }
}

export default BaseRepository;
