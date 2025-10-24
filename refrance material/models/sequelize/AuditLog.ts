import { DataTypes, Model, Op } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

export interface AuditLogAttributes {
  id?: number;
  tenant_id?: number;
  table_name: string;
  record_id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'IMPORT';
  old_values?: object;
  new_values?: object;
  changed_fields?: string[];
  user_id?: number;
  user_ip?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  endpoint?: string;
  http_method?: string;
  status_code?: number;
  error_message?: string;
  execution_time_ms?: number;
  created_at?: Date;
  metadata?: object;
}

class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
  declare id: number;
  declare tenant_id?: number;
  declare table_name: string;
  declare record_id?: number;
  declare action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'IMPORT';
  declare old_values?: object;
  declare new_values?: object;
  declare changed_fields?: string[];
  declare user_id?: number;
  declare user_ip?: string;
  declare user_agent?: string;
  declare session_id?: string;
  declare request_id?: string;
  declare endpoint?: string;
  declare http_method?: string;
  declare status_code?: number;
  declare error_message?: string;
  declare execution_time_ms?: number;
  declare created_at: Date;
  declare metadata?: object;

  // Static methods for common audit operations
  static async logCreate(data: Omit<AuditLogAttributes, 'action'>) {
    return this.create({ ...data, action: 'CREATE' });
  }

  static async logUpdate(data: Omit<AuditLogAttributes, 'action'>) {
    return this.create({ ...data, action: 'UPDATE' });
  }

  static async logDelete(data: Omit<AuditLogAttributes, 'action'>) {
    return this.create({ ...data, action: 'DELETE' });
  }

  static async logLogin(data: Omit<AuditLogAttributes, 'action' | 'table_name'>) {
    return this.create({ ...data, action: 'LOGIN', table_name: 'users' });
  }

  static async logLogout(data: Omit<AuditLogAttributes, 'action' | 'table_name'>) {
    return this.create({ ...data, action: 'LOGOUT', table_name: 'users' });
  }

  static async logView(data: Omit<AuditLogAttributes, 'action'>) {
    return this.create({ ...data, action: 'VIEW' });
  }

  static async logExport(data: Omit<AuditLogAttributes, 'action'>) {
    return this.create({ ...data, action: 'EXPORT' });
  }

  static async logImport(data: Omit<AuditLogAttributes, 'action'>) {
    return this.create({ ...data, action: 'IMPORT' });
  }

  // Query methods
  static async getByUser(userId: number, limit = 100, offset = 0) {
    return this.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  static async getByTable(tableName: string, recordId?: number, limit = 100, offset = 0) {
    const where: any = { table_name: tableName };
    if (recordId) {
      where.record_id = recordId;
    }
    
    return this.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  static async getByAction(action: AuditLogAttributes['action'], limit = 100, offset = 0) {
    return this.findAndCountAll({
      where: { action },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  static async getByDateRange(startDate: Date, endDate: Date, limit = 100, offset = 0) {
    return this.findAndCountAll({
      where: {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    table_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    record_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'IMPORT'),
      allowNull: false,
    },
    old_values: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    changed_fields: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    user_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    request_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    http_method: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    execution_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['table_name'] },
      { fields: ['record_id'] },
      { fields: ['action'] },
      { fields: ['user_id'] },
      { fields: ['created_at'] },
      { fields: ['table_name', 'record_id'] },
    ]
  }
);

Tenant.hasMany(AuditLog, { foreignKey: 'tenant_id' });
AuditLog.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default AuditLog; 