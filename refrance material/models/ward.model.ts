import { pool } from '../db/init';
import logger from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';

// Ward interface
export interface Ward {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: Date;
}

// Ward with additional counts
export interface WardWithCounts extends Ward {
  property_count: number;
  user_count: number;
}

// Pagination interface
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

// Ward with additional data
export interface WardWithDetails extends Ward {
  total_households: number;
  total_voters: number;
}

export class WardModel {
  private static instance: WardModel;

  private constructor() {}

  /**
   * Gets the singleton instance of the WardModel class.
   * @returns {WardModel} The singleton instance of WardModel
   */
  public static getInstance(): WardModel {
    if (!WardModel.instance) {
      WardModel.instance = new WardModel();
    }
    return WardModel.instance;
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
   * Helper method to create paginated response
   * @param {T[]} data - The data array
   * @param {PaginationParams} pagination - Pagination parameters
   * @param {number} totalItems - Total number of items
   * @returns {PaginatedResponse<T>} Formatted paginated response
   */
  private createPaginatedResponse<T>(data: T[], pagination: PaginationParams, totalItems: number): PaginatedResponse<T> {
    const totalPages = Math.ceil(totalItems / pagination.limit);
    
    return {
      data,
      pagination: {
        current_page: pagination.page,
        per_page: pagination.limit,
        total_items: totalItems,
        total_pages: totalPages,
        has_next_page: pagination.page < totalPages,
        has_prev_page: pagination.page > 1
      }
    };
  }

  /**
   * Creates a new ward in the database.
   * @param {Omit<Ward, 'id' | 'created_at'>} wardData - The ward data to create
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<Ward>} The created ward
   * @throws {ApiError} If the ward code already exists
   */
  public async createWard(wardData: Omit<Ward, 'id' | 'created_at'>, userId?: number): Promise<Ward> {
    try {
      const { name, code, description } = wardData;
      
      // Check if ward code already exists
      const existingWard = await pool.query(
        'SELECT id FROM wards WHERE code = $1',
        [code]
      );
      
      if (existingWard.rows.length > 0) {
        throw this.createApiError(400, 'Ward code already exists');
      }
      
      const result = await pool.query(
        `INSERT INTO wards (name, code, description, created_by, updated_by) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, name, code, description, created_at, created_by, updated_by, updated_at, deleted_at, deleted_by`,
        [name, code, description || null, userId || null, userId || null]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating ward:', error);
      throw error;
    }
  }

  /**
   * Retrieves all wards from the database.
   * @returns {Promise<Ward[]>} An array of all wards
   */
  public async getAllWards(): Promise<Ward[]> {
    try {
      const result = await pool.query(
        'SELECT id, name, code, description, created_at FROM wards ORDER BY name'
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting all wards:', error);
      throw error;
    }
  }

  /**
   * Retrieves all wards from the database with pagination.
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Promise<PaginatedResponse<Ward>>} Paginated wards response
   */
  public async getAllWardsPaginated(pagination: PaginationParams): Promise<PaginatedResponse<Ward>> {
    try {
      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) as total FROM wards');
      const totalItems = parseInt(countResult.rows[0].total);

      // Get paginated data
      const result = await pool.query(
        'SELECT id, name, code, description, created_at FROM wards ORDER BY name LIMIT $1 OFFSET $2',
        [pagination.limit, pagination.offset]
      );

      return this.createPaginatedResponse(result.rows, pagination, totalItems);
    } catch (error) {
      logger.error('Error getting paginated wards:', error);
      throw error;
    }
  }

  /**
   * Retrieves all wards with property and user counts.
   * @returns {Promise<WardWithCounts[]>} An array of all wards with counts
   */
  public async getAllWardsWithCounts(): Promise<WardWithCounts[]> {
    try {
      const result = await pool.query(`
        SELECT 
          w.id,
          w.name,
          w.code,
          w.description,
          w.created_at,
          COALESCE(property_counts.property_count, 0) as property_count,
          COALESCE(user_counts.user_count, 0) as user_count
        FROM wards w
        LEFT JOIN (
          SELECT 
            ward_id,
            COUNT(*) as property_count
          FROM properties 
          WHERE ward_id IS NOT NULL
          GROUP BY ward_id
        ) property_counts ON w.id = property_counts.ward_id
        CROSS JOIN (
          SELECT 
            COUNT(DISTINCT u.id) as user_count
          FROM users u
          WHERE u.id NOT IN (
            SELECT DISTINCT owner_id 
            FROM properties 
            WHERE owner_id IS NOT NULL
          )
          AND u.is_active = true
        ) user_counts
        ORDER BY w.name
      `);
      
      return result.rows.map(row => ({
        ...row,
        property_count: parseInt(row.property_count) || 0,
        user_count: parseInt(row.user_count) || 0
      }));
    } catch (error) {
      logger.error('Error getting all wards with counts:', error);
      throw error;
    }
  }

  /**
   * Retrieves all wards with property and user counts with pagination.
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Promise<PaginatedResponse<WardWithCounts>>} Paginated wards with counts response
   */
  public async getAllWardsWithCountsPaginated(pagination: PaginationParams): Promise<PaginatedResponse<WardWithCounts>> {
    try {
      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) as total FROM wards');
      const totalItems = parseInt(countResult.rows[0].total);

      // Get paginated data with counts
      const result = await pool.query(`
        SELECT 
          w.id,
          w.name,
          w.code,
          w.description,
          w.created_at,
          COALESCE(property_counts.property_count, 0) as property_count,
          COALESCE(user_counts.user_count, 0) as user_count
        FROM wards w
        LEFT JOIN (
          SELECT 
            ward_id,
            COUNT(*) as property_count
          FROM properties 
          WHERE ward_id IS NOT NULL
          GROUP BY ward_id
        ) property_counts ON w.id = property_counts.ward_id
        CROSS JOIN (
          SELECT 
            COUNT(DISTINCT u.id) as user_count
          FROM users u
          WHERE u.id NOT IN (
            SELECT DISTINCT owner_id 
            FROM properties 
            WHERE owner_id IS NOT NULL
          )
          AND u.is_active = true
        ) user_counts
        ORDER BY w.name
        LIMIT $1 OFFSET $2
      `, [pagination.limit, pagination.offset]);
      
      const wardsWithCounts = result.rows.map(row => ({
        ...row,
        property_count: parseInt(row.property_count) || 0,
        user_count: parseInt(row.user_count) || 0
      }));

      return this.createPaginatedResponse(wardsWithCounts, pagination, totalItems);
    } catch (error) {
      logger.error('Error getting paginated wards with counts:', error);
      throw error;
    }
  }

  /**
   * Retrieves a ward by its ID.
   * @param {string} id - The ID of the ward to retrieve
   * @returns {Promise<Ward>} The requested ward
   * @throws {ApiError} If the ward is not found
   */
  public async getWardById(id: string): Promise<Ward> {
    try {
      const result = await pool.query(
        'SELECT id, name, code, description, created_at FROM wards WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw this.createApiError(404, 'Ward not found');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting ward with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a ward by its ID with property and user counts.
   * @param {string} id - The ID of the ward to retrieve
   * @returns {Promise<WardWithCounts>} The requested ward with counts
   * @throws {ApiError} If the ward is not found
   */
  public async getWardByIdWithCounts(id: string): Promise<WardWithCounts> {
    try {
      const result = await pool.query(`
        SELECT 
          w.id,
          w.name,
          w.code,
          w.description,
          w.created_at,
          COALESCE(property_counts.property_count, 0) as property_count,
          COALESCE(user_counts.user_count, 0) as user_count
        FROM wards w
        LEFT JOIN (
          SELECT 
            ward_id,
            COUNT(*) as property_count
          FROM properties 
          WHERE ward_id = $1
          GROUP BY ward_id
        ) property_counts ON w.id = property_counts.ward_id
        CROSS JOIN (
          SELECT 
            COUNT(DISTINCT u.id) as user_count
          FROM users u
          WHERE u.id NOT IN (
            SELECT DISTINCT owner_id 
            FROM properties 
            WHERE owner_id IS NOT NULL
          )
          AND u.is_active = true
        ) user_counts
        WHERE w.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        throw this.createApiError(404, 'Ward not found');
      }
      
      const row = result.rows[0];
      return {
        ...row,
        property_count: parseInt(row.property_count) || 0,
        user_count: parseInt(row.user_count) || 0
      };
    } catch (error) {
      logger.error(`Error getting ward with ID ${id} and counts:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a ward by its code.
   * @param {string} code - The code of the ward to retrieve
   * @returns {Promise<Ward>} The requested ward
   * @throws {ApiError} If the ward is not found
   */
  public async getWardByCode(code: string): Promise<Ward> {
    try {
      const result = await pool.query(
        'SELECT id, name, code, description, created_at FROM wards WHERE code = $1',
        [code]
      );
      
      if (result.rows.length === 0) {
        throw this.createApiError(404, 'Ward not found');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting ward with code ${code}:`, error);
      throw error;
    }
  }

  /**
   * Updates an existing ward in the database.
   * @param {string} id - The ID of the ward to update
   * @param {Partial<Omit<Ward, 'id' | 'created_at'>>} wardData - The ward data to update
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<Ward>} The updated ward
   * @throws {ApiError} If the ward code already exists
   */
  public async updateWard(id: string, wardData: Partial<Omit<Ward, 'id' | 'created_at'>>, userId?: number): Promise<Ward> {
    try {
      const { name, code, description } = wardData;
      
      // Check if the ward exists
      const wardCheck = await pool.query(
        'SELECT id FROM wards WHERE id = $1',
        [id]
      );
      
      if (wardCheck.rows.length === 0) {
        throw this.createApiError(404, 'Ward not found');
      }
      
      // If code is being updated, check if it already exists
      if (code) {
        const existingWard = await pool.query(
          'SELECT id FROM wards WHERE code = $1 AND id != $2',
          [code, id]
        );
        
        if (existingWard.rows.length > 0) {
          throw this.createApiError(400, 'Ward code already exists');
        }
      }
      
      // Build the update query dynamically
      let updateQuery = 'UPDATE wards SET ';
      const queryParams: any[] = [];
      let paramCount = 1;
      
      if (name !== undefined) {
        updateQuery += `name = $${paramCount++}, `;
        queryParams.push(name);
      }
      
      if (code !== undefined) {
        updateQuery += `code = $${paramCount++}, `;
        queryParams.push(code);
      }
      
      if (description !== undefined) {
        updateQuery += `description = $${paramCount++}, `;
        queryParams.push(description);
      }
      
      // Add audit fields
      updateQuery += `updated_by = $${paramCount++}, updated_at = NOW() `;
      queryParams.push(userId || null);
      
      // Add the WHERE clause
      updateQuery += `WHERE id = $${paramCount} RETURNING id, name, code, description, created_at, created_by, updated_by, updated_at, deleted_at, deleted_by`;
      queryParams.push(id);
      
      const result = await pool.query(updateQuery, queryParams);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating ward:', error);
      throw error;
    }
  }

  /**
   * Deletes a ward from the database.
   * @param {string} id - The ID of the ward to delete
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<boolean>} True if the ward was deleted successfully
   * @throws {ApiError} If the ward is not found
   */
  public async deleteWard(id: string, userId?: number): Promise<boolean> {
    try {
      // Check if the ward exists
      const wardCheck = await pool.query(
        'SELECT id FROM wards WHERE id = $1',
        [id]
      );
      if (wardCheck.rows.length === 0) {
        throw this.createApiError(404, 'Ward not found');
      }
      // Only delete if not already deleted
      const result = await pool.query(
        `UPDATE wards SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id`,
        [userId || null, id]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error deleting ward:', error);
      throw error;
    }
  }

  /**
   * Retrieves detailed information about a ward, including total households and voters.
   * @param {string} id - The ID of the ward to get details for
   * @returns {Promise<WardWithDetails>} The ward details
   * @throws {ApiError} If the ward is not found
   */
  public async getWardDetails(id: string): Promise<WardWithDetails> {
    try {
      const result = await pool.query(`
        SELECT 
          w.*,
          COUNT(DISTINCT p.id) as total_households,
          COUNT(DISTINCT u.id) as total_voters
        FROM wards w
        LEFT JOIN properties p ON w.id = p.ward_id
        LEFT JOIN users u ON u.id IN (
          SELECT owner_id 
          FROM properties 
          WHERE ward_id = $1 AND owner_id IS NOT NULL
        )
        WHERE w.id = $1
        GROUP BY w.id
      `, [id]);
      
      if (result.rows.length === 0) {
        throw this.createApiError(404, 'Ward not found');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting ward details for ID ${id}:`, error);
      throw error;
    }
  }
} 