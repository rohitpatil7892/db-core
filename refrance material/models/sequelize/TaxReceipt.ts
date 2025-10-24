import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

export interface TaxReceiptAttributes {
  id?: number;
  tenant_id: number;
  payment_id: number;
  receipt_number: string;
  amount: number;
  receipt_date: Date;
  payment_method: string;
  payer_name: string;
  payer_email: string;
  payer_phone: string;
  description: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
  created_by: number;
  updated_by?: number;
  deleted_by?: number;
}

class TaxReceipt extends Model<TaxReceiptAttributes> implements TaxReceiptAttributes {
  public id!: number;
  public tenant_id!: number;
  public payment_id!: number;
  public receipt_number!: string;
  public amount!: number;
  public receipt_date!: Date;
  public payment_method!: string;
  public payer_name!: string;
  public payer_email!: string;
  public payer_phone!: string;
  public description!: string;
  public status!: string;
  public created_at?: Date;
  public updated_at?: Date;
  public deleted_at?: Date;
  public created_by!: number;
  public updated_by?: number;
  public deleted_by?: number;
}

TaxReceipt.init(
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
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receipt_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    receipt_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payer_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payer_email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payer_phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
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
      allowNull: false,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'tax_receipts',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['payment_id'] },
    ],
  }
);

Tenant.hasMany(TaxReceipt, { foreignKey: 'tenant_id' });
TaxReceipt.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default TaxReceipt; 