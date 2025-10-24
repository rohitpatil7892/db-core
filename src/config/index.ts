import { config as dotenvConfig } from 'dotenv';
import { DatabaseConfig, RedisConfig } from '../types';

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
