import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Activity from './Activity';
import User from './User';
import Tenant from './Tenant';

class Meeting extends Model {
  declare id: number;
  declare tenant_id: number;
  declare activity_id: number;
  declare meeting_type: string;
  declare agenda: string;
  declare meeting_minutes: string;
  declare attendee_count: number;
  declare expected_attendees: number;
  declare resolution_count: number;
  declare meeting_status: string;
  declare meeting_location: string;
  declare meeting_date: Date;
  declare meeting_time: string;
  declare created_by: number;
  declare created_at: Date;
  declare updated_at: Date;

  // Association methods
  declare getActivity: () => Promise<Activity>;
  declare getCreatedBy: () => Promise<User>;
}

Meeting.init(
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
      allowNull: true,
      references: {
        model: Activity,
        key: 'id',
      },
    },
    meeting_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    agenda: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    meeting_minutes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attendee_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    expected_attendees: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    resolution_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    meeting_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'scheduled',
    },
    meeting_location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    meeting_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    meeting_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
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
    tableName: 'meetings',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['activity_id'] },
      { fields: ['created_by'] },
    ],
  }
);

// Define associations
Tenant.hasMany(Meeting, { foreignKey: 'tenant_id' });
Meeting.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Activity.hasOne(Meeting, { foreignKey: 'activity_id' });
Meeting.belongsTo(Activity, { foreignKey: 'activity_id' });

User.hasMany(Meeting, { foreignKey: 'created_by' });
Meeting.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

export default Meeting; 