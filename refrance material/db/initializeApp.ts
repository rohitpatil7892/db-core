import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import logger from '../config/logger';
import dotenv from 'dotenv';
import sequelize from './sequelize';

dotenv.config();

/**
 * Initialize the complete application database with multi-tenancy support
 * This script handles:
 * 1. Database creation (if not exists)
 * 2. Table synchronization via Sequelize models
 * 3. Default tenant creation
 * 4. Super admin user creation
 */

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'grampanchayat';

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'admin1234';
const ADMIN_FULL_NAME = 'System Administrator';

// Default tenant
const DEFAULT_TENANT_NAME = 'Default Tenant';
const DEFAULT_TENANT_SLUG = 'default-tenant';

/**
 * Create database if it doesn't exist
 */
async function createDatabaseIfNotExists(): Promise<void> {
  // Connect to postgres database to create our target database
  const adminPool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: 'postgres', // Connect to default postgres database
    password: DB_PASSWORD,
    port: DB_PORT,
  });

  try {
    // Check if database exists
    const checkDbQuery = `
      SELECT 1 FROM pg_database WHERE datname = $1
    `;
    const result = await adminPool.query(checkDbQuery, [DB_NAME]);

    if (result.rows.length === 0) {
      logger.info(`Database '${DB_NAME}' does not exist. Creating...`);
      
      // Create database
      await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
      
      logger.info(`Database '${DB_NAME}' created successfully`);
    } else {
      logger.info(`Database '${DB_NAME}' already exists`);
    }
  } catch (error) {
    logger.error('Error checking/creating database', { error });
    throw error;
  } finally {
    await adminPool.end();
  }
}

/**
 * Synchronize all Sequelize models to create tables
 */
async function syncModels(): Promise<void> {
  try {
    logger.info('Synchronizing database models...');
    
    // Import all models to ensure they're registered
    await import('../models/sequelize');
    
    // Sync with alter: true to update existing tables without dropping data
    // Use force: true only on first run or when you want to drop all tables
    const shouldForce = process.env.DB_FORCE_SYNC === 'true';
    
    if (shouldForce) {
      logger.warn('Force sync enabled - all tables will be dropped and recreated!');
    }
    
    await sequelize.sync({ 
      force: shouldForce,
      alter: !shouldForce 
    });
    
    logger.info('Database models synchronized successfully');
  } catch (error) {
    logger.error('Error synchronizing models', { error });
    throw error;
  }
}

/**
 * Create default tenant if it doesn't exist
 */
async function createDefaultTenant(): Promise<number> {
  try {
    const { Tenant } = await import('../models/sequelize');
    
    // Check if default tenant exists
    let tenant = await Tenant.findOne({ 
      where: { slug: DEFAULT_TENANT_SLUG } 
    });

    if (!tenant) {
      logger.info('Creating default tenant...');
      
      tenant = await Tenant.create({
        name: DEFAULT_TENANT_NAME,
        slug: DEFAULT_TENANT_SLUG,
        description: 'Default organization tenant',
        is_active: true,
        settings: {}
      });
      
      logger.info(`Default tenant created with ID: ${tenant.id}`);
    } else {
      logger.info(`Default tenant already exists with ID: ${tenant.id}`);
    }

    return tenant.id;
  } catch (error) {
    logger.error('Error creating default tenant', { error });
    throw error;
  }
}

/**
 * Create super admin role if it doesn't exist
 */
async function createSuperAdminRole(tenantId: number): Promise<number> {
  try {
    const { Role } = await import('../models/sequelize');
    
    // Check if super admin role exists
    let role = await Role.findOne({ 
      where: { 
        tenant_id: tenantId,
        name: 'super admin' 
      } 
    });

    if (!role) {
      logger.info('Creating super admin role...');
      
      role = await Role.create({
        tenant_id: tenantId,
        name: 'super admin',
        description: 'Super Administrator with full access'
      });
      
      logger.info(`Super admin role created with ID: ${role.id}`);
    } else {
      logger.info(`Super admin role already exists with ID: ${role.id}`);
    }

    return role.id;
  } catch (error) {
    logger.error('Error creating super admin role', { error });
    throw error;
  }
}

/**
 * Create super admin user if it doesn't exist
 */
async function createSuperAdminUser(tenantId: number, roleId: number): Promise<void> {
  try {
    const { User, UserRole } = await import('../models/sequelize');
    
    // Check if admin user exists
    let user = await User.findOne({ 
      where: { 
        tenant_id: tenantId,
        username: ADMIN_USERNAME 
      } 
    });

    if (!user) {
      logger.info('Creating super admin user...');
      
      // Hash password
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // Create user
      user = await User.create({
        tenant_id: tenantId,
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        full_name: ADMIN_FULL_NAME,
        phone: '1234567890',
        is_active: true
      });
      
      logger.info(`Super admin user created with ID: ${user.id}`);
      logger.info(`Credentials - Username: ${ADMIN_USERNAME}, Password: ${ADMIN_PASSWORD}`);
    } else {
      logger.info(`Super admin user already exists with ID: ${user.id}`);
    }

    // Assign role to user
    const userRole = await UserRole.findOne({
      where: {
        user_id: user.id,
        role_id: roleId
      }
    });

    if (!userRole) {
      await UserRole.create({
        user_id: user.id,
        role_id: roleId
      });
      logger.info('Super admin role assigned to user');
    } else {
      logger.info('Super admin role already assigned to user');
    }
  } catch (error) {
    logger.error('Error creating super admin user', { error });
    throw error;
  }
}

/**
 * Main initialization function
 */
export async function initializeApplication(): Promise<void> {
  try {
    logger.info('='.repeat(60));
    logger.info('Starting application initialization...');
    logger.info('='.repeat(60));

    // Step 1: Create database if it doesn't exist
    await createDatabaseIfNotExists();

    // Step 2: Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Step 3: Sync all models (create/update tables)
    await syncModels();

    // Step 4: Create default tenant
    const tenantId = await createDefaultTenant();

    // Step 5: Create super admin role
    const roleId = await createSuperAdminRole(tenantId);

    // Step 6: Create super admin user
    await createSuperAdminUser(tenantId, roleId);

    logger.info('='.repeat(60));
    logger.info('Application initialization completed successfully!');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('Super Admin Credentials:');
    logger.info(`  Username: ${ADMIN_USERNAME}`);
    logger.info(`  Email: ${ADMIN_EMAIL}`);
    logger.info(`  Password: ${ADMIN_PASSWORD}`);
    logger.info('');
    logger.info('Please change the default password after first login!');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('Application initialization failed', { error });
    throw error;
  }
}

export default initializeApplication;
