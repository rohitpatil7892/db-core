// Legacy database pool - using Sequelize instead
import sequelize from './sequelize';

// Export a stub pool for backward compatibility
// Models should use Sequelize connection manager instead
export const pool = (sequelize.connectionManager as any).pool || {};
