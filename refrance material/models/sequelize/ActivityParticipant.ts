import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Activity from './Activity';
import User from './User';
import Tenant from './Tenant';

class ActivityParticipant extends Model {
  declare id: number;
  declare tenant_id: number;
  declare activity_id: number;
  declare user_id: number;
  declare role: string;
  declare status: string;
  declare created_at: Date;
}

ActivityParticipant.init(
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
    activity_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Activity,
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    role: {
      type: DataTypes.STRING(50),
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
    tableName: 'activity_participants',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['activity_id'] },
      { fields: ['user_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(ActivityParticipant, { foreignKey: 'tenant_id' });
ActivityParticipant.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Activity.hasMany(ActivityParticipant, { foreignKey: 'activity_id' });
ActivityParticipant.belongsTo(Activity, { foreignKey: 'activity_id' });

User.hasMany(ActivityParticipant, { foreignKey: 'user_id' });
ActivityParticipant.belongsTo(User, { foreignKey: 'user_id' });

export default ActivityParticipant; 