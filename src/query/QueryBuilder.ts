import {
  WhereCondition,
  JoinCondition,
  OrderByClause,
  PaginationOptions,
  PaginatedResult,
} from '../types';
import { DatabaseManager } from '../database/DatabaseManager';
import { RedisManager } from '../cache/RedisManager';
import logger from '../utils/logger';

/**
 * Query Builder
 * Provides a fluent interface for building and executing SQL queries
 */
export class QueryBuilder<T = any> {
  private tableName: string;
  private selectColumns: string[] = ['*'];
  private whereConditions: WhereCondition[] = [];
  private joinConditions: JoinCondition[] = [];
  private orderByColumns: OrderByClause[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private groupByColumns: string[] = [];
  private havingCondition?: string;

  private db: DatabaseManager;
  private cache?: RedisManager;
  private useCache: boolean = false;
  private cacheTTL?: number;
  private cacheKeyPrefix?: string;

  constructor(
    tableName: string,
    db: DatabaseManager,
    cache?: RedisManager
  ) {
    this.tableName = tableName;
    this.db = db;
    this.cache = cache;
  }

  /**
   * Select specific columns
   */
  public select(...columns: string[]): this {
    this.selectColumns = columns;
    return this;
  }

  /**
   * Add WHERE condition
   */
  public where(column: string, operator: string, value?: any): this {
    this.whereConditions.push({
      column,
      operator: operator as any,
      value,
    });
    return this;
  }

  /**
   * Add WHERE IN condition
   */
  public whereIn(column: string, values: any[]): this {
    this.whereConditions.push({
      column,
      operator: 'IN',
      values,
    });
    return this;
  }

  /**
   * Add WHERE NOT IN condition
   */
  public whereNotIn(column: string, values: any[]): this {
    this.whereConditions.push({
      column,
      operator: 'NOT IN',
      values,
    });
    return this;
  }

  /**
   * Add WHERE BETWEEN condition
   */
  public whereBetween(column: string, value1: any, value2: any): this {
    this.whereConditions.push({
      column,
      operator: 'BETWEEN',
      values: [value1, value2],
    });
    return this;
  }

  /**
   * Add WHERE NULL condition
   */
  public whereNull(column: string): this {
    this.whereConditions.push({
      column,
      operator: 'IS NULL',
    });
    return this;
  }

  /**
   * Add WHERE NOT NULL condition
   */
  public whereNotNull(column: string): this {
    this.whereConditions.push({
      column,
      operator: 'IS NOT NULL',
    });
    return this;
  }

  /**
   * Add JOIN condition
   */
  public join(type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL', table: string, on: string, alias?: string): this {
    this.joinConditions.push({ type, table, on, alias });
    return this;
  }

  /**
   * Add INNER JOIN
   */
  public innerJoin(table: string, on: string, alias?: string): this {
    return this.join('INNER', table, on, alias);
  }

  /**
   * Add LEFT JOIN
   */
  public leftJoin(table: string, on: string, alias?: string): this {
    return this.join('LEFT', table, on, alias);
  }

  /**
   * Add ORDER BY clause
   */
  public orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByColumns.push({ column, direction });
    return this;
  }

  /**
   * Set LIMIT
   */
  public limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * Set OFFSET
   */
  public offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  /**
   * Add GROUP BY clause
   */
  public groupBy(...columns: string[]): this {
    this.groupByColumns = columns;
    return this;
  }

  /**
   * Add HAVING clause
   */
  public having(condition: string): this {
    this.havingCondition = condition;
    return this;
  }

  /**
   * Enable caching for this query
   */
  public withCache(ttl?: number, keyPrefix?: string): this {
    this.useCache = true;
    this.cacheTTL = ttl;
    this.cacheKeyPrefix = keyPrefix;
    return this;
  }

  /**
   * Build the SQL query
   */
  private buildQuery(): { sql: string; params: any[] } {
    const params: any[] = [];
    let paramCounter = 1;

    // SELECT clause
    const selectClause = `SELECT ${this.selectColumns.join(', ')}`;

    // FROM clause
    let fromClause = `FROM ${this.tableName}`;

    // JOIN clauses
    if (this.joinConditions.length > 0) {
      const joins = this.joinConditions.map((join) => {
        const alias = join.alias ? `AS ${join.alias}` : '';
        return `${join.type} JOIN ${join.table} ${alias} ON ${join.on}`;
      });
      fromClause += ' ' + joins.join(' ');
    }

    // WHERE clause
    let whereClause = '';
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions.map((condition) => {
        if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
          return `${condition.column} ${condition.operator}`;
        } else if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
          const placeholders = condition.values!.map((val) => {
            params.push(val);
            return `$${paramCounter++}`;
          });
          return `${condition.column} ${condition.operator} (${placeholders.join(', ')})`;
        } else if (condition.operator === 'BETWEEN') {
          params.push(condition.values![0], condition.values![1]);
          return `${condition.column} BETWEEN $${paramCounter++} AND $${paramCounter++}`;
        } else {
          params.push(condition.value);
          return `${condition.column} ${condition.operator} $${paramCounter++}`;
        }
      });
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // GROUP BY clause
    let groupByClause = '';
    if (this.groupByColumns.length > 0) {
      groupByClause = `GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // HAVING clause
    let havingClause = '';
    if (this.havingCondition) {
      havingClause = `HAVING ${this.havingCondition}`;
    }

    // ORDER BY clause
    let orderByClause = '';
    if (this.orderByColumns.length > 0) {
      const orders = this.orderByColumns.map((order) => `${order.column} ${order.direction}`);
      orderByClause = `ORDER BY ${orders.join(', ')}`;
    }

    // LIMIT and OFFSET
    let limitClause = '';
    if (this.limitValue !== undefined) {
      params.push(this.limitValue);
      limitClause = `LIMIT $${paramCounter++}`;
    }

    let offsetClause = '';
    if (this.offsetValue !== undefined) {
      params.push(this.offsetValue);
      offsetClause = `OFFSET $${paramCounter++}`;
    }

    // Combine all clauses
    const sql = [
      selectClause,
      fromClause,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      limitClause,
      offsetClause,
    ]
      .filter((clause) => clause !== '')
      .join(' ');

    return { sql, params };
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(sql: string, params: any[]): string {
    const prefix = this.cacheKeyPrefix || 'query';
    const hash = Buffer.from(sql + JSON.stringify(params)).toString('base64');
    return `${prefix}:${hash}`;
  }

  /**
   * Execute the query and return all results
   */
  public async get(): Promise<T[]> {
    const { sql, params } = this.buildQuery();

    // Check cache if enabled
    if (this.useCache && this.cache) {
      const cacheKey = this.generateCacheKey(sql, params);
      const cachedResult = await this.cache.get<T[]>(cacheKey);

      if (cachedResult) {
        logger.debug('Query result from cache', { cacheKey });
        return cachedResult;
      }

      // Execute query
      const result = await this.db.queryMany(sql, params) as T[];

      // Store in cache
      await this.cache.set(cacheKey, result, this.cacheTTL);

      return result;
    }

    return this.db.queryMany(sql, params) as Promise<T[]>;
  }

  /**
   * Execute the query and return first result
   */
  public async first(): Promise<T | null> {
    this.limit(1);
    const results = await this.get();
    return results[0] || null;
  }

  /**
   * Execute the query with pagination
   */
  public async paginate(options: PaginationOptions): Promise<PaginatedResult<T>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = new QueryBuilder<{ count: string }>(this.tableName, this.db);
    countQuery.whereConditions = [...this.whereConditions];
    countQuery.joinConditions = [...this.joinConditions];
    countQuery.select('COUNT(*) as count');

    const countResult = await countQuery.first();
    const totalRows = parseInt(countResult?.count || '0', 10);
    const totalPages = Math.ceil(totalRows / limit);

    // Get data with pagination
    this.limit(limit).offset(offset);
    const data = await this.get();

    return {
      data,
      pagination: {
        page,
        limit,
        totalRows,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Execute a count query
   */
  public async count(): Promise<number> {
    this.select('COUNT(*) as count');
    const result = await this.first();
    return parseInt((result as any)?.count || '0', 10);
  }

  /**
   * Insert a record
   */
  public async insert(data: Partial<T>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.db.queryOne(sql, values) as T | null;
    if (!result) {
      throw new Error('Insert failed');
    }

    // Invalidate cache
    if (this.cache) {
      await this.cache.delPattern(`${this.cacheKeyPrefix || 'query'}:*`);
    }

    return result;
  }

  /**
   * Update records
   */
  public async update(data: Partial<T>): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const { sql: whereClause, params: whereParams } = this.buildQuery();
    const whereMatch = whereClause.match(/WHERE .+/);

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}
      ${whereMatch ? whereMatch[0] : ''}
      RETURNING *
    `;

    const result = await this.db.query(sql, [...values, ...whereParams]);

    // Invalidate cache
    if (this.cache) {
      await this.cache.delPattern(`${this.cacheKeyPrefix || 'query'}:*`);
    }

    return result.rowCount || 0;
  }

  /**
   * Delete records
   */
  public async delete(): Promise<number> {
    const { sql: whereClause, params } = this.buildQuery();
    const whereMatch = whereClause.match(/WHERE .+/);

    const sql = `
      DELETE FROM ${this.tableName}
      ${whereMatch ? whereMatch[0] : ''}
    `;

    const result = await this.db.query(sql, params);

    // Invalidate cache
    if (this.cache) {
      await this.cache.delPattern(`${this.cacheKeyPrefix || 'query'}:*`);
    }

    return result.rowCount || 0;
  }
}

export default QueryBuilder;
