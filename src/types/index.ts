import { PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | object;
}

/**
 * Read replica configuration
 */
export interface ReadReplicaConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  min?: number;
  ssl?: boolean;
  weight?: number; // For load balancing (default: 1)
}

/**
 * Database configuration with read replicas
 */
export interface DatabaseConfigWithReplicas {
  write: DatabaseConfig;
  read?: ReadReplicaConfig[];
  loadBalancing?: 'round-robin' | 'random' | 'weighted';
}

/**
 * Redis configuration interface
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
}

/**
 * Transaction callback function type
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Query result with metadata
 */
export interface QueryResultWithMeta<T extends QueryResultRow = any> extends QueryResult<T> {
  fromCache?: boolean;
  executionTime?: number;
}

/**
 * Where clause operators
 */
export type WhereOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'BETWEEN';

/**
 * Where condition
 */
export interface WhereCondition {
  column: string;
  operator: WhereOperator;
  value?: any;
  values?: any[]; // For BETWEEN and IN operators
}

/**
 * Join types
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

/**
 * Join condition
 */
export interface JoinCondition {
  type: JoinType;
  table: string;
  on: string;
  alias?: string;
}

/**
 * Order by direction
 */
export type OrderDirection = 'ASC' | 'DESC';

/**
 * Order by clause
 */
export interface OrderByClause {
  column: string;
  direction: OrderDirection;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalRows: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Migration interface
 */
export interface Migration {
  id: string;
  name: string;
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

/**
 * Database event types
 */
export type DatabaseEvent = 'connect' | 'disconnect' | 'error' | 'query';

/**
 * Event listener callback
 */
export type EventListener = (data?: any) => void;
