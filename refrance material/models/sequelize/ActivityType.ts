import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/sequelize';
import Tenant from './Tenant';

class ActivityType extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare description?: string;
  declare created_at: Date;
}

ActivityType.init(
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'activity_types',
    timestamps: false,
    indexes: [
      { fields: ['tenant_id'] },
    ],
  }
);

Tenant.hasMany(ActivityType, { foreignKey: 'tenant_id' });
ActivityType.belongsTo(Tenant, { foreignKey: 'tenant_id' });

export default ActivityType; 