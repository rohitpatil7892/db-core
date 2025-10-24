import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class TaxCalculationType extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare description?: string;
  declare created_at: Date;
}

TaxCalculationType.init(
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
      unique: true
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
    tableName: 'tax_calculation_types',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tenant_id', 'name'], unique: true },
    ],
  }
);

Tenant.hasMany(TaxCalculationType, { foreignKey: 'tenant_id' });
TaxCalculationType.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default TaxCalculationType; 