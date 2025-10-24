import { Model, DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize';
import TaxAssessment from './TaxAssessment';
import Tenant from './Tenant';

export interface TaxPaymentAttributes {
  id?: number;
  tenant_id: number;
  assessment_id?: number;
  amount: number;
  payment_date: Date;
  payment_method: string;
  transaction_id?: string;
  status: string;
  receipt_id?: number;
  remarks?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
  deleted_by?: number;
}

class TaxPayment extends Model<TaxPaymentAttributes> implements TaxPaymentAttributes {
  public id!: number;
  public tenant_id!: number;
  public assessment_id?: number;
  public amount!: number;
  public payment_date!: Date;
  public payment_method!: string;
  public transaction_id?: string;
  public status!: string;
  public receipt_id?: number;
  public remarks?: string;
  public created_at?: Date;
  public updated_at?: Date;
  public deleted_at?: Date;
  public created_by?: number;
  public updated_by?: number;
  public deleted_by?: number;
}

TaxPayment.init(
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
        model: 'tenants',
        key: 'id',
      },
    },
    assessment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tax_assessments',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    receipt_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tax_receipts',
        key: 'id',
      },
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'tax_payments',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['assessment_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(TaxPayment, { foreignKey: 'tenant_id' });
TaxPayment.belongsTo(Tenant, { foreignKey: 'tenant_id' });

TaxAssessment.hasMany(TaxPayment, { foreignKey: 'assessment_id' });
TaxPayment.belongsTo(TaxAssessment, { foreignKey: 'assessment_id' });

export default TaxPayment; 