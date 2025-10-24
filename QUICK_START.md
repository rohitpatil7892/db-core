# Quick Start Guide

Get started with @your-org/db-core in 5 minutes!

## Step 1: Installation

```bash
cd /path/to/db-core
npm install
```

## Step 2: Setup PostgreSQL

Make sure you have PostgreSQL installed and running:

```bash
# Using Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Or install locally
brew install postgresql  # macOS
sudo apt-get install postgresql  # Ubuntu
```

## Step 3: Setup Redis (Optional)

Redis is optional but recommended for caching:

```bash
# Using Docker
docker run --name redis -p 6379:6379 -d redis

# Or install locally
brew install redis  # macOS
sudo apt-get install redis  # Ubuntu
```

## Step 4: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379
```

## Step 5: Build the Module

```bash
npm run build
```

## Step 6: Run Examples

### Basic Usage

```bash
# Create database first
createdb mydb

# Run the example
node dist/examples/basic-usage.js
```

### Migrations

```bash
node dist/examples/migrations-usage.js
```

### Custom Repository

```bash
node dist/examples/custom-repository.js
```

## Step 7: Use in Your Microservice

### Install in your project

```bash
# If publishing to npm
npm install @your-org/db-core

# Or link locally for development
cd /path/to/db-core
npm link

cd /path/to/your-microservice
npm link @your-org/db-core
```

### Basic Integration

```typescript
import { DBCore } from '@your-org/db-core';

async function main() {
  const db = new DBCore();
  
  try {
    await db.initialize();
    console.log('✅ Connected to database');
    
    // Your microservice code here
    const users = await db.table('users').get();
    console.log('Users:', users);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}

main();
```

## Common Patterns for Microservices

### 1. Singleton Pattern

Create a singleton instance:

```typescript
// database.ts
import { DBCore } from '@your-org/db-core';

let dbInstance: DBCore | null = null;

export async function getDatabase(): Promise<DBCore> {
  if (!dbInstance) {
    dbInstance = new DBCore();
    await dbInstance.initialize();
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
```

### 2. Express Integration

```typescript
import express from 'express';
import { getDatabase } from './database';

const app = express();

// Middleware to add db to request
app.use(async (req, res, next) => {
  req.db = await getDatabase();
  next();
});

// Routes
app.get('/users', async (req, res) => {
  try {
    const users = await req.db.table('users').get();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 3. Repository Layer

```typescript
// repositories/UserRepository.ts
import { BaseRepository } from '@your-org/db-core';
import { User } from '../types';

export class UserRepository extends BaseRepository<User> {
  constructor(db, cache) {
    super('users', db, cache, 'user');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy('email', email);
  }

  async findActive(): Promise<User[]> {
    return this.query()
      .where('is_active', '=', true)
      .get();
  }
}

// services/UserService.ts
import { UserRepository } from '../repositories/UserRepository';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async getActiveUsers() {
    return this.userRepo.findActive();
  }

  async getUserByEmail(email: string) {
    return this.userRepo.findByEmail(email);
  }
}
```

## Testing

### Unit Tests

```typescript
import { DBCore } from '@your-org/db-core';

describe('UserRepository', () => {
  let db: DBCore;

  beforeAll(async () => {
    db = new DBCore();
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  it('should create a user', async () => {
    const repo = db.repository('users');
    const user = await repo.create({
      username: 'testuser',
      email: 'test@example.com',
    });
    
    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
  });
});
```

## Production Deployment

### Environment Variables

Set these in your production environment:

```bash
NODE_ENV=production
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=production_db
DB_USER=db_user
DB_PASSWORD=secure_password
DB_POOL_MAX=20
DB_SSL=true

REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
```

### Health Check Endpoint

```typescript
app.get('/health', async (req, res) => {
  try {
    const db = await getDatabase();
    const isConnected = db.initialized();
    const poolStats = db.getPoolStats();
    
    res.json({
      status: 'healthy',
      database: {
        connected: isConnected,
        pool: poolStats,
      },
      redis: {
        connected: db.getCache()?.connected() || false,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

## Troubleshooting

### Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d mydb

# Test Redis connection
redis-cli ping
```

### Build Issues

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Port Conflicts

```bash
# Check if ports are in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

## Next Steps

- Read the [full documentation](README.md)
- Check out [examples](examples/)
- Set up [migrations](src/migrations/examples/)
- Create custom repositories for your domain models
- Add connection pooling monitoring
- Implement caching strategies

## Support

For issues or questions:
- Check the [README](README.md)
- Review [examples](examples/)
- Open an issue on GitHub
