import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import User from './User';
import Role from './Role';

class UserRole extends Model {
  declare user_id: number;
  declare role_id: number;
}

UserRole.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Role,
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'user_roles',
    timestamps: false,
  }
);

// Define associations
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' });

export default UserRole; 