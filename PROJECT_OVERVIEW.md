# DB-Core Project Overview

## Summary

A production-ready TypeScript NPM module for handling database operations and Redis caching in microservices architecture.

## Project Structure

```
db-core/
├── src/
│   ├── cache/
│   │   └── RedisManager.ts         # Redis caching functionality
│   ├── config/
│   │   └── index.ts                # Environment configuration
│   ├── database/
│   │   └── DatabaseManager.ts      # PostgreSQL connection pool
│   ├── migrations/
│   │   ├── MigrationManager.ts     # Migration system
│   │   └── examples/               # Example migrations
│   ├── models/
│   │   └── types.ts                # Database model types
│   ├── query/
│   │   └── QueryBuilder.ts         # Fluent query builder
│   ├── repository/
│   │   └── BaseRepository.ts       # Base repository pattern
│   ├── types/
│   │   └── index.ts                # Core type definitions
│   ├── utils/
│   │   └── logger.ts               # Logging utility
│   ├── DBCore.ts                   # Main entry point
│   └── index.ts                    # Module exports
├── examples/
│   ├── basic-usage.ts              # Basic usage examples
│   ├── custom-repository.ts        # Custom repository example
│   └── migrations-usage.ts         # Migration examples
├── scripts/
│   ├── setup.sh                    # Setup script
│   └── test-connection.js          # Connection test utility
├── dist/                           # Compiled JavaScript (generated)
├── package.json                    # Package configuration
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Environment template
├── README.md                       # Full documentation
├── QUICK_START.md                  # Quick start guide
├── CHANGELOG.md                    # Version history
└── LICENSE                         # MIT license
```

## Core Features

### 1. Database Management (`DatabaseManager`)
- PostgreSQL connection pooling with configurable settings
- Query execution with prepared statements
- Transaction support with automatic rollback
- Connection health monitoring
- Event system for database operations

### 2. Redis Caching (`RedisManager`)
- Automatic cache connection management
- Key-value operations with TTL support
- Pattern-based cache invalidation
- Atomic increment/decrement operations
- Graceful fallback when Redis unavailable

### 3. Query Builder (`QueryBuilder`)
- Fluent API for building SQL queries
- Support for:
  - SELECT with column selection
  - WHERE conditions (=, !=, >, <, IN, BETWEEN, NULL, etc.)
  - JOINs (INNER, LEFT, RIGHT, FULL)
  - ORDER BY, GROUP BY, HAVING
  - LIMIT and OFFSET
  - Pagination
  - Aggregations (COUNT, etc.)
- Automatic query result caching
- Cache key generation and invalidation

### 4. Repository Pattern (`BaseRepository`)
- Abstract base class for data access
- Standard CRUD operations
- Automatic cache management
- Support for custom queries
- Type-safe operations

### 5. Migration System (`MigrationManager`)
- Version-controlled schema changes
- Up/down migration support
- Migration status tracking
- Transaction-wrapped migrations
- Automatic migration table creation

### 6. Main Class (`DBCore`)
- Single entry point for all operations
- Connection lifecycle management
- Factory methods for query builders and repositories
- Event-driven architecture
- Pool statistics monitoring

## Key Technologies

- **TypeScript**: Full type safety and IntelliSense
- **PostgreSQL**: Primary database via `pg` library
- **Redis**: Caching layer via `redis` library
- **Node.js**: Runtime environment (18+)

## Configuration

Environment variables (`.env`):
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_KEY_PREFIX=app:
REDIS_DEFAULT_TTL=3600
```

## Usage Patterns

### 1. Singleton Pattern (Recommended for Microservices)
```typescript
let dbInstance: DBCore | null = null;

export async function getDatabase(): Promise<DBCore> {
  if (!dbInstance) {
    dbInstance = new DBCore();
    await dbInstance.initialize();
  }
  return dbInstance;
}
```

### 2. Query Builder
```typescript
const users = await db.table('users')
  .where('is_active', '=', true)
  .orderBy('created_at', 'DESC')
  .get();
```

### 3. Repository Pattern
```typescript
class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string) {
    return this.findOneBy('email', email);
  }
}
```

### 4. Transactions
```typescript
await db.transaction(async (client) => {
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO user_roles ...');
});
```

## Database Schema

Based on the reference schema, the module supports:
- **Users & Authentication**: users, roles, user_roles
- **Tax Management**: tax_types, tax_rates, tax_contracts, tax_assessments, tax_payments
- **Property Management**: properties, property_types, property_addresses, wards
- **Activity Management**: activities, activity_types, activity_templates
- **Notifications**: notifications, notification_types, notification_templates

All tables include:
- Primary keys with SERIAL type
- Foreign key constraints
- Indexes for performance
- Timestamps (created_at, updated_at)
- Triggers for automatic updates

## Development

### Setup
```bash
npm install
npm run build
```

### Testing
```bash
# Test connections
node scripts/test-connection.js

# Run examples
node dist/examples/basic-usage.js
```

### Building
```bash
npm run build       # Compile TypeScript
npm run build:watch # Watch mode
```

### Linting
```bash
npm run lint        # Check code
npm run lint:fix    # Fix issues
```

## Best Practices

1. **Connection Management**
   - Initialize once, use everywhere
   - Always close connections on shutdown
   - Monitor pool statistics

2. **Caching Strategy**
   - Cache frequently read data
   - Use appropriate TTL values
   - Invalidate on writes
   - Handle cache misses gracefully

3. **Query Optimization**
   - Use prepared statements
   - Create appropriate indexes
   - Monitor query performance
   - Use pagination for large datasets

4. **Error Handling**
   - Always use try-catch blocks
   - Log errors with context
   - Implement retry logic for transient failures
   - Provide meaningful error messages

5. **Security**
   - Use parameterized queries
   - Never expose credentials in logs
   - Use SSL for database connections
   - Implement proper authentication

## Performance Considerations

- **Connection Pooling**: Configured with min/max connections
- **Query Caching**: Automatic caching with Redis
- **Prepared Statements**: All queries use parameterization
- **Indexes**: Recommended for frequently queried columns
- **Pagination**: Built-in support to avoid large result sets

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure SSL for database connections
- [ ] Set appropriate pool sizes
- [ ] Enable Redis for caching
- [ ] Set secure passwords
- [ ] Configure logging levels
- [ ] Set up health check endpoints
- [ ] Monitor connection pool stats

### Health Monitoring
```typescript
app.get('/health', async (req, res) => {
  const db = await getDatabase();
  res.json({
    database: db.initialized(),
    pool: db.getPoolStats(),
    redis: db.getCache()?.connected(),
  });
});
```

## Future Enhancements

Potential improvements:
- [ ] Add query logging and metrics
- [ ] Implement read replicas support
- [ ] Add database sharding capabilities
- [ ] Enhance migration CLI tools
- [ ] Add connection retry logic
- [ ] Implement query result streaming
- [ ] Add GraphQL support
- [ ] Create monitoring dashboard

## Support

- **Documentation**: README.md, QUICK_START.md
- **Examples**: `/examples` directory
- **Issues**: Open on project repository
- **Contributing**: Follow contribution guidelines

## License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: October 24, 2024  
**Maintained By**: Your Team
