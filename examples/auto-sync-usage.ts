import { DBCore } from '../src';

/**
 * Example: Using Auto-Sync Feature
 * Demonstrates automatic database creation and schema synchronization
 */

async function autoSyncExample() {
  console.log('🔄 Auto-Sync Example\n');

  // Create DBCore instance with auto-sync enabled
  const db = new DBCore(undefined, undefined, { autoSync: true });

  try {
    // Initialize with database creation and schema sync
    console.log('1️⃣  Initializing with auto-sync...');
    await db.initialize({
      ensureDatabase: true,  // Create database if it doesn't exist
      syncSchema: true,       // Automatically create all tables
    });
    console.log('✅ Database and schema ready!\n');

    // Check existing tables
    console.log('2️⃣  Checking existing tables...');
    const tables = await db.getExistingTables();
    console.log(`   Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`   - ${table}`));
    console.log('');

    // Check if schema is up to date
    console.log('3️⃣  Checking schema status...');
    const isUpToDate = await db.isSchemaUpToDate();
    console.log(`   Schema is ${isUpToDate ? '✅ up to date' : '⚠️  outdated'}\n`);

    // Test inserting data into tenant table
    console.log('4️⃣  Testing data insertion...');
    const tenant = await db.queryOne(`
      INSERT INTO tenants (name, slug, is_active)
      VALUES ($1, $2, $3)
      RETURNING *
    `, ['Test Organization', 'test-org', true]);
    console.log('   Created tenant:', tenant);

    // Test querying
    const allTenants = await db.queryMany('SELECT * FROM tenants');
    console.log(`   Total tenants: ${allTenants.length}\n`);

    console.log('✅ Auto-sync example completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

/**
 * Example: Manual Schema Sync
 */
async function manualSyncExample() {
  console.log('\n🔧 Manual Schema Sync Example\n');

  const db = new DBCore();

  try {
    // Initialize without auto-sync
    console.log('1️⃣  Initializing without auto-sync...');
    await db.initialize();

    // Manually sync schema later
    console.log('2️⃣  Manually syncing schema...');
    await db.syncSchema();
    console.log('✅ Schema synchronized!\n');

    // Check tables
    const tables = await db.getExistingTables();
    console.log(`   Tables: ${tables.length} found\n`);

    console.log('✅ Manual sync example completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

/**
 * Example: Production Setup with Schema Check
 */
async function productionExample() {
  console.log('\n🏭 Production Example\n');

  const db = new DBCore();

  try {
    console.log('1️⃣  Initializing...');
    await db.initialize();

    // In production, check if schema needs update
    console.log('2️⃣  Checking schema status...');
    const isUpToDate = await db.isSchemaUpToDate();
    
    if (!isUpToDate) {
      console.log('⚠️  Schema is outdated!');
      console.log('   Run migrations or sync schema manually');
      
      // In production, you might want to prevent app startup
      // throw new Error('Schema is not up to date');
    } else {
      console.log('✅ Schema is up to date');
    }

    // Show available tables
    const tables = await db.getExistingTables();
    console.log(`\n📊 Available tables: ${tables.length}`);
    console.log('   ' + tables.join(', '));

    console.log('\n✅ Production check completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

// Run examples
async function main() {
  console.log('═'.repeat(60));
  console.log('  DB-Core Auto-Sync Examples');
  console.log('═'.repeat(60));

  // Choose which example to run
  const example = process.argv[2] || 'auto';

  switch (example) {
    case 'auto':
      await autoSyncExample();
      break;
    case 'manual':
      await manualSyncExample();
      break;
    case 'production':
      await productionExample();
      break;
    case 'all':
      await autoSyncExample();
      await manualSyncExample();
      await productionExample();
      break;
    default:
      console.log(`\n❌ Unknown example: ${example}`);
      console.log('\nUsage: node dist/examples/auto-sync-usage.js [auto|manual|production|all]');
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
