import { DataTypes, Model, ModelAttributes, ModelOptions } from 'sequelize';
import sequelize from '../../db/sequelize';

export interface AuditableAttributes {
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
  deleted_by?: number;
}

export abstract class BaseAuditableModel<T extends AuditableAttributes> extends Model<T> {
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at?: Date;
  declare created_by?: number;
  declare updated_by?: number;
  declare deleted_by?: number;

  /**
   * Get the base audit fields that should be added to all models
   */
  static getAuditFields(): ModelAttributes {
    return {
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      deleted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    };
  }

  /**
   * Get the base model options with audit configuration
   */
  static getAuditOptions(): Partial<ModelOptions> {
    return {
      timestamps: false, // We handle timestamps manually
      paranoid: false, // We handle soft deletes manually
      hooks: {
        beforeCreate: (instance: any, options: any) => {
          const userId = options.userId || options.user_id;
          if (userId) {
            instance.created_by = userId;
            instance.updated_by = userId;
          }
        },
        beforeUpdate: (instance: any, options: any) => {
          const userId = options.userId || options.user_id;
          if (userId) {
            instance.updated_by = userId;
          }
        },
        beforeDestroy: (instance: any, options: any) => {
          const userId = options.userId || options.user_id;
          if (userId) {
            instance.deleted_by = userId;
            instance.deleted_at = new Date();
          }
        },
      },
    };
  }

  /**
   * Soft delete the record
   */
  async softDelete(userId?: number): Promise<this> {
    this.deleted_at = new Date();
    if (userId) {
      this.deleted_by = userId;
    }
    return this.save();
  }

  /**
   * Restore a soft deleted record
   */
  async restoreRecord(userId?: number): Promise<this> {
    this.deleted_at = undefined;
    this.deleted_by = undefined;
    if (userId) {
      this.updated_by = userId;
    }
    return this.save();
  }

  /**
   * Check if the record is soft deleted
   */
  get isDeleted(): boolean {
    return this.deleted_at !== null && this.deleted_at !== undefined;
  }

  /**
   * Get audit trail for this record
   */
  async getAuditTrail() {
    const AuditLog = require('./AuditLog').default;
    return AuditLog.getByTable(this.constructor.name.toLowerCase(), (this as any).id);
  }

  /**
   * Create a new record with audit information
   */
  static async createWithAudit<T extends Model>(
    this: new () => T,
    values: any,
    userId?: number,
    options?: any
  ): Promise<T> {
    const createOptions = {
      ...options,
      userId,
    };
    return (this as any).create(values, createOptions);
  }

  /**
   * Update a record with audit information
   */
  static async updateWithAudit<T extends Model>(
    this: new () => T,
    values: any,
    options: any,
    userId?: number
  ): Promise<[number, T[]]> {
    const updateOptions = {
      ...options,
      userId,
    };
    return (this as any).update(values, updateOptions);
  }

  /**
   * Soft delete records with audit information
   */
  static async softDeleteWithAudit<T extends Model>(
    this: new () => T,
    options: any,
    userId?: number
  ): Promise<number> {
    const updateOptions = {
      ...options,
      userId,
    };
    
    const records = await (this as any).findAll(options);
    const updatePromises = records.map((record: any) => record.softDelete(userId));
    await Promise.all(updatePromises);
    
    return records.length;
  }

  /**
   * Find all records excluding soft deleted ones by default
   */
  static async findAllActive<T extends Model>(
    this: new () => T,
    options: any = {}
  ): Promise<T[]> {
    const whereClause = {
      ...options.where,
      deleted_at: null,
    };
    
    return (this as any).findAll({
      ...options,
      where: whereClause,
    });
  }

  /**
   * Find one record excluding soft deleted ones by default
   */
  static async findOneActive<T extends Model>(
    this: new () => T,
    options: any = {}
  ): Promise<T | null> {
    const whereClause = {
      ...options.where,
      deleted_at: null,
    };
    
    return (this as any).findOne({
      ...options,
      where: whereClause,
    });
  }

  /**
   * Find by primary key excluding soft deleted ones by default
   */
  static async findByPkActive<T extends Model>(
    this: new () => T,
    id: any,
    options: any = {}
  ): Promise<T | null> {
    const whereClause = {
      ...options.where,
      deleted_at: null,
    };
    
    return (this as any).findByPk(id, {
      ...options,
      where: whereClause,
    });
  }
}

export default BaseAuditableModel; 