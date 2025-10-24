/**
 * Example of using migrations
 */

import { DBCore } from '../src';
import { MigrationManager } from '../src/migrations/MigrationManager';
import createUsersTable from '../src/migrations/examples/001_create_users_table';
import createRolesTable from '../src/migrations/examples/002_create_roles_table';

async function migrationsExample() {
  const db = new DBCore();

  try {
    // Initialize database
    await db.initialize();
    console.log('✅ Database connected');

    // Create migration manager
    const migrationManager = new MigrationManager(db.getDatabase());

    // Register migrations
    migrationManager.registerMany([
      createUsersTable,
      createRolesTable,
    ]);

    // Check migration status
    console.log('\n📊 Migration Status:');
    const status = await migrationManager.status();
    console.log('Executed migrations:', status.executed);
    console.log('Pending migrations:', status.pending);

    // Run pending migrations
    if (status.pending.length > 0) {
      console.log('\n⬆️  Running pending migrations...');
      await migrationManager.up();
      console.log('✅ Migrations completed');
    } else {
      console.log('\n✅ No pending migrations');
    }

    // Example: Rollback last migration
    // console.log('\n⬇️  Rolling back last migration...');
    // await migrationManager.down();
    // console.log('✅ Rollback completed');

    // Example: Reset all migrations
    // console.log('\n🔄 Resetting all migrations...');
    // await migrationManager.reset();
    // console.log('✅ Reset completed');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
    console.log('\n✅ Database disconnected');
  }
}

// Run the example
if (require.main === module) {
  migrationsExample().catch(console.error);
}

export default migrationsExample;
