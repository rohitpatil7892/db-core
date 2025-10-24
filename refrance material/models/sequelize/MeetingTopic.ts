import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Meeting from './Meeting';
import Tenant from './Tenant';

class MeetingTopic extends Model {
  declare id: number;
  declare tenant_id: number;
  declare meeting_id: number;
  declare topic: string;
  declare topic_order: number;
  declare created_at: Date;
  declare updated_at: Date;

  // Association methods
  declare getMeeting: () => Promise<Meeting>;
}

MeetingTopic.init(
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
    topic: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    topic_order: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
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
    tableName: 'meeting_topics',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['meeting_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(MeetingTopic, { foreignKey: 'tenant_id' });
MeetingTopic.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Meeting.hasMany(MeetingTopic, { foreignKey: 'meeting_id', as: 'topics' });
MeetingTopic.belongsTo(Meeting, { foreignKey: 'meeting_id' });

export default MeetingTopic; 