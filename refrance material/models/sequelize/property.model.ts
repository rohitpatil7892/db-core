import { Model, DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize';

export class Property extends Model {
  public id!: number;
  public propertyAddress!: string;
  public propertyTypeId!: number;
  public area!: number;
  public wardId!: number;
  public ownerId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Property.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    propertyAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    propertyTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'property_types',
        key: 'id',
      },
    },
    area: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    wardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'wards',
        key: 'id',
      },
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'properties',
    timestamps: true,
  }
); 