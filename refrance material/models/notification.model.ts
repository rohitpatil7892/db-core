import { pool } from '../db/init';
import { ApiError } from '../middlewares/error.middleware';
import logger from '../config/logger';
import {
  TABLES,
  COLUMNS,
  STATUS,
  NOTIFICATION_CHANNELS,
  ERROR_MESSAGES
} from '../constants/database.constants';

// Interfaces
export interface NotificationType {
  id: number;
  name: string;
  description: string;
  created_at: Date;
}

export interface NotificationTemplate {
  id: number;
  notification_type_id: number;
  title: string;
  content: string;
  created_at: Date;
}

export interface Notification {
  id: number;
  notification_type_id: number;
  template_id: number;
  user_id: number;
  title: string;
  content: string;
  status: string;
  scheduled_date?: Date;
  sent_date?: Date;
  created_at: Date;
}

export interface NotificationSubscription {
  id: number;
  user_id: number;
  notification_type_id: number;
  channel: string;
  is_active: boolean;
  created_at: Date;
}

export interface CreateNotificationTypeInput {
  name: string;
  description: string;
}

export interface CreateNotificationTemplateInput {
  notification_type_id: number;
  title: string;
  content: string;
}

export interface CreateNotificationInput {
  notification_type_id: number;
  notification_template_id: number; // This will map to template_id in the database
  user_id: number;
  title: string;
  content: string;
  is_read?: boolean; // This will map to status in the database
  scheduled_date?: Date;
  sent_date?: Date;
}

export interface CreateNotificationSubscriptionInput {
  user_id: number;
  notification_type_id: number;
  channel: string;
}

export class NotificationModel {
  private static instance: NotificationModel;

  private constructor() {}

  /**
   * Gets the singleton instance of the NotificationModel class.
   * @returns {NotificationModel} The singleton instance of NotificationModel
   */
  public static getInstance(): NotificationModel {
    if (!NotificationModel.instance) {
      NotificationModel.instance = new NotificationModel();
    }
    return NotificationModel.instance;
  }

  /**
   * Creates an ApiError instance with the specified status code and message.
   * @param {number} statusCode - The HTTP status code for the error
   * @param {string} message - The error message
   * @returns {ApiError} The created ApiError instance
   */
  private createApiError(statusCode: number, message: string): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    return error;
  }

  /**
   * Retrieves all notification types from the database.
   * @returns {Promise<NotificationType[]>} An array of all notification types
   */
  public async getAllNotificationTypes(): Promise<NotificationType[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.NOTIFICATION_TYPES} ORDER BY ${COLUMNS.NAME}`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting all notification types:', error);
      throw error;
    }
  }

  /**
   * Retrieves a notification type by its ID.
   * @param {number} id - The ID of the notification type to retrieve
   * @returns {Promise<NotificationType | null>} The requested notification type or null if not found
   */
  public async getNotificationTypeById(id: number): Promise<NotificationType | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.NOTIFICATION_TYPES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting notification type by ID:', error);
      throw error;
    }
  }

  /**
   * Creates a new notification type in the database.
   * @param {CreateNotificationTypeInput} data - The notification type data to create
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<NotificationType>} The created notification type
   */
  public async createNotificationType(data: CreateNotificationTypeInput, userId?: number): Promise<NotificationType> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.NOTIFICATION_TYPES} (
          ${COLUMNS.NAME}, 
          ${COLUMNS.DESCRIPTION},
          ${COLUMNS.CREATED_BY},
          ${COLUMNS.UPDATED_BY}
        ) VALUES ($1, $2, $3, $4) RETURNING *`,
        [data.name, data.description, userId || null, userId || null]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification type:', error);
      throw error;
    }
  }

  /**
   * Updates an existing notification type in the database.
   * @param {number} id - The ID of the notification type to update
   * @param {Partial<CreateNotificationTypeInput>} data - The notification type data to update
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<NotificationType | null>} The updated notification type or null if not found
   */
  public async updateNotificationType(
    id: number,
    data: Partial<CreateNotificationTypeInput>,
    userId?: number
  ): Promise<NotificationType | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.NOTIFICATION_TYPES} 
         SET ${COLUMNS.NAME} = COALESCE($1, ${COLUMNS.NAME}), 
             ${COLUMNS.DESCRIPTION} = COALESCE($2, ${COLUMNS.DESCRIPTION}),
             ${COLUMNS.UPDATED_BY} = $3,
             ${COLUMNS.UPDATED_AT} = NOW()
         WHERE ${COLUMNS.ID} = $4 
         RETURNING *`,
        [data.name, data.description, userId || null, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating notification type:', error);
      throw error;
    }
  }

  /**
   * Deletes a notification type from the database.
   * @param {number} id - The ID of the notification type to delete
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<boolean>} True if the notification type was deleted, false otherwise
   */
  public async deleteNotificationType(id: number, userId?: number): Promise<boolean> {
    try {
      // Check if the table has deleted_at column (supports soft delete)
      const tableInfoQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${TABLES.NOTIFICATION_TYPES}' 
        AND column_name = '${COLUMNS.DELETED_AT}'
      `;
      
      const columnInfo = await pool.query(tableInfoQuery);
      const hasSoftDelete = columnInfo.rows.length > 0;
      
      let result;
      if (hasSoftDelete) {
        // Soft delete
        result = await pool.query(
          `UPDATE ${TABLES.NOTIFICATION_TYPES}
           SET ${COLUMNS.DELETED_AT} = NOW(),
               ${COLUMNS.DELETED_BY} = $1
           WHERE ${COLUMNS.ID} = $2
           RETURNING ${COLUMNS.ID}`,
          [userId || null, id]
        );
      } else {
        // Hard delete
        result = await pool.query(
          `DELETE FROM ${TABLES.NOTIFICATION_TYPES} WHERE ${COLUMNS.ID} = $1 RETURNING ${COLUMNS.ID}`,
          [id]
        );
      }
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error deleting notification type:', error);
      throw error;
    }
  }

  /**
   * Retrieves all notification templates from the database.
   * @returns {Promise<NotificationTemplate[]>} An array of all notification templates
   */
  public async getAllNotificationTemplates(): Promise<NotificationTemplate[]> {
    try {
      const result = await pool.query(`
        SELECT nt.*, ntt.${COLUMNS.NAME} as notification_type_name 
        FROM ${TABLES.NOTIFICATION_TEMPLATES} nt
        JOIN ${TABLES.NOTIFICATION_TYPES} ntt ON nt.${COLUMNS.NOTIFICATION_TYPE_ID} = ntt.${COLUMNS.ID}
        ORDER BY nt.${COLUMNS.CREATED_AT} DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all notification templates:', error);
      throw error;
    }
  }

  /**
   * Retrieves a notification template by its ID.
   * @param {number} id - The ID of the notification template to retrieve
   * @returns {Promise<NotificationTemplate | null>} The requested notification template or null if not found
   */
  public async getNotificationTemplateById(id: number): Promise<NotificationTemplate | null> {
    try {
      const result = await pool.query(`
        SELECT nt.*, ntt.${COLUMNS.NAME} as notification_type_name 
        FROM ${TABLES.NOTIFICATION_TEMPLATES} nt
        JOIN ${TABLES.NOTIFICATION_TYPES} ntt ON nt.${COLUMNS.NOTIFICATION_TYPE_ID} = ntt.${COLUMNS.ID}
        WHERE nt.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting notification template by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all notification templates for a specific notification type.
   * @param {number} notificationTypeId - The ID of the notification type
   * @returns {Promise<NotificationTemplate[]>} An array of notification templates for the specified type
   */
  public async getNotificationTemplatesByType(notificationTypeId: number): Promise<NotificationTemplate[]> {
    try {
      const result = await pool.query(`
        SELECT nt.*, ntt.${COLUMNS.NAME} as notification_type_name 
        FROM ${TABLES.NOTIFICATION_TEMPLATES} nt
        JOIN ${TABLES.NOTIFICATION_TYPES} ntt ON nt.${COLUMNS.NOTIFICATION_TYPE_ID} = ntt.${COLUMNS.ID}
        WHERE nt.${COLUMNS.NOTIFICATION_TYPE_ID} = $1
        ORDER BY nt.${COLUMNS.CREATED_AT} DESC
      `, [notificationTypeId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notification templates by type:', error);
      throw error;
    }
  }

  /**
   * Creates a new notification template in the database.
   * @param {CreateNotificationTemplateInput} data - The notification template data to create
   * @returns {Promise<NotificationTemplate>} The created notification template
   */
  public async createNotificationTemplate(data: CreateNotificationTemplateInput): Promise<NotificationTemplate> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.NOTIFICATION_TEMPLATES} 
         (${COLUMNS.NOTIFICATION_TYPE_ID}, ${COLUMNS.TITLE}, ${COLUMNS.CONTENT}) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [data.notification_type_id, data.title, data.content]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Updates an existing notification template in the database.
   * @param {number} id - The ID of the notification template to update
   * @param {Partial<CreateNotificationTemplateInput>} data - The notification template data to update
   * @returns {Promise<NotificationTemplate | null>} The updated notification template or null if not found
   */
  public async updateNotificationTemplate(
    id: number,
    data: Partial<CreateNotificationTemplateInput>
  ): Promise<NotificationTemplate | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.NOTIFICATION_TEMPLATES} 
         SET ${COLUMNS.NOTIFICATION_TYPE_ID} = COALESCE($1, ${COLUMNS.NOTIFICATION_TYPE_ID}), 
             ${COLUMNS.TITLE} = COALESCE($2, ${COLUMNS.TITLE}), 
             ${COLUMNS.CONTENT} = COALESCE($3, ${COLUMNS.CONTENT}) 
         WHERE ${COLUMNS.ID} = $4 
         RETURNING *`,
        [data.notification_type_id, data.title, data.content, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating notification template:', error);
      throw error;
    }
  }

  /**
   * Deletes a notification template from the database.
   * @param {number} id - The ID of the notification template to delete
   * @returns {Promise<boolean>} True if the notification template was deleted, false otherwise
   */
  public async deleteNotificationTemplate(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.NOTIFICATION_TEMPLATES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting notification template:', error);
      throw error;
    }
  }

  /**
   * Retrieves all notifications from the database.
   * @returns {Promise<Notification[]>} An array of all notifications
   */
  public async getAllNotifications(): Promise<Notification[]> {
    try {
      const result = await pool.query(`
        SELECT n.*, nt.${COLUMNS.NAME} as notification_type_name, 
               ntt.${COLUMNS.NAME} as template_name, ntt.${COLUMNS.CONTENT} as template_content 
        FROM ${TABLES.NOTIFICATIONS} n
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON n.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        JOIN ${TABLES.NOTIFICATION_TEMPLATES} ntt ON n.template_id = ntt.${COLUMNS.ID}
        ORDER BY n.${COLUMNS.CREATED_AT} DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all notifications:', error);
      throw error;
    }
  }

  /**
   * Retrieves a notification by its ID.
   * @param {number} id - The ID of the notification to retrieve
   * @returns {Promise<Notification | null>} The requested notification or null if not found
   */
  public async getNotificationById(id: number): Promise<Notification | null> {
    try {
      const result = await pool.query(`
        SELECT n.*, nt.${COLUMNS.NAME} as notification_type_name, 
               ntt.${COLUMNS.NAME} as template_name, ntt.${COLUMNS.CONTENT} as template_content 
        FROM ${TABLES.NOTIFICATIONS} n
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON n.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        JOIN ${TABLES.NOTIFICATION_TEMPLATES} ntt ON n.template_id = ntt.${COLUMNS.ID}
        WHERE n.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting notification by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all notifications for a specific user.
   * @param {number} userId - The ID of the user
   * @returns {Promise<Notification[]>} An array of notifications for the specified user
   */
  public async getNotificationsByUser(userId: number): Promise<Notification[]> {
    try {
      const result = await pool.query(`
        SELECT n.*, nt.${COLUMNS.NAME} as notification_type_name, 
               ntt.${COLUMNS.NAME} as template_name, ntt.${COLUMNS.CONTENT} as template_content 
        FROM ${TABLES.NOTIFICATIONS} n
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON n.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        JOIN ${TABLES.NOTIFICATION_TEMPLATES} ntt ON n.template_id = ntt.${COLUMNS.ID}
        WHERE n.${COLUMNS.USER_ID} = $1
        ORDER BY n.${COLUMNS.CREATED_AT} DESC
      `, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notifications by user:', error);
      throw error;
    }
  }

  /**
   * Creates a new notification in the database.
   * @param {CreateNotificationInput} data - The notification data to create
   * @returns {Promise<Notification>} The created notification
   */
  public async createNotification(data: CreateNotificationInput): Promise<Notification> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.NOTIFICATIONS} 
         (${COLUMNS.NOTIFICATION_TYPE_ID}, template_id, ${COLUMNS.USER_ID}, 
          ${COLUMNS.TITLE}, ${COLUMNS.CONTENT}, status) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          data.notification_type_id,
          data.notification_template_id,
          data.user_id,
          data.title,
          data.content,
          'pending'
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Updates an existing notification in the database.
   * @param {number} id - The ID of the notification to update
   * @param {Partial<CreateNotificationInput>} data - The notification data to update
   * @returns {Promise<Notification | null>} The updated notification or null if not found
   */
  public async updateNotification(
    id: number,
    data: Partial<CreateNotificationInput>
  ): Promise<Notification | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.NOTIFICATIONS} 
         SET ${COLUMNS.NOTIFICATION_TYPE_ID} = COALESCE($1, ${COLUMNS.NOTIFICATION_TYPE_ID}), 
             template_id = COALESCE($2, template_id), 
             ${COLUMNS.USER_ID} = COALESCE($3, ${COLUMNS.USER_ID}), 
             ${COLUMNS.TITLE} = COALESCE($4, ${COLUMNS.TITLE}), 
             ${COLUMNS.CONTENT} = COALESCE($5, ${COLUMNS.CONTENT}), 
             status = COALESCE($6, status) 
         WHERE ${COLUMNS.ID} = $7 
         RETURNING *`,
        [
          data.notification_type_id,
          data.notification_template_id,
          data.user_id,
          data.title,
          data.content,
          data.is_read ? 'read' : 'pending',
          id
        ]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating notification:', error);
      throw error;
    }
  }

  /**
   * Deletes a notification from the database.
   * @param {number} id - The ID of the notification to delete
   * @returns {Promise<boolean>} True if the notification was deleted, false otherwise
   */
  public async deleteNotification(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.NOTIFICATIONS} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Retrieves all notification subscriptions from the database.
   * @returns {Promise<NotificationSubscription[]>} An array of all notification subscriptions
   */
  public async getAllNotificationSubscriptions(): Promise<NotificationSubscription[]> {
    try {
      const result = await pool.query(`
        SELECT ns.*, nt.${COLUMNS.NAME} as notification_type_name 
        FROM ${TABLES.NOTIFICATION_SUBSCRIPTIONS} ns
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON ns.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        ORDER BY ns.${COLUMNS.CREATED_AT} DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all notification subscriptions:', error);
      throw error;
    }
  }

  /**
   * Retrieves a notification subscription by its ID.
   * @param {number} id - The ID of the notification subscription to retrieve
   * @returns {Promise<NotificationSubscription | null>} The requested notification subscription or null if not found
   */
  public async getNotificationSubscriptionById(id: number): Promise<NotificationSubscription | null> {
    try {
      const result = await pool.query(`
        SELECT ns.*, nt.${COLUMNS.NAME} as notification_type_name 
        FROM ${TABLES.NOTIFICATION_SUBSCRIPTIONS} ns
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON ns.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        WHERE ns.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting notification subscription by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all notification subscriptions for a specific user.
   * @param {number} userId - The ID of the user
   * @returns {Promise<NotificationSubscription[]>} An array of notification subscriptions for the specified user
   */
  public async getNotificationSubscriptionsByUser(userId: number): Promise<NotificationSubscription[]> {
    try {
      const result = await pool.query(`
        SELECT ns.*, nt.${COLUMNS.NAME} as notification_type_name 
        FROM ${TABLES.NOTIFICATION_SUBSCRIPTIONS} ns
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON ns.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        WHERE ns.${COLUMNS.USER_ID} = $1
        ORDER BY ns.${COLUMNS.CREATED_AT} DESC
      `, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notification subscriptions by user:', error);
      throw error;
    }
  }

  /**
   * Creates a new notification subscription in the database.
   * @param {CreateNotificationSubscriptionInput} data - The notification subscription data to create
   * @returns {Promise<NotificationSubscription>} The created notification subscription
   */
  public async createNotificationSubscription(data: CreateNotificationSubscriptionInput): Promise<NotificationSubscription> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.NOTIFICATION_SUBSCRIPTIONS} 
         (${COLUMNS.USER_ID}, ${COLUMNS.NOTIFICATION_TYPE_ID}, ${COLUMNS.CHANNEL}, is_active) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [data.user_id, data.notification_type_id, data.channel, true]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification subscription:', error);
      throw error;
    }
  }

  /**
   * Updates an existing notification subscription in the database.
   * @param {number} id - The ID of the notification subscription to update
   * @param {Partial<CreateNotificationSubscriptionInput>} data - The notification subscription data to update
   * @returns {Promise<NotificationSubscription | null>} The updated notification subscription or null if not found
   */
  public async updateNotificationSubscription(
    id: number,
    data: Partial<CreateNotificationSubscriptionInput>
  ): Promise<NotificationSubscription | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.NOTIFICATION_SUBSCRIPTIONS} 
         SET ${COLUMNS.USER_ID} = COALESCE($1, ${COLUMNS.USER_ID}), 
             ${COLUMNS.NOTIFICATION_TYPE_ID} = COALESCE($2, ${COLUMNS.NOTIFICATION_TYPE_ID}), 
             ${COLUMNS.CHANNEL} = COALESCE($3, ${COLUMNS.CHANNEL}) 
         WHERE ${COLUMNS.ID} = $4 
         RETURNING *`,
        [data.user_id, data.notification_type_id, data.channel, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating notification subscription:', error);
      throw error;
    }
  }

  /**
   * Deletes a notification subscription from the database.
   * @param {number} id - The ID of the notification subscription to delete
   * @returns {Promise<boolean>} True if the notification subscription was deleted, false otherwise
   */
  public async deleteNotificationSubscription(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.NOTIFICATION_SUBSCRIPTIONS} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting notification subscription:', error);
      throw error;
    }
  }

  public async getNotificationsByType(typeId: number): Promise<Notification[]> {
    try {
      const result = await pool.query(`
        SELECT n.*, nt.${COLUMNS.NAME} as notification_type_name, 
               ntt.${COLUMNS.TITLE} as template_title, ntt.${COLUMNS.CONTENT} as template_content 
        FROM ${TABLES.NOTIFICATIONS} n
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON n.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        JOIN ${TABLES.NOTIFICATION_TEMPLATES} ntt ON n.${COLUMNS.NOTIFICATION_TEMPLATE_ID} = ntt.${COLUMNS.ID}
        WHERE n.${COLUMNS.NOTIFICATION_TYPE_ID} = $1
        ORDER BY n.${COLUMNS.CREATED_AT} DESC
      `, [typeId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notifications by type:', error);
      throw error;
    }
  }

  public async getNotificationsByStatus(status: string): Promise<Notification[]> {
    try {
      const result = await pool.query(`
        SELECT n.*, nt.${COLUMNS.NAME} as notification_type_name, 
               ntt.${COLUMNS.TITLE} as template_title, ntt.${COLUMNS.CONTENT} as template_content 
        FROM ${TABLES.NOTIFICATIONS} n
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON n.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        JOIN ${TABLES.NOTIFICATION_TEMPLATES} ntt ON n.${COLUMNS.NOTIFICATION_TEMPLATE_ID} = ntt.${COLUMNS.ID}
        WHERE n.status = $1
        ORDER BY n.${COLUMNS.CREATED_AT} DESC
      `, [status]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notifications by status:', error);
      throw error;
    }
  }

  public async getSubscriptionsByType(typeId: number): Promise<NotificationSubscription[]> {
    try {
      const result = await pool.query(`
        SELECT ns.*, nt.${COLUMNS.NAME} as notification_type_name 
        FROM ${TABLES.NOTIFICATION_SUBSCRIPTIONS} ns
        JOIN ${TABLES.NOTIFICATION_TYPES} nt ON ns.${COLUMNS.NOTIFICATION_TYPE_ID} = nt.${COLUMNS.ID}
        WHERE ns.${COLUMNS.NOTIFICATION_TYPE_ID} = $1
        ORDER BY ns.${COLUMNS.CREATED_AT} DESC
      `, [typeId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting subscriptions by type:', error);
      throw error;
    }
  }
} 