/**
 * Example of creating a custom repository
 */

import { BaseRepository } from '../src/repository/BaseRepository';
import { DatabaseManager } from '../src/database/DatabaseManager';
import { RedisManager } from '../src/cache/RedisManager';
import { User } from '../src/models/types';

/**
 * Custom User Repository with additional methods
 */
export class UserRepository extends BaseRepository<User> {
  constructor(db: DatabaseManager, cache?: RedisManager) {
    super('users', db, cache, 'user');
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const cacheKey = `${this.cachePrefix}:username:${username}`;

    // Check cache
    if (this.cache) {
      const cached = await this.cache.get<User>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const user = await this.findOneBy('username', username);

    // Cache result
    if (user && this.cache) {
      await this.cache.set(cacheKey, user, this.defaultCacheTTL);
    }

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy('email', email);
  }

  /**
   * Find active users
   */
  async findActiveUsers(): Promise<User[]> {
    return this.query()
      .where('is_active', '=', true)
      .orderBy('created_at', 'DESC')
      .get();
  }

  /**
   * Find users with roles
   */
  async findUsersWithRoles(): Promise<any[]> {
    const sql = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        json_agg(json_build_object('id', r.id, 'name', r.name)) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id, u.username, u.email, u.full_name
    `;

    return this.raw(sql);
  }

  /**
   * Search users by name or email
   */
  async search(query: string): Promise<User[]> {
    const searchPattern = `%${query}%`;
    
    const sql = `
      SELECT * FROM users
      WHERE full_name ILIKE $1 OR email ILIKE $1
      ORDER BY created_at DESC
    `;

    return this.raw(sql, [searchPattern]);
  }

  /**
   * Update user password
   */
  async updatePassword(userId: number, passwordHash: string): Promise<boolean> {
    const result = await this.update(userId, { password_hash: passwordHash } as any);
    
    if (result && this.cache) {
      // Invalidate user cache
      await this.invalidateCache(userId);
    }

    return result;
  }

  /**
   * Deactivate user
   */
  async deactivate(userId: number): Promise<boolean> {
    return this.update(userId, { is_active: false } as any);
  }

  /**
   * Activate user
   */
  async activate(userId: number): Promise<boolean> {
    return this.update(userId, { is_active: true } as any);
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM users
    `;

    const result = await this.rawOne<any>(sql);

    return {
      total: parseInt(result?.total || '0', 10),
      active: parseInt(result?.active || '0', 10),
      inactive: parseInt(result?.inactive || '0', 10),
    };
  }
}

// Usage example
export async function customRepositoryExample() {
  const { DBCore } = await import('../src');
  const db = new DBCore();

  try {
    await db.initialize();

    const userRepo = new UserRepository(db.getDatabase(), db.getCache());

    // Find by username
    const user = await userRepo.findByUsername('john_doe');
    console.log('User:', user);

    // Search users
    const searchResults = await userRepo.search('john');
    console.log('Search results:', searchResults);

    // Get statistics
    const stats = await userRepo.getStatistics();
    console.log('User statistics:', stats);

    // Find users with roles
    const usersWithRoles = await userRepo.findUsersWithRoles();
    console.log('Users with roles:', usersWithRoles);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}

export default UserRepository;
