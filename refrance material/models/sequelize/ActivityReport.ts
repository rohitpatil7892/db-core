import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Activity from './Activity';
import Tenant from './Tenant';

class ActivityReport extends Model {
  declare id: number;
  declare tenant_id: number;
  declare activity_id: number;
  declare content: string;
  declare created_at: Date;
}

ActivityReport.init(
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
    content: {
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
    tableName: 'activity_reports',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['activity_id'] },
    ],
  }
);

// Define associations
Tenant.hasMany(ActivityReport, { foreignKey: 'tenant_id' });
ActivityReport.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Activity.hasMany(ActivityReport, { foreignKey: 'activity_id' });
ActivityReport.belongsTo(Activity, { foreignKey: 'activity_id' });

export default ActivityReport; 