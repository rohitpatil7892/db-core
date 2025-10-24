import pool from '../config/database';
import logger from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';

// Interfaces
export interface ReportType {
  id: number;
  name: string;
  description: string | null;
  parameters: Record<string, any> | null;
  created_at: Date;
}

export interface Report {
  id: number;
  report_type_id: number;
  user_id: number;
  parameters: Record<string, any> | null;
  status: string;
  result: Record<string, any> | null;
  created_at: Date;
  completed_at: Date | null;
}

export class ReportModel {
  private static instance: ReportModel;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): ReportModel {
    if (!ReportModel.instance) {
      ReportModel.instance = new ReportModel();
    }
    return ReportModel.instance;
  }

  private createApiError(statusCode: number, message: string): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    return error;
  }

  // Report Type Operations
  public async getAllReportTypes(): Promise<ReportType[]> {
    try {
      const result = await pool.query('SELECT * FROM report_types ORDER BY name');
      return result.rows;
    } catch (error) {
      logger.error('Error getting report types:', error);
      throw error;
    }
  }

  public async getReportTypeById(id: number): Promise<ReportType | null> {
    try {
      const result = await pool.query('SELECT * FROM report_types WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting report type by ID:', error);
      throw error;
    }
  }

  public async createReportType(
    name: string,
    description?: string,
    parameters?: Record<string, any>
  ): Promise<ReportType> {
    try {
      const result = await pool.query(
        `INSERT INTO report_types (name, description, parameters)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, description, parameters]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating report type:', error);
      throw error;
    }
  }

  public async updateReportType(
    id: number,
    name: string,
    description?: string,
    parameters?: Record<string, any>
  ): Promise<ReportType | null> {
    try {
      const result = await pool.query(
        `UPDATE report_types 
         SET name = $1, description = $2, parameters = $3
         WHERE id = $4
         RETURNING *`,
        [name, description, parameters, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating report type:', error);
      throw error;
    }
  }

  public async deleteReportType(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM report_types WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error deleting report type:', error);
      throw error;
    }
  }

  // Report Operations
  public async getAllReports(): Promise<Report[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM reports ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting all reports:', error);
      throw error;
    }
  }

  public async getReportById(id: number): Promise<Report | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM reports WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting report by ID:', error);
      throw error;
    }
  }

  public async getReportsByUser(userId: number): Promise<Report[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting reports by user:', error);
      throw error;
    }
  }

  public async getReportsByType(reportTypeId: number): Promise<Report[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM reports WHERE report_type_id = $1 ORDER BY created_at DESC',
        [reportTypeId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting reports by type:', error);
      throw error;
    }
  }

  public async getReportsByStatus(status: string): Promise<Report[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM reports WHERE status = $1 ORDER BY created_at DESC',
        [status]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting reports by status:', error);
      throw error;
    }
  }

  public async createReport(
    reportTypeId: number,
    userId: number,
    parameters?: Record<string, any>,
    status: string = 'pending'
  ): Promise<Report> {
    try {
      const result = await pool.query(
        `INSERT INTO reports (report_type_id, user_id, parameters, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [reportTypeId, userId, parameters, status]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating report:', error);
      throw error;
    }
  }

  public async updateReport(
    id: number,
    status: string,
    resultData?: Record<string, any>,
    completedAt?: Date
  ): Promise<Report | null> {
    try {
      const queryResult = await pool.query(
        `UPDATE reports 
         SET status = $1, result = $2, completed_at = $3
         WHERE id = $4
         RETURNING *`,
        [status, resultData, completedAt, id]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      logger.error('Error updating report:', error);
      throw error;
    }
  }

  public async deleteReport(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM reports WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error deleting report:', error);
      throw error;
    }
  }

  // Report Generation Methods
  public async generateTaxCollectionReport(
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    // Implementation
    return {};
  }

  public async generateTaxContractsReport(
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    // Implementation
    return {};
  }

  public async generateWardsReport(
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    // Implementation
    return {};
  }

  public async generatePropertiesReport(
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    // Implementation
    return {};
  }

  public async generateUsersReport(
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    // Implementation
    return {};
  }

  public async generateActivitiesReport(
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    // Implementation
    return {};
  }
} 