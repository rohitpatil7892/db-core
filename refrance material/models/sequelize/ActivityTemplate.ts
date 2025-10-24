import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import ActivityType from './ActivityType';
import Tenant from './Tenant';

class ActivityTemplate extends Model {
  declare id: number;
  declare tenant_id: number;
  declare activity_type_id: number;
  declare title: string;
  declare description: string;
  declare created_at: Date;
}

ActivityTemplate.init(
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
    activity_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ActivityType,
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'activity_templates',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['activity_type_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(ActivityTemplate, { foreignKey: 'tenant_id' });
ActivityTemplate.belongsTo(Tenant, { foreignKey: 'tenant_id' });

ActivityType.hasMany(ActivityTemplate, { foreignKey: 'activity_type_id' });
ActivityTemplate.belongsTo(ActivityType, { foreignKey: 'activity_type_id' });

export default ActivityTemplate; 