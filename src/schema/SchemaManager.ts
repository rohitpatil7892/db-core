import { Pool } from 'pg';
import { DatabaseConfig } from '../types';
import logger from '../utils/logger';

/**
 * Schema Manager
 * Handles database creation and schema synchronization
 */
export class SchemaManager {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Check if database exists
   */
  private async databaseExists(): Promise<boolean> {
    const adminPool = new Pool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: 'postgres', // Connect to default postgres database
    });

    try {
      const result = await adminPool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.config.database]
      );
      return result.rows.length > 0;
    } finally {
      await adminPool.end();
    }
  }

  /**
   * Create database if it doesn't exist
   */
  async ensureDatabaseExists(): Promise<boolean> {
    try {
      const exists = await this.databaseExists();

      if (exists) {
        logger.info(`Database "${this.config.database}" already exists`);
        return false;
      }

      // Create database
      const adminPool = new Pool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: 'postgres',
      });

      try {
        await adminPool.query(`CREATE DATABASE "${this.config.database}"`);
        logger.info(`Database "${this.config.database}" created successfully`);
        return true;
      } finally {
        await adminPool.end();
      }
    } catch (error: any) {
      logger.error('Failed to create database', { error: error.message });
      throw error;
    }
  }

  /**
   * Get table creation order (respecting foreign key dependencies)
   */
  private getTableCreationOrder(): string[] {
    return [
      // Base tables (no dependencies)
      'tenants',
      
      // User management
      'users',
      'roles',
      'user_roles',
      
      // Property system
      'wards',
      'property_types',
      'property_addresses',
      'properties',
      
      // Tax system
      'tax_types',
      'tax_calculation_types',
      'tax_rates',
      'tax_contracts',
      'tax_assessments',
      'tax_receipts',
      'tax_payments',
      'miscellaneous_payments',
      
      // Activity system
      'activity_types',
      'activity_templates',
      'activities',
      'activity_participants',
      'activity_reports',
      
      // Meeting system
      'meetings',
      'meeting_templates',
      'meeting_attendees',
      'meeting_topics',
      'meeting_resolutions',
      
      // System tables
      'audit_logs',
    ];
  }

  /**
   * Get SQL for table creation
   */
  private getTableSQL(tableName: string): string {
    const schemas: Record<string, string> = {
      // Tenants table
      tenants: `
        CREATE TABLE IF NOT EXISTS tenants (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT true NOT NULL,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          deleted_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
        CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
        INSERT INTO tenants (name, slug, description, is_active, settings) VALUES 
        ('Default Village', 'default-village', 'Default village for tax management', true, '{"currency": "INR", "timezone": "Asia/Kolkata"}'::jsonb)
        ON CONFLICT (slug) DO NOTHING;
      `,

      // Users table
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          username VARCHAR(50) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(100) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          phone VARCHAR(15),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username ON users(tenant_id, username);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
      `,

      // Roles table
      roles: `
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_tenant_name ON roles(tenant_id, name);
      `,

      // User Roles table
      user_roles: `
        CREATE TABLE IF NOT EXISTS user_roles (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, role_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
      `,

      // Wards table
      wards: `
        CREATE TABLE IF NOT EXISTS wards (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          code VARCHAR(20) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_wards_tenant_id ON wards(tenant_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_wards_tenant_code ON wards(tenant_id, code);
      `,

      // Property Types table
      property_types: `
        CREATE TABLE IF NOT EXISTS property_types (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_property_types_tenant_id ON property_types(tenant_id);
      `,

      // Property Addresses table
      property_addresses: `
        CREATE TABLE IF NOT EXISTS property_addresses (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          street_address VARCHAR(255) NOT NULL,
          city VARCHAR(100) NOT NULL,
          state VARCHAR(100) NOT NULL,
          postal_code VARCHAR(20) NOT NULL,
          country VARCHAR(100) DEFAULT 'India',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_property_addresses_tenant_id ON property_addresses(tenant_id);
      `,

      // Properties table
      properties: `
        CREATE TABLE IF NOT EXISTS properties (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          property_type_id INTEGER NOT NULL REFERENCES property_types(id),
          owner_id INTEGER NOT NULL REFERENCES users(id),
          ward_id INTEGER NOT NULL REFERENCES wards(id),
          property_address_id INTEGER NOT NULL REFERENCES property_addresses(id),
          area DECIMAL(10, 2) NOT NULL,
          built_up_area DECIMAL(10, 2),
          property_number VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_properties_tenant_id ON properties(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
        CREATE INDEX IF NOT EXISTS idx_properties_ward_id ON properties(ward_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_tenant_number ON properties(tenant_id, property_number);
      `,

      // Tax Types table
      tax_types: `
        CREATE TABLE IF NOT EXISTS tax_types (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tax_types_tenant_id ON tax_types(tenant_id);
      `,

      // Tax Calculation Types table
      tax_calculation_types: `
        CREATE TABLE IF NOT EXISTS tax_calculation_types (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          formula TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tax_calculation_types_tenant_id ON tax_calculation_types(tenant_id);
      `,

      // Tax Rates table
      tax_rates: `
        CREATE TABLE IF NOT EXISTS tax_rates (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          tax_type_id INTEGER NOT NULL REFERENCES tax_types(id),
          calculation_type_id INTEGER NOT NULL REFERENCES tax_calculation_types(id),
          rate DECIMAL(10, 2) NOT NULL,
          effective_date DATE NOT NULL,
          expiry_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant_id ON tax_rates(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tax_rates_tax_type_id ON tax_rates(tax_type_id);
      `,

      // Tax Contracts table
      tax_contracts: `
        CREATE TABLE IF NOT EXISTS tax_contracts (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          tax_type_id INTEGER NOT NULL REFERENCES tax_types(id),
          tax_rate_id INTEGER NOT NULL REFERENCES tax_rates(id),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          max_duration INTEGER NOT NULL CHECK (max_duration <= 12),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CHECK (end_date > start_date)
        );
        CREATE INDEX IF NOT EXISTS idx_tax_contracts_tenant_id ON tax_contracts(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tax_contracts_tax_type_id ON tax_contracts(tax_type_id);
      `,

      // Tax Assessments table
      tax_assessments: `
        CREATE TABLE IF NOT EXISTS tax_assessments (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          property_id INTEGER NOT NULL REFERENCES properties(id),
          tax_contract_id INTEGER NOT NULL REFERENCES tax_contracts(id),
          assessment_date DATE NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          status VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tax_assessments_tenant_id ON tax_assessments(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tax_assessments_property_id ON tax_assessments(property_id);
      `,

      // Tax Receipts table
      tax_receipts: `
        CREATE TABLE IF NOT EXISTS tax_receipts (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          payment_id INTEGER NOT NULL,
          receipt_number VARCHAR(50) NOT NULL UNIQUE,
          receipt_date DATE NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          issued_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tax_receipts_tenant_id ON tax_receipts(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tax_receipts_payment_id ON tax_receipts(payment_id);
      `,

      // Tax Payments table
      tax_payments: `
        CREATE TABLE IF NOT EXISTS tax_payments (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          assessment_id INTEGER REFERENCES tax_assessments(id),
          amount DECIMAL(10, 2) NOT NULL,
          payment_date DATE NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          transaction_id VARCHAR(100),
          status VARCHAR(20) NOT NULL,
          receipt_id INTEGER REFERENCES tax_receipts(id),
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          deleted_by INTEGER REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_tax_payments_tenant_id ON tax_payments(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tax_payments_assessment_id ON tax_payments(assessment_id);
      `,

      // Miscellaneous Payments table
      miscellaneous_payments: `
        CREATE TABLE IF NOT EXISTS miscellaneous_payments (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          payer_id INTEGER NOT NULL REFERENCES users(id),
          amount DECIMAL(10, 2) NOT NULL,
          payment_date DATE NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          description TEXT,
          receipt_number VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_miscellaneous_payments_tenant_id ON miscellaneous_payments(tenant_id);
      `,

      // Activity Types table
      activity_types: `
        CREATE TABLE IF NOT EXISTS activity_types (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_activity_types_tenant_id ON activity_types(tenant_id);
      `,

      // Activity Templates table
      activity_templates: `
        CREATE TABLE IF NOT EXISTS activity_templates (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          activity_type_id INTEGER NOT NULL REFERENCES activity_types(id),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          default_duration INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_activity_templates_tenant_id ON activity_templates(tenant_id);
      `,

      // Activities table
      activities: `
        CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          activity_type_id INTEGER NOT NULL REFERENCES activity_types(id),
          template_id INTEGER REFERENCES activity_templates(id),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          scheduled_date TIMESTAMP NOT NULL,
          status VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          deleted_by INTEGER REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_activities_activity_type_id ON activities(activity_type_id);
      `,

      // Activity Participants table
      activity_participants: `
        CREATE TABLE IF NOT EXISTS activity_participants (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          role VARCHAR(50),
          attendance_status VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_activity_participants_tenant_id ON activity_participants(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_activity_participants_activity_id ON activity_participants(activity_id);
      `,

      // Activity Reports table
      activity_reports: `
        CREATE TABLE IF NOT EXISTS activity_reports (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
          report_content TEXT NOT NULL,
          submitted_by INTEGER NOT NULL REFERENCES users(id),
          submitted_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_activity_reports_tenant_id ON activity_reports(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_activity_reports_activity_id ON activity_reports(activity_id);
      `,

      // Meetings table
      meetings: `
        CREATE TABLE IF NOT EXISTS meetings (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          activity_id INTEGER REFERENCES activities(id),
          meeting_type VARCHAR(50) NOT NULL,
          agenda TEXT,
          meeting_minutes TEXT,
          attendee_count INTEGER DEFAULT 0,
          expected_attendees INTEGER DEFAULT 0,
          resolution_count INTEGER DEFAULT 0,
          meeting_status VARCHAR(20) DEFAULT 'scheduled',
          meeting_location VARCHAR(255),
          meeting_date DATE NOT NULL,
          meeting_time TIME NOT NULL,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_meetings_tenant_id ON meetings(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_meetings_activity_id ON meetings(activity_id);
      `,

      // Meeting Templates table
      meeting_templates: `
        CREATE TABLE IF NOT EXISTS meeting_templates (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          meeting_type VARCHAR(50) NOT NULL,
          default_agenda TEXT,
          default_duration INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_meeting_templates_tenant_id ON meeting_templates(tenant_id);
      `,

      // Meeting Attendees table
      meeting_attendees: `
        CREATE TABLE IF NOT EXISTS meeting_attendees (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          attendance_status VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_meeting_attendees_tenant_id ON meeting_attendees(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
      `,

      // Meeting Topics table
      meeting_topics: `
        CREATE TABLE IF NOT EXISTS meeting_topics (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
          topic VARCHAR(255) NOT NULL,
          discussion TEXT,
          order_index INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_meeting_topics_tenant_id ON meeting_topics(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_topics_meeting_id ON meeting_topics(meeting_id);
      `,

      // Meeting Resolutions table
      meeting_resolutions: `
        CREATE TABLE IF NOT EXISTS meeting_resolutions (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
          resolution_text TEXT NOT NULL,
          status VARCHAR(20) NOT NULL,
          responsible_person INTEGER REFERENCES users(id),
          due_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_meeting_resolutions_tenant_id ON meeting_resolutions(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_resolutions_meeting_id ON meeting_resolutions(meeting_id);
      `,

      // Audit Logs table
      audit_logs: `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          action VARCHAR(50) NOT NULL,
          table_name VARCHAR(100) NOT NULL,
          record_id INTEGER,
          old_values JSONB,
          new_values JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      `,
    };

    return schemas[tableName] || '';
  }

  /**
   * Synchronize database schema
   * Creates all tables if they don't exist
   */
  async syncSchema(pool: Pool): Promise<void> {
    logger.info('Starting schema synchronization...');

    const tables = this.getTableCreationOrder();
    let createdCount = 0;

    for (const tableName of tables) {
      try {
        const sql = this.getTableSQL(tableName);
        
        if (!sql) {
          logger.warn(`No SQL schema defined for table: ${tableName}`);
          continue;
        }

        await pool.query(sql);
        createdCount++;
        logger.debug(`Table "${tableName}" synchronized`);
      } catch (error: any) {
        logger.error(`Failed to sync table "${tableName}"`, { error: error.message });
        throw error;
      }
    }

    logger.info(`Schema synchronization complete. ${createdCount} tables processed.`);
  }

  /**
   * Get list of existing tables in database
   */
  async getExistingTables(pool: Pool): Promise<string[]> {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    return result.rows.map(row => row.tablename);
  }

  /**
   * Check if schema is up to date
   */
  async isSchemaUpToDate(pool: Pool): Promise<boolean> {
    const existingTables = await this.getExistingTables(pool);
    const expectedTables = this.getTableCreationOrder();

    return expectedTables.every(table => existingTables.includes(table));
  }
}

export default SchemaManager;
