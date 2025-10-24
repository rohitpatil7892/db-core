import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';

class Tenant extends Model {
  declare id: number;
  declare name: string;
  declare slug: string;
  declare description?: string;
  declare is_active: boolean;
  declare settings?: object;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at?: Date;
}

Tenant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'tenants',
    timestamps: false,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['is_active'] },
    ],
  }
);

export default Tenant;
