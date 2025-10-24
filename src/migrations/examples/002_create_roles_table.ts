import { Migration } from '../../types';

/**
 * Example migration: Create roles and user_roles tables
 */
export const createRolesTable: Migration = {
  id: '002',
  name: '002_create_roles_table',
  
  async up(client) {
    // Create roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_roles junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    // Insert default roles
    await client.query(`
      INSERT INTO roles (name, description) VALUES 
        ('admin', 'System Administrator'),
        ('user', 'Regular User')
      ON CONFLICT (name) DO NOTHING
    `);
  },

  async down(client) {
    await client.query(`DROP TABLE IF EXISTS user_roles`);
    await client.query(`DROP TABLE IF EXISTS roles`);
  },
};

export default createRolesTable;
