import { pool } from '../db/init';
import { ApiError } from '../middlewares/error.middleware';
import logger from '../config/logger';
import {
  TABLES,
  COLUMNS,
  STATUS,
  ERROR_MESSAGES
} from '../constants/database.constants';

// Interfaces
export interface ActivityType {
  id: number;
  name: string;
  description: string;
  created_at: Date;
}

export interface ActivityTemplate {
  id: number;
  activity_type_id: number;
  title: string;
  description: string;
  created_at: Date;
}

export interface Activity {
  id: number;
  activity_type_id: number;
  template_id: number;
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  location: string;
  status: string;
  created_at: Date;
}

export interface ActivityParticipant {
  id: number;
  activity_id: number;
  user_id: number;
  role: string;
  status: string;
  created_at: Date;
}

export interface ActivityReport {
  id: number;
  activity_id: number;
  content: string;
  created_at: Date;
}

export interface CreateActivityTypeInput {
  name: string;
  description: string;
}

export interface CreateActivityTemplateInput {
  activity_type_id: number;
  title: string;
  description: string;
}

export interface CreateActivityInput {
  activity_type_id: number;
  template_id: number;
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  location: string;
  status: string;
}

export interface CreateActivityParticipantInput {
  activity_id: number;
  user_id: number;
  role: string;
}

export interface CreateActivityReportInput {
  activity_id: number;
  content: string;
}

export class ActivityModel {
  private static instance: ActivityModel;

  private constructor() {}

  /**
   * Gets the singleton instance of the ActivityModel class.
   * @returns {ActivityModel} The singleton instance of ActivityModel
   */
  public static getInstance(): ActivityModel {
    if (!ActivityModel.instance) {
      ActivityModel.instance = new ActivityModel();
    }
    return ActivityModel.instance;
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
   * Retrieves all activity types from the database.
   * @returns {Promise<ActivityType[]>} An array of all activity types
   */
  public async getAllActivityTypes(): Promise<ActivityType[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.ACTIVITY_TYPES} ORDER BY ${COLUMNS.NAME}`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting all activity types:', error);
      throw error;
    }
  }

  /**
   * Retrieves an activity type by its ID.
   * @param {number} id - The ID of the activity type to retrieve
   * @returns {Promise<ActivityType | null>} The requested activity type or null if not found
   */
  public async getActivityTypeById(id: number): Promise<ActivityType | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.ACTIVITY_TYPES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting activity type by ID:', error);
      throw error;
    }
  }

  /**
   * Creates a new activity type in the database.
   * @param {CreateActivityTypeInput} data - The activity type data to create
   * @returns {Promise<ActivityType>} The created activity type
   */
  public async createActivityType(data: CreateActivityTypeInput): Promise<ActivityType> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.ACTIVITY_TYPES} (${COLUMNS.NAME}, ${COLUMNS.DESCRIPTION}) VALUES ($1, $2) RETURNING *`,
        [data.name, data.description]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating activity type:', error);
      throw error;
    }
  }

  /**
   * Updates an existing activity type in the database.
   * @param {number} id - The ID of the activity type to update
   * @param {Partial<CreateActivityTypeInput>} data - The activity type data to update
   * @returns {Promise<ActivityType | null>} The updated activity type or null if not found
   */
  public async updateActivityType(
    id: number,
    data: Partial<CreateActivityTypeInput>
  ): Promise<ActivityType | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.ACTIVITY_TYPES} 
         SET ${COLUMNS.NAME} = COALESCE($1, ${COLUMNS.NAME}), 
             ${COLUMNS.DESCRIPTION} = COALESCE($2, ${COLUMNS.DESCRIPTION}) 
         WHERE ${COLUMNS.ID} = $3 
         RETURNING *`,
        [data.name, data.description, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating activity type:', error);
      throw error;
    }
  }

  /**
   * Deletes an activity type from the database.
   * @param {number} id - The ID of the activity type to delete
   * @returns {Promise<boolean>} True if the activity type was deleted, false otherwise
   */
  public async deleteActivityType(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.ACTIVITY_TYPES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting activity type:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activity templates from the database.
   * @returns {Promise<ActivityTemplate[]>} An array of all activity templates
   */
  public async getAllActivityTemplates(): Promise<ActivityTemplate[]> {
    try {
      const result = await pool.query(`
        SELECT at.*, aty.${COLUMNS.NAME} as activity_type_name 
        FROM ${TABLES.ACTIVITY_TEMPLATES} at
        JOIN ${TABLES.ACTIVITY_TYPES} aty ON at.${COLUMNS.ACTIVITY_TYPE_ID} = aty.${COLUMNS.ID}
        ORDER BY at.${COLUMNS.CREATED_AT} DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all activity templates:', error);
      throw error;
    }
  }

  /**
   * Retrieves an activity template by its ID.
   * @param {number} id - The ID of the activity template to retrieve
   * @returns {Promise<ActivityTemplate | null>} The requested activity template or null if not found
   */
  public async getActivityTemplateById(id: number): Promise<ActivityTemplate | null> {
    try {
      const result = await pool.query(`
        SELECT at.*, aty.${COLUMNS.NAME} as activity_type_name 
        FROM ${TABLES.ACTIVITY_TEMPLATES} at
        JOIN ${TABLES.ACTIVITY_TYPES} aty ON at.${COLUMNS.ACTIVITY_TYPE_ID} = aty.${COLUMNS.ID}
        WHERE at.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting activity template by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activity templates for a specific activity type.
   * @param {number} activityTypeId - The ID of the activity type
   * @returns {Promise<ActivityTemplate[]>} An array of activity templates for the specified type
   */
  public async getActivityTemplatesByType(activityTypeId: number): Promise<ActivityTemplate[]> {
    try {
      const result = await pool.query(`
        SELECT at.*, aty.${COLUMNS.NAME} as activity_type_name 
        FROM ${TABLES.ACTIVITY_TEMPLATES} at
        JOIN ${TABLES.ACTIVITY_TYPES} aty ON at.${COLUMNS.ACTIVITY_TYPE_ID} = aty.${COLUMNS.ID}
        WHERE at.${COLUMNS.ACTIVITY_TYPE_ID} = $1
        ORDER BY at.${COLUMNS.CREATED_AT} DESC
      `, [activityTypeId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting activity templates by type:', error);
      throw error;
    }
  }

  /**
   * Creates a new activity template in the database.
   * @param {CreateActivityTemplateInput} data - The activity template data to create
   * @returns {Promise<ActivityTemplate>} The created activity template
   */
  public async createActivityTemplate(data: CreateActivityTemplateInput): Promise<ActivityTemplate> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.ACTIVITY_TEMPLATES} 
         (${COLUMNS.ACTIVITY_TYPE_ID}, ${COLUMNS.TITLE}, ${COLUMNS.DESCRIPTION}) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [data.activity_type_id, data.title, data.description]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating activity template:', error);
      throw error;
    }
  }

  /**
   * Updates an existing activity template in the database.
   * @param {number} id - The ID of the activity template to update
   * @param {Partial<CreateActivityTemplateInput>} data - The activity template data to update
   * @returns {Promise<ActivityTemplate | null>} The updated activity template or null if not found
   */
  public async updateActivityTemplate(
    id: number,
    data: Partial<CreateActivityTemplateInput>
  ): Promise<ActivityTemplate | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.ACTIVITY_TEMPLATES} 
         SET ${COLUMNS.ACTIVITY_TYPE_ID} = COALESCE($1, ${COLUMNS.ACTIVITY_TYPE_ID}), 
             ${COLUMNS.TITLE} = COALESCE($2, ${COLUMNS.TITLE}), 
             ${COLUMNS.DESCRIPTION} = COALESCE($3, ${COLUMNS.DESCRIPTION}) 
         WHERE ${COLUMNS.ID} = $4 
         RETURNING *`,
        [data.activity_type_id, data.title, data.description, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating activity template:', error);
      throw error;
    }
  }

  /**
   * Deletes an activity template from the database.
   * @param {number} id - The ID of the activity template to delete
   * @returns {Promise<boolean>} True if the activity template was deleted, false otherwise
   */
  public async deleteActivityTemplate(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.ACTIVITY_TEMPLATES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting activity template:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activities from the database.
   * @returns {Promise<Activity[]>} An array of all activities
   */
  public async getAllActivities(): Promise<Activity[]> {
    try {
      const result = await pool.query(`
        SELECT a.*, at.${COLUMNS.NAME} as activity_type_name, 
               att.${COLUMNS.TITLE} as template_title, att.${COLUMNS.DESCRIPTION} as template_description 
        FROM ${TABLES.ACTIVITIES} a
        JOIN ${TABLES.ACTIVITY_TYPES} at ON a.${COLUMNS.ACTIVITY_TYPE_ID} = at.${COLUMNS.ID}
        JOIN ${TABLES.ACTIVITY_TEMPLATES} att ON a.${COLUMNS.ACTIVITY_TEMPLATE_ID} = att.${COLUMNS.ID}
        ORDER BY a.${COLUMNS.START_DATE} DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all activities:', error);
      throw error;
    }
  }

  /**
   * Retrieves an activity by its ID.
   * @param {number} id - The ID of the activity to retrieve
   * @returns {Promise<Activity | null>} The requested activity or null if not found
   */
  public async getActivityById(id: number): Promise<Activity | null> {
    try {
      const result = await pool.query(`
        SELECT a.*, at.${COLUMNS.NAME} as activity_type_name, 
               att.${COLUMNS.TITLE} as template_title, att.${COLUMNS.DESCRIPTION} as template_description 
        FROM ${TABLES.ACTIVITIES} a
        JOIN ${TABLES.ACTIVITY_TYPES} at ON a.${COLUMNS.ACTIVITY_TYPE_ID} = at.${COLUMNS.ID}
        JOIN ${TABLES.ACTIVITY_TEMPLATES} att ON a.${COLUMNS.ACTIVITY_TEMPLATE_ID} = att.${COLUMNS.ID}
        WHERE a.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting activity by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activities of a specific type.
   * @param {number} activityTypeId - The ID of the activity type
   * @returns {Promise<Activity[]>} An array of activities of the specified type
   */
  public async getActivitiesByType(activityTypeId: number): Promise<Activity[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.ACTIVITIES} WHERE ${COLUMNS.ACTIVITY_TYPE_ID} = $1 ORDER BY ${COLUMNS.START_DATE} DESC`,
        [activityTypeId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting activities by type:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activities with a specific status.
   * @param {string} status - The status to filter by
   * @returns {Promise<Activity[]>} An array of activities with the specified status
   */
  public async getActivitiesByStatus(status: string): Promise<Activity[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.ACTIVITIES} WHERE ${COLUMNS.STATUS} = $1 ORDER BY ${COLUMNS.START_DATE} DESC`,
        [status]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting activities by status:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activities within a date range.
   * @param {Date} startDate - The start date of the range
   * @param {Date} endDate - The end date of the range
   * @returns {Promise<Activity[]>} An array of activities within the date range
   */
  public async getActivitiesByDateRange(startDate: Date, endDate: Date): Promise<Activity[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.ACTIVITIES} 
         WHERE ${COLUMNS.START_DATE} >= $1 AND ${COLUMNS.END_DATE} <= $2 
         ORDER BY ${COLUMNS.START_DATE} DESC`,
        [startDate, endDate]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting activities by date range:', error);
      throw error;
    }
  }

  /**
   * Retrieves a specific activity report by ID.
   * @param {number} id - The ID of the activity report to retrieve
   * @returns {Promise<ActivityReport | null>} The requested activity report or null if not found
   */
  public async getActivityReport(id: number): Promise<ActivityReport | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.ACTIVITY_REPORTS} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting activity report:', error);
      throw error;
    }
  }

  /**
   * Creates a new activity in the database.
   * @param {CreateActivityInput} data - The activity data to create
   * @returns {Promise<Activity>} The created activity
   */
  public async createActivity(data: CreateActivityInput): Promise<Activity> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.ACTIVITIES} 
         (${COLUMNS.ACTIVITY_TYPE_ID}, ${COLUMNS.ACTIVITY_TEMPLATE_ID}, ${COLUMNS.TITLE}, 
          ${COLUMNS.DESCRIPTION}, ${COLUMNS.START_DATE}, ${COLUMNS.END_DATE}, ${COLUMNS.LOCATION}, ${COLUMNS.STATUS}) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          data.activity_type_id,
          data.template_id,
          data.title,
          data.description,
          data.start_date,
          data.end_date,
          data.location,
          data.status
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  }

  /**
   * Updates an existing activity in the database.
   * @param {number} id - The ID of the activity to update
   * @param {Partial<CreateActivityInput>} data - The activity data to update
   * @returns {Promise<Activity | null>} The updated activity or null if not found
   */
  public async updateActivity(
    id: number,
    data: Partial<CreateActivityInput>
  ): Promise<Activity | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.ACTIVITIES} 
         SET ${COLUMNS.ACTIVITY_TYPE_ID} = COALESCE($1, ${COLUMNS.ACTIVITY_TYPE_ID}), 
             ${COLUMNS.ACTIVITY_TEMPLATE_ID} = COALESCE($2, ${COLUMNS.ACTIVITY_TEMPLATE_ID}), 
             ${COLUMNS.TITLE} = COALESCE($3, ${COLUMNS.TITLE}), 
             ${COLUMNS.DESCRIPTION} = COALESCE($4, ${COLUMNS.DESCRIPTION}), 
             ${COLUMNS.START_DATE} = COALESCE($5, ${COLUMNS.START_DATE}), 
             ${COLUMNS.END_DATE} = COALESCE($6, ${COLUMNS.END_DATE}), 
             ${COLUMNS.LOCATION} = COALESCE($7, ${COLUMNS.LOCATION}) 
         WHERE ${COLUMNS.ID} = $8 
         RETURNING *`,
        [
          data.activity_type_id,
          data.template_id,
          data.title,
          data.description,
          data.start_date,
          data.end_date,
          data.location,
          id
        ]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating activity:', error);
      throw error;
    }
  }

  /**
   * Deletes an activity from the database.
   * @param {number} id - The ID of the activity to delete
   * @returns {Promise<boolean>} True if the activity was deleted, false otherwise
   */
  public async deleteActivity(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.ACTIVITIES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting activity:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activity participants from the database.
   * @returns {Promise<ActivityParticipant[]>} An array of all activity participants
   */
  public async getAllActivityParticipants(): Promise<ActivityParticipant[]> {
    try {
      const result = await pool.query(`
        SELECT ap.*, a.${COLUMNS.TITLE} as activity_title, 
               u.${COLUMNS.FULL_NAME} as user_name 
        FROM ${TABLES.ACTIVITY_PARTICIPANTS} ap
        JOIN ${TABLES.ACTIVITIES} a ON ap.${COLUMNS.ACTIVITY_ID} = a.${COLUMNS.ID}
        JOIN ${TABLES.USERS} u ON ap.${COLUMNS.USER_ID} = u.${COLUMNS.ID}
        ORDER BY ap.${COLUMNS.CREATED_AT} DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all activity participants:', error);
      throw error;
    }
  }

  /**
   * Retrieves an activity participant by its ID.
   * @param {number} id - The ID of the activity participant to retrieve
   * @returns {Promise<ActivityParticipant | null>} The requested activity participant or null if not found
   */
  public async getActivityParticipantById(id: number): Promise<ActivityParticipant | null> {
    try {
      const result = await pool.query(`
        SELECT ap.*, a.${COLUMNS.TITLE} as activity_title, 
               u.${COLUMNS.FULL_NAME} as user_name 
        FROM ${TABLES.ACTIVITY_PARTICIPANTS} ap
        JOIN ${TABLES.ACTIVITIES} a ON ap.${COLUMNS.ACTIVITY_ID} = a.${COLUMNS.ID}
        JOIN ${TABLES.USERS} u ON ap.${COLUMNS.USER_ID} = u.${COLUMNS.ID}
        WHERE ap.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting activity participant by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all participants for a specific activity.
   * @param {number} activityId - The ID of the activity
   * @returns {Promise<ActivityParticipant[]>} An array of participants for the specified activity
   */
  public async getActivityParticipantsByActivity(activityId: number): Promise<ActivityParticipant[]> {
    try {
      const result = await pool.query(`
        SELECT ap.*, a.${COLUMNS.TITLE} as activity_title, 
               u.${COLUMNS.FULL_NAME} as user_name 
        FROM ${TABLES.ACTIVITY_PARTICIPANTS} ap
        JOIN ${TABLES.ACTIVITIES} a ON ap.${COLUMNS.ACTIVITY_ID} = a.${COLUMNS.ID}
        JOIN ${TABLES.USERS} u ON ap.${COLUMNS.USER_ID} = u.${COLUMNS.ID}
        WHERE ap.${COLUMNS.ACTIVITY_ID} = $1
        ORDER BY ap.${COLUMNS.CREATED_AT} DESC
      `, [activityId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting activity participants by activity:', error);
      throw error;
    }
  }

  /**
   * Creates a new activity participant in the database.
   * @param {CreateActivityParticipantInput} data - The activity participant data to create
   * @returns {Promise<ActivityParticipant>} The created activity participant
   */
  public async createActivityParticipant(data: CreateActivityParticipantInput): Promise<ActivityParticipant> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.ACTIVITY_PARTICIPANTS} 
         (${COLUMNS.ACTIVITY_ID}, ${COLUMNS.USER_ID}, role, ${COLUMNS.STATUS}) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [data.activity_id, data.user_id, data.role, STATUS.PENDING]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating activity participant:', error);
      throw error;
    }
  }

  /**
   * Updates an existing activity participant in the database.
   * @param {number} id - The ID of the activity participant to update
   * @param {Partial<CreateActivityParticipantInput>} data - The activity participant data to update
   * @returns {Promise<ActivityParticipant | null>} The updated activity participant or null if not found
   */
  public async updateActivityParticipant(
    id: number,
    data: Partial<CreateActivityParticipantInput>
  ): Promise<ActivityParticipant | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.ACTIVITY_PARTICIPANTS} 
         SET ${COLUMNS.ACTIVITY_ID} = COALESCE($1, ${COLUMNS.ACTIVITY_ID}), 
             ${COLUMNS.USER_ID} = COALESCE($2, ${COLUMNS.USER_ID}), 
             role = COALESCE($3, role) 
         WHERE ${COLUMNS.ID} = $4 
         RETURNING *`,
        [data.activity_id, data.user_id, data.role, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating activity participant:', error);
      throw error;
    }
  }

  /**
   * Deletes an activity participant from the database.
   * @param {number} id - The ID of the activity participant to delete
   * @returns {Promise<boolean>} True if the activity participant was deleted, false otherwise
   */
  public async deleteActivityParticipant(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.ACTIVITY_PARTICIPANTS} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting activity participant:', error);
      throw error;
    }
  }

  /**
   * Retrieves all activity reports from the database.
   * @returns {Promise<ActivityReport[]>} An array of all activity reports
   */
  public async getAllActivityReports(): Promise<ActivityReport[]> {
    try {
      const result = await pool.query(`
        SELECT ar.*, a.${COLUMNS.TITLE} as activity_title 
        FROM ${TABLES.ACTIVITY_REPORTS} ar
        JOIN ${TABLES.ACTIVITIES} a ON ar.${COLUMNS.ACTIVITY_ID} = a.${COLUMNS.ID}
        ORDER BY ar.${COLUMNS.CREATED_AT} DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all activity reports:', error);
      throw error;
    }
  }

  /**
   * Retrieves an activity report by its ID.
   * @param {number} id - The ID of the activity report to retrieve
   * @returns {Promise<ActivityReport | null>} The requested activity report or null if not found
   */
  public async getActivityReportById(id: number): Promise<ActivityReport | null> {
    try {
      const result = await pool.query(`
        SELECT ar.*, a.${COLUMNS.TITLE} as activity_title 
        FROM ${TABLES.ACTIVITY_REPORTS} ar
        JOIN ${TABLES.ACTIVITIES} a ON ar.${COLUMNS.ACTIVITY_ID} = a.${COLUMNS.ID}
        WHERE ar.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting activity report by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all reports for a specific activity.
   * @param {number} activityId - The ID of the activity
   * @returns {Promise<ActivityReport[]>} An array of reports for the specified activity
   */
  public async getActivityReportsByActivity(activityId: number): Promise<ActivityReport[]> {
    try {
      const result = await pool.query(`
        SELECT ar.*, a.${COLUMNS.TITLE} as activity_title 
        FROM ${TABLES.ACTIVITY_REPORTS} ar
        JOIN ${TABLES.ACTIVITIES} a ON ar.${COLUMNS.ACTIVITY_ID} = a.${COLUMNS.ID}
        WHERE ar.${COLUMNS.ACTIVITY_ID} = $1
        ORDER BY ar.${COLUMNS.CREATED_AT} DESC
      `, [activityId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting activity reports by activity:', error);
      throw error;
    }
  }

  /**
   * Creates a new activity report in the database.
   * @param {CreateActivityReportInput} data - The activity report data to create
   * @returns {Promise<ActivityReport>} The created activity report
   */
  public async createActivityReport(data: CreateActivityReportInput): Promise<ActivityReport> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.ACTIVITY_REPORTS} 
         (${COLUMNS.ACTIVITY_ID}, ${COLUMNS.CONTENT}) 
         VALUES ($1, $2) 
         RETURNING *`,
        [data.activity_id, data.content]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating activity report:', error);
      throw error;
    }
  }

  /**
   * Updates an existing activity report in the database.
   * @param {number} id - The ID of the activity report to update
   * @param {Partial<CreateActivityReportInput>} data - The activity report data to update
   * @returns {Promise<ActivityReport | null>} The updated activity report or null if not found
   */
  public async updateActivityReport(
    id: number,
    data: Partial<CreateActivityReportInput>
  ): Promise<ActivityReport | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.ACTIVITY_REPORTS} 
         SET ${COLUMNS.ACTIVITY_ID} = COALESCE($1, ${COLUMNS.ACTIVITY_ID}), 
             ${COLUMNS.CONTENT} = COALESCE($2, ${COLUMNS.CONTENT}) 
         WHERE ${COLUMNS.ID} = $3 
         RETURNING *`,
        [data.activity_id, data.content, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating activity report:', error);
      throw error;
    }
  }

  /**
   * Deletes an activity report from the database.
   * @param {number} id - The ID of the activity report to delete
   * @returns {Promise<boolean>} True if the activity report was deleted, false otherwise
   */
  public async deleteActivityReport(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.ACTIVITY_REPORTS} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting activity report:', error);
      throw error;
    }
  }
} 