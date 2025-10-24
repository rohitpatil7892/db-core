# @your-org/db-core

A comprehensive TypeScript-based database core layer for microservices with PostgreSQL and Redis caching support.

## Features

- 🚀 **PostgreSQL Connection Pooling** - Efficient connection management with pg
- 💾 **Redis Caching** - Built-in caching layer for query optimization
- 🔨 **Query Builder** - Fluent API for building SQL queries
- 📦 **Repository Pattern** - Clean abstraction over database operations
- 🔄 **Transaction Support** - ACID-compliant transaction handling
- 🔀 **Migration System** - Database schema version control
- 📝 **TypeScript First** - Full type safety and IntelliSense support
- ⚡ **Performance Optimized** - Automatic query caching and optimization
- 🎯 **Microservice Ready** - Designed for distributed systems

## Installation

```bash
npm install @your-org/db-core pg redis
```

## Quick Start

### 1. Environment Configuration

Create a `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

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
import { DBCore } from '@your-org/db-core';

const db = new DBCore();

// Initialize connections
await db.initialize();

// Use the database
const users = await db.table('users').get();

// Close connections when done
await db.close();
```

## Usage Examples

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

- `initialize()` - Connect to database and cache
- `close()` - Close all connections
- `table(tableName)` - Create a query builder
- `repository(tableName, cachePrefix?)` - Create a repository
- `transaction(callback)` - Execute a transaction
- `query(sql, params?)` - Execute raw query
- `queryOne(sql, params?)` - Execute query and return first row
- `queryMany(sql, params?)` - Execute query and return all rows
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

## TypeScript Support

This package is written in TypeScript and includes full type definitions.

```typescript
import { DBCore, User, QueryBuilder } from '@your-org/db-core';

// Type-safe queries
const db = new DBCore();
const userQuery: QueryBuilder<User> = db.table<User>('users');
const users: User[] = await userQuery.get();
```

## Best Practices

1. **Always close connections** - Use `db.close()` when done
2. **Use transactions** - For operations that need to be atomic
3. **Enable caching** - For frequently accessed data
4. **Use repositories** - For complex domain logic
5. **Handle errors** - Always use try-catch blocks
6. **Use connection pooling** - Don't create multiple DBCore instances
7. **Monitor pool stats** - Use `getPoolStats()` for debugging

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

## Support

For issues and questions, please open an issue on GitHub.
