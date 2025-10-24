import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class TaxType extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare description?: string;
  declare created_at: Date;
}

TaxType.init(
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
    tableName: 'tax_types',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(TaxType, { foreignKey: 'tenant_id' });
TaxType.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default TaxType; 