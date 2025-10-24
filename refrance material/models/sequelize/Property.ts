import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import PropertyType from './PropertyType';
import User from './User';
import Ward from './Ward';
import PropertyAddress from './PropertyAddress';
import Tenant from './Tenant';

class Property extends Model {
  declare id: number;
  declare tenant_id: number;
  declare property_type_id: number;
  declare owner_id: number;
  declare ward_id: number;
  declare property_address_id: number;
  declare area: number;
  declare built_up_area?: number;
  declare property_number: string;
  declare created_at: Date;
}

Property.init(
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
    property_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: PropertyType,
        key: 'id',
      },
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    ward_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Ward,
        key: 'id',
      },
    },
    property_address_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: PropertyAddress,
        key: 'id',
      },
    },
    area: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    built_up_area: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    property_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'properties',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['owner_id'] },
      { fields: ['ward_id'] },
      { fields: ['tenant_id', 'property_number'], unique: true }
    ]
  }
);

// Define associations
Tenant.hasMany(Property, { foreignKey: 'tenant_id' });
Property.belongsTo(Tenant, { foreignKey: 'tenant_id' });

PropertyType.hasMany(Property, { foreignKey: 'property_type_id' });
Property.belongsTo(PropertyType, { foreignKey: 'property_type_id' });

User.hasMany(Property, { foreignKey: 'owner_id', as: 'properties' });
Property.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

Ward.hasMany(Property, { foreignKey: 'ward_id' });
Property.belongsTo(Ward, { foreignKey: 'ward_id' });

PropertyAddress.hasOne(Property, { foreignKey: 'property_address_id' });
Property.belongsTo(PropertyAddress, { foreignKey: 'property_address_id', as: 'address' });

export default Property; 