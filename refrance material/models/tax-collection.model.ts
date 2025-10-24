import { Pool } from 'pg';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';
import sequelize from '../db/sequelize';
import TaxPaymentModel from './sequelize/TaxPayment';
import TaxReceiptModel from './sequelize/TaxReceipt';
import type { TaxPaymentAttributes } from './sequelize/TaxPayment';
import type { TaxReceiptAttributes } from './sequelize/TaxReceipt';
import pool from '../config/database'; // Import the shared pg.Pool instance

// Interfaces
export interface TaxAssessment {
  id: number;
  property_id: number;
  tax_contract_id: number;
  assessment_date: Date;
  amount: number;
  status: string;
  created_at: Date;
  property_number: string;
  property_type_name: string;
  contract_start_date: Date;
  contract_end_date: Date;
  tax_rate_amount: number;
  tax_calculation_type_name: string;
  tax_type_name: string;
}

export interface TaxPayment {
  id: number;
  assessment_id: number;
  payment_date: Date;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  status: string;
  receipt_id: number | null;
  created_at: Date;
}

export interface CreateTaxAssessmentInput {
  property_id: number;
  tax_contract_id: number;
  assessment_date: Date;
  amount: number;
}

export interface CreateTaxPaymentInput {
  assessment_id?: number;
  assessment_ids?: number[];
  amount: number;
  payment_date: Date;
  payment_method: string;
  transaction_id?: string;
  payer_name?: string;
  payer_email?: string;
  payer_phone?: string;
  description?: string;
  user_id?: number;
}

interface TaxPaymentWithReceipt extends TaxPaymentAttributes {
  receipt: TaxReceiptAttributes;
}

export interface UpdateTaxAssessmentInput {
  property_id?: number;
  tax_contract_id?: number;
  assessment_date?: Date;
  amount?: number;
  status?: string;
}

export interface UpdateTaxPaymentInput {
  assessment_id?: number;
  amount?: number;
  payment_date?: Date;
  payment_method?: string;
  transaction_id?: string;
  status?: string;
}

export interface YearFilter {
  startYear: number;
  endYear: number;
}

export class TaxCollectionModel {
  private static instance: TaxCollectionModel;
  private pool: Pool;

  private constructor() {
    this.pool = pool; // Use the shared pool instance
  }

  /**
   * Gets the singleton instance of the TaxCollectionModel class.
   * @returns {TaxCollectionModel} The singleton instance of TaxCollectionModel
   */
  public static getInstance(): TaxCollectionModel {
    if (!TaxCollectionModel.instance) {
      TaxCollectionModel.instance = new TaxCollectionModel();
    }
    return TaxCollectionModel.instance;
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
   * Retrieves all tax assessments from the database.
   * @returns {Promise<TaxAssessment[]>} An array of all tax assessments
   */
  public async getAllTaxAssessments(): Promise<TaxAssessment[]> {
    try {
      const result = await this.pool.query(`
        SELECT ta.*, p.property_number, tt.name as tax_type_name 
        FROM tax_assessments ta
        JOIN properties p ON ta.property_id = p.id
        JOIN tax_contracts tc ON ta.tax_contract_id = tc.id
        JOIN tax_types tt ON tc.tax_type_id = tt.id
        ORDER BY ta.assessment_date DESC, ta.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all tax assessments:', error);
      throw error;
    }
  }

  /**
   * Retrieves a tax assessment by its ID.
   * @param {number} id - The ID of the tax assessment to retrieve
   * @returns {Promise<TaxAssessment | null>} The requested tax assessment or null if not found
   */
  public async getTaxAssessmentById(id: number): Promise<TaxAssessment | null> {
    try {
      const result = await this.pool.query(`
        SELECT ta.*, p.property_number, tt.name as tax_type_name 
        FROM tax_assessments ta
        JOIN properties p ON ta.property_id = p.id
        JOIN tax_contracts tc ON ta.tax_contract_id = tc.id
        JOIN tax_types tt ON tc.tax_type_id = tt.id
        WHERE ta.id = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting tax assessment by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all tax assessments for a specific property, grouped by financial year.
   * @param {number} propertyId - The ID of the property
   * @returns {Promise<Record<string, TaxAssessment[]>>} An object where keys are financial years (e.g., "2024-2025") and values are arrays of tax assessments
   */
  public async getTaxAssessmentsByProperty(propertyId: number, status?: string): Promise<Record<string, TaxAssessment[]>> {
    try {
      let query = `
        SELECT ta.*, 
               p.property_number,
               pt.name as property_type_name,
               tc.start_date as contract_start_date,
               tc.end_date as contract_end_date,
               tr.rate as tax_rate_amount,
               tct.name as tax_calculation_type_name,
               tt.name as tax_type_name
        FROM tax_assessments ta
        JOIN properties p ON ta.property_id = p.id
        JOIN property_types pt ON p.property_type_id = pt.id
        LEFT JOIN tax_contracts tc ON ta.tax_contract_id = tc.id
        LEFT JOIN tax_rates tr ON tc.tax_rate_id = tr.id
        LEFT JOIN tax_calculation_types tct ON tr.tax_calculation_type_id = tct.id
        LEFT JOIN tax_types tt ON tc.tax_type_id = tt.id
        WHERE ta.property_id = $1
      `;
      const queryParams: any[] = [propertyId];
      let paramIndex = 2;

      if (status) {
        query += ` AND ta.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      query += ` ORDER BY ta.assessment_date DESC`;

      const result = await this.pool.query(query, queryParams);

      const assessments = result.rows;

      // Group assessments by financial year
      const groupedAssessments: Record<string, TaxAssessment[]> = {};
      assessments.forEach((assessment: TaxAssessment) => {
        const fiscalYear = this.getFinancialYear(new Date(assessment.contract_start_date));
        if (!groupedAssessments[fiscalYear]) {
          groupedAssessments[fiscalYear] = [];
        }
        groupedAssessments[fiscalYear].push(assessment);
      });

      // Sort fiscal years in descending order and create ordered result
      const sortedFiscalYears = Object.keys(groupedAssessments).sort((a, b) => {
        // Extract start year from fiscal year string (e.g., "2024-2025" -> 2024)
        const yearA = parseInt(a.split('-')[0]);
        const yearB = parseInt(b.split('-')[0]);
        return yearB - yearA; // Descending order
      });

      const sortedGroupedAssessments: Record<string, TaxAssessment[]> = {};
      sortedFiscalYears.forEach(fiscalYear => {
        sortedGroupedAssessments[fiscalYear] = groupedAssessments[fiscalYear];
      });

      return sortedGroupedAssessments;
    } catch (error) {
      logger.error('Error getting tax assessments by property:', error);
      throw error;
    }
  }

  // Helper function to get the financial year (April to March)
  private getFinancialYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    if (month >= 3) { // April is month 3
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  /**
   * Retrieves all tax assessments for a specific tax contract.
   * @param {number} taxContractId - The ID of the tax contract
   * @returns {Promise<TaxAssessment[]>} An array of tax assessments for the specified tax contract
   */
  public async getTaxAssessmentsByTaxContract(taxContractId: number): Promise<TaxAssessment[]> {
    try {
      const result = await this.pool.query(`
        SELECT ta.*, p.property_number, tt.name as tax_type_name 
        FROM tax_assessments ta
        JOIN properties p ON ta.property_id = p.id
        JOIN tax_contracts tc ON ta.tax_contract_id = tc.id
        JOIN tax_types tt ON tc.tax_type_id = tt.id
        WHERE ta.tax_contract_id = $1
        ORDER BY ta.assessment_date DESC, ta.created_at DESC
      `, [taxContractId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting tax assessments by tax contract:', error);
      throw error;
    }
  }

  /**
   * Creates a new tax assessment in the database.
   * @param {CreateTaxAssessmentInput} data - The tax assessment data to create
   * @returns {Promise<TaxAssessment>} The created tax assessment
   */
  public async createTaxAssessment(data: CreateTaxAssessmentInput): Promise<TaxAssessment> {
    try {
      const result = await this.pool.query(
        'INSERT INTO tax_assessments (property_id, tax_contract_id, assessment_date, amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [data.property_id, data.tax_contract_id, data.assessment_date, data.amount, 'pending']
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating tax assessment:', error);
      throw error;
    }
  }

  /**
   * Updates an existing tax assessment in the database.
   * @param {number} id - The ID of the tax assessment to update
   * @param {UpdateTaxAssessmentInput} data - The tax assessment data to update
   * @returns {Promise<TaxAssessment | null>} The updated tax assessment or null if not found
   */
  public async updateTaxAssessment(
    id: number,
    data: UpdateTaxAssessmentInput
  ): Promise<TaxAssessment | null> {
    try {
      const result = await this.pool.query(
        'UPDATE tax_assessments SET property_id = COALESCE($1, property_id), tax_contract_id = COALESCE($2, tax_contract_id), assessment_date = COALESCE($3, assessment_date), amount = COALESCE($4, amount), status = COALESCE($5, status) WHERE id = $6 RETURNING *',
        [data.property_id, data.tax_contract_id, data.assessment_date, data.amount, data.status, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating tax assessment:', error);
      throw error;
    }
  }

  /**
   * Deletes a tax assessment from the database.
   * @param {number} id - The ID of the tax assessment to delete
   * @returns {Promise<boolean>} True if the tax assessment was deleted, false otherwise
   */
  public async deleteTaxAssessment(id: number): Promise<boolean> {
    try {
      const result = await this.pool.query('DELETE FROM tax_assessments WHERE id = $1', [id]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting tax assessment:', error);
      throw error;
    }
  }

  /**
   * Retrieves all tax payments from the database.
   * @returns {Promise<TaxPayment[]>} An array of all tax payments
   */
  public async getAllTaxPayments(): Promise<TaxPayment[]> {
    try {
      const result = await this.pool.query(`
        SELECT tp.*, ta.assessment_date, p.property_number 
        FROM tax_payments tp
        JOIN tax_assessments ta ON tp.assessment_id = ta.id
        JOIN properties p ON ta.property_id = p.id
        ORDER BY tp.payment_date DESC, tp.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all tax payments:', error);
      throw error;
    }
  }

  /**
   * Retrieves a tax payment by its ID.
   * @param {number} id - The ID of the tax payment to retrieve
   * @returns {Promise<TaxPayment | null>} The requested tax payment or null if not found
   */
  public async getTaxPaymentById(id: number): Promise<TaxPayment | null> {
    try {
      const result = await this.pool.query(`
        SELECT tp.*, ta.assessment_date, p.property_number 
        FROM tax_payments tp
        JOIN tax_assessments ta ON tp.assessment_id = ta.id
        JOIN properties p ON ta.property_id = p.id
        WHERE tp.id = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting tax payment by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all tax payments for a specific assessment.
   * @param {number} assessmentId - The ID of the tax assessment
   * @returns {Promise<TaxPayment[]>} An array of tax payments for the specified assessment
   */
  public async getTaxPaymentsByAssessment(assessmentId: number): Promise<TaxPayment[]> {
    try {
      const result = await this.pool.query(`
        SELECT tp.*, ta.assessment_date, p.property_number 
        FROM tax_payments tp
        JOIN tax_assessments ta ON tp.assessment_id = ta.id
        JOIN properties p ON ta.property_id = p.id
        WHERE tp.assessment_id = $1
        ORDER BY tp.payment_date DESC, tp.created_at DESC
      `, [assessmentId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting tax payments by assessment:', error);
      throw error;
    }
  }

  /**
   * Creates a new tax payment in the database.
   * @param {CreateTaxPaymentInput} data - The tax payment data to create
   * @param {string} status - The payment status (defaults to 'completed')
   * @returns {Promise<TaxPayment | TaxPayment[] | TaxPaymentWithReceipt[]>} The created tax payment or array of payments
   */
  public async createTaxPayment(data: CreateTaxPaymentInput, status: string = 'completed'): Promise<TaxPaymentModel | TaxPaymentModel[] | TaxPaymentWithReceipt[]> {
    const t = await sequelize.transaction();

    let payments: TaxPaymentModel[] = [];
    let assessmentIds: number[] = [];
    try {
      const paymentData = {
        amount: data.amount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        transaction_id: data.transaction_id || '',
        status,
        created_by: data.user_id
      };

      if (data.assessment_ids && data.assessment_ids.length > 0) {
        // Fetch amounts for all assessments
        const assessments = await (TaxPaymentModel.sequelize as any).query(
          'SELECT id, amount FROM tax_assessments WHERE id IN (:ids)',
          { replacements: { ids: data.assessment_ids }, type: (TaxPaymentModel.sequelize as any).QueryTypes.SELECT, transaction: t }
        );
        if (!assessments || assessments.length !== data.assessment_ids.length) {
          throw new Error('One or more assessments not found');
        }
        // Create payments for multiple assessments, using the correct amount for each
        payments = await Promise.all(
          data.assessment_ids.map(async (assessmentId) => {
            const assessment = assessments.find((a: any) => a.id === assessmentId);
            if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`);
            const payment = await TaxPaymentModel.create({
              ...paymentData,
              amount: assessment.amount, // Use the correct assessment amount
              assessment_id: assessmentId
            }, { transaction: t });
            return payment;
          })
        );
        assessmentIds = data.assessment_ids;
      } else if (data.assessment_id) {
        // Create payment for single assessment, use provided amount
        const payment = await TaxPaymentModel.create({
          ...paymentData,
          assessment_id: data.assessment_id
        }, { transaction: t });
        payments = [payment];
        assessmentIds = [data.assessment_id];
      } else {
        throw new Error('Either assessment_id or assessment_ids must be provided for tax payments');
      }

      // For offline payments, create receipts immediately
      if (data.payment_method !== 'razorpay' && data.payment_method !== 'online') {
        if (payments.length > 1) {
          // Create a single receipt for all payments
          const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          const receiptData = {
            payment_id: payments[0].id, // Reference the first payment (for schema compatibility)
            receipt_number: `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: totalAmount,
            receipt_date: payments[0].payment_date,
            payment_method: payments[0].payment_method,
            payer_name: data.payer_name || '',
            payer_email: data.payer_email || '',
            payer_phone: data.payer_phone || '',
            description: data.description || `Tax payment for assessments: ${payments.map(p => String(p.assessment_id)).join(',')}`,
            status: payments[0].status,
            created_by: data.user_id || 0
          };
          const receipt = await TaxReceiptModel.create(receiptData, { transaction: t });
          // Update all payments to reference this receipt
          await Promise.all(
            payments.map(payment => payment.update({ receipt_id: receipt.id }, { transaction: t }))
          );
          await t.commit();
          for (const assessmentId of assessmentIds) {
            try {
              await this.updateAssessmentStatusByPayment(assessmentId);
            } catch (err) {
              logger.error('Error updating assessment status after payment commit:', err);
            }
          }
          // Return all payments with the single receipt
          return payments.map(payment => ({ ...payment.toJSON(), receipt: receipt.toJSON() })) as TaxPaymentWithReceipt[];
        } else {
          // Single payment, single receipt (existing logic)
          const payment = payments[0];
            const receiptData = {
              payment_id: payment.id,
              receipt_number: `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              amount: payment.amount,
              receipt_date: payment.payment_date,
              payment_method: payment.payment_method,
              payer_name: data.payer_name || '',
              payer_email: data.payer_email || '',
              payer_phone: data.payer_phone || '',
              description: data.description || `Tax payment for assessment ${payment.assessment_id}`,
              status: payment.status,
            created_by: data.user_id || 0
            };
            const receipt = await TaxReceiptModel.create(receiptData, { transaction: t });
          await payment.update({ receipt_id: receipt.id }, { transaction: t });
        await t.commit();
          for (const assessmentId of assessmentIds) {
            try {
              await this.updateAssessmentStatusByPayment(assessmentId);
            } catch (err) {
              logger.error('Error updating assessment status after payment commit:', err);
            }
          }
          return [{ ...payment.toJSON(), receipt: receipt.toJSON() }] as TaxPaymentWithReceipt[];
        }
      }

      await t.commit();

      // Update assessment statuses after transaction commit
      for (const assessmentId of assessmentIds) {
        try {
          await this.updateAssessmentStatusByPayment(assessmentId);
        } catch (err) {
          logger.error('Error updating assessment status after payment commit:', err);
        }
      }

      return payments.length === 1 ? payments[0] : payments;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Updates an existing tax payment in the database.
   * @param {number} id - The ID of the tax payment to update
   * @param {UpdateTaxPaymentInput} data - The tax payment data to update
   * @returns {Promise<TaxPayment | null>} The updated tax payment or null if not found
   */
  public async updateTaxPayment(
    id: number,
    data: UpdateTaxPaymentInput
  ): Promise<TaxPaymentModel | null> {
    try {
      // First get the current payment to check the assessment_id
      const currentPayment = await this.pool.query('SELECT * FROM tax_payments WHERE id = $1', [id]);
      if (!currentPayment.rows[0]) {
        return null;
      }

      const result = await this.pool.query(
        'UPDATE tax_payments SET assessment_id = COALESCE($1, assessment_id), payment_date = COALESCE($2, payment_date), amount = COALESCE($3, amount), payment_method = COALESCE($4, payment_method), transaction_id = COALESCE($5, transaction_id), status = COALESCE($6, status) WHERE id = $7 RETURNING *',
        [data.assessment_id, data.payment_date, data.amount, data.payment_method, data.transaction_id, data.status, id]
      );
      
      const updatedPayment = result.rows[0];
      
      // If payment status is updated to 'completed', update the corresponding assessment status
      if (updatedPayment && data.status === 'completed') {
        await this.updateAssessmentStatusByPayment(updatedPayment.assessment_id);
      }
      
      return updatedPayment || null;
    } catch (error) {
      logger.error('Error updating tax payment:', error);
      throw error;
    }
  }

  /**
   * Updates the assessment status based on payment status.
   * @param {number} assessmentId - The ID of the tax assessment to update
   * @returns {Promise<void>}
   */
  public async updateAssessmentStatusByPayment(assessmentId: number): Promise<void> {
    try {
      // Get the assessment details
      const assessmentResult = await this.pool.query(
        'SELECT amount FROM tax_assessments WHERE id = $1',
        [assessmentId]
      );
      
      if (!assessmentResult.rows[0]) {
        throw new Error('Assessment not found');
      }
      
      const assessmentAmount = parseFloat(assessmentResult.rows[0].amount);
      
      // Get total completed payments for this assessment
      const paymentsResult = await this.pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total_paid FROM tax_payments WHERE assessment_id = $1 AND status = $2',
        [assessmentId, 'completed']
      );
      
      const totalPaid = parseFloat(paymentsResult.rows[0].total_paid);
      
      // Determine new assessment status based on payment completion
      let newStatus = 'pending';
      if (totalPaid >= assessmentAmount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      }
      
      // Update the assessment status
      await this.pool.query(
        'UPDATE tax_assessments SET status = $1 WHERE id = $2',
        [newStatus, assessmentId]
      );
      
      logger.info(`Assessment ${assessmentId} status updated to: ${newStatus} (Total paid: ${totalPaid}, Assessment amount: ${assessmentAmount})`);
    } catch (error) {
      logger.error('Error updating assessment status by payment:', error);
      throw error;
    }
  }

  /**
   * Deletes a tax payment from the database.
   * @param {number} id - The ID of the tax payment to delete
   * @returns {Promise<boolean>} True if the tax payment was deleted, false otherwise
   */
  public async deleteTaxPayment(id: number): Promise<boolean> {
    try {
      const result = await this.pool.query('DELETE FROM tax_payments WHERE id = $1', [id]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting tax payment:', error);
      throw error;
    }
  }

  /**
   * Retrieves a tax payment receipt by its ID.
   * @param {number} id - The ID of the tax payment
   * @returns {Promise<TaxPayment | null>} The requested tax payment receipt or null if not found
   */
  public async getTaxPaymentReceipt(id: number): Promise<TaxPaymentModel | null> {
    try {
      const result = await this.pool.query(`
        SELECT tp.*, ta.assessment_date, p.property_number, tt.name as tax_type_name 
        FROM tax_payments tp
        JOIN tax_assessments ta ON tp.assessment_id = ta.id
        JOIN properties p ON ta.property_id = p.id
        JOIN tax_contracts tc ON ta.tax_contract_id = tc.id
        JOIN tax_types tt ON tc.tax_type_id = tt.id
        WHERE tp.id = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting tax payment receipt:', error);
      throw error;
    }
  }

  /**
   * Retrieves all tax receipts for a specific property, with their payments.
   * @param {number} propertyId - The ID of the property
   * @returns {Promise<any[]>} An array of receipts, each with a payments array
   */
  public async getTaxReceiptsByPropertyId(propertyId: number, yearFilter?: YearFilter): Promise<any[]> {
    try {
      // 1. Find all payments for this property
      let paymentsQuery = `
        SELECT tp.*, ta.assessment_date, ta.amount as assessment_amount, ta.id as assessment_id
        FROM tax_payments tp
        JOIN tax_assessments ta ON tp.assessment_id = ta.id
        WHERE ta.property_id = $1
      `;
      const queryParams: any[] = [propertyId];
      let paramIndex = 2;
      if (yearFilter) {
        const startDate = `${yearFilter.startYear}-04-01`;
        const endDate = `${yearFilter.endYear}-03-31`;
        paymentsQuery += ` AND tp.payment_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        queryParams.push(startDate, endDate);
      }
      paymentsQuery += ` ORDER BY tp.payment_date DESC, tp.created_at DESC`;
      const paymentsResult = await this.pool.query(paymentsQuery, queryParams);
      const payments = paymentsResult.rows;
      if (!payments.length) return [];
      // 2. Group payments by receipt_id
      const receiptIds = [...new Set(payments.map((p: any) => p.receipt_id).filter((id: any) => id != null))];
      if (!receiptIds.length) return [];
      // 3. Fetch all receipts
      const receiptsResult = await this.pool.query(
        `SELECT * FROM tax_receipts WHERE id = ANY($1::int[]) ORDER BY receipt_date DESC, created_at DESC`,
        [receiptIds]
      );
      const receipts = receiptsResult.rows;
      // 4. For each receipt, attach its payments
      return receipts.map((receipt: any) => ({
        ...receipt,
        payments: payments.filter((p: any) => p.receipt_id === receipt.id)
      }));
    } catch (error) {
      logger.error('Error getting tax receipts by property:', error);
      throw error;
    }
  }

  /**
   * Manually triggers an update of assessment status based on completed payments.
   * This method can be called to recalculate and update assessment status.
   * @param {number} assessmentId - The ID of the tax assessment to recalculate
   * @returns {Promise<TaxAssessment | null>} The updated assessment
   */
  public async recalculateAssessmentStatus(assessmentId: number): Promise<TaxAssessment | null> {
    try {
      await this.updateAssessmentStatusByPayment(assessmentId);
      return await this.getTaxAssessmentById(assessmentId);
    } catch (error) {
      logger.error('Error recalculating assessment status:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard data for tax collection statistics
   * @returns {Promise<any>} Dashboard data including year-wise collection, property counts, receipts, etc.
   */
  public async getDashboardData(): Promise<any> {
    try {
      logger.debug('Getting dashboard data');

      // Get current financial year (April to March)
      const now = new Date();
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // If before April, use previous year

      // First check if we have any properties to avoid division by zero
      const propertyCountCheck = await this.pool.query('SELECT COUNT(*) as count FROM properties');
      const totalPropertiesCount = parseInt(propertyCountCheck.rows[0]?.count) || 0;

      // If no properties exist, return default data structure
      if (totalPropertiesCount === 0) {
        logger.info('No properties found, returning default dashboard data');
        return {
          taxCollectionData: [],
          taxTypeData: [],
          last5receipts: [],
          totalProperties: 0,
          totalTaxProjected: 0,
          totalTaxCollected: 0,
          totalPendingTax: 0
        };
      }

      // 1. Year-wise tax collection data with individual year stats (last 5 years)
      const yearWiseStatsQuery = `
        WITH year_ranges AS (
          SELECT 
            generate_series($1::integer, $2::integer) as start_year
        ),
        year_data AS (
          SELECT 
            yr.start_year,
            (yr.start_year || '-' || (yr.start_year + 1)) as financial_year,
            (yr.start_year || '-04-01')::date as year_start,
            ((yr.start_year + 1) || '-03-31')::date as year_end
          FROM year_ranges yr
        ),
        assessments_by_year AS (
          SELECT 
            yd.financial_year,
            yd.start_year,
            COALESCE(SUM(ta.amount), 0) as total_projected
          FROM year_data yd
          LEFT JOIN tax_assessments ta ON ta.assessment_date >= yd.year_start 
                                       AND ta.assessment_date <= yd.year_end
          GROUP BY yd.financial_year, yd.start_year
        ),
        collections_by_year AS (
          SELECT 
            yd.financial_year,
            yd.start_year,
            COALESCE(SUM(CASE WHEN tp.status = 'completed' THEN tp.amount ELSE 0 END), 0) as total_collected
          FROM year_data yd
          LEFT JOIN tax_assessments ta_tp ON ta_tp.assessment_date >= yd.year_start 
                                          AND ta_tp.assessment_date <= yd.year_end
          LEFT JOIN tax_payments tp ON ta_tp.id = tp.assessment_id
          GROUP BY yd.financial_year, yd.start_year
        )
        SELECT 
          yd.financial_year,
          yd.start_year,
          COALESCE(aby.total_projected, 0) as totaltaxporjectedtax,
          COALESCE(cby.total_collected, 0) as totaltaxcollection,
          (COALESCE(aby.total_projected, 0) - COALESCE(cby.total_collected, 0)) as totalremaintax
        FROM year_data yd
        LEFT JOIN assessments_by_year aby ON yd.financial_year = aby.financial_year
        LEFT JOIN collections_by_year cby ON yd.financial_year = cby.financial_year
        ORDER BY yd.start_year DESC
      `;

      // 2. Total properties count
      const totalPropertiesQuery = `SELECT COUNT(*) as total_properties FROM properties`;

      // 3. Tax type data (by property type) - Fixed division by zero
      const taxTypeDataQuery = `
        SELECT 
          pt.name,
          COUNT(DISTINCT p.id) as property_count,
          CASE 
            WHEN $1 > 0 THEN ROUND((COUNT(DISTINCT p.id) * 100.0 / $1), 0)
            ELSE 0
          END as percentage,
          COALESCE(SUM(CASE WHEN tp.status = 'completed' THEN tp.amount ELSE 0 END), 0) as total_collection
        FROM property_types pt
        LEFT JOIN properties p ON pt.id = p.property_type_id
        LEFT JOIN tax_assessments ta ON p.id = ta.property_id
        LEFT JOIN tax_payments tp ON ta.id = tp.assessment_id
        GROUP BY pt.id, pt.name
        ORDER BY property_count DESC
      `;

      // 4. Last 5 tax receipts (get recent tax payments as receipts)
      const last5ReceiptsQuery = `
        SELECT 
          tp.id,
          tp.amount,
          tp.payment_date as date,
          COALESCE(u.full_name, 'Unknown') as payer_name,
          tp.payment_method,
          ('RCP-' || tp.id) as receipt_number
        FROM tax_payments tp
        LEFT JOIN tax_assessments ta ON tp.assessment_id = ta.id
        LEFT JOIN properties p ON ta.property_id = p.id
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE tp.status = 'completed'
        ORDER BY tp.payment_date DESC, tp.created_at DESC
        LIMIT 5
      `;

      // 5. Current year overall stats
      const currentYearStatsQuery = `
        SELECT 
          COALESCE(SUM(ta.amount), 0) as total_tax_projected,
          COALESCE(SUM(CASE WHEN tp.status = 'completed' THEN tp.amount ELSE 0 END), 0) as total_tax_collected,
          COALESCE(SUM(ta.amount), 0) - COALESCE(SUM(CASE WHEN tp.status = 'completed' THEN tp.amount ELSE 0 END), 0) as total_remain_tax
        FROM tax_assessments ta
        LEFT JOIN tax_payments tp ON ta.id = tp.assessment_id
        WHERE ta.assessment_date >= $1 AND ta.assessment_date <= $2
      `;

      const currentFinancialYearStart = `${currentYear}-04-01`;
      const currentFinancialYearEnd = `${currentYear + 1}-03-31`;

      // Execute all queries in parallel
      const [yearWiseResult, totalPropertiesResult, taxTypeResult, last5ReceiptsResult, currentYearResult] = await Promise.all([
        this.pool.query(yearWiseStatsQuery, [currentYear - 4, currentYear]), // Last 5 years
        this.pool.query(totalPropertiesQuery),
        this.pool.query(taxTypeDataQuery, [totalPropertiesCount]), // Pass total properties count to avoid division by zero
        this.pool.query(last5ReceiptsQuery),
        this.pool.query(currentYearStatsQuery, [currentFinancialYearStart, currentFinancialYearEnd])
      ]);

      // Process year-wise data - each year gets its own complete stats
      const taxCollectionData = yearWiseResult.rows.map(row => ({
        year: row.financial_year,
        totalTaxPorjectedtax: parseFloat(row.totaltaxporjectedtax) || 0,
        totaltaxcollection: parseFloat(row.totaltaxcollection) || 0,
        totalremainTax: parseFloat(row.totalremaintax) || 0
      }));

      // Process tax type data
      const taxTypeData = taxTypeResult.rows.map(row => ({
        name: row.name || 'Unknown',
        value: parseInt(row.percentage) || 0,
        collection: parseFloat(row.total_collection) || 0
      }));

      // Process last 5 receipts
      const last5receipts = last5ReceiptsResult.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount) || 0,
        date: row.date,
        payer_name: row.payer_name,
        payment_method: row.payment_method,
        receipt_number: row.receipt_number
      }));

      const totalProperties = parseInt(totalPropertiesResult.rows[0]?.total_properties) || 0;
      const currentYearStats = currentYearResult.rows[0] || {};

      return {
        taxCollectionData,
        taxTypeData,
        last5receipts,
        totalProperties,
        totalTaxProjected: parseFloat(currentYearStats.total_tax_projected) || 0,
        totalTaxCollected: parseFloat(currentYearStats.total_tax_collected) || 0,
        totalPendingTax: parseFloat(currentYearStats.total_remain_tax) || 0
      };

    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      
      // Return default data structure instead of throwing error
      logger.info('Returning default dashboard data due to error');
      return {
        taxCollectionData: [],
        taxTypeData: [],
        last5receipts: [],
        totalProperties: 0,
        totalTaxProjected: 0,
        totalTaxCollected: 0,
        totalPendingTax: 0
      };
    }
  }
} 