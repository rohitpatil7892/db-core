import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../db';

export class TaxAssessment extends Model {
  public id!: number;
  public property_id!: number;
  public tax_contract_id!: number;
  public assessment_date!: Date;
  public amount!: number;
  public status!: string;
  public readonly created_at!: Date;
}

TaxAssessment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    property_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'properties',
        key: 'id',
      },
    },
    tax_contract_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tax_contracts',
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
    }
  },
  {
    sequelize,
    tableName: 'tax_assessments',
    timestamps: false,
  }
); 