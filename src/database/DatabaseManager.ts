import { Pool, QueryResult, QueryResultRow } from 'pg';
import { DatabaseConfig, TransactionCallback, EventListener, DatabaseEvent } from '../types';
import logger from '../utils/logger';

/**
 * Database Manager
 * Handles PostgreSQL connection pooling and query execution
 */
export class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private eventListeners: Map<DatabaseEvent, EventListener[]> = new Map();

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners map
   */
  private initializeEventListeners(): void {
    this.eventListeners.set('connect', []);
    this.eventListeners.set('disconnect', []);
    this.eventListeners.set('error', []);
    this.eventListeners.set('query', []);
  }

  /**
   * Add event listener
   */
  public on(event: DatabaseEvent, listener: EventListener): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  /**
   * Emit event
   */
  private emit(event: DatabaseEvent, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((listener) => listener(data));
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    if (this.pool) {
      logger.warn('Database pool already exists');
      return;
    }

    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        min: this.config.min,
        max: this.config.max,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        ssl: this.config.ssl,
      });

      // Setup pool error handler
      this.pool.on('error', (err) => {
        logger.error('Unexpected database pool error', { error: err });
        this.emit('error', err);
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connected successfully', {
        host: this.config.host,
        database: this.config.database,
      });

      this.emit('connect');
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    if (!this.pool) {
      logger.warn('No database pool to disconnect');
      return;
    }

    try {
      await this.pool.end();
      this.pool = null;
      logger.info('Database disconnected successfully');
      this.emit('disconnect');
    } catch (error) {
      logger.error('Error disconnecting from database', { error });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get pool instance
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      const pool = this.getPool();
      const result = await pool.query<T>(text, params);
      
      const executionTime = Date.now() - startTime;
      
      logger.debug('Query executed', {
        query: text,
        params,
        rowCount: result.rowCount,
        executionTime: `${executionTime}ms`,
      });

      this.emit('query', { text, params, executionTime, rowCount: result.rowCount });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Query execution failed', {
        query: text,
        params,
        error,
        executionTime: `${executionTime}ms`,
      });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute a query and return first row
   */
  public async queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  public async queryMany<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Execute a transaction
   */
  public async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      logger.debug('Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');
      logger.debug('Transaction committed');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is connected
   */
  public isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Get pool status
   */
  public getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}

export default DatabaseManager;
