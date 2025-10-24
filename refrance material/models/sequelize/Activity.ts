import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import ActivityType from './ActivityType';
import ActivityTemplate from './ActivityTemplate';
import Tenant from './Tenant';

class Activity extends Model {
  declare id: number;
  declare tenant_id: number;
  declare activity_type_id: number;
  declare template_id: number;
  declare title: string;
  declare description: string;
  declare scheduled_date: Date;
  declare status: string;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date;
  declare created_by: number;
  declare updated_by: number;
  declare deleted_by: number;
}

Activity.init(
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
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: ActivityTemplate,
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    scheduled_date: {
      type: DataTypes.DATE,
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
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'activities',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['activity_type_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(Activity, { foreignKey: 'tenant_id' });
Activity.belongsTo(Tenant, { foreignKey: 'tenant_id' });

ActivityType.hasMany(Activity, { foreignKey: 'activity_type_id' });
Activity.belongsTo(ActivityType, { foreignKey: 'activity_type_id' });

ActivityTemplate.hasMany(Activity, { foreignKey: 'template_id' });
Activity.belongsTo(ActivityTemplate, { foreignKey: 'template_id' });

export default Activity;