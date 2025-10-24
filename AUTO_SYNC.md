# Auto-Sync Feature Guide

## Overview

The Auto-Sync feature automatically creates your database and synchronizes all table schemas based on the reference Sequelize models. This ensures your database structure is always up-to-date without manual migration management.

## Features

✅ **Automatic Database Creation** - Creates the database if it doesn't exist  
✅ **Schema Synchronization** - Creates all 30+ tables automatically  
✅ **Foreign Key Management** - Handles table dependencies correctly  
✅ **Index Creation** - Automatically creates all performance indexes  
✅ **Multi-Tenant Support** - All tables include tenant_id for multi-tenancy  
✅ **Audit Trail** - Includes audit logs and soft delete support  

## Supported Tables

### Core Tables (30+)
- **Tenant & User Management**: tenants, users, roles, user_roles
- **Property System**: wards, property_types, property_addresses, properties
- **Tax System**: tax_types, tax_calculation_types, tax_rates, tax_contracts, tax_assessments, tax_payments, tax_receipts, miscellaneous_payments
- **Activity System**: activity_types, activity_templates, activities, activity_participants, activity_reports
- **Meeting System**: meetings, meeting_templates, meeting_attendees, meeting_topics, meeting_resolutions
- **System Tables**: audit_logs

## Usage

### Option 1: Auto-Sync on Initialize

```typescript
import { DBCore } from '@rohit_patil/db-core';

const db = new DBCore(undefined, undefined, { autoSync: true });

// This will create database and all tables automatically
await db.initialize({
  ensureDatabase: true,  // Create database if missing
  syncSchema: true,       // Sync all tables
});
```

### Option 2: Manual Sync

```typescript
import { DBCore } from '@rohit_patil/db-core';

const db = new DBCore();

// Initialize first
await db.initialize();

// Then sync schema manually when needed
await db.syncSchema();
```

### Option 3: Check Before Sync

```typescript
import { DBCore } from '@rohit_patil/db-core';

const db = new DBCore();
await db.initialize();

// Check if schema is up to date
const isUpToDate = await db.isSchemaUpToDate();

if (!isUpToDate) {
  console.log('Syncing schema...');
  await db.syncSchema();
}
```

## Configuration

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=postgres
DB_PASSWORD=your_password

# For production, ensure database exists first
# or use ensureDatabase: true option
```

### Constructor Options

```typescript
new DBCore(
  dbConfig?,      // Database config (optional)
  redisConfig?,   // Redis config (optional)
  options?: {
    autoSync?: boolean  // Enable auto-sync on initialize
  }
)
```

### Initialize Options

```typescript
await db.initialize({
  ensureDatabase?: boolean,  // Create DB if not exists (default: false)
  syncSchema?: boolean,      // Sync all tables (default: false or autoSync value)
});
```

## Examples

### Complete Setup (New Project)

```typescript
import { DBCore } from '@rohit_patil/db-core';

async function setupDatabase() {
  const db = new DBCore();
  
  try {
    // Create database and all tables
    await db.initialize({
      ensureDatabase: true,
      syncSchema: true,
    });
    
    console.log('✅ Database ready!');
    
    // Start using it
    const tenant = await db.queryOne(`
      INSERT INTO tenants (name, slug, is_active)
      VALUES ('My Org', 'my-org', true)
      RETURNING *
    `);
    
    console.log('Created tenant:', tenant);
    
  } finally {
    await db.close();
  }
}

setupDatabase();
```

### Microservice Startup

```typescript
import { DBCore } from '@rohit_patil/db-core';

let dbInstance: DBCore | null = null;

export async function initDatabase() {
  if (dbInstance) return dbInstance;
  
  dbInstance = new DBCore();
  
  // In production, verify schema but don't auto-create
  if (process.env.NODE_ENV === 'production') {
    await dbInstance.initialize();
    
    const isUpToDate = await dbInstance.isSchemaUpToDate();
    if (!isUpToDate) {
      throw new Error('Database schema is outdated! Run migrations.');
    }
  } else {
    // In development, auto-sync everything
    await dbInstance.initialize({
      ensureDatabase: true,
      syncSchema: true,
    });
  }
  
  return dbInstance;
}

export function getDatabase(): DBCore {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }
  return dbInstance;
}
```

### Health Check Endpoint

```typescript
app.get('/health', async (req, res) => {
  try {
    const db = getDatabase();
    const isInitialized = db.initialized();
    const tables = await db.getExistingTables();
    const isUpToDate = await db.isSchemaUpToDate();
    
    res.json({
      status: 'healthy',
      database: {
        connected: isInitialized,
        tables: tables.length,
        schemaUpToDate: isUpToDate,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

## Schema Details

### Table Creation Order

Tables are created in dependency order to respect foreign key constraints:

1. **Base Tables**: tenants
2. **User Tables**: users, roles, user_roles
3. **Property Tables**: wards, property_types, property_addresses, properties
4. **Tax Tables**: tax_types, tax_calculation_types, tax_rates, tax_contracts, tax_assessments, tax_receipts, tax_payments, miscellaneous_payments
5. **Activity Tables**: activity_types, activity_templates, activities, activity_participants, activity_reports
6. **Meeting Tables**: meetings, meeting_templates, meeting_attendees, meeting_topics, meeting_resolutions
7. **System Tables**: audit_logs

### Key Features Per Table

- **Primary Keys**: Auto-incrementing SERIAL
- **Foreign Keys**: ON DELETE CASCADE where appropriate
- **Indexes**: Performance indexes on frequently queried columns
- **Timestamps**: created_at, updated_at (where applicable)
- **Soft Deletes**: deleted_at columns for auditable records
- **Multi-Tenancy**: tenant_id in all tables

## API Methods

### Schema Management

```typescript
// Sync schema (create tables)
await db.syncSchema();

// Get existing tables
const tables = await db.getExistingTables();
console.log(tables); // ['tenants', 'users', ...]

// Check if schema is up to date
const isUpToDate = await db.isSchemaUpToDate();

// Get pool statistics
const stats = db.getPoolStats();
console.log(stats); // { total, idle, waiting }
```

## Best Practices

### Development

```typescript
// ✅ Auto-create everything
await db.initialize({
  ensureDatabase: true,
  syncSchema: true,
});
```

### Production

```typescript
// ✅ Verify but don't auto-create
await db.initialize();

const isUpToDate = await db.isSchemaUpToDate();
if (!isUpToDate) {
  // Log warning, alert DevOps, or prevent startup
  console.error('Schema is not up to date!');
}
```

### Testing

```typescript
// ✅ Fresh database for each test suite
beforeAll(async () => {
  testDb = new DBCore(testConfig);
  await testDb.initialize({
    ensureDatabase: true,
    syncSchema: true,
  });
});

afterAll(async () => {
  await testDb.close();
});
```

## Troubleshooting

### Database Permission Issues

```bash
# Error: permission denied to create database
# Solution: Ensure user has CREATEDB privilege
ALTER USER your_user CREATEDB;
```

### Table Already Exists

The sync is idempotent - it uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### Missing Foreign Key Target

Tables are created in the correct order. If you see foreign key errors, it means a required table failed to create. Check logs for the first error.

### Schema Out of Sync

```typescript
// Check which tables are missing
const existing = await db.getExistingTables();
const expected = [
  'tenants', 'users', 'roles', /* ... all 30+ tables ... */
];
const missing = expected.filter(t => !existing.includes(t));
console.log('Missing tables:', missing);

// Sync to fix
await db.syncSchema();
```

## Performance Considerations

- **Initial Sync**: Creating all tables takes ~1-2 seconds
- **Subsequent Runs**: Nearly instant (uses IF NOT EXISTS)
- **Production**: Disable auto-sync, verify schema at startup
- **Indexes**: All performance indexes created automatically

## Migration Strategy

### From Empty Database

```typescript
// Perfect! Just use auto-sync
await db.initialize({ ensureDatabase: true, syncSchema: true });
```

### From Existing Database

```typescript
// Check first, then decide
await db.initialize();

const isUpToDate = await db.isSchemaUpToDate();
if (!isUpToDate) {
  // Option 1: Auto-sync missing tables
  await db.syncSchema();
  
  // Option 2: Use migration system
  // const migrator = new MigrationManager(db);
  // await migrator.up();
}
```

### With Existing Data

Auto-sync is safe! It only creates missing tables and never modifies existing data.

## Security Notes

1. **Production**: Don't give app user CREATEDB privilege
2. **Database Creation**: Use separate admin user with CREATEDB
3. **Schema Sync**: Regular app user only needs CREATE TABLE in public schema
4. **Audit Logs**: Track all database changes

## Support

For issues or questions:
- Check [README.md](README.md) for general documentation
- See [examples/auto-sync-usage.ts](examples/auto-sync-usage.ts) for code examples
- Review [src/schema/SchemaManager.ts](src/schema/SchemaManager.ts) for implementation details

## Version History

- **v1.0.1**: Initial auto-sync feature
  - 30+ tables from reference models
  - Auto database creation
  - Schema verification methods
