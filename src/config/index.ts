import { config as dotenvConfig } from 'dotenv';
import { DatabaseConfig, RedisConfig, DatabaseConfigWithReplicas, ReadReplicaConfig } from '../types';

// Load environment variables
dotenvConfig();

/**
 * Get database configuration from environment variables
 */
export const getDatabaseConfig = (): DatabaseConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
  ssl: process.env.DB_SSL === 'true',
});

/**
 * Get database configuration with read replicas
 * Supports multiple read replicas for horizontal scaling
 */
export const getDatabaseConfigWithReplicas = (): DatabaseConfigWithReplicas => {
  const config: DatabaseConfigWithReplicas = {
    write: getDatabaseConfig(),
    loadBalancing: (process.env.DB_LOAD_BALANCING as any) || 'round-robin',
  };

  // Parse read replicas from environment
  // Format: DB_READ_REPLICA_1_HOST, DB_READ_REPLICA_1_PORT, etc.
  const readReplicas: ReadReplicaConfig[] = [];
  
  let replicaIndex = 1;
  while (process.env[`DB_READ_REPLICA_${replicaIndex}_HOST`]) {
    readReplicas.push({
      host: process.env[`DB_READ_REPLICA_${replicaIndex}_HOST`]!,
      port: parseInt(process.env[`DB_READ_REPLICA_${replicaIndex}_PORT`] || '5432', 10),
      database: process.env[`DB_READ_REPLICA_${replicaIndex}_DATABASE`] || process.env.DB_NAME || 'postgres',
      user: process.env[`DB_READ_REPLICA_${replicaIndex}_USER`] || process.env.DB_USER || 'postgres',
      password: process.env[`DB_READ_REPLICA_${replicaIndex}_PASSWORD`] || process.env.DB_PASSWORD || '',
      max: parseInt(process.env[`DB_READ_REPLICA_${replicaIndex}_POOL_MAX`] || '10', 10),
      min: parseInt(process.env[`DB_READ_REPLICA_${replicaIndex}_POOL_MIN`] || '2', 10),
      ssl: process.env[`DB_READ_REPLICA_${replicaIndex}_SSL`] === 'true',
      weight: parseInt(process.env[`DB_READ_REPLICA_${replicaIndex}_WEIGHT`] || '1', 10),
    });
    replicaIndex++;
  }

  if (readReplicas.length > 0) {
    config.read = readReplicas;
  }

  return config;
};

/**
 * Get Redis configuration from environment variables
 */
export const getRedisConfig = (): RedisConfig => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:',
  defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
});

/**
 * Get log level from environment
 */
export const getLogLevel = (): string => process.env.LOG_LEVEL || 'info';

/**
 * Check if in production environment
 */
export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Check if in development environment
 */
export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
