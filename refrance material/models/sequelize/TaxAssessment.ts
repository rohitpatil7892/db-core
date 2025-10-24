import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Property from './Property';
import TaxContract from './TaxContract';
import Tenant from './Tenant';

class TaxAssessment extends Model {
  declare id: number;
  declare tenant_id: number;
  declare property_id: number;
  declare tax_contract_id: number;
  declare assessment_date: Date;
  declare amount: number;
  declare status: string;
  declare created_at: Date;
}

TaxAssessment.init(
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
    property_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Property,
        key: 'id',
      },
    },
    tax_contract_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: TaxContract,
        key: 'id',
      },
    },
    assessment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'tax_assessments',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['property_id'] },
      { fields: ['tax_contract_id'] }
    ]
  }
);

// Define associations
Tenant.hasMany(TaxAssessment, { foreignKey: 'tenant_id' });
TaxAssessment.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Property.hasMany(TaxAssessment, { foreignKey: 'property_id' });
TaxAssessment.belongsTo(Property, { foreignKey: 'property_id' });

TaxContract.hasMany(TaxAssessment, { foreignKey: 'tax_contract_id' });
TaxAssessment.belongsTo(TaxContract, { foreignKey: 'tax_contract_id' });

export default TaxAssessment; 