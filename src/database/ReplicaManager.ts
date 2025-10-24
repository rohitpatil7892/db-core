import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabaseConfigWithReplicas } from '../types';
import logger from '../utils/logger';

/**
 * Replica Manager
 * Handles read/write replica connections for horizontal scaling
 */
export class ReplicaManager {
  private writePool: Pool | null = null;
  private readPools: Pool[] = [];
  private config: DatabaseConfigWithReplicas;
  private loadBalancing: 'round-robin' | 'random' | 'weighted';
  private currentReadIndex: number = 0;
  private replicaWeights: number[] = [];

  constructor(config: DatabaseConfigWithReplicas) {
    this.config = config;
    this.loadBalancing = config.loadBalancing || 'round-robin';
  }

  /**
   * Connect to write (primary) and read replicas
   */
  async connect(): Promise<void> {
    try {
      // Connect to write (primary) database
      logger.info('Connecting to write database (primary)...');
      this.writePool = new Pool({
        host: this.config.write.host,
        port: this.config.write.port,
        database: this.config.write.database,
        user: this.config.write.user,
        password: this.config.write.password,
        max: this.config.write.max || 10,
        min: this.config.write.min || 2,
        idleTimeoutMillis: this.config.write.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.write.connectionTimeoutMillis || 2000,
        ssl: this.config.write.ssl,
      });

      // Test write connection
      const writeClient = await this.writePool.connect();
      await writeClient.query('SELECT NOW()');
      writeClient.release();
      logger.info('✅ Connected to write database (primary)');

      // Connect to read replicas
      if (this.config.read && this.config.read.length > 0) {
        logger.info(`Connecting to ${this.config.read.length} read replica(s)...`);

        for (let i = 0; i < this.config.read.length; i++) {
          const replica = this.config.read[i];
          
          const readPool = new Pool({
            host: replica.host,
            port: replica.port,
            database: replica.database,
            user: replica.user,
            password: replica.password,
            max: replica.max || 10,
            min: replica.min || 2,
            ssl: replica.ssl,
          });

          // Test read replica connection
          const readClient = await readPool.connect();
          await readClient.query('SELECT NOW()');
          readClient.release();

          this.readPools.push(readPool);
          this.replicaWeights.push(replica.weight || 1);

          logger.info(`✅ Connected to read replica ${i + 1} (${replica.host}:${replica.port})`);
        }
      } else {
        logger.info('No read replicas configured, using write database for reads');
      }

      logger.info('✅ All database connections established');
    } catch (error: any) {
      logger.error('Failed to connect to database', { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect from all pools
   */
  async disconnect(): Promise<void> {
    try {
      if (this.writePool) {
        await this.writePool.end();
        logger.info('Disconnected from write database');
      }

      for (let i = 0; i < this.readPools.length; i++) {
        await this.readPools[i].end();
        logger.info(`Disconnected from read replica ${i + 1}`);
      }

      this.readPools = [];
      this.replicaWeights = [];
      logger.info('All database connections closed');
    } catch (error: any) {
      logger.error('Error disconnecting from database', { error: error.message });
      throw error;
    }
  }

  /**
   * Get write pool (primary)
   */
  getWritePool(): Pool {
    if (!this.writePool) {
      throw new Error('Write database not connected');
    }
    return this.writePool;
  }

  /**
   * Get read pool using load balancing strategy
   */
  getReadPool(): Pool {
    // If no read replicas, use write pool
    if (this.readPools.length === 0) {
      return this.getWritePool();
    }

    // Select pool based on load balancing strategy
    let selectedIndex: number;

    switch (this.loadBalancing) {
      case 'round-robin':
        selectedIndex = this.currentReadIndex;
        this.currentReadIndex = (this.currentReadIndex + 1) % this.readPools.length;
        break;

      case 'random':
        selectedIndex = Math.floor(Math.random() * this.readPools.length);
        break;

      case 'weighted':
        selectedIndex = this.selectWeightedReplica();
        break;

      default:
        selectedIndex = 0;
    }

    return this.readPools[selectedIndex];
  }

  /**
   * Select replica based on weights
   */
  private selectWeightedReplica(): number {
    const totalWeight = this.replicaWeights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < this.replicaWeights.length; i++) {
      random -= this.replicaWeights[i];
      if (random <= 0) {
        return i;
      }
    }

    return 0;
  }

  /**
   * Execute write query (uses primary database)
   */
  async executeWrite<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      const pool = this.getWritePool();
      const result = await pool.query<T>(text, params);

      const executionTime = Date.now() - startTime;
      logger.debug('Write query executed', {
        query: text.substring(0, 100),
        executionTime: `${executionTime}ms`,
        rows: result.rowCount,
      });

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error('Write query failed', {
        query: text.substring(0, 100),
        error: error.message,
        executionTime: `${executionTime}ms`,
      });
      throw error;
    }
  }

  /**
   * Execute read query (uses read replica)
   */
  async executeRead<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      const pool = this.getReadPool();
      const result = await pool.query<T>(text, params);

      const executionTime = Date.now() - startTime;
      logger.debug('Read query executed', {
        query: text.substring(0, 100),
        executionTime: `${executionTime}ms`,
        rows: result.rowCount,
        replica: pool === this.writePool ? 'primary' : 'replica',
      });

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error('Read query failed', {
        query: text.substring(0, 100),
        error: error.message,
        executionTime: `${executionTime}ms`,
      });
      throw error;
    }
  }

  /**
   * Execute transaction (always uses write database)
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const pool = this.getWritePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      logger.debug('Transaction committed successfully');
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
   * Get pool statistics
   */
  getStats() {
    const writeStats = this.writePool
      ? {
          total: this.writePool.totalCount,
          idle: this.writePool.idleCount,
          waiting: this.writePool.waitingCount,
        }
      : null;

    const readStats = this.readPools.map((pool, index) => ({
      replica: index + 1,
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      weight: this.replicaWeights[index],
    }));

    return {
      write: writeStats,
      read: readStats,
      loadBalancing: this.loadBalancing,
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.writePool !== null;
  }
}

export default ReplicaManager;
