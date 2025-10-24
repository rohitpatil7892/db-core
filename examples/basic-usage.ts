/**
 * Basic usage example of @your-org/db-core
 */

import { DBCore } from '../src';

async function basicUsageExample() {
  // Initialize DBCore with default configuration from environment variables
  const db = new DBCore();
  
  try {
    // Connect to database and Redis
    await db.initialize();
    console.log('✅ Database connected');

    // Example 1: Using Query Builder
    console.log('\n📝 Example 1: Query Builder');
    const users = await db.table('users')
      .select('id', 'username', 'email')
      .where('is_active', '=', true)
      .orderBy('created_at', 'DESC')
      .limit(10)
      .get();
    
    console.log('Active users:', users);

    // Example 2: Using Repository Pattern
    console.log('\n📝 Example 2: Repository Pattern');
    const userRepo = db.repository('users');
    
    // Create a new user
    const newUser = await userRepo.create({
      username: 'john_doe',
      email: 'john@example.com',
      password_hash: 'hashed_password',
      full_name: 'John Doe',
    });
    console.log('Created user:', newUser);

    // Find user by ID
    const user = await userRepo.findById(newUser.id);
    console.log('Found user:', user);

    // Update user
    await userRepo.update(newUser.id, { full_name: 'John Smith' });
    console.log('User updated');

    // Example 3: Pagination
    console.log('\n📝 Example 3: Pagination');
    const paginatedUsers = await db.table('users')
      .paginate({ page: 1, limit: 10 });
    
    console.log('Page 1 users:', paginatedUsers.data);
    console.log('Pagination info:', paginatedUsers.pagination);

    // Example 4: Joins
    console.log('\n📝 Example 4: Joins');
    const usersWithRoles = await db.table('users')
      .select('users.id', 'users.username', 'roles.name as role_name')
      .innerJoin('user_roles', 'users.id = user_roles.user_id')
      .innerJoin('roles', 'user_roles.role_id = roles.id')
      .get();
    
    console.log('Users with roles:', usersWithRoles);

    // Example 5: Transactions
    console.log('\n📝 Example 5: Transactions');
    await db.transaction(async (client) => {
      await client.query(
        'INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4)',
        ['jane_doe', 'jane@example.com', 'hashed_password', 'Jane Doe']
      );
      
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [2, 1]
      );
    });
    console.log('Transaction completed');

    // Example 6: Caching (if Redis is available)
    console.log('\n📝 Example 6: Caching');
    const cache = db.getCache();
    
    if (cache) {
      // Set cache
      await cache.set('user:1', { id: 1, name: 'John' }, 3600);
      
      // Get from cache
      const cachedUser = await cache.get('user:1');
      console.log('Cached user:', cachedUser);
      
      // Query with cache
      const cachedUsers = await db.table('users')
        .withCache(3600, 'users')
        .get();
      console.log('Users (cached):', cachedUsers);
    } else {
      console.log('Redis not available');
    }

    // Example 7: Raw SQL
    console.log('\n📝 Example 7: Raw SQL');
    const customQuery = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE is_active = $1',
      [true]
    );
    console.log('Active users count:', customQuery.rows[0]);

    // Get pool stats
    console.log('\n📊 Pool Stats:', db.getPoolStats());

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close connections
    await db.close();
    console.log('\n✅ Database disconnected');
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

export default basicUsageExample;
