import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Meeting from './Meeting';
import User from './User';
import Tenant from './Tenant';

class MeetingResolution extends Model {
  declare id: number;
  declare tenant_id: number;
  declare meeting_id: number;
  declare resolution_title: string;
  declare resolution_text: string;
  declare resolution_status: string;
  declare votes_for: number;
  declare votes_against: number;
  declare votes_abstain: number;
  declare proposed_by: number;
  declare created_at: Date;
  declare updated_at: Date;

  // Association methods
  declare getMeeting: () => Promise<Meeting>;
  declare getProposedBy: () => Promise<User>;
}

MeetingResolution.init(
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
    resolution_title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    resolution_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    resolution_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'proposed',
    },
    votes_for: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    votes_against: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    votes_abstain: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    proposed_by: {
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
    tableName: 'meeting_resolutions',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['meeting_id'] },
      { fields: ['proposed_by'] },
    ],
  }
);

// Define associations
Tenant.hasMany(MeetingResolution, { foreignKey: 'tenant_id' });
MeetingResolution.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Meeting.hasMany(MeetingResolution, { foreignKey: 'meeting_id', as: 'resolutions' });
MeetingResolution.belongsTo(Meeting, { foreignKey: 'meeting_id' });

User.hasMany(MeetingResolution, { foreignKey: 'proposed_by' });
MeetingResolution.belongsTo(User, { foreignKey: 'proposed_by', as: 'proposer' });

export default MeetingResolution; 