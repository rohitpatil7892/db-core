#!/usr/bin/env node

/**
 * Test database and Redis connections
 */

require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('redis');

async function testPostgreSQL() {
  console.log('\n🔍 Testing PostgreSQL connection...');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version()');
    console.log('✅ PostgreSQL connection successful');
    console.log('   Time:', result.rows[0].now);
    console.log('   Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    await pool.end();
    return false;
  }
}

async function testRedis() {
  console.log('\n🔍 Testing Redis connection...');
  
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  try {
    await client.connect();
    await client.ping();
    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
    console.log('✅ Redis connection successful');
    console.log('   Version:', version);
    await client.quit();
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('   Note: Redis is optional. The module will work without it.');
    return false;
  }
}

async function main() {
  console.log('🔧 DB-Core Connection Test');
  console.log('========================');
  
  const pgSuccess = await testPostgreSQL();
  const redisSuccess = await testRedis();
  
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`PostgreSQL: ${pgSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Redis:      ${redisSuccess ? '✅ Connected' : '⚠️  Not available (optional)'}`);
  
  if (!pgSuccess) {
    console.log('\n⚠️  PostgreSQL connection failed. Please check:');
    console.log('   - PostgreSQL is running');
    console.log('   - Database credentials in .env are correct');
    console.log('   - Database exists and is accessible');
    process.exit(1);
  }
  
  console.log('\n✅ All required connections successful!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
