import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import User from './User';
import Tenant from './Tenant';

class MeetingTemplate extends Model {
  declare id: number;
  declare tenant_id: number;
  declare template_name: string;
  declare meeting_type: string;
  declare template_content: string;
  declare agenda_template: string;
  declare is_active: boolean;
  declare created_by: number;
  declare created_at: Date;

  // Association methods
  declare getCreatedBy: () => Promise<User>;
}

MeetingTemplate.init(
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
    template_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    meeting_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    template_content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    agenda_template: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
  },
  {
    sequelize,
    tableName: 'meeting_templates',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['created_by'] },
    ],
  }
);

// Define associations
Tenant.hasMany(MeetingTemplate, { foreignKey: 'tenant_id' });
MeetingTemplate.belongsTo(Tenant, { foreignKey: 'tenant_id' });

User.hasMany(MeetingTemplate, { foreignKey: 'created_by' });
MeetingTemplate.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

export default MeetingTemplate; 