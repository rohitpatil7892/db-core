import { PoolClient } from 'pg';
import { DatabaseManager } from '../database/DatabaseManager';
import { Migration } from '../types';
import logger from '../utils/logger';

/**
 * Migration Manager
 * Handles database migrations
 */
export class MigrationManager {
  private db: DatabaseManager;
  private migrations: Migration[] = [];
  private migrationsTable: string = 'migrations';

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Initialize migrations table
   */
  private async initializeMigrationsTable(client: PoolClient): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await client.query(sql);
    logger.info('Migrations table initialized');
  }

  /**
   * Register a migration
   */
  public register(migration: Migration): void {
    this.migrations.push(migration);
  }

  /**
   * Register multiple migrations
   */
  public registerMany(migrations: Migration[]): void {
    this.migrations.push(...migrations);
  }

  /**
   * Get executed migrations
   */
  private async getExecutedMigrations(client: PoolClient): Promise<string[]> {
    const result = await client.query<{ name: string }>(
      `SELECT name FROM ${this.migrationsTable} ORDER BY id ASC`
    );
    return result.rows.map((row) => row.name);
  }

  /**
   * Mark migration as executed
   */
  private async markAsExecuted(client: PoolClient, name: string): Promise<void> {
    await client.query(
      `INSERT INTO ${this.migrationsTable} (name) VALUES ($1)`,
      [name]
    );
  }

  /**
   * Unmark migration
   */
  private async unmarkMigration(client: PoolClient, name: string): Promise<void> {
    await client.query(
      `DELETE FROM ${this.migrationsTable} WHERE name = $1`,
      [name]
    );
  }

  /**
   * Run pending migrations
   */
  public async up(): Promise<void> {
    await this.db.transaction(async (client) => {
      await this.initializeMigrationsTable(client);

      const executedMigrations = await this.getExecutedMigrations(client);
      const pendingMigrations = this.migrations.filter(
        (m) => !executedMigrations.includes(m.name)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Running ${pendingMigrations.length} migrations`);

      for (const migration of pendingMigrations) {
        try {
          logger.info(`Running migration: ${migration.name}`);
          await migration.up(client);
          await this.markAsExecuted(client, migration.name);
          logger.info(`Migration completed: ${migration.name}`);
        } catch (error) {
          logger.error(`Migration failed: ${migration.name}`, { error });
          throw error;
        }
      }

      logger.info('All migrations completed successfully');
    });
  }

  /**
   * Rollback the last migration
   */
  public async down(): Promise<void> {
    await this.db.transaction(async (client) => {
      await this.initializeMigrationsTable(client);

      const executedMigrations = await this.getExecutedMigrations(client);

      if (executedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigrationName = executedMigrations[executedMigrations.length - 1];
      const migration = this.migrations.find((m) => m.name === lastMigrationName);

      if (!migration) {
        throw new Error(`Migration not found: ${lastMigrationName}`);
      }

      try {
        logger.info(`Rolling back migration: ${migration.name}`);
        await migration.down(client);
        await this.unmarkMigration(client, migration.name);
        logger.info(`Migration rolled back: ${migration.name}`);
      } catch (error) {
        logger.error(`Rollback failed: ${migration.name}`, { error });
        throw error;
      }
    });
  }

  /**
   * Rollback all migrations
   */
  public async reset(): Promise<void> {
    await this.db.transaction(async (client) => {
      await this.initializeMigrationsTable(client);

      const executedMigrations = await this.getExecutedMigrations(client);

      if (executedMigrations.length === 0) {
        logger.info('No migrations to reset');
        return;
      }

      logger.info(`Resetting ${executedMigrations.length} migrations`);

      // Rollback in reverse order
      for (let i = executedMigrations.length - 1; i >= 0; i--) {
        const migrationName = executedMigrations[i];
        const migration = this.migrations.find((m) => m.name === migrationName);

        if (!migration) {
          logger.warn(`Migration not found, skipping: ${migrationName}`);
          continue;
        }

        try {
          logger.info(`Rolling back migration: ${migration.name}`);
          await migration.down(client);
          await this.unmarkMigration(client, migration.name);
          logger.info(`Migration rolled back: ${migration.name}`);
        } catch (error) {
          logger.error(`Rollback failed: ${migration.name}`, { error });
          throw error;
        }
      }

      logger.info('All migrations reset successfully');
    });
  }

  /**
   * Get migration status
   */
  public async status(): Promise<{
    executed: string[];
    pending: string[];
  }> {
    const pool = this.db.getPool();
    const client = await pool.connect();

    try {
      await this.initializeMigrationsTable(client);
      const executedMigrations = await this.getExecutedMigrations(client);
      const pendingMigrations = this.migrations
        .filter((m) => !executedMigrations.includes(m.name))
        .map((m) => m.name);

      return {
        executed: executedMigrations,
        pending: pendingMigrations,
      };
    } finally {
      client.release();
    }
  }
}

export default MigrationManager;
