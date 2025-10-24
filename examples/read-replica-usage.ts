import { ReplicaManager, getDatabaseConfigWithReplicas } from '../src';

/**
 * Example: Using Read/Write Replicas
 * Demonstrates horizontal scaling with read replicas
 */

async function basicReplicaExample() {
  console.log('📊 Basic Read Replica Example\n');

  // Option 1: Load from environment variables
  const config = getDatabaseConfigWithReplicas();
  
  // Option 2: Manual configuration
  /*
  const config = {
    write: {
      host: 'primary-db.example.com',
      port: 5432,
      database: 'mydb',
      user: 'postgres',
      password: 'password',
      max: 20,
      min: 5,
    },
    read: [
      {
        host: 'replica-1.example.com',
        port: 5432,
        database: 'mydb',
        user: 'postgres',
        password: 'password',
        max: 15,
        weight: 2, // Higher weight = more traffic
      },
      {
        host: 'replica-2.example.com',
        port: 5432,
        database: 'mydb',
        user: 'postgres',
        password: 'password',
        max: 15,
        weight: 1,
      },
    ],
    loadBalancing: 'weighted', // or 'round-robin' or 'random'
  };
  */

  const replicaManager = new ReplicaManager(config);

  try {
    // Connect to all databases
    console.log('1️⃣  Connecting to databases...');
    await replicaManager.connect();
    console.log('✅ Connected to write DB and read replicas\n');

    // Write operation (goes to primary)
    console.log('2️⃣  Performing write operation...');
    await replicaManager.executeWrite(`
      INSERT INTO tenants (name, slug, is_active)
      VALUES ($1, $2, $3)
    `, ['Test Org', 'test-org', true]);
    console.log('✅ Write completed (on primary database)\n');

    // Read operation (goes to replica)
    console.log('3️⃣  Performing read operation...');
    const result = await replicaManager.executeRead('SELECT * FROM tenants');
    console.log(`✅ Read completed (from replica): ${result.rows.length} rows\n`);

    // Transaction (always on primary)
    console.log('4️⃣  Performing transaction...');
    await replicaManager.transaction(async (client) => {
      await client.query('UPDATE tenants SET is_active = true WHERE id = 1');
      await client.query('INSERT INTO audit_logs (tenant_id, action) VALUES (1, $1)', ['UPDATE']);
    });
    console.log('✅ Transaction completed (on primary)\n');

    // Get statistics
    console.log('5️⃣  Connection statistics:');
    const stats = replicaManager.getStats();
    console.log('   Write Pool:', stats.write);
    console.log('   Read Pools:', stats.read);
    console.log('   Load Balancing:', stats.loadBalancing);

    console.log('\n✅ Example completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await replicaManager.disconnect();
  }
}

/**
 * Example: High-Performance Read Operations
 */
async function highPerformanceReads() {
  console.log('\n📈 High-Performance Reads Example\n');

  const config = getDatabaseConfigWithReplicas();
  const replicaManager = new ReplicaManager(config);

  try {
    await replicaManager.connect();

    // Simulate multiple concurrent reads
    console.log('Running 10 concurrent read queries...');
    
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        replicaManager.executeRead('SELECT * FROM users WHERE is_active = true')
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    console.log(`✅ Completed 10 queries in ${duration}ms`);
    console.log(`   Average: ${(duration / 10).toFixed(2)}ms per query`);
    console.log(`   Total rows: ${results.reduce((sum, r) => sum + r.rows.length, 0)}`);

    const stats = replicaManager.getStats();
    console.log('\n📊 Final stats:');
    console.log(`   Write pool: ${stats.write?.idle}/${stats.write?.total} idle`);
    stats.read.forEach((replica, index) => {
      console.log(`   Replica ${index + 1}: ${replica.idle}/${replica.total} idle (weight: ${replica.weight})`);
    });

  } finally {
    await replicaManager.disconnect();
  }
}

/**
 * Example: Load Balancing Strategies
 */
async function loadBalancingExample() {
  console.log('\n⚖️  Load Balancing Strategies Example\n');

  // Round-robin strategy
  console.log('1️⃣  Round-Robin Strategy:');
  console.log('   Distributes requests evenly across all replicas');
  console.log('   Request 1 → Replica 1');
  console.log('   Request 2 → Replica 2');
  console.log('   Request 3 → Replica 1');
  console.log('   ...\n');

  // Weighted strategy
  console.log('2️⃣  Weighted Strategy:');
  console.log('   Distributes based on replica weights');
  console.log('   Replica 1 (weight: 2) gets ~67% of traffic');
  console.log('   Replica 2 (weight: 1) gets ~33% of traffic\n');

  // Random strategy
  console.log('3️⃣  Random Strategy:');
  console.log('   Randomly selects a replica for each request');
  console.log('   Good for unpredictable load patterns\n');

  console.log('Set via environment: DB_LOAD_BALANCING=round-robin|weighted|random');
}

/**
 * Example: Microservice Integration
 */
async function microserviceIntegration() {
  console.log('\n🏗️  Microservice Integration Example\n');

  console.log(`
// Singleton pattern for microservices
import { ReplicaManager, getDatabaseConfigWithReplicas } from '@rohit_patil/db-core';

let replicaManager: ReplicaManager | null = null;

export async function getReplicaManager(): Promise<ReplicaManager> {
  if (!replicaManager) {
    const config = getDatabaseConfigWithReplicas();
    replicaManager = new ReplicaManager(config);
    await replicaManager.connect();
  }
  return replicaManager;
}

// In your routes/controllers
app.get('/users', async (req, res) => {
  const rm = await getReplicaManager();
  
  // Read from replica
  const result = await rm.executeRead('SELECT * FROM users');
  res.json(result.rows);
});

app.post('/users', async (req, res) => {
  const rm = await getReplicaManager();
  
  // Write to primary
  const result = await rm.executeWrite(
    'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
    [req.body.username, req.body.email]
  );
  res.json(result.rows[0]);
});
  `);
}

// Main function to run examples
async function main() {
  console.log('═'.repeat(60));
  console.log('  DB-Core Read/Write Replica Examples');
  console.log('═'.repeat(60));

  const example = process.argv[2] || 'basic';

  switch (example) {
    case 'basic':
      await basicReplicaExample();
      break;
    case 'performance':
      await highPerformanceReads();
      break;
    case 'balancing':
      await loadBalancingExample();
      break;
    case 'microservice':
      await microserviceIntegration();
      break;
    case 'all':
      await basicReplicaExample();
      await highPerformanceReads();
      await loadBalancingExample();
      await microserviceIntegration();
      break;
    default:
      console.log(`\n❌ Unknown example: ${example}`);
      console.log('\nUsage: node dist/examples/read-replica-usage.js [basic|performance|balancing|microservice|all]');
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
