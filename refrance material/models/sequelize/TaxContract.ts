import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import TaxType from './TaxType';
import TaxRate from './TaxRate';
import Tenant from './Tenant';

class TaxContract extends Model {
  declare id: number;
  declare tenant_id: number;
  declare tax_type_id: number;
  declare tax_rate_id: number;
  declare start_date: Date;
  declare end_date: Date;
  declare max_duration: number;
  declare created_at: Date;
}

TaxContract.init(
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
    tax_rate_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: TaxRate,
        key: 'id',
      },
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isAfterStartDate(value: Date) {
          if (new Date(value) <= new Date(this.start_date as any)) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    max_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        max: 12 // max_duration must be <= 12 (months)
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'tax_contracts',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tax_type_id'] },
      { fields: ['tax_rate_id'] }
    ]
  }
);

// Define associations
Tenant.hasMany(TaxContract, { foreignKey: 'tenant_id' });
TaxContract.belongsTo(Tenant, { foreignKey: 'tenant_id' });

TaxType.hasMany(TaxContract, { foreignKey: 'tax_type_id' });
TaxContract.belongsTo(TaxType, { foreignKey: 'tax_type_id' });
TaxRate.hasMany(TaxContract, { foreignKey: 'tax_rate_id' });
TaxContract.belongsTo(TaxRate, { foreignKey: 'tax_rate_id' });

export default TaxContract; 