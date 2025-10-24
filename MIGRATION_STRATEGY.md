# Migration Strategy

## 🎯 Approach

### Phase 1: Initial Deployment (Current)
**Use Auto-Sync** - No migrations needed

```typescript
const db = new DBCore();
await db.initialize({
  ensureDatabase: true,
  syncSchema: true,  // Creates all 30+ tables directly
});
```

**Why?**
- Fresh database with no existing data
- Faster deployment
- No migration history to manage
- Schema is the source of truth

### Phase 2: Production Changes (Future)
**Use Migrations** - Track all schema changes

```typescript
const db = new DBCore();
await db.initialize();  // No auto-sync

// Run migrations
const migrator = new MigrationManager(db);
await migrator.up();
```

**Why?**
- Preserves existing data
- Version-controlled changes
- Rollback capability
- Audit trail of changes

---

## 📋 Current Setup Status

### ✅ What's Ready

1. **SchemaManager** - Initial schema creation (30+ tables)
2. **MigrationManager** - Migration system ready for future use
3. **Auto-Sync** - Development convenience
4. **Schema Verification** - `isSchemaUpToDate()` method

### 🚀 Initial Deployment Checklist

- [x] Schema definitions complete (30+ tables)
- [x] SchemaManager implemented
- [x] Auto-sync feature ready
- [x] Type definitions complete
- [x] Examples provided
- [ ] Deploy to development environment
- [ ] Deploy to staging environment  
- [ ] Deploy to production environment

---

## 🔄 Migration Strategy for Future

### When to Create Migrations

Create a migration when you need to:

1. **Add a new table**
   ```typescript
   // Example: adding notifications table
   ```

2. **Modify existing table**
   ```typescript
   // Example: add column to users table
   ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
   ```

3. **Add/Remove constraints**
   ```typescript
   // Example: add unique constraint
   ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
   ```

4. **Create indexes**
   ```typescript
   // Example: performance index
   CREATE INDEX idx_users_email ON users(email);
   ```

5. **Data migrations**
   ```typescript
   // Example: populate default data
   INSERT INTO roles (name) VALUES ('Admin'), ('User');
   ```

### Migration File Structure

```
src/migrations/
├── 001_initial_schema.ts       (NOT NEEDED - using auto-sync)
├── 002_add_notifications.ts    (FUTURE - when needed)
├── 003_modify_users.ts         (FUTURE - when needed)
└── examples/
    ├── add-column.ts
    ├── create-table.ts
    └── add-index.ts
```

### Creating a Migration (Future)

```typescript
// src/migrations/002_add_notifications.ts
import { Migration } from '../MigrationManager';

export default class AddNotifications implements Migration {
  name = '002_add_notifications';

  async up(db: any): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_notifications_read ON notifications(read);
    `);
  }

  async down(db: any): Promise<void> {
    await db.query(`
      DROP TABLE IF EXISTS notifications;
    `);
  }
}
```

### Running Migrations (Future)

```typescript
// In your application startup
import { DBCore, MigrationManager } from '@rohit_patil/db-core';

async function startup() {
  const db = new DBCore();
  
  // Initialize without auto-sync
  await db.initialize();
  
  // Check if using auto-sync or migrations
  const isUpToDate = await db.isSchemaUpToDate();
  
  if (!isUpToDate) {
    console.log('⚠️  Schema changes detected');
    
    if (process.env.USE_MIGRATIONS === 'true') {
      // Production: Use migrations
      const migrator = new MigrationManager(db);
      const pending = await migrator.getPendingMigrations();
      
      if (pending.length > 0) {
        console.log(`Running ${pending.length} migrations...`);
        await migrator.up();
        console.log('✅ Migrations complete');
      }
    } else {
      // Development: Use auto-sync
      console.log('Running auto-sync...');
      await db.syncSchema();
      console.log('✅ Schema synced');
    }
  }
  
  console.log('✅ Database ready');
}
```

---

## 🎯 Deployment Strategy

### Development Environment
```typescript
// Use auto-sync for fast iteration
const db = new DBCore(undefined, undefined, { autoSync: true });
await db.initialize({ 
  ensureDatabase: true, 
  syncSchema: true 
});
```

### Staging Environment
```typescript
// Option 1: Auto-sync (if data is disposable)
await db.initialize({ syncSchema: true });

// Option 2: Migrations (if testing migration process)
await db.initialize();
const migrator = new MigrationManager(db);
await migrator.up();
```

### Production Environment
```typescript
// Use migrations only
await db.initialize();

// Verify schema
const isUpToDate = await db.isSchemaUpToDate();
if (!isUpToDate) {
  throw new Error('Schema is not up to date! Run migrations.');
}

// Or run migrations automatically (with caution)
const migrator = new MigrationManager(db);
await migrator.up();
```

---

## 📊 Decision Matrix

| Scenario | Use Auto-Sync | Use Migrations |
|----------|---------------|----------------|
| **Initial deployment** | ✅ YES | ❌ No |
| **Development** | ✅ YES | ❌ No |
| **Testing (fresh DB)** | ✅ YES | ❌ No |
| **Production (existing data)** | ❌ No | ✅ YES |
| **Schema changes in prod** | ❌ No | ✅ YES |
| **Rollback needed** | ❌ No | ✅ YES |
| **Audit trail required** | ❌ No | ✅ YES |

---

## 🔐 Best Practices

### Initial Deployment
1. ✅ Use auto-sync to create all tables
2. ✅ Test thoroughly in development
3. ✅ Deploy to staging with same approach
4. ✅ Deploy to production
5. ✅ Take database backup
6. ✅ Document the initial schema version

### After Initial Deployment
1. ✅ Create migrations for all changes
2. ✅ Test migrations in development
3. ✅ Test migrations in staging
4. ✅ Review migration before production
5. ✅ Take backup before production migration
6. ✅ Monitor migration in production
7. ✅ Keep rollback plan ready

---

## 🚨 Important Notes

### Current Status (Initial Phase)
- **No migrations directory needed yet**
- **No migration history to track**
- **Schema in `SchemaManager.ts` is the source of truth**
- **Auto-sync creates everything fresh**

### After First Production Deployment
- **Stop using auto-sync in production**
- **Start creating migrations for changes**
- **Keep SchemaManager as reference**
- **MigrationManager becomes active**

### Transition Point
The transition from auto-sync to migrations happens **after your first production deployment**. Until then, you're in "initial setup" mode.

---

## 📝 Workflow Examples

### Current: Initial Setup
```bash
# Development
1. Update SchemaManager.ts with table definitions
2. npm run build
3. Run app with auto-sync enabled
4. Tables created automatically

# Staging
1. Deploy application
2. Auto-sync creates all tables
3. Test functionality

# Production (First Time)
1. Deploy application  
2. Auto-sync creates all tables
3. Insert initial data
4. 🎯 From now on, use migrations for changes!
```

### Future: Schema Changes
```bash
# Development
1. Create migration file (e.g., 002_add_field.ts)
2. Test migration: migrator.up()
3. Test rollback: migrator.down()
4. Commit migration file

# Staging
1. Deploy application
2. Run migrations automatically or manually
3. Verify changes

# Production
1. Take database backup
2. Deploy application
3. Run migrations
4. Verify changes
5. Monitor application
```

---

## 🎓 Summary

**Right Now:**
- ✅ Use auto-sync for initial deployment
- ✅ No migration files needed
- ✅ Schema definitions in SchemaManager.ts
- ✅ Fast and simple

**After Production Deployment:**
- ✅ Switch to migrations for changes
- ✅ MigrationManager is already ready
- ✅ Version-controlled schema changes
- ✅ Safe and auditable

**You're Already Set Up Correctly!**
- SchemaManager: ✅ Ready for initial deployment
- MigrationManager: ✅ Ready for future changes
- Auto-Sync: ✅ Perfect for current phase
- Documentation: ✅ Complete

---

## 🎯 Next Actions

### Now (Initial Deployment Phase)
1. ✅ Test auto-sync in development
2. ✅ Deploy to staging with auto-sync
3. ✅ Deploy to production with auto-sync
4. ✅ Document the deployed schema version

### Later (Post-Deployment Phase)
1. Create first migration when needed
2. Test migration process in development
3. Deploy migration to staging
4. Deploy migration to production
5. Continue with migration-based workflow

---

**Your current approach is perfect for initial deployment! The migration system is ready when you need it.** 🚀
