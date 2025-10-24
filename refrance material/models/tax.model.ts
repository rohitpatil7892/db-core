import { pool } from '../db/init';
import { ApiError } from '../middlewares/error.middleware';
import logger from '../config/logger';
import {
  TABLES,
  COLUMNS,
  STATUS,
  ERROR_MESSAGES
} from '../constants/database.constants';
import { Transaction } from 'sequelize';
import sequelize from '../db/sequelize';
import { DatabaseService } from '../services/database.service';

// Interfaces
export interface TaxType {
  id: number;
  name: string;
  description: string;
  created_at: Date;
}

export interface TaxRate {
  id: number;
  tax_type_id: number;
  tax_calculation_type_id: number | null;
  rate: number;
  effective_from: Date;
  effective_to: Date | null;
  created_at: Date;
  calculation_type_name?: string;
  calculation_type_description?: string;
}

export interface TaxContract {
  id: number;
  tax_type_id: number;
  tax_rate_id: number;
  start_date: Date;
  end_date: Date;
  max_duration: number;
  created_at: Date;
  tax_type_name?: string;
  tax_rate?: number;
  rate_effective_from?: Date;
  rate_effective_to?: Date;
  calculation_type_name?: string;
  calculation_type_description?: string;
}

export interface CreateTaxTypeInput {
  name: string;
  description: string;
}

export interface CreateTaxRateInput {
  tax_type_id: number;
  tax_calculation_type_id?: number;
  rate: number;
  effective_from: Date;
  effective_to?: Date;
}

export interface CreateTaxContractInput {
  tax_type_id: number;
  tax_rate_id: number;
  start_date: Date;
  end_date: Date;
  max_duration: number;
}

export interface UpdateTaxTypeInput {
  name?: string;
  description?: string;
}

export interface UpdateTaxRateInput {
  rate?: number;
  tax_calculation_type_id?: number;
  effective_from?: Date;
  effective_to?: Date;
}

export interface UpdateTaxContractInput {
  start_date?: Date;
  end_date?: Date;
  max_duration?: number;
}

export class TaxModel {
  private static instance: TaxModel;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Gets the singleton instance of the TaxModel class.
   * @returns {TaxModel} The singleton instance of TaxModel
   */
  public static getInstance(): TaxModel {
    if (!TaxModel.instance) {
      TaxModel.instance = new TaxModel();
    }
    return TaxModel.instance;
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
   * Retrieves all tax types from the database.
   * @param {boolean} includeDeleted - Whether to include soft-deleted records
   * @returns {Promise<TaxType[]>} An array of all tax types
   */
  public async getAllTaxTypes(includeDeleted: boolean = false): Promise<TaxType[]> {
    logger.debug('Getting all tax types', { includeDeleted });
    try {
      let query = `SELECT * FROM ${TABLES.TAX_TYPES}`;
      
      // Filter out soft-deleted records unless explicitly requested
      if (!includeDeleted) {
        query += ` WHERE ${COLUMNS.DELETED_AT} IS NULL`;
      }
      
      query += ` ORDER BY ${COLUMNS.NAME}`;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all tax types:', error);
      throw error;
    }
  }

  /**
   * Retrieves a tax type by its ID.
   * @param {number} id - The ID of the tax type to retrieve
   * @returns {Promise<TaxType | null>} The requested tax type or null if not found
   */
  public async getTaxTypeById(id: number): Promise<TaxType | null> {
    logger.debug(`Getting tax type by id: ${id}`);
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.TAX_TYPES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting tax type by ID:', error);
      throw error;
    }
  }

  /**
   * Creates a new tax type in the database.
   * @param {CreateTaxTypeInput} data - The tax type data to create
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<TaxType>} The created tax type
   */
  public async createTaxType(data: CreateTaxTypeInput, userId?: number): Promise<TaxType> {
    logger.debug('Creating tax type', { data });
    try {
      // Use database service to handle audit fields
      return await this.dbService.insert<TaxType>(TABLES.TAX_TYPES, data, userId);
    } catch (error) {
      logger.error('Error creating tax type:', error);
      throw error;
    }
  }

  /**
   * Updates an existing tax type in the database.
   * @param {number} id - The ID of the tax type to update
   * @param {Partial<CreateTaxTypeInput>} data - The tax type data to update
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<TaxType | null>} The updated tax type or null if not found
   */
  public async updateTaxType(
    id: number,
    data: Partial<CreateTaxTypeInput>,
    userId?: number
  ): Promise<TaxType | null> {
    logger.debug(`Updating tax type with id: ${id}`, { data });
    try {
      // Use database service to handle audit fields
      const result = await this.dbService.update<TaxType>(TABLES.TAX_TYPES, id, data, userId);
      return result || null; // Convert undefined to null if no result
    } catch (error) {
      logger.error('Error updating tax type:', error);
      throw error;
    }
  }

  /**
   * Deletes a tax type from the database.
   * @param {number} id - The ID of the tax type to delete
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise
   */
  public async deleteTaxType(id: number, userId?: number): Promise<boolean> {
    logger.debug(`Deleting tax type with id: ${id}`);
    try {
      // Use database service to handle soft delete with audit fields
      return await this.dbService.delete(TABLES.TAX_TYPES, id, userId);
    } catch (error) {
      logger.error('Error deleting tax type:', error);
      throw error;
    }
  }

  /**
   * Retrieves all tax rates from the database.
   * @returns {Promise<TaxRate[]>} An array of all tax rates
   */
  public async getAllTaxRates(yearFilter?: number | { startYear: number; endYear: number }): Promise<TaxRate[]> {
    logger.debug('Getting all tax rates');
    try {
      let query = `
        SELECT tr.*, tt.${COLUMNS.NAME} as tax_type_name, tct.name as calculation_type_name, tct.description as calculation_type_description 
        FROM ${TABLES.TAX_RATES} tr
        JOIN ${TABLES.TAX_TYPES} tt ON tr.${COLUMNS.TAX_TYPE_ID} = tt.${COLUMNS.ID}
        LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
      `;
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (yearFilter) {
        if (typeof yearFilter === 'number') {
          // Single year filter: effective_from or effective_to falls within the fiscal year
          const startDate = `${yearFilter}-04-01`; // Fiscal year starts April 1
          const endDate = `${yearFilter + 1}-03-31`; // Fiscal year ends March 31 of next year
          query += `
            WHERE tr.effective_from <= $${paramIndex + 1} AND (tr.effective_to IS NULL OR tr.effective_to >= $${paramIndex})
          `;
          queryParams.push(startDate, endDate);
          paramIndex += 2;
        } else {
          // Year range filter: effective_from or effective_to falls within the specified range
          const startDate = `${yearFilter.startYear}-04-01`;
          const endDate = `${yearFilter.endYear}-03-31`;
          query += `
            WHERE tr.effective_from <= $${paramIndex + 1} AND (tr.effective_to IS NULL OR tr.effective_to >= $${paramIndex})
          `;
          queryParams.push(startDate, endDate);
          paramIndex += 2;
        }
      }

      query += ` ORDER BY tr.effective_from DESC`;
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all tax rates:', error);
      throw error;
    }
  }

  /**
   * Retrieves a tax rate by its ID.
   * @param {number} id - The ID of the tax rate to retrieve
   * @returns {Promise<TaxRate | null>} The requested tax rate or null if not found
   */
  public async getTaxRateById(id: number): Promise<TaxRate | null> {
    logger.debug(`Getting tax rate by id: ${id}`);
    try {
      const result = await pool.query(
        `SELECT tr.*, tct.name as calculation_type_name, tct.description as calculation_type_description 
         FROM ${TABLES.TAX_RATES} tr
         LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
         WHERE tr.${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting tax rate by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves tax rates by their tax type ID.
   * @param {number} taxTypeId - The ID of the tax type
   * @returns {Promise<TaxRate[]>} An array of tax rates for the specified tax type
   */
  public async getTaxRatesByType(taxTypeId: number): Promise<TaxRate[]> {
    logger.debug(`Getting tax rates by type: ${taxTypeId}`);
    try {
      const result = await pool.query(
        `SELECT tr.*, tct.name as calculation_type_name, tct.description as calculation_type_description
         FROM ${TABLES.TAX_RATES} tr 
         LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
         WHERE tr.${COLUMNS.TAX_TYPE_ID} = $1 
         ORDER BY tr.effective_from DESC`,
        [taxTypeId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting tax rates by type:', error);
      throw error;
    }
  }

  /**
   * Creates a new tax rate in the database.
   * @param {CreateTaxRateInput} data - The tax rate data to create
   * @returns {Promise<TaxRate>} The created tax rate
   */
  public async createTaxRate(data: CreateTaxRateInput): Promise<TaxRate> {
    logger.debug('Creating tax rate', { data });
    try {
      // Validate tax type exists
      const taxType = await this.getTaxTypeById(data.tax_type_id);
      if (!taxType) {
        throw this.createApiError(404, 'Tax type not found');
      }

      // Check if the tax calculation type exists if provided
      if (data.tax_calculation_type_id) {
        const calcTypeExists = await pool.query(
          `SELECT id FROM tax_calculation_types WHERE id = $1`,
          [data.tax_calculation_type_id]
        );
        
        if (calcTypeExists.rowCount === 0) {
          throw this.createApiError(404, 'Tax calculation type not found');
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert tax rate
        const taxRateResult = await client.query(
          `INSERT INTO ${TABLES.TAX_RATES} 
           (${COLUMNS.TAX_TYPE_ID}, tax_calculation_type_id, rate, effective_from, effective_to) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [data.tax_type_id, data.tax_calculation_type_id || null, data.rate, data.effective_from, data.effective_to || null]
        );
        
        const taxRate = taxRateResult.rows[0];
        await client.query('COMMIT');
        
        // Get calculation type details if available
        if (taxRate.tax_calculation_type_id) {
          const calcTypeResult = await pool.query(
            `SELECT name, description FROM tax_calculation_types WHERE id = $1`,
            [taxRate.tax_calculation_type_id]
          );
          
          if (calcTypeResult.rows.length > 0) {
            taxRate.calculation_type_name = calcTypeResult.rows[0].name;
            taxRate.calculation_type_description = calcTypeResult.rows[0].description;
          }
        }
        
        return taxRate;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error creating tax rate:', error);
      throw error;
    }
  }

  /**
   * Updates an existing tax rate in the database.
   * @param {number} id - The ID of the tax rate to update
   * @param {Partial<CreateTaxRateInput>} data - The tax rate data to update
   * @returns {Promise<TaxRate | null>} The updated tax rate or null if not found
   */
  public async updateTaxRate(
    id: number,
    data: Partial<CreateTaxRateInput>
  ): Promise<TaxRate | null> {
    logger.debug(`Updating tax rate with id: ${id}`, { data });
    try {
      // First update the tax rate
      const updateResult = await pool.query(
        `UPDATE ${TABLES.TAX_RATES} 
         SET ${COLUMNS.TAX_TYPE_ID} = COALESCE($1, ${COLUMNS.TAX_TYPE_ID}), 
             tax_calculation_type_id = COALESCE($2, tax_calculation_type_id), 
             rate = COALESCE($3, rate), 
             effective_from = COALESCE($4, effective_from), 
             effective_to = COALESCE($5, effective_to) 
         WHERE ${COLUMNS.ID} = $6 
         RETURNING *`,
        [data.tax_type_id, data.tax_calculation_type_id, data.rate, data.effective_from, data.effective_to, id]
      );
      
      if (updateResult.rows.length === 0) {
        return null;
      }
      
      // Now fetch the updated record with joined calculation type data
      const result = await pool.query(
        `SELECT tr.*, tct.name as calculation_type_name, tct.description as calculation_type_description 
         FROM ${TABLES.TAX_RATES} tr
         LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
         WHERE tr.${COLUMNS.ID} = $1`,
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating tax rate:', error);
      throw error;
    }
  }

  /**
   * Deletes a tax rate from the database.
   * @param {number} id - The ID of the tax rate to delete
   * @returns {Promise<boolean>} True if the tax rate was deleted, false otherwise
   */
  public async deleteTaxRate(id: number): Promise<boolean> {
    logger.debug(`Deleting tax rate with id: ${id}`);
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.TAX_RATES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting tax rate:', error);
      throw error;
    }
  }

  /**
   * Retrieves all tax contracts from the database.
   * @returns {Promise<TaxContract[]>} An array of all tax contracts
   */
  public async getAllTaxContracts(): Promise<TaxContract[]> {
    logger.debug('Getting all tax contracts');
    try {
      const result = await pool.query(`
        SELECT 
          tc.*, 
          tt.${COLUMNS.NAME} as tax_type_name,
          tr.rate as tax_rate,
          tr.effective_from as rate_effective_from,
          tr.effective_to as rate_effective_to,
          tr.tax_calculation_type_id,
          tct.name as calculation_type_name,
          tct.description as calculation_type_description
        FROM ${TABLES.TAX_CONTRACTS} tc
        JOIN ${TABLES.TAX_TYPES} tt ON tc.${COLUMNS.TAX_TYPE_ID} = tt.${COLUMNS.ID}
        JOIN ${TABLES.TAX_RATES} tr ON tc.tax_rate_id = tr.${COLUMNS.ID}
        LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
        ORDER BY tc.start_date DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all tax contracts:', error);
      throw error;
    }
  }

  /**
   * Retrieves a tax contract by its ID.
   * @param {number} id - The ID of the tax contract to retrieve
   * @param {Transaction} [transaction] - Optional transaction for database operations
   * @returns {Promise<TaxContract | null>} The requested tax contract or null if not found
   */
  public async getTaxContractById(id: number, transaction?: any): Promise<TaxContract | null> {
    logger.debug(`Getting tax contract by id: ${id}`);
    try {
      // If transaction is provided, use it with sequelize
      if (transaction) {
        const TaxContract = sequelize.models.TaxContract;
        const TaxType = sequelize.models.TaxType;
        const TaxRate = sequelize.models.TaxRate;
        const TaxCalculationType = sequelize.models.TaxCalculationType;

        const result = await TaxContract.findByPk(id, {
          include: [
            {
              model: TaxType,
              attributes: ['name']
            },
            {
              model: TaxRate,
              include: [{
                model: TaxCalculationType,
                attributes: ['id', 'name', 'description']
              }]
            }
          ],
          transaction
        });

        if (!result) return null;
        
        // Convert to plain object that matches our interface
        const plainResult = result.get({ plain: true });
        return {
          id: plainResult.id,
          tax_type_id: plainResult.tax_type_id,
          tax_rate_id: plainResult.tax_rate_id,
          start_date: plainResult.start_date,
          end_date: plainResult.end_date,
          max_duration: plainResult.max_duration,
          created_at: plainResult.created_at,
          tax_type_name: plainResult.TaxType?.name,
          tax_rate: plainResult.TaxRate?.rate,
          rate_effective_from: plainResult.TaxRate?.effective_from,
          rate_effective_to: plainResult.TaxRate?.effective_to,
          calculation_type_name: plainResult.TaxRate?.TaxCalculationType?.name,
          calculation_type_description: plainResult.TaxRate?.TaxCalculationType?.description
        };
      }
      
      // If no transaction, use the original pool query
      const result = await pool.query(`
        SELECT 
          tc.*, 
          tt.${COLUMNS.NAME} as tax_type_name,
          tr.rate as tax_rate,
          tr.effective_from as rate_effective_from,
          tr.effective_to as rate_effective_to,
          tr.tax_calculation_type_id,
          tct.name as calculation_type_name,
          tct.description as calculation_type_description
        FROM ${TABLES.TAX_CONTRACTS} tc
        JOIN ${TABLES.TAX_TYPES} tt ON tc.${COLUMNS.TAX_TYPE_ID} = tt.${COLUMNS.ID}
        JOIN ${TABLES.TAX_RATES} tr ON tc.tax_rate_id = tr.${COLUMNS.ID}
        LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
        WHERE tc.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting tax contract by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all tax contracts for a specific tax type.
   * @param {number} taxTypeId - The ID of the tax type
   * @returns {Promise<TaxContract[]>} An array of tax contracts for the specified tax type
   */
  public async getTaxContractsByType(taxTypeId: number): Promise<TaxContract[]> {
    logger.debug(`Getting tax contracts by type: ${taxTypeId}`);
    try {
      const result = await pool.query(`
        SELECT 
          tc.*, 
          tt.${COLUMNS.NAME} as tax_type_name,
          tr.rate as tax_rate,
          tr.effective_from as rate_effective_from,
          tr.effective_to as rate_effective_to,
          tr.tax_calculation_type_id,
          tct.name as calculation_type_name,
          tct.description as calculation_type_description
        FROM ${TABLES.TAX_CONTRACTS} tc
        JOIN ${TABLES.TAX_TYPES} tt ON tc.${COLUMNS.TAX_TYPE_ID} = tt.${COLUMNS.ID}
        JOIN ${TABLES.TAX_RATES} tr ON tc.tax_rate_id = tr.${COLUMNS.ID}
        LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
        WHERE tc.${COLUMNS.TAX_TYPE_ID} = $1
        ORDER BY tc.start_date DESC
      `, [taxTypeId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting tax contracts by type:', error);
      throw error;
    }
  }

  /**
   * Creates a new tax contract in the database.
   * @param {CreateTaxContractInput} data - The tax contract data to create
   * @returns {Promise<TaxContract>} The created tax contract
   */
  public async createTaxContract(data: CreateTaxContractInput): Promise<TaxContract> {
    logger.debug('Creating tax contract', { data });
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.TAX_CONTRACTS} 
         (${COLUMNS.TAX_TYPE_ID}, tax_rate_id, start_date, end_date, max_duration) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          data.tax_type_id,
          data.tax_rate_id,
          data.start_date,
          data.end_date,
          data.max_duration
        ]
      );
      
      // Fetch the newly created contract with tax rate information
      if (result.rows[0]) {
        const taxContract = await this.getTaxContractById(result.rows[0].id);
        if (taxContract) {
          return taxContract;
        }
      }
      
      // If we couldn't fetch with joined data, return the basic record
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating tax contract:', error);
      throw error;
    }
  }

  /**
   * Updates an existing tax contract in the database.
   * @param {number} id - The ID of the tax contract to update
   * @param {Partial<CreateTaxContractInput>} data - The tax contract data to update
   * @returns {Promise<TaxContract | null>} The updated tax contract or null if not found
   */
  public async updateTaxContract(
    id: number,
    data: Partial<CreateTaxContractInput>
  ): Promise<TaxContract | null> {
    logger.debug(`Updating tax contract with id: ${id}`, { data });
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.TAX_CONTRACTS} 
         SET ${COLUMNS.TAX_TYPE_ID} = COALESCE($1, ${COLUMNS.TAX_TYPE_ID}), 
             tax_rate_id = COALESCE($2, tax_rate_id), 
             start_date = COALESCE($3, start_date), 
             end_date = COALESCE($4, end_date), 
             max_duration = COALESCE($5, max_duration) 
         WHERE ${COLUMNS.ID} = $6 
         RETURNING *`,
        [
          data.tax_type_id,
          data.tax_rate_id,
          data.start_date,
          data.end_date,
          data.max_duration,
          id
        ]
      );
      
      // Fetch the updated contract with tax rate information
      if (result.rows[0]) {
        return await this.getTaxContractById(id);
      }
      
      return null;
    } catch (error) {
      logger.error('Error updating tax contract:', error);
      throw error;
    }
  }

  /**
   * Deletes a tax contract from the database.
   * @param {number} id - The ID of the tax contract to delete
   * @returns {Promise<boolean>} True if the tax contract was deleted, false otherwise
   */
  public async deleteTaxContract(id: number): Promise<boolean> {
    logger.debug(`Deleting tax contract with id: ${id}`);
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.TAX_CONTRACTS} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting tax contract:', error);
      throw error;
    }
  }

  // Add this new method to handle getting tax calculation type by ID
  public async getTaxCalculationTypeById(id: number): Promise<any | null> {
    logger.debug(`Getting tax calculation type by id: ${id}`);
    try {
      const result = await pool.query(
        `SELECT * FROM tax_calculation_types WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting tax calculation type by ID:', error);
      throw error;
    }
  }

  // Add this method to execute raw SQL queries
  public async executeRawQuery(query: string, params: any[] = []): Promise<any[]> {
    logger.debug('Executing raw query', { query, params });
    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error executing raw query:', error);
      throw error;
    }
  }
} 