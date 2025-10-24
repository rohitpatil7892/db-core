import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class Role extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare description?: string;
  declare created_at: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Tenant,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'roles',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tenant_id', 'name'], unique: true },
    ],
  }
);

// Define associations
Tenant.hasMany(Role, { foreignKey: 'tenant_id' });
Role.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default Role; 