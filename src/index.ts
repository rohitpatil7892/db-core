/**
 * @your-org/db-core
 * Core database layer with PostgreSQL and Redis caching for microservices
 */

// Main exports
export { DBCore } from './DBCore';
export { DatabaseManager } from './database/DatabaseManager';
export { ReplicaManager } from './database/ReplicaManager';
export { RedisManager } from './cache/RedisManager';
export { CacheInvalidationManager, CacheKeyBuilder } from './cache/CacheInvalidationStrategy';
export { QueryBuilder } from './query/QueryBuilder';
export { BaseRepository } from './repository/BaseRepository';
export { MigrationManager } from './migrations/MigrationManager';
export { SchemaManager } from './schema/SchemaManager';

// Configuration
export {
  getDatabaseConfig,
  getDatabaseConfigWithReplicas,
  getRedisConfig,
  getLogLevel,
  isProduction,
  isDevelopment,
} from './config';

// Logger
export { logger } from './utils/logger';

// Types
export * from './types';
export * from './models/types';

// Default export
export { DBCore as default } from './DBCore';
