# Cache Invalidation Strategies

## 🎯 The Problem

**Your Question:** "If records are cached, and then updated, does the cache get updated or is this scenario missed?"

**Answer:** ✅ **Your implementation DOES handle this**, but there are better strategies available.

---

## 📊 Current Implementation (Broad Invalidation)

### How It Works Now

```typescript
// 1. First request - Data is cached
const users = await db.table('users').withCache(3600).get();
// Cache: "query:ABC123" → [user1, user2, user3]

// 2. Update happens
await db.table('users').where('id', '=', 1).update({ name: 'New Name' });
// ✅ Automatically deletes ALL caches matching "query:*"

// 3. Next request - Fresh data from DB
const users2 = await db.table('users').withCache(3600).get();
// ✅ No stale data - cache was cleared, fresh data fetched
```

### Code Location

```typescript
// QueryBuilder.ts - Lines 395-398, 424-427, 446-449
if (this.cache) {
  await this.cache.delPattern(`${this.cacheKeyPrefix || 'query'}:*`);
}
```

### Pros & Cons

**Pros:**
- ✅ Simple implementation
- ✅ No stale data guaranteed
- ✅ Works automatically
- ✅ No configuration needed

**Cons:**
- ❌ Deletes ALL table caches (even unrelated queries)
- ❌ Reduces cache hit rate
- ❌ Performance impact on high-traffic apps

---

## 🎯 Better Strategies

### Strategy 1: Granular Invalidation ⭐ RECOMMENDED

Only invalidate affected records, keep unrelated caches.

```typescript
// Update specific user
await db.table('users')
  .where('id', '=', 123)
  .update({ name: 'John' });

// Only invalidates:
// - query:users:123
// - query:users:list:* (lists might contain this user)

// Keeps intact:
// - query:users:456 (different user)
// - query:products:* (different table)
```

**Implementation:**

```typescript
import { CacheInvalidationManager } from '@rohit_patil/db-core';

// In your update method
async update(id: number, data: any) {
  await db.table('users').where('id', '=', id).update(data);
  
  // Granular invalidation
  await invalidationManager.invalidate({
    strategy: 'granular',
    tableName: 'users',
    affectedIds: [id],
  });
}
```

**When to use:**
- ✅ Know which specific records changed
- ✅ Want to keep unrelated caches
- ✅ High cache hit rate is important

---

### Strategy 2: TTL-Based (Time to Live)

Let caches expire automatically based on time.

```typescript
// Short TTL for frequently changing data
const users = await db.table('users')
  .withCache(60)  // 60 seconds
  .get();

// Long TTL for rarely changing data
const categories = await db.table('categories')
  .withCache(3600)  // 1 hour
  .get();
```

**When to use:**
- ✅ Can tolerate brief stale data
- ✅ Data changes frequently
- ✅ Want simplest solution

**TTL Guidelines:**
```typescript
// Real-time data (stock prices, notifications)
ttl: 5-30 seconds

// Frequently updated (user profiles, posts)
ttl: 1-5 minutes

// Moderate updates (products, categories)
ttl: 10-30 minutes

// Rarely changes (settings, configurations)
ttl: 1-24 hours

// Almost static (countries, languages)
ttl: 24+ hours
```

---

### Strategy 3: Versioned Cache Keys

Increment version number instead of deleting caches.

```typescript
// Cache with version
// Before update: query:users:v1:ABC123
// After update:  query:users:v2:ABC123  (new version)
// Old cache naturally expires, no deletion needed

import { CacheKeyBuilder } from '@rohit_patil/db-core';

const keyBuilder = new CacheKeyBuilder(cache);

// Get data
const cacheKey = await keyBuilder.buildVersionedKey('users', queryHash);
const cached = await cache.get(cacheKey);

// Update data
await db.table('users').update({ ... });
await invalidationManager.versionedInvalidation('users');
// Version incremented: v1 → v2

// Next request uses v2, v1 caches ignored
```

**When to use:**
- ✅ Want to avoid cache deletion operations
- ✅ OK with old caches lingering until TTL
- ✅ Need audit trail of versions

---

### Strategy 4: Tag-Based Invalidation

Tag related caches and invalidate by tag.

```typescript
// Cache with tags
await cache.set('query:user:123', userData, {
  tags: ['user', 'profile', 'tenant:5']
});

await cache.set('query:orders:456', orderData, {
  tags: ['order', 'user:123', 'tenant:5']
});

// Update user - invalidate all user-related caches
await invalidationManager.invalidate({
  strategy: 'tag-based',
  tags: ['user:123']
});

// This invalidates:
// - query:user:123 (has tag 'user:123')
// - query:orders:456 (has tag 'user:123')
```

**When to use:**
- ✅ Complex relationships between data
- ✅ Need to invalidate related caches
- ✅ Multi-tenant applications

---

### Strategy 5: Write-Through Cache

Update cache when updating database.

```typescript
async updateUser(id: number, data: any) {
  // 1. Update database
  const updated = await db.table('users')
    .where('id', '=', id)
    .update(data);
  
  // 2. Update cache immediately
  const cacheKey = `query:users:${id}`;
  await cache.set(cacheKey, updated, 3600);
  
  return updated;
}
```

**When to use:**
- ✅ Read-heavy workload
- ✅ Updates are infrequent
- ✅ Can't tolerate cache misses

**Caution:**
- ❌ Can lead to cache/DB inconsistency
- ❌ More complex error handling
- ❌ Need careful synchronization

---

## 📋 Comparison Table

| Strategy | Complexity | Stale Risk | Cache Hit Rate | Best For |
|----------|------------|------------|----------------|----------|
| **Broad** | ⭐ Low | ✅ None | ⚠️ Low | Simple apps |
| **Granular** | ⭐⭐ Medium | ✅ None | ✅ High | Most apps |
| **TTL** | ⭐ Low | ⚠️ Medium | ⭐⭐ Medium | Tolerant apps |
| **Versioned** | ⭐⭐⭐ High | ✅ None | ✅ High | Version tracking |
| **Tag-Based** | ⭐⭐⭐ High | ✅ None | ✅ High | Complex relations |
| **Write-Through** | ⭐⭐⭐⭐ Very High | ⚠️ Risk | ✅ Very High | Read-heavy |

---

## 🚀 Implementation Guide

### Option 1: Quick Fix (Recommended)

Keep current implementation but use shorter TTLs:

```typescript
// Instead of long TTL
const users = await db.table('users').withCache(3600).get();

// Use shorter TTL for frequently updated data
const users = await db.table('users').withCache(300).get(); // 5 minutes
```

### Option 2: Upgrade to Granular Invalidation

```typescript
// 1. Import the new manager
import { CacheInvalidationManager } from '@rohit_patil/db-core';

// 2. Initialize
const cache = db.getCache();
const invalidationManager = new CacheInvalidationManager(cache);

// 3. Use in your updates
class UserService {
  async updateUser(id: number, data: any) {
    // Update database
    await db.table('users').where('id', '=', id).update(data);
    
    // Granular invalidation
    await invalidationManager.invalidate({
      strategy: 'granular',
      tableName: 'users',
      affectedIds: [id],
    });
  }
  
  async deleteUser(id: number) {
    await db.table('users').where('id', '=', id).delete();
    
    await invalidationManager.invalidate({
      strategy: 'granular',
      tableName: 'users',
      affectedIds: [id],
    });
  }
}
```

### Option 3: Multi-Strategy Approach

Use different strategies for different data:

```typescript
class CacheStrategy {
  // Real-time data - Short TTL
  async getUserNotifications(userId: number) {
    return db.table('notifications')
      .where('user_id', '=', userId)
      .withCache(30)  // 30 seconds
      .get();
  }
  
  // Frequently updated - Granular
  async updateUser(id: number, data: any) {
    await db.table('users').where('id', '=', id).update(data);
    await invalidationManager.invalidate({
      strategy: 'granular',
      tableName: 'users',
      affectedIds: [id],
    });
  }
  
  // Static data - Long TTL
  async getCountries() {
    return db.table('countries')
      .withCache(86400)  // 24 hours
      .get();
  }
  
  // Related data - Tag-based
  async updateTenant(tenantId: number, data: any) {
    await db.table('tenants').where('id', '=', tenantId).update(data);
    await invalidationManager.invalidate({
      strategy: 'tag-based',
      tags: [`tenant:${tenantId}`],
    });
  }
}
```

---

## 🎯 Best Practices

### 1. Choose TTL Based on Data Volatility

```typescript
// HIGH volatility (changes every second/minute)
realTimeData: 5-60 seconds

// MEDIUM volatility (changes hourly/daily)
normalData: 5-30 minutes

// LOW volatility (changes rarely)
staticData: 1-24 hours
```

### 2. Use Granular for Important Updates

```typescript
// ✅ DO: Granular invalidation for user data
await invalidationManager.invalidate({
  strategy: 'granular',
  tableName: 'users',
  affectedIds: [userId],
});

// ❌ DON'T: Broad invalidation (unless necessary)
await cache.delPattern('query:*');
```

### 3. Monitor Cache Performance

```typescript
// Track cache hit rate
const stats = {
  hits: 0,
  misses: 0,
  hitRate: () => stats.hits / (stats.hits + stats.misses)
};

// Log periodically
setInterval(() => {
  console.log('Cache hit rate:', stats.hitRate());
}, 60000);
```

### 4. Handle Cache Failures Gracefully

```typescript
async getUsers() {
  try {
    // Try cache first
    const cached = await cache.get('users');
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.error('Cache read failed:', error);
    // Continue to database
  }
  
  // Fetch from database
  const users = await db.table('users').get();
  
  try {
    // Try to cache result
    await cache.set('users', JSON.stringify(users), 300);
  } catch (error) {
    console.error('Cache write failed:', error);
    // Continue anyway
  }
  
  return users;
}
```

### 5. Document Your Strategy

```typescript
/**
 * User Service
 * 
 * Cache Strategy:
 * - User profiles: Granular invalidation, 5 min TTL
 * - User list: Broad invalidation, 2 min TTL
 * - User settings: Write-through cache, 30 min TTL
 */
class UserService {
  // ...
}
```

---

## 🔍 Testing Cache Invalidation

```typescript
describe('Cache Invalidation', () => {
  it('should invalidate cache on update', async () => {
    // 1. Fetch and cache
    const users1 = await db.table('users').withCache(3600).get();
    expect(users1.length).toBe(3);
    
    // 2. Update
    await db.table('users').where('id', '=', 1).update({ name: 'Updated' });
    
    // 3. Verify cache cleared
    const cacheKey = 'query:users:1';
    const cached = await cache.get(cacheKey);
    expect(cached).toBeNull();
    
    // 4. Fetch again - should get fresh data
    const users2 = await db.table('users').withCache(3600).get();
    const updatedUser = users2.find(u => u.id === 1);
    expect(updatedUser.name).toBe('Updated');
  });
});
```

---

## 📊 Summary

### Your Current Setup

✅ **You're SAFE!** Your implementation invalidates cache on updates.

```typescript
// Current behavior:
1. SELECT → Cache miss → Fetch from DB → Cache result
2. UPDATE → Invalidate ALL table caches
3. SELECT → Cache miss → Fetch from DB → Cache result
```

### Recommended Improvements

1. **Short term** - Use appropriate TTLs
2. **Medium term** - Implement granular invalidation
3. **Long term** - Multi-strategy based on data type

### Quick Win

```typescript
// Change this:
.withCache(3600)  // 1 hour - too long for frequently updated data

// To this:
.withCache(300)   // 5 minutes - safer for dynamic data
```

---

## 🎉 Conclusion

**You asked:** "Does cache get updated when records change?"

**Answer:** 
- ✅ **YES** - Cache is invalidated on INSERT/UPDATE/DELETE
- ✅ **NO STALE DATA** - Fresh data is fetched after updates
- ⚠️ **BUT** - Uses broad invalidation (deletes all table caches)
- 💡 **IMPROVE** - Use granular or TTL-based strategies for better performance

Your implementation is **safe and correct**, just not optimal for high-traffic scenarios. The strategies above will help you optimize further!
