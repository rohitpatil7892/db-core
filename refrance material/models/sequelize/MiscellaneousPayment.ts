import { Model, DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize';
import { BaseAuditableModel, AuditableAttributes } from './BaseAuditableModel';
import User from './User';
import Tenant from './Tenant';

export interface MiscellaneousPaymentAttributes extends AuditableAttributes {
  id?: number;
  tenant_id: number;
  user_id: number;
  amount: number;
  payment_date: Date;
  description: string;
  payment_method: string;
  transaction_id: string;
  category: string;
  reference_number: string;
  status: string;
  receipt_id?: number;
  remarks: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
  created_by: number;
  updated_by?: number;
  deleted_by?: number;
}

class MiscellaneousPayment extends Model<MiscellaneousPaymentAttributes> implements MiscellaneousPaymentAttributes {
  public id!: number;
  public tenant_id!: number;
  public user_id!: number;
  public amount!: number;
  public payment_date!: Date;
  public description!: string;
  public payment_method!: string;
  public transaction_id!: string;
  public category!: string;
  public reference_number!: string;
  public status!: string;
  public receipt_id?: number;
  public remarks!: string;
  public created_at?: Date;
  public updated_at?: Date;
  public deleted_at?: Date;
  public created_by!: number;
  public updated_by?: number;
  public deleted_by?: number;

  // Add soft delete functionality
  public async softDelete(userId: number): Promise<void> {
    await this.update({
      deleted_by: userId,
      deleted_at: new Date()
    });
  }

  // Add static method for creating with audit
  public static async createWithAudit(data: Omit<MiscellaneousPaymentAttributes, 'id' | 'created_by'>, userId: number) {
    return await this.create({
      ...data,
      created_by: userId
    });
  }
}

MiscellaneousPayment.init(
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reference_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'completed',
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
    ...BaseAuditableModel.getAuditFields(),
  },
  {
    sequelize,
    tableName: 'miscellaneous_payments',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['user_id'] },
    ],
    ...BaseAuditableModel.getAuditOptions(),
  }
);

// Define associations
Tenant.hasMany(MiscellaneousPayment, { foreignKey: 'tenant_id' });
MiscellaneousPayment.belongsTo(Tenant, { foreignKey: 'tenant_id' });

User.hasMany(MiscellaneousPayment, { foreignKey: 'user_id' });
MiscellaneousPayment.belongsTo(User, { foreignKey: 'user_id' });

export default MiscellaneousPayment; 