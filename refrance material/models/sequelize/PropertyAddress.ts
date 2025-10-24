import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class PropertyAddress extends Model {
  declare id: number;
  declare tenant_id: number;
  declare address_line1: string;
  declare address_line2?: string;
  declare city: string;
  declare state: string;
  declare pincode: string;
  declare created_at: Date;
}

PropertyAddress.init(
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
    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'property_addresses',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(PropertyAddress, { foreignKey: 'tenant_id' });
PropertyAddress.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default PropertyAddress; 