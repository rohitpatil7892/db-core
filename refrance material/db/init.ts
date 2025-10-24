import { Pool } from 'pg';
import logger from '../config/logger';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'grampanchayat',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const initializeDatabase = async () => {
  try {
    // Test database connection
    const client = await pool.connect();
    logger.info('Database connection established successfully');
    
    // Create tables if they don't exist
    await createTables(client);
    
    client.release();
    return true;
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
};

const createTables = async (client: any) => {
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(15),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // User roles mapping
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id),
        role_id INTEGER REFERENCES roles(id),
        PRIMARY KEY (user_id, role_id)
      );
    `);
    
    // Tax types
    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Tax rates
    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_rates (
        id SERIAL PRIMARY KEY,
        tax_type_id INTEGER REFERENCES tax_types(id),
        rate DECIMAL(10,2) NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Tax contracts
    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_contracts (
        id SERIAL PRIMARY KEY,
        tax_type_id INTEGER REFERENCES tax_types(id),
        tax_rate_id INTEGER REFERENCES tax_rates(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        max_duration INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_dates CHECK (end_date > start_date),
        CONSTRAINT valid_duration CHECK (max_duration <= 12)
      );
    `);
    
    // Wards
    await client.query(`
      CREATE TABLE IF NOT EXISTS wards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Ward addresses
    await client.query(`
      CREATE TABLE IF NOT EXISTS ward_addresses (
        id SERIAL PRIMARY KEY,
        ward_id INTEGER REFERENCES wards(id),
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Property types
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Properties
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        property_type_id INTEGER REFERENCES property_types(id),
        owner_id INTEGER REFERENCES users(id),
        ward_id INTEGER REFERENCES wards(id),
        address_id INTEGER REFERENCES ward_addresses(id),
        area DECIMAL(10,2) NOT NULL,
        built_up_area DECIMAL(10,2),
        property_number VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Activity types
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Activity templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_templates (
        id SERIAL PRIMARY KEY,
        activity_type_id INTEGER REFERENCES activity_types(id),
        name VARCHAR(100) NOT NULL,
        template_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Activities
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        activity_type_id INTEGER REFERENCES activity_types(id),
        template_id INTEGER REFERENCES activity_templates(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Notification types
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Notification templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        notification_type_id INTEGER REFERENCES notification_types(id),
        name VARCHAR(100) NOT NULL,
        template_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        notification_type_id INTEGER REFERENCES notification_types(id),
        template_id INTEGER REFERENCES notification_templates(id),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL,
        scheduled_date TIMESTAMP,
        sent_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Notification subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        notification_type_id INTEGER REFERENCES notification_types(id),
        subscription_type VARCHAR(50) NOT NULL,
        parameters JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Failed to create database tables', { error });
    throw error;
  }
};

export { pool, initializeDatabase };
export default initializeDatabase; 