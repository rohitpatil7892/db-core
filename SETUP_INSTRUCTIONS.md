# Setup Instructions

## ✅ Module Successfully Created!

Your personal NPM module `@your-org/db-core` has been successfully created with full PostgreSQL and Redis support.

## 📦 What's Included

### Core Features
- ✅ PostgreSQL connection pooling with `pg`
- ✅ Redis caching system
- ✅ Fluent query builder API
- ✅ Repository pattern implementation
- ✅ Transaction management
- ✅ Database migration system
- ✅ Full TypeScript support
- ✅ Comprehensive examples

### File Structure
```
db-core/
├── src/                      # Source code (TypeScript)
├── dist/                     # Compiled code (JavaScript) ✅ Built
├── examples/                 # Usage examples
├── scripts/                  # Utility scripts
├── package.json              # Dependencies installed ✅
├── tsconfig.json             # TypeScript config
├── README.md                 # Full documentation
├── QUICK_START.md            # Quick start guide
└── PROJECT_OVERVIEW.md       # Project structure overview
```

## 🚀 Next Steps

### 1. Configure Your Environment

Edit the `.env` file with your database credentials:

```bash
cp .env.example .env
# Then edit .env with your actual credentials
```

### 2. Set Up Your Database

Make sure PostgreSQL is running and create your database:

```bash
# Create database
createdb your_database_name

# Or using psql
psql -U postgres -c "CREATE DATABASE your_database_name;"
```

### 3. Optionally Set Up Redis

If you want caching (recommended):

```bash
# Using Docker
docker run --name redis -p 6379:6379 -d redis

# Or install locally
brew install redis  # macOS
redis-server
```

### 4. Test Your Connection

```bash
node scripts/test-connection.js
```

This will verify your PostgreSQL and Redis connections.

### 5. Try the Examples

```bash
# Basic usage
node dist/examples/basic-usage.js

# Migrations
node dist/examples/migrations-usage.js

# Custom repository
node dist/examples/custom-repository.js
```

## 📚 How to Use in Your Microservices

### Option 1: Publish to NPM (Recommended for Production)

1. **Update package.json** with your organization name:
   ```json
   {
     "name": "@your-org/db-core",
     ...
   }
   ```

2. **Publish to NPM**:
   ```bash
   npm login
   npm publish --access public
   ```

3. **Install in your microservices**:
   ```bash
   npm install @your-org/db-core
   ```

### Option 2: Use npm link (For Development)

1. **Link the module**:
   ```bash
   cd /path/to/db-core
   npm link
   ```

2. **Use in your microservice**:
   ```bash
   cd /path/to/your-microservice
   npm link @your-org/db-core
   ```

### Option 3: Install from Local Path

In your microservice's `package.json`:
```json
{
  "dependencies": {
    "@your-org/db-core": "file:../db-core"
  }
}
```

## 💻 Basic Usage Example

```typescript
import { DBCore } from '@your-org/db-core';

async function main() {
  // Initialize
  const db = new DBCore();
  await db.initialize();

  // Use query builder
  const users = await db.table('users')
    .where('is_active', '=', true)
    .get();

  // Use repository
  const userRepo = db.repository('users');
  const user = await userRepo.findById(1);

  // Use transactions
  await db.transaction(async (client) => {
    await client.query('INSERT INTO ...');
    await client.query('UPDATE ...');
  });

  // Close connection
  await db.close();
}

main();
```

## 🔧 Customization

### 1. Update Database Schema

Your schema is based on the reference material in `refrance material/db/`. To customize:

1. Modify `src/models/types.ts` with your table structures
2. Create migrations in `src/migrations/examples/`
3. Run migrations to update your database

### 2. Create Custom Repositories

```typescript
import { BaseRepository } from '@your-org/db-core';

class UserRepository extends BaseRepository<User> {
  constructor(db, cache) {
    super('users', db, cache, 'user');
  }

  async findByEmail(email: string) {
    return this.findOneBy('email', email);
  }

  // Add more custom methods...
}
```

### 3. Add Custom Migrations

See `src/migrations/examples/` for templates.

## 📖 Documentation

- **README.md**: Complete API documentation
- **QUICK_START.md**: 5-minute quick start
- **PROJECT_OVERVIEW.md**: Architecture and structure
- **Examples**: See `/examples` directory

## 🐛 Troubleshooting

### Build Errors
```bash
rm -rf dist node_modules
npm install
npm run build
```

### Connection Issues
- Check PostgreSQL is running: `psql -U postgres -l`
- Check Redis is running: `redis-cli ping`
- Verify `.env` credentials

### Type Errors
- Ensure TypeScript version matches: `npm ls typescript`
- Clear IDE cache and restart

## 📊 Health Check

Add this to your microservice for monitoring:

```typescript
app.get('/health', async (req, res) => {
  const db = await getDatabase();
  res.json({
    status: 'healthy',
    database: {
      connected: db.initialized(),
      pool: db.getPoolStats(),
    },
    cache: {
      connected: db.getCache()?.connected() || false,
    },
  });
});
```

## 🎯 Recommended Folder Structure for Microservices

```
your-microservice/
├── src/
│   ├── repositories/        # Custom repositories
│   │   └── UserRepository.ts
│   ├── services/            # Business logic
│   │   └── UserService.ts
│   ├── controllers/         # API controllers
│   │   └── UserController.ts
│   ├── routes/              # Express routes
│   │   └── user.routes.ts
│   ├── database.ts          # DB singleton
│   └── server.ts            # Main entry
├── package.json
└── .env
```

## 🔐 Security Best Practices

1. **Never commit `.env` files**
2. **Use environment variables** in production
3. **Enable SSL** for database connections
4. **Use strong passwords**
5. **Implement rate limiting**
6. **Monitor database access**

## 🚢 Production Deployment

Before deploying:

1. ✅ Set `NODE_ENV=production`
2. ✅ Configure proper pool sizes
3. ✅ Enable SSL connections
4. ✅ Set up monitoring
5. ✅ Configure backups
6. ✅ Test failover scenarios

## 📞 Support

- Check documentation in `README.md`
- Review examples in `/examples`
- Read `QUICK_START.md` for quick reference
- See `PROJECT_OVERVIEW.md` for architecture

## 🎉 You're Ready!

Your database core module is ready to be used across all your microservices. Start by:

1. Testing the connection: `node scripts/test-connection.js`
2. Running an example: `node dist/examples/basic-usage.js`
3. Integrating into your first microservice

Happy coding! 🚀
