import { DBCore, CacheInvalidationManager, CacheKeyBuilder } from '../src';

/**
 * Cache Invalidation Examples
 * Demonstrates different cache invalidation strategies
 */

// ===================================================================
// Example 1: Current Implementation (Broad Invalidation)
// ===================================================================
async function broadInvalidationExample() {
  console.log('\n📊 Example 1: Broad Invalidation (Current)\n');

  const db = new DBCore();
  await db.initialize();

  try {
    // Step 1: Fetch and cache users
    console.log('1️⃣  Fetching users (cache miss)...');
    const users1 = await db.table('users')
      .select('id', 'username', 'email')
      .withCache(3600, 'users')
      .get();
    console.log(`   ✅ Fetched ${users1.length} users from DB and cached`);

    // Step 2: Fetch again (cache hit)
    console.log('\n2️⃣  Fetching users again (cache hit)...');
    const users2 = await db.table('users')
      .select('id', 'username', 'email')
      .withCache(3600, 'users')
      .get();
    console.log(`   ✅ Retrieved ${users2.length} users from cache (fast!)`);

    // Step 3: Update a user
    console.log('\n3️⃣  Updating user with ID 1...');
    await db.table('users')
      .where('id', '=', 1)
      .update({ full_name: 'John Updated' });
    console.log('   ✅ User updated');
    console.log('   🗑️  Cache automatically invalidated (ALL user caches)');

    // Step 4: Fetch again (cache miss - had to fetch fresh)
    console.log('\n4️⃣  Fetching users again (cache miss)...');
    const users3 = await db.table('users')
      .select('id', 'username', 'email')
      .withCache(3600, 'users')
      .get();
    console.log(`   ✅ Fetched ${users3.length} users from DB (fresh data)`);
    console.log('   ℹ️  Note: ALL user caches were cleared, even unrelated ones');

  } finally {
    await db.close();
  }
}

// ===================================================================
// Example 2: Granular Invalidation
// ===================================================================
async function granularInvalidationExample() {
  console.log('\n📊 Example 2: Granular Invalidation\n');

  const db = new DBCore();
  await db.initialize();

  try {
    const cache = db.getCache();
    if (!cache) {
      console.log('⚠️  Cache not available, skipping example');
      return;
    }

    const invalidationManager = new CacheInvalidationManager(cache);

    // Cache multiple users individually
    console.log('1️⃣  Caching users individually...');
    await cache.set('query:users:1', JSON.stringify({ id: 1, name: 'Alice' }), 3600);
    await cache.set('query:users:2', JSON.stringify({ id: 2, name: 'Bob' }), 3600);
    await cache.set('query:users:3', JSON.stringify({ id: 3, name: 'Charlie' }), 3600);
    console.log('   ✅ Cached users 1, 2, and 3');

    // Update only user 1
    console.log('\n2️⃣  Updating user 1...');
    await db.table('users').where('id', '=', 1).update({ name: 'Alice Updated' });
    
    // Granular invalidation - only user 1
    await invalidationManager.invalidate({
      strategy: 'granular',
      tableName: 'users',
      affectedIds: [1],
      cachePrefix: 'query',
    });
    console.log('   ✅ Invalidated only user 1 cache');

    // Check caches
    const user1 = await cache.get('query:users:1');
    const user2 = await cache.get('query:users:2');
    const user3 = await cache.get('query:users:3');

    console.log('\n3️⃣  Checking caches:');
    console.log(`   User 1: ${user1 ? '❌ Cleared' : '✅ Cleared'}`);
    console.log(`   User 2: ${user2 ? '✅ Still cached' : '❌ Cleared'}`);
    console.log(`   User 3: ${user3 ? '✅ Still cached' : '❌ Cleared'}`);
    console.log('\n   💡 Only affected cache was invalidated!');

  } finally {
    await db.close();
  }
}

// ===================================================================
// Example 3: TTL-Based Invalidation
// ===================================================================
async function ttlBasedExample() {
  console.log('\n📊 Example 3: TTL-Based Invalidation\n');

  const db = new DBCore();
  await db.initialize();

  try {
    console.log('1️⃣  Setting different TTLs for different data types:\n');

    // Real-time data - Short TTL
    console.log('   🔴 Real-time data (notifications): 30 seconds');
    const notifications = await db.table('notifications')
      .withCache(30, 'notifications')  // 30 seconds
      .get();

    // Frequently updated data - Medium TTL
    console.log('   🟡 Frequently updated (user profiles): 5 minutes');
    const users = await db.table('users')
      .withCache(300, 'users')  // 5 minutes
      .get();

    // Rarely changed data - Long TTL
    console.log('   🟢 Rarely changed (categories): 1 hour');
    const categories = await db.table('property_types')
      .withCache(3600, 'types')  // 1 hour
      .get();

    console.log('\n2️⃣  How it works:');
    console.log('   • Short TTL data expires quickly → Fresh data');
    console.log('   • Long TTL data stays cached → Better performance');
    console.log('   • No manual invalidation needed!');

    console.log('\n💡 Guidelines:');
    console.log('   • Volatile data: 5-60 seconds');
    console.log('   • Normal data: 5-30 minutes');
    console.log('   • Static data: 1-24 hours');

  } finally {
    await db.close();
  }
}

// ===================================================================
// Example 4: Versioned Cache
// ===================================================================
async function versionedCacheExample() {
  console.log('\n📊 Example 4: Versioned Cache\n');

  const db = new DBCore();
  await db.initialize();

  try {
    const cache = db.getCache();
    if (!cache) {
      console.log('⚠️  Cache not available, skipping example');
      return;
    }

    const invalidationManager = new CacheInvalidationManager(cache);
    const keyBuilder = new CacheKeyBuilder(cache);

    // Version 1 cache
    console.log('1️⃣  Creating version 1 cache...');
    const v1Key = await keyBuilder.buildVersionedKey('users', 'query-hash-123');
    await cache.set(v1Key, JSON.stringify([{ id: 1, name: 'Alice' }]), 3600);
    console.log(`   ✅ Cached with key: ${v1Key}`);

    // Update data and increment version
    console.log('\n2️⃣  Updating data and incrementing version...');
    await db.table('users').where('id', '=', 1).update({ name: 'Alice Updated' });
    const newVersion = await invalidationManager.versionedInvalidation('users');
    console.log(`   ✅ Version incremented to: ${newVersion}`);

    // Version 2 cache
    console.log('\n3️⃣  Creating version 2 cache...');
    const v2Key = await keyBuilder.buildVersionedKey('users', 'query-hash-123');
    await cache.set(v2Key, JSON.stringify([{ id: 1, name: 'Alice Updated' }]), 3600);
    console.log(`   ✅ Cached with key: ${v2Key}`);

    console.log('\n💡 Benefits:');
    console.log('   • No cache deletion needed');
    console.log('   • Old caches naturally expire');
    console.log('   • Version tracking for audits');

  } finally {
    await db.close();
  }
}

// ===================================================================
// Example 5: Tag-Based Invalidation
// ===================================================================
async function tagBasedExample() {
  console.log('\n📊 Example 5: Tag-Based Invalidation\n');

  const db = new DBCore();
  await db.initialize();

  try {
    const cache = db.getCache();
    if (!cache) {
      console.log('⚠️  Cache not available, skipping example');
      return;
    }

    const invalidationManager = new CacheInvalidationManager(cache);
    const keyBuilder = new CacheKeyBuilder(cache);

    console.log('1️⃣  Creating tagged caches...');
    
    // Cache user data with tags
    const userData = JSON.stringify({ id: 123, name: 'Alice' });
    await cache.set('query:user:123', userData, 3600);
    await keyBuilder.registerTaggedCache('query:user:123', ['user', 'user:123', 'tenant:5'], 'query');
    console.log('   ✅ User cache with tags: [user, user:123, tenant:5]');

    // Cache order data with tags
    const orderData = JSON.stringify({ id: 456, userId: 123 });
    await cache.set('query:order:456', orderData, 3600);
    await keyBuilder.registerTaggedCache('query:order:456', ['order', 'user:123', 'tenant:5'], 'query');
    console.log('   ✅ Order cache with tags: [order, user:123, tenant:5]');

    // Cache product data with different tags
    const productData = JSON.stringify({ id: 789, name: 'Product' });
    await cache.set('query:product:789', productData, 3600);
    await keyBuilder.registerTaggedCache('query:product:789', ['product', 'tenant:5'], 'query');
    console.log('   ✅ Product cache with tags: [product, tenant:5]');

    // Invalidate by tag
    console.log('\n2️⃣  Invalidating caches with tag "user:123"...');
    await invalidationManager.invalidate({
      strategy: 'tag-based',
      tableName: '',
      tags: ['user:123'],
      cachePrefix: 'query',
    });

    // Check results
    const user = await cache.get('query:user:123');
    const order = await cache.get('query:order:456');
    const product = await cache.get('query:product:789');

    console.log('\n3️⃣  Results:');
    console.log(`   User cache: ${user ? '❌ Still there' : '✅ Cleared'}`);
    console.log(`   Order cache: ${order ? '❌ Still there' : '✅ Cleared'}`);
    console.log(`   Product cache: ${product ? '✅ Still there' : '❌ Cleared'}`);

    console.log('\n💡 Use cases:');
    console.log('   • Invalidate all caches for a user');
    console.log('   • Invalidate all caches for a tenant');
    console.log('   • Invalidate related caches across tables');

  } finally {
    await db.close();
  }
}

// ===================================================================
// Example 6: Real-World Service Pattern
// ===================================================================
async function realWorldServiceExample() {
  console.log('\n📊 Example 6: Real-World Service Pattern\n');

  const db = new DBCore();
  await db.initialize();

  try {
    const cache = db.getCache();
    if (!cache) {
      console.log('⚠️  Cache not available, skipping example');
      return;
    }

    const invalidationManager = new CacheInvalidationManager(cache);

    /**
     * User Service with Smart Caching
     */
    class UserService {
      // Read operations - Use cache
      async getUser(id: number) {
        const cacheKey = `user:${id}`;
        
        // Try cache first
        const cached = await cache!.get(cacheKey);
        if (cached) {
          console.log(`   📦 Cache HIT for user ${id}`);
          return JSON.parse(cached);
        }

        console.log(`   💾 Cache MISS for user ${id} - fetching from DB`);
        const user = await db.table('users')
          .where('id', '=', id)
          .first();

        if (user) {
          await cache!.set(cacheKey, JSON.stringify(user), 300); // 5 min
        }

        return user;
      }

      async getAllUsers() {
        return db.table('users')
          .withCache(300, 'users:list')  // 5 min
          .get();
      }

      // Write operations - Invalidate cache
      async updateUser(id: number, data: any) {
        console.log(`   ✏️  Updating user ${id}`);
        
        await db.table('users')
          .where('id', '=', id)
          .update(data);

        // Granular invalidation
        await invalidationManager.invalidate({
          strategy: 'granular',
          tableName: 'users',
          affectedIds: [id],
          cachePrefix: 'user',
        });

        console.log(`   🗑️  Cache invalidated for user ${id}`);
      }

      async deleteUser(id: number) {
        console.log(`   ❌ Deleting user ${id}`);
        
        await db.table('users')
          .where('id', '=', id)
          .delete();

        await invalidationManager.invalidate({
          strategy: 'granular',
          tableName: 'users',
          affectedIds: [id],
          cachePrefix: 'user',
        });

        console.log(`   🗑️  Cache invalidated for user ${id}`);
      }
    }

    const userService = new UserService();

    console.log('1️⃣  First read (cache miss):');
    await userService.getUser(1);

    console.log('\n2️⃣  Second read (cache hit):');
    await userService.getUser(1);

    console.log('\n3️⃣  Update user:');
    await userService.updateUser(1, { full_name: 'Updated Name' });

    console.log('\n4️⃣  Read after update (cache miss):');
    await userService.getUser(1);

    console.log('\n💡 This pattern ensures:');
    console.log('   ✅ Fast reads from cache');
    console.log('   ✅ No stale data after updates');
    console.log('   ✅ Granular invalidation');
    console.log('   ✅ Production-ready');

  } finally {
    await db.close();
  }
}

// ===================================================================
// Main Function
// ===================================================================
async function main() {
  console.log('═'.repeat(70));
  console.log('  Cache Invalidation Strategies - Examples');
  console.log('═'.repeat(70));

  const example = process.argv[2] || 'all';

  try {
    switch (example) {
      case 'broad':
        await broadInvalidationExample();
        break;

      case 'granular':
        await granularInvalidationExample();
        break;

      case 'ttl':
        await ttlBasedExample();
        break;

      case 'versioned':
        await versionedCacheExample();
        break;

      case 'tags':
        await tagBasedExample();
        break;

      case 'service':
        await realWorldServiceExample();
        break;

      case 'all':
        await broadInvalidationExample();
        await granularInvalidationExample();
        await ttlBasedExample();
        await versionedCacheExample();
        await tagBasedExample();
        await realWorldServiceExample();
        break;

      default:
        console.log(`\n❌ Unknown example: ${example}`);
        console.log('\nUsage: node dist/examples/cache-invalidation-example.js [example]');
        console.log('\nAvailable examples:');
        console.log('  • broad      - Broad invalidation (current)');
        console.log('  • granular   - Granular invalidation');
        console.log('  • ttl        - TTL-based invalidation');
        console.log('  • versioned  - Versioned cache keys');
        console.log('  • tags       - Tag-based invalidation');
        console.log('  • service    - Real-world service pattern');
        console.log('  • all        - Run all examples');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n' + '═'.repeat(70));
}

main().catch(console.error);
