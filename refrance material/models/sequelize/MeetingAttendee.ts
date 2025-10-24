import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Meeting from './Meeting';
import User from './User';
import Tenant from './Tenant';

class MeetingAttendee extends Model {
  declare id: number;
  declare tenant_id: number;
  declare meeting_id: number;
  declare user_id: number;
  declare attendance_status: string;
  declare attendee_role: string;
  declare joined_at: Date;
  declare left_at: Date;
  declare created_at: Date;

  // Association methods
  declare getMeeting: () => Promise<Meeting>;
  declare getUser: () => Promise<User>;
}

MeetingAttendee.init(
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
    meeting_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Meeting,
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
    attendance_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'invited',
    },
    attendee_role: {
      type: DataTypes.STRING(50),
      defaultValue: 'participant',
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    left_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'meeting_attendees',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['meeting_id'] },
      { fields: ['user_id'] },
      {
        unique: true,
        fields: ['meeting_id', 'user_id'],
      },
    ],
  }
);

// Define associations
Tenant.hasMany(MeetingAttendee, { foreignKey: 'tenant_id' });
MeetingAttendee.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Meeting.hasMany(MeetingAttendee, { foreignKey: 'meeting_id', as: 'attendees' });
MeetingAttendee.belongsTo(Meeting, { foreignKey: 'meeting_id' });

User.hasMany(MeetingAttendee, { foreignKey: 'user_id' });
MeetingAttendee.belongsTo(User, { foreignKey: 'user_id' });

export default MeetingAttendee; 