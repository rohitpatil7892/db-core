# Read/Write Replica Support

## 🎯 Overview

The db-core module now supports **read/write replicas** for horizontal database scaling. This allows you to:

- ✅ **Scale Read Operations** - Distribute read queries across multiple replica databases
- ✅ **Improve Performance** - Reduce load on primary database
- ✅ **High Availability** - Automatic failover to primary if replica fails
- ✅ **Load Balancing** - Multiple strategies (round-robin, weighted, random)
- ✅ **Transparent Routing** - Automatic query routing to appropriate database

## 📊 Architecture

```
┌─────────────┐
│ Application │
└──────┬──────┘
       │
       ├─── Write Operations ──→ Primary Database (Write)
       │
       └─── Read Operations ───→ ┌─ Replica 1 (Read)
                                 ├─ Replica 2 (Read)
                                 └─ Replica 3 (Read)
```

### How It Works

1. **Write Operations** → Always go to primary (master) database
2. **Read Operations** → Distributed across read replicas
3. **Transactions** → Always execute on primary database
4. **Automatic Failover** → If replicas unavailable, uses primary

## 🚀 Quick Start

### 1. Environment Configuration

```bash
# Primary Database (Write)
DB_HOST=primary-db.example.com
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MAX=20
DB_POOL_MIN=5

# Read Replica 1
DB_READ_REPLICA_1_HOST=replica-1.example.com
DB_READ_REPLICA_1_PORT=5432
DB_READ_REPLICA_1_DATABASE=mydb
DB_READ_REPLICA_1_USER=postgres
DB_READ_REPLICA_1_PASSWORD=password
DB_READ_REPLICA_1_POOL_MAX=15
DB_READ_REPLICA_1_WEIGHT=2

# Read Replica 2
DB_READ_REPLICA_2_HOST=replica-2.example.com
DB_READ_REPLICA_2_PORT=5432
DB_READ_REPLICA_2_DATABASE=mydb
DB_READ_REPLICA_2_USER=postgres
DB_READ_REPLICA_2_PASSWORD=password
DB_READ_REPLICA_2_POOL_MAX=15
DB_READ_REPLICA_2_WEIGHT=1

# Load Balancing Strategy
DB_LOAD_BALANCING=weighted  # or: round-robin, random
```

### 2. Basic Usage

```typescript
import { ReplicaManager, getDatabaseConfigWithReplicas } from '@rohit_patil/db-core';

// Initialize
const config = getDatabaseConfigWithReplicas();
const replicaManager = new ReplicaManager(config);
await replicaManager.connect();

// Write operation (goes to primary)
await replicaManager.executeWrite(
  'INSERT INTO users (username, email) VALUES ($1, $2)',
  ['john', 'john@example.com']
);

// Read operation (goes to replica)
const result = await replicaManager.executeRead(
  'SELECT * FROM users WHERE is_active = true'
);

// Transaction (always on primary)
await replicaManager.transaction(async (client) => {
  await client.query('UPDATE accounts SET balance = balance - 100 WHERE id = 1');
  await client.query('UPDATE accounts SET balance = balance + 100 WHERE id = 2');
});

// Close connections
await replicaManager.disconnect();
```

## 📋 Configuration Options

### Load Balancing Strategies

#### 1. Round-Robin (Default)
Distributes requests evenly across all replicas in sequence.

```bash
DB_LOAD_BALANCING=round-robin
```

**When to use:**
- Equal capacity replicas
- Predictable load distribution
- Simple setup

#### 2. Weighted
Distributes based on replica weights (higher weight = more traffic).

```bash
DB_LOAD_BALANCING=weighted
DB_READ_REPLICA_1_WEIGHT=2  # Gets ~67% of traffic
DB_READ_REPLICA_2_WEIGHT=1  # Gets ~33% of traffic
```

**When to use:**
- Different capacity replicas
- Some replicas more powerful than others
- Fine-tuned load distribution

#### 3. Random
Randomly selects a replica for each request.

```bash
DB_LOAD_BALANCING=random
```

**When to use:**
- Unpredictable load patterns
- Simple implementation
- Testing scenarios

### Connection Pool Settings

```bash
# Per-replica pool configuration
DB_READ_REPLICA_1_POOL_MAX=15    # Maximum connections
DB_READ_REPLICA_1_POOL_MIN=2     # Minimum connections
DB_READ_REPLICA_1_SSL=true       # Enable SSL
DB_READ_REPLICA_1_WEIGHT=1       # Load balancing weight
```

## 💡 Usage Patterns

### Pattern 1: Microservice Singleton

```typescript
// database.ts
import { ReplicaManager, getDatabaseConfigWithReplicas } from '@rohit_patil/db-core';

let replicaManager: ReplicaManager | null = null;

export async function getReplicaManager(): Promise<ReplicaManager> {
  if (!replicaManager) {
    const config = getDatabaseConfigWithReplicas();
    replicaManager = new ReplicaManager(config);
    await replicaManager.connect();
    
    console.log('✅ Database replicas connected');
    const stats = replicaManager.getStats();
    console.log(`   Write pool: ${stats.write?.total} connections`);
    console.log(`   Read replicas: ${stats.read.length}`);
  }
  return replicaManager;
}

export function getRM(): ReplicaManager {
  if (!replicaManager) throw new Error('Database not initialized');
  return replicaManager;
}

export async function closeReplicaManager(): Promise<void> {
  if (replicaManager) {
    await replicaManager.disconnect();
    replicaManager = null;
  }
}
```

### Pattern 2: Express Integration

```typescript
// server.ts
import express from 'express';
import { getReplicaManager, getRM } from './database';

const app = express();

// Initialize on startup
app.listen(3000, async () => {
  await getReplicaManager();
  console.log('🚀 Server running with read replicas');
});

// Read-heavy endpoint
app.get('/users', async (req, res) => {
  try {
    const rm = getRM();
    const result = await rm.executeRead(
      'SELECT id, username, email FROM users WHERE is_active = true'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write endpoint
app.post('/users', async (req, res) => {
  try {
    const rm = getRM();
    const result = await rm.executeWrite(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [req.body.username, req.body.email]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction endpoint
app.post('/transfer', async (req, res) => {
  try {
    const rm = getRM();
    await rm.transaction(async (client) => {
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
        [req.body.amount, req.body.from]
      );
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
        [req.body.amount, req.body.to]
      );
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const rm = getRM();
    const stats = rm.getStats();
    
    res.json({
      status: 'healthy',
      database: {
        write: stats.write,
        readReplicas: stats.read.length,
        loadBalancing: stats.loadBalancing,
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Pattern 3: Repository Layer

```typescript
// repositories/UserRepository.ts
import { getRM } from '../database';

export class UserRepository {
  // Read operations use replicas
  async findAll() {
    const rm = getRM();
    const result = await rm.executeRead('SELECT * FROM users');
    return result.rows;
  }

  async findById(id: number) {
    const rm = getRM();
    const result = await rm.executeRead(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Write operations use primary
  async create(userData: any) {
    const rm = getRM();
    const result = await rm.executeWrite(
      'INSERT INTO users (username, email, full_name) VALUES ($1, $2, $3) RETURNING *',
      [userData.username, userData.email, userData.full_name]
    );
    return result.rows[0];
  }

  async update(id: number, userData: any) {
    const rm = getRM();
    const result = await rm.executeWrite(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING *',
      [userData.username, userData.email, id]
    );
    return result.rows[0];
  }

  // Complex operations use transactions
  async transferOwnership(fromUserId: number, toUserId: number, propertyId: number) {
    const rm = getRM();
    await rm.transaction(async (client) => {
      await client.query(
        'UPDATE properties SET owner_id = $1 WHERE id = $2',
        [toUserId, propertyId]
      );
      await client.query(
        'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
        [fromUserId, 'TRANSFER_PROPERTY', JSON.stringify({ propertyId, toUserId })]
      );
    });
  }
}
```

## 📊 Monitoring & Statistics

```typescript
const rm = getRM();
const stats = rm.getStats();

console.log('Database Statistics:');
console.log('Write Pool:', stats.write);
// { total: 20, idle: 15, waiting: 0 }

console.log('Read Replicas:', stats.read);
// [
//   { replica: 1, total: 15, idle: 10, waiting: 0, weight: 2 },
//   { replica: 2, total: 15, idle: 12, waiting: 0, weight: 1 }
// ]

console.log('Load Balancing:', stats.loadBalancing);
// 'weighted'
```

## 🏗️ Database Setup

### PostgreSQL Replication Setup

#### 1. Configure Primary Database

```bash
# postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_size = 16MB
```

#### 2. Create Replication User

```sql
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'password';
```

#### 3. Configure Authentication

```bash
# pg_hba.conf
host    replication     replicator      replica-ip/32       md5
```

#### 4. Setup Replica

```bash
# On replica server
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -P -v
```

#### 5. Configure Replica

```bash
# postgresql.conf on replica
hot_standby = on
```

## ⚡ Performance Benefits

### Without Replicas
```
Primary Database: 100% reads + 100% writes = Overloaded
```

### With 2 Replicas
```
Primary: 100% writes + 0% reads
Replica 1: 50% reads
Replica 2: 50% reads
```

**Result:** 
- Primary load reduced by ~50-80%
- Read query performance improved
- Better write throughput
- Horizontal scalability

## 🎯 Best Practices

### 1. Query Routing

```typescript
// ✅ DO: Use executeRead for SELECT queries
await rm.executeRead('SELECT * FROM users');

// ✅ DO: Use executeWrite for INSERT/UPDATE/DELETE
await rm.executeWrite('INSERT INTO users ...');

// ✅ DO: Use transactions for multi-query operations
await rm.transaction(async (client) => {
  await client.query('UPDATE ...');
  await client.query('INSERT ...');
});

// ❌ DON'T: Use executeRead for write operations
await rm.executeRead('INSERT INTO users ...'); // Wrong!
```

### 2. Replication Lag Awareness

```typescript
// After write, if immediate read is critical, use write pool
await rm.executeWrite('INSERT INTO users ...');

// This might not see the new data immediately (replication lag)
await rm.executeRead('SELECT * FROM users WHERE id = ?');

// Solution: Read from primary after writes if needed
const writePool = rm.getWritePool();
await writePool.query('SELECT * FROM users WHERE id = ?');
```

### 3. Connection Pool Sizing

```bash
# Size based on workload
DB_POOL_MAX=20              # Primary (writes + critical reads)
DB_READ_REPLICA_1_POOL_MAX=30  # Replica (high read volume)
DB_READ_REPLICA_2_POOL_MAX=30  # Replica (high read volume)
```

### 4. Health Monitoring

```typescript
setInterval(async () => {
  const rm = getRM();
  const stats = rm.getStats();
  
  // Monitor pool usage
  if (stats.write && stats.write.idle < 2) {
    console.warn('⚠️  Write pool running low on connections');
  }
  
  stats.read.forEach((replica, index) => {
    if (replica.idle < 2) {
      console.warn(`⚠️  Replica ${index + 1} running low on connections`);
    }
  });
}, 60000);
```

## 🔧 Troubleshooting

### Issue: Stale Data

**Cause:** Replication lag  
**Solution:** Read from primary for time-sensitive data

```typescript
// For time-sensitive reads
const writePool = rm.getWritePool();
await writePool.query('SELECT ...');
```

### Issue: Connection Errors

**Cause:** Replica unavailable  
**Solution:** System auto-fails to primary, but monitor logs

```typescript
// Logs will show:
// "Read replica failed, using primary"
```

### Issue: Unbalanced Load

**Cause:** Improper weights or strategy  
**Solution:** Adjust weights or change strategy

```bash
# Increase weight for more powerful replica
DB_READ_REPLICA_1_WEIGHT=3
DB_READ_REPLICA_2_WEIGHT=1
```

## 📖 API Reference

### ReplicaManager

```typescript
class ReplicaManager {
  constructor(config: DatabaseConfigWithReplicas);
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Query execution
  executeWrite<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  executeRead<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  
  // Pool access
  getWritePool(): Pool;
  getReadPool(): Pool;
  
  // Monitoring
  getStats(): ReplicaStats;
}
```

## 🎊 Summary

Read/write replicas provide:

✅ **Horizontal Scaling** - Add replicas as load increases  
✅ **Better Performance** - Distribute read queries  
✅ **High Availability** - Automatic failover  
✅ **Flexibility** - Multiple load balancing strategies  
✅ **Easy Integration** - Simple API, minimal code changes  

**Your microservices are now ready for production-scale workloads!** 🚀
