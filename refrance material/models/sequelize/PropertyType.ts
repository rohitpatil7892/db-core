import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class PropertyType extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare description?: string;
  declare created_at: Date;
}

PropertyType.init(
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
    tableName: 'property_types',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(PropertyType, { foreignKey: 'tenant_id' });
PropertyType.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default PropertyType; 