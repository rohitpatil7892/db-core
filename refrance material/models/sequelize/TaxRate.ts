import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import TaxType from './TaxType';
import TaxCalculationType from './TaxCalculationType';
import Tenant from './Tenant';

class TaxRate extends Model {
  declare id: number;
  declare tenant_id: number;
  declare tax_type_id: number;
  declare tax_calculation_type_id: number | null;
  declare rate: number;
  declare effective_from: Date;
  declare effective_to: Date;
  declare created_at: Date;
}

TaxRate.init(
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
    tax_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: TaxType,
        key: 'id',
      },
    },
    tax_calculation_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: TaxCalculationType,
        key: 'id',
      },
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    effective_to: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'tax_rates',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tax_type_id'] },
      { fields: ['tax_calculation_type_id'] }
    ]
  }
);

// Define associations
Tenant.hasMany(TaxRate, { foreignKey: 'tenant_id' });
TaxRate.belongsTo(Tenant, { foreignKey: 'tenant_id' });

TaxType.hasMany(TaxRate, { foreignKey: 'tax_type_id' });
TaxRate.belongsTo(TaxType, { foreignKey: 'tax_type_id' });

// Define association with TaxCalculationType
TaxCalculationType.hasMany(TaxRate, { foreignKey: 'tax_calculation_type_id' });
TaxRate.belongsTo(TaxCalculationType, { foreignKey: 'tax_calculation_type_id' });

export default TaxRate; 