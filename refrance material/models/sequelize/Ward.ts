import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class Ward extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare code: string;
  declare description?: string;
  declare created_at: Date;
}

Ward.init(
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
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(20),
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
    tableName: 'wards',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tenant_id', 'code'], unique: true },
    ],
  }
);

// Define associations
Tenant.hasMany(Ward, { foreignKey: 'tenant_id' });
Ward.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default Ward; 