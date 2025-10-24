import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class User extends Model {
  declare id: number;
  declare tenant_id: number;
  declare username: string;
  declare password_hash: string;
  declare email: string;
  declare full_name: string;
  declare phone?: string;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

User.init(
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
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: false,
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['tenant_id'] },
      { fields: ['tenant_id', 'username'], unique: true },
      { fields: ['tenant_id', 'email'], unique: true },
    ]
  }
);

// Define associations
Tenant.hasMany(User, { foreignKey: 'tenant_id' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default User; 