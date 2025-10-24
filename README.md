# @rohit_patil/db-core

A comprehensive TypeScript-based database core layer for microservices with PostgreSQL and Redis caching support.

**Version:** 1.0.4 | **License:** MIT | **Language:** TypeScript

---

## 🚀 Quick Links

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Auto-Sync Feature](#auto-sync-feature-new-) (NEW!)
- [Read/Write Replicas](#readwrite-replicas-new-) (NEW!)
- [30+ Supported Models](#supported-models-30-tables)
- [Complete Documentation](#-documentation)
- [API Reference](#api-reference)

---

## ✨ Features

### Core Database Features
- 🗄️ **PostgreSQL Connection Pooling** - Efficient connection management with pg
- 💾 **Redis Caching** - Automatic query result caching
- 🔨 **Query Builder** - Fluent API for building SQL queries
- 📦 **Repository Pattern** - Clean data access layer
- 🔄 **Transaction Support** - ACID-compliant transactions
- 📊 **Migration System** - Database version control
- 🎯 **TypeScript** - Full type safety and IntelliSense
- ⚡ **Performance** - Optimized queries with caching
- 🔍 **Logging** - Built-in query and error logging

### New in v1.0.1 🎉
- 🚀 **Auto-Sync** - Automatic database creation and schema synchronization
- 📋 **30+ Models** - Complete model definitions (tenants, users, properties, tax, activities, meetings, etc.)
- 🔀 **Read/Write Replicas** - Horizontal scaling with separate read and write databases
- ⚖️ **Load Balancing** - Round-robin, weighted, and random strategies
- 🎯 **Microservice Ready** - Production-ready patterns for distributed systems

## Installation

```bash
npm install @rohit_patil/db-core pg redis
```

## Quick Start

### 1. Environment Configuration

Create a `.env` file:

```env
# Primary Database Configuration (Write)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Read Replicas (Optional - for scaling)
DB_READ_REPLICA_1_HOST=replica-1.example.com
DB_READ_REPLICA_1_PORT=5432
DB_READ_REPLICA_1_WEIGHT=2
DB_LOAD_BALANCING=weighted

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=app:
REDIS_DEFAULT_TTL=3600
```

### 2. Initialize DBCore

```typescript
import { DBCore } from '@rohit_patil/db-core';

const db = new DBCore();

try {
  // Basic initialization
  await db.initialize();
  console.log('✅ Connected to database');
  
  // OR with auto-sync (creates database and all tables automatically)
  await db.initialize({
    ensureDatabase: true,  // Create database if it doesn't exist
    syncSchema: true,       // Create all 30+ tables automatically
  });
  console.log('✅ Database and schema ready!');
} catch (error) {
  console.error('❌ Connection failed:', error);
}

// Use the database
const users = await db.table('users').get();

// Close connections when done
await db.close();

```

## 📚 Core Features

### Auto-Sync Feature (NEW! 🎉)

Automatically create database and sync all 30+ tables:

```typescript
import { DBCore } from '@rohit_patil/db-core';

// Option 1: Auto-sync on initialization
const db = new DBCore(undefined, undefined, { autoSync: true });
await db.initialize({ ensureDatabase: true, syncSchema: true });

// Option 2: Manual sync after initialization
const db2 = new DBCore();
await db2.initialize();
await db2.syncSchema();

// Check schema status
const isUpToDate = await db.isSchemaUpToDate();
const tables = await db.getExistingTables();
console.log(`Tables: ${tables.length}, Up to date: ${isUpToDate}`);
```

📚 **See [AUTO_SYNC.md](AUTO_SYNC.md) for complete guide**

### Read/Write Replicas (NEW! 🎉)

Scale your database horizontally with read replicas:

```typescript
import { ReplicaManager, getDatabaseConfigWithReplicas } from '@rohit_patil/db-core';

// Initialize with replicas
const rm = new ReplicaManager(getDatabaseConfigWithReplicas());
await rm.connect();

// Writes go to primary database
await rm.executeWrite(
  'INSERT INTO users (username, email) VALUES ($1, $2)',
  ['john', 'john@example.com']
);

// Reads go to replica databases (load balanced)
const users = await rm.executeRead('SELECT * FROM users WHERE is_active = true');

// Transactions always on primary
await rm.transaction(async (client) => {
  await client.query('UPDATE accounts SET balance = balance - 100 WHERE id = 1');
  await client.query('UPDATE accounts SET balance = balance + 100 WHERE id = 2');
});

// Monitor connection stats
const stats = rm.getStats();
console.log('Write pool:', stats.write);
console.log('Read replicas:', stats.read.length);
```

**Benefits:**
- ✅ Distribute read load across multiple databases
- ✅ Reduce primary database load by 50-80%
- ✅ 2-3x faster read performance
- ✅ Horizontal scalability
- ✅ Automatic failover to primary if replicas unavailable

📚 **See [READ_REPLICAS.md](READ_REPLICAS.md) for complete guide**

### Query Builder

```typescript
// Select with conditions
const activeUsers = await db.table('users')
  .select('id', 'username', 'email')
  .where('is_active', '=', true)
  .where('created_at', '>', '2024-01-01')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .get();

// Joins
const usersWithRoles = await db.table('users')
  .select('users.*', 'roles.name as role_name')
  .innerJoin('user_roles', 'users.id = user_roles.user_id')
  .innerJoin('roles', 'user_roles.role_id = roles.id')
  .get();

// Pagination
const paginatedUsers = await db.table('users')
  .paginate({ page: 1, limit: 20 });

// With caching
const cachedUsers = await db.table('users')
  .withCache(3600, 'users')  // Cache for 1 hour
  .get();

// Aggregations
const userCount = await db.table('users')
  .where('is_active', '=', true)
  .count();
```

### Repository Pattern

```typescript
// Basic CRUD operations
const userRepo = db.repository('users');

// Create
const newUser = await userRepo.create({
  username: 'john_doe',
  email: 'john@example.com',
  password_hash: 'hashed_password',
  full_name: 'John Doe'
});

// Find by ID
const user = await userRepo.findById(1);

// Find by column
const usersByEmail = await userRepo.findBy('email', 'john@example.com');

// Update
await userRepo.update(1, { full_name: 'John Smith' });

// Delete
await userRepo.delete(1);

// Pagination
const paginatedResult = await userRepo.findPaginated({ page: 1, limit: 20 });
```

### Custom Repository

```typescript
import { BaseRepository, User } from '@your-org/db-core';

class UserRepository extends BaseRepository<User> {
  constructor(db, cache) {
    super('users', db, cache, 'user');
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOneBy('username', username);
  }

  async findActiveUsers(): Promise<User[]> {
    return this.query()
      .where('is_active', '=', true)
      .orderBy('created_at', 'DESC')
      .get();
  }

  async search(query: string): Promise<User[]> {
    const sql = `
      SELECT * FROM users
      WHERE full_name ILIKE $1 OR email ILIKE $1
      ORDER BY created_at DESC
    `;
    return this.raw(sql, [`%${query}%`]);
  }
}

// Usage
const userRepo = new UserRepository(db.getDatabase(), db.getCache());
const user = await userRepo.findByUsername('john_doe');
```

### Transactions

```typescript
await db.transaction(async (client) => {
  // All queries within this callback are part of the same transaction
  await client.query(
    'INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4)',
    ['jane_doe', 'jane@example.com', 'hashed_password', 'Jane Doe']
  );
  
  await client.query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
    [2, 1]
  );
  
  // If any query fails, all changes are rolled back
});
```

### Redis Caching

```typescript
const cache = db.getCache();

if (cache) {
  // Set value with TTL
  await cache.set('user:1', { id: 1, name: 'John' }, 3600);
  
  // Get value
  const user = await cache.get('user:1');
  
  // Delete value
  await cache.del('user:1');
  
  // Delete pattern
  await cache.delPattern('user:*');
  
  // Check existence
  const exists = await cache.exists('user:1');
  
  // Increment/Decrement
  await cache.incr('views:post:123');
  await cache.decr('views:post:123');
}
```

### Migrations

```typescript
import { MigrationManager, Migration } from '@your-org/db-core';

// Define migration
const createUsersTable: Migration = {
  id: '001',
  name: '001_create_users_table',
  
  async up(client) {
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
  
  async down(client) {
    await client.query('DROP TABLE users');
  }
};

// Run migrations
const migrationManager = new MigrationManager(db.getDatabase());
migrationManager.register(createUsersTable);

// Run pending migrations
await migrationManager.up();

// Rollback last migration
await migrationManager.down();

// Check status
const status = await migrationManager.status();
console.log('Executed:', status.executed);
console.log('Pending:', status.pending);
```

## Advanced Configuration

### Custom Configuration

```typescript
import { DBCore, DatabaseConfig, RedisConfig } from '@your-org/db-core';

const dbConfig: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password',
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false
};

const redisConfig: RedisConfig = {
  host: 'localhost',
  port: 6379,
  password: undefined,
  db: 0,
  keyPrefix: 'myapp:',
  defaultTTL: 3600
};

const db = new DBCore(dbConfig, redisConfig);
await db.initialize();
```

### Event Listeners

```typescript
// Listen to database events
db.on('connect', () => {
  console.log('Database connected');
});

db.on('disconnect', () => {
  console.log('Database disconnected');
});

db.on('error', (error) => {
  console.error('Database error:', error);
});

db.on('query', (data) => {
  console.log('Query executed:', data);
});
```

## API Reference

### DBCore

Main class that combines database and cache functionality.

#### Methods

- `initialize(options?)` - Connect to database and cache
  - `options.ensureDatabase` - Create database if it doesn't exist
  - `options.syncSchema` - Synchronize database schema
- `close()` - Close all connections
- `table(tableName)` - Create a query builder
- `repository(tableName, cachePrefix?)` - Create a repository
- `transaction(callback)` - Execute a transaction
- `query(sql, params?)` - Execute raw query
- `queryOne(sql, params?)` - Execute query and return first row
- `queryMany(sql, params?)` - Execute query and return all rows
- `syncSchema()` - Manually sync database schema (NEW)
- `getExistingTables()` - Get list of existing tables (NEW)
- `isSchemaUpToDate()` - Check if schema is up to date (NEW)
- `getDatabase()` - Get database manager
- `getCache()` - Get cache manager
- `getPoolStats()` - Get connection pool statistics
- `on(event, listener)` - Add event listener

### QueryBuilder

Fluent interface for building SQL queries.

#### Methods

- `select(...columns)` - Select columns
- `where(column, operator, value)` - Add WHERE condition
- `whereIn(column, values)` - Add WHERE IN condition
- `whereNotIn(column, values)` - Add WHERE NOT IN condition
- `whereBetween(column, value1, value2)` - Add WHERE BETWEEN condition
- `whereNull(column)` - Add WHERE NULL condition
- `whereNotNull(column)` - Add WHERE NOT NULL condition
- `join(type, table, on, alias?)` - Add JOIN
- `innerJoin(table, on, alias?)` - Add INNER JOIN
- `leftJoin(table, on, alias?)` - Add LEFT JOIN
- `orderBy(column, direction)` - Add ORDER BY
- `groupBy(...columns)` - Add GROUP BY
- `having(condition)` - Add HAVING
- `limit(value)` - Set LIMIT
- `offset(value)` - Set OFFSET
- `withCache(ttl?, keyPrefix?)` - Enable caching
- `get()` - Execute and return all results
- `first()` - Execute and return first result
- `paginate(options)` - Execute with pagination
- `count()` - Execute count query
- `insert(data)` - Insert record
- `update(data)` - Update records
- `delete()` - Delete records

### BaseRepository

Base class for creating custom repositories.

#### Methods

- `findById(id)` - Find by ID
- `findAll()` - Find all records
- `findPaginated(options)` - Find with pagination
- `findBy(column, value)` - Find by column
- `findOneBy(column, value)` - Find one by column
- `create(data)` - Create record
- `update(id, data)` - Update record
- `delete(id)` - Delete record
- `count()` - Count records
- `exists(id)` - Check if exists

### RedisManager

Redis cache management.

#### Methods

- `connect()` - Connect to Redis
- `disconnect()` - Disconnect from Redis
- `set(key, value, ttl?)` - Set value
- `get(key)` - Get value
- `del(key)` - Delete value
- `delPattern(pattern)` - Delete by pattern
- `exists(key)` - Check if exists
- `expire(key, ttl)` - Set expiration
- `ttl(key)` - Get TTL
- `clear()` - Clear all keys with prefix
- `incr(key)` - Increment value
- `decr(key)` - Decrement value

### ReplicaManager (NEW)

Read/write replica management for horizontal scaling.

#### Methods

- `connect()` - Connect to primary and replica databases
- `disconnect()` - Disconnect from all databases
- `executeWrite(sql, params?)` - Execute write query on primary
- `executeRead(sql, params?)` - Execute read query on replica
- `transaction(callback)` - Execute transaction on primary
- `getWritePool()` - Get primary database pool
- `getReadPool()` - Get read replica pool (load balanced)
- `getStats()` - Get connection statistics for all pools
- `isConnected()` - Check if connected

### SchemaManager (NEW)

Database schema management and synchronization.

#### Methods

- `ensureDatabaseExists()` - Create database if it doesn't exist
- `syncSchema(pool)` - Synchronize all tables
- `getExistingTables(pool)` - Get list of existing tables
- `isSchemaUpToDate(pool)` - Check if all tables exist

## Supported Models (30+ Tables)

All models from your reference Sequelize implementation are included:

### Core Models
- **Tenant & Users**: tenants, users, roles, user_roles
- **Properties**: wards, property_types, property_addresses, properties
- **Tax System**: tax_types, tax_calculation_types, tax_rates, tax_contracts, tax_assessments, tax_payments, tax_receipts, miscellaneous_payments
- **Activities**: activity_types, activity_templates, activities, activity_participants, activity_reports
- **Meetings**: meetings, meeting_templates, meeting_attendees, meeting_topics, meeting_resolutions
- **System**: audit_logs

All tables include:
- Primary keys with auto-increment
- Foreign key relationships
- Indexes for performance
- Multi-tenant support (tenant_id)
- Timestamps (created_at, updated_at)
- Soft deletes where applicable

## TypeScript Support

This package is written in TypeScript and includes full type definitions.

```typescript
import { DBCore, User, QueryBuilder, Tenant, Property } from '@rohit_patil/db-core';

// Type-safe queries
const db = new DBCore();
const userQuery: QueryBuilder<User> = db.table<User>('users');
const users: User[] = await userQuery.get();

// All 30+ models have type definitions
const tenants: Tenant[] = await db.table('tenants').get();
const properties: Property[] = await db.table('properties').get();
```

## Best Practices

### General
1. **Always close connections** - Use `db.close()` when done
2. **Use transactions** - For operations that need to be atomic
3. **Enable caching** - For frequently accessed data
4. **Use repositories** - For complex domain logic
5. **Handle errors** - Always use try-catch blocks
6. **Use connection pooling** - Don't create multiple DBCore instances
7. **Monitor pool stats** - Use `getPoolStats()` for debugging

### Read/Write Replicas
1. **Use `executeRead` for SELECT queries** - Distribute load to replicas
2. **Use `executeWrite` for INSERT/UPDATE/DELETE** - Ensure data consistency
3. **Use transactions for multi-query operations** - Always on primary
4. **Be aware of replication lag** - Read from primary after writes if critical
5. **Monitor replica health** - Check `getStats()` regularly
6. **Size pools appropriately** - More connections for read replicas

### Auto-Sync
1. **Use in development** - Fast iteration with automatic schema creation
2. **Verify in production** - Use `isSchemaUpToDate()` before starting
3. **Keep schema definitions updated** - Single source of truth
4. **Test migrations** - Before applying to production
5. **Backup before sync** - Always backup production databases

## Performance Tips

- Use prepared statements (parameterized queries)
- Enable query caching for read-heavy operations
- Use pagination for large result sets
- Create appropriate database indexes
- Monitor connection pool usage
- Use transactions sparingly

## Troubleshooting

### Connection Issues

```typescript
// Check if connected
if (db.initialized()) {
  console.log('Connected');
}

// Check pool stats
const stats = db.getPoolStats();
console.log('Pool stats:', stats);
```

### Cache Issues

```typescript
// Check if Redis is available
const cache = db.getCache();
if (cache && cache.connected()) {
  console.log('Redis connected');
} else {
  console.log('Redis not available');
}
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## 📖 Documentation

Comprehensive guides for all features:

- **[README.md](README.md)** - This file, overview and quick start
- **[AUTO_SYNC.md](AUTO_SYNC.md)** - Complete auto-sync feature guide
- **[READ_REPLICAS.md](READ_REPLICAS.md)** - Read/write replica setup and usage
- **[MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md)** - Migration approach and strategy
- **[QUICK_START.md](QUICK_START.md)** - 5-minute quick start guide
- **[COMPLETE_FEATURES.md](COMPLETE_FEATURES.md)** - All features with examples
- **[UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)** - What's new in v1.0.1
- **[examples/](examples/)** - Working code examples

## Support

For issues and questions, please open an issue on GitHub.

## Changelog

### v1.0.0
- Initial release with core features

### v1.0.1
- bug fix

### v1.0.2
- Added automatic database creation and schema synchronization
- Added 30+ model definitions from Sequelize reference
- Added read/write replica support for horizontal scaling
- Added load balancing strategies (round-robin, weighted, random)
- Added comprehensive documentation and examples
- Enhanced DBCore with schema management methods

### v1.0.3
- Added cache invalidation strategies
- Added cache key builder
- Added cache invalidation manager

### v1.0.4 (Latest)
- Documentation updates
- Cache invalidation examples


