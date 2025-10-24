import { pool } from '../db/init';
import { TaxCollectionModel } from './tax-collection.model';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';
import {
  TABLES,
  COLUMNS,
  STATUS,
  ERROR_MESSAGES
} from '../constants/database.constants';

// Interfaces
export interface PropertyType {
  id: number;
  name: string;
  description: string;
  created_at: Date;
}

export interface PropertyAddress {
  id: number;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  created_at: Date;
}

export interface Property {
  id: number;
  property_number: string;
  property_type_id: number;
  ward_id: number;
  owner_id: number;
  property_address_id: number;
  area: number;
  built_up_area: number | null;
  created_at: Date;
}

export interface CreatePropertyTypeInput {
  name: string;
  description: string;
}

export interface CreatePropertyAddressInput {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CreatePropertyInput {
  property_number: string;
  property_type_id: number;
  ward_id: number;
  owner_id: number;
  property_address_id: number;
  area: number;
  built_up_area?: number;
}

export interface UpdatePropertyTypeInput {
  name?: string;
  description?: string;
}

export interface UpdatePropertyAddressInput {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UpdatePropertyInput {
  property_type_id?: number;
  owner_id?: number;
  ward_id?: number;
  property_address_id?: number;
  area?: number;
  built_up_area?: number;
  property_number?: string;
}

export class PropertyModel {
  private static instance: PropertyModel;

  private constructor() {}

  /**
   * Gets the singleton instance of the PropertyModel class.
   * @returns {PropertyModel} The singleton instance of PropertyModel
   */
  public static getInstance(): PropertyModel {
    if (!PropertyModel.instance) {
      PropertyModel.instance = new PropertyModel();
    }
    return PropertyModel.instance;
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

  // Property Type Operations
  /**
   * Retrieves all property types from the database.
   * @returns {Promise<PropertyType[]>} An array of all property types
   */
  public async getAllPropertyTypes(): Promise<PropertyType[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.PROPERTY_TYPES} ORDER BY ${COLUMNS.NAME}`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting all property types:', error);
      throw error;
    }
  }

  /**
   * Retrieves a property type by its ID.
   * @param {number} id - The ID of the property type to retrieve
   * @returns {Promise<PropertyType | null>} The requested property type or null if not found
   */
  public async getPropertyTypeById(id: number): Promise<PropertyType | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.PROPERTY_TYPES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting property type by ID:', error);
      throw error;
    }
  }

  /**
   * Creates a new property type in the database.
   * @param {CreatePropertyTypeInput} data - The property type data to create
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<PropertyType>} The created property type
   */
  public async createPropertyType(data: CreatePropertyTypeInput, userId?: number): Promise<PropertyType> {
    try {
      const result = await pool.query(
        `INSERT INTO ${TABLES.PROPERTY_TYPES} (
          ${COLUMNS.NAME}, 
          ${COLUMNS.DESCRIPTION},
          ${COLUMNS.CREATED_BY},
          ${COLUMNS.UPDATED_BY}
        ) VALUES ($1, $2, $3, $4) RETURNING *`,
        [data.name, data.description, userId || null, userId || null]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating property type:', error);
      throw error;
    }
  }

  /**
   * Updates an existing property type in the database.
   * @param {number} id - The ID of the property type to update
   * @param {Partial<CreatePropertyTypeInput>} data - The property type data to update
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<PropertyType | null>} The updated property type or null if not found
   */
  public async updatePropertyType(
    id: number,
    data: Partial<CreatePropertyTypeInput>,
    userId?: number
  ): Promise<PropertyType | null> {
    try {
      const result = await pool.query(
        `UPDATE ${TABLES.PROPERTY_TYPES} 
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
      logger.error('Error updating property type:', error);
      throw error;
    }
  }

  /**
   * Deletes a property type from the database.
   * @param {number} id - The ID of the property type to delete
   * @param {number} userId - Optional user ID for audit tracking
   * @returns {Promise<boolean>} True if the property type was deleted, false otherwise
   */
  public async deletePropertyType(id: number, userId?: number): Promise<boolean> {
    try {
      // Use soft delete if deleted_at column exists
      const result = await pool.query(
        `UPDATE ${TABLES.PROPERTY_TYPES}
         SET ${COLUMNS.DELETED_AT} = NOW(),
             ${COLUMNS.DELETED_BY} = $1
         WHERE ${COLUMNS.ID} = $2
         RETURNING ${COLUMNS.ID}`,
        [userId || null, id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting property type:', error);
      throw error;
    }
  }

  // Property Address Operations
  /**
   * Retrieves all property addresses from the database.
   * @returns {Promise<PropertyAddress[]>} An array of all property addresses
   */
  public async getAllPropertyAddresses(): Promise<PropertyAddress[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM property_addresses ORDER BY city, address_line1`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting all property addresses:', error);
      throw error;
    }
  }

  /**
   * Retrieves a property address by its ID.
   * @param {number} id - The ID of the property address to retrieve
   * @returns {Promise<PropertyAddress | null>} The requested property address or null if not found
   */
  public async getPropertyAddressById(id: number): Promise<PropertyAddress | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM property_addresses WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting property address by ID:', error);
      throw error;
    }
  }

  /**
   * Creates a new property address in the database.
   * @param {CreatePropertyAddressInput} data - The property address data to create
   * @returns {Promise<PropertyAddress>} The created property address
   */
  public async createPropertyAddress(data: CreatePropertyAddressInput): Promise<PropertyAddress> {
    try {
      const result = await pool.query(
        `INSERT INTO property_addresses (address_line1, address_line2, city, state, pincode) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.address_line1, data.address_line2, data.city, data.state, data.pincode]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating property address:', error);
      throw error;
    }
  }

  /**
   * Updates an existing property address in the database.
   * @param {number} id - The ID of the property address to update
   * @param {UpdatePropertyAddressInput} data - The property address data to update
   * @returns {Promise<PropertyAddress | null>} The updated property address or null if not found
   */
  public async updatePropertyAddress(
    id: number,
    data: UpdatePropertyAddressInput
  ): Promise<PropertyAddress | null> {
    try {
      const result = await pool.query(
        `UPDATE property_addresses 
         SET address_line1 = COALESCE($1, address_line1), 
             address_line2 = COALESCE($2, address_line2),
             city = COALESCE($3, city),
             state = COALESCE($4, state),
             pincode = COALESCE($5, pincode)
         WHERE id = $6 
         RETURNING *`,
        [data.address_line1, data.address_line2, data.city, data.state, data.pincode, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating property address:', error);
      throw error;
    }
  }

  /**
   * Deletes a property address from the database.
   * @param {number} id - The ID of the property address to delete
   * @returns {Promise<boolean>} True if the property address was deleted, false otherwise
   */
  public async deletePropertyAddress(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM property_addresses WHERE id = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting property address:', error);
      throw error;
    }
  }

  /**
   * Retrieves properties that use a specific address ID.
   * @param {number} addressId - The ID of the address
   * @returns {Promise<Property[]>} An array of properties using the address
   */
  public async getPropertiesByAddressId(addressId: number): Promise<Property[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${TABLES.PROPERTIES} WHERE property_address_id = $1`,
        [addressId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting properties by address ID:', error);
      throw error;
    }
  }

  // Property Operations
  /**
   * Retrieves all properties from the database.
   * @returns {Promise<Property[]>} An array of all properties
   */
  public async getAllProperties(): Promise<Property[]> {
    try {
      const result = await pool.query(`
        SELECT p.*, pt.${COLUMNS.NAME} as property_type_name, w.${COLUMNS.NAME} as ward_name 
        FROM ${TABLES.PROPERTIES} p
        JOIN ${TABLES.PROPERTY_TYPES} pt ON p.${COLUMNS.PROPERTY_TYPE_ID} = pt.${COLUMNS.ID}
        JOIN ${TABLES.WARDS} w ON p.${COLUMNS.WARD_ID} = w.${COLUMNS.ID}
        ORDER BY p.${COLUMNS.PROPERTY_NUMBER}
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all properties:', error);
      throw error;
    }
  }

  /**
   * Retrieves a property by its ID.
   * @param {number} id - The ID of the property to retrieve
   * @returns {Promise<Property | null>} The requested property or null if not found
   */
  public async getPropertyById(id: number): Promise<Property | null> {
    try {
      const result = await pool.query(`
        SELECT p.*, pt.${COLUMNS.NAME} as property_type_name, w.${COLUMNS.NAME} as ward_name 
        FROM ${TABLES.PROPERTIES} p
        JOIN ${TABLES.PROPERTY_TYPES} pt ON p.${COLUMNS.PROPERTY_TYPE_ID} = pt.${COLUMNS.ID}
        JOIN ${TABLES.WARDS} w ON p.${COLUMNS.WARD_ID} = w.${COLUMNS.ID}
        WHERE p.${COLUMNS.ID} = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting property by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all properties in a specific ward.
   * @param {number} wardId - The ID of the ward
   * @returns {Promise<Property[]>} An array of properties in the specified ward
   */
  public async getPropertiesByWard(wardId: number): Promise<Property[]> {
    try {
      const result = await pool.query(`
        SELECT p.*, pt.${COLUMNS.NAME} as property_type_name, w.${COLUMNS.NAME} as ward_name 
        FROM ${TABLES.PROPERTIES} p
        JOIN ${TABLES.PROPERTY_TYPES} pt ON p.${COLUMNS.PROPERTY_TYPE_ID} = pt.${COLUMNS.ID}
        JOIN ${TABLES.WARDS} w ON p.${COLUMNS.WARD_ID} = w.${COLUMNS.ID}
        WHERE p.${COLUMNS.WARD_ID} = $1
        ORDER BY p.${COLUMNS.PROPERTY_NUMBER}
      `, [wardId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting properties by ward:', error);
      throw error;
    }
  }

  /**
   * Retrieves all properties owned by a specific owner.
   * @param {number} ownerId - The ID of the property owner
   * @returns {Promise<Property[]>} An array of properties owned by the specified owner
   */
  public async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    try {
      const result = await pool.query(`
        SELECT p.*, pt.${COLUMNS.NAME} as property_type_name, w.${COLUMNS.NAME} as ward_name 
        FROM ${TABLES.PROPERTIES} p
        JOIN ${TABLES.PROPERTY_TYPES} pt ON p.${COLUMNS.PROPERTY_TYPE_ID} = pt.${COLUMNS.ID}
        JOIN ${TABLES.WARDS} w ON p.${COLUMNS.WARD_ID} = w.${COLUMNS.ID}
        WHERE p.${COLUMNS.OWNER_ID} = $1
        ORDER BY p.${COLUMNS.PROPERTY_NUMBER}
      `, [ownerId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting properties by owner:', error);
      throw error;
    }
  }

  /**
   * Creates a new property in the database.
   * @param {CreatePropertyInput} data - The property data to create
   * @returns {Promise<Property>} The created property
   * @throws {ApiError} If a property with the same property number already exists
   */
  public async createProperty(data: CreatePropertyInput): Promise<Property> {
    try {
      // Check if property number already exists
      const existingProperty = await pool.query(
        `SELECT ${COLUMNS.ID} FROM ${TABLES.PROPERTIES} WHERE ${COLUMNS.PROPERTY_NUMBER} = $1`,
        [data.property_number]
      );

      if (existingProperty.rows.length > 0) {
        throw this.createApiError(400, ERROR_MESSAGES.DUPLICATE_PROPERTY_NUMBER);
      }

      const result = await pool.query(
        `INSERT INTO ${TABLES.PROPERTIES} 
         (${COLUMNS.PROPERTY_NUMBER}, ${COLUMNS.PROPERTY_TYPE_ID}, ${COLUMNS.WARD_ID}, 
          ${COLUMNS.OWNER_ID}, property_address_id, ${COLUMNS.AREA}, 
          ${COLUMNS.BUILT_UP_AREA}) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          data.property_number,
          data.property_type_id,
          data.ward_id,
          data.owner_id,
          data.property_address_id,
          data.area,
          data.built_up_area
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating property:', error);
      throw error;
    }
  }

  /**
   * Updates an existing property in the database.
   * @param {number} id - The ID of the property to update
   * @param {Partial<CreatePropertyInput>} data - The property data to update
   * @returns {Promise<Property | null>} The updated property or null if not found
   * @throws {ApiError} If the new property number already exists
   */
  public async updateProperty(
    id: number,
    data: Partial<CreatePropertyInput>
  ): Promise<Property | null> {
    try {
      // Check if property number already exists
      if (data.property_number) {
        const existingProperty = await pool.query(
          `SELECT ${COLUMNS.ID} FROM ${TABLES.PROPERTIES} 
           WHERE ${COLUMNS.PROPERTY_NUMBER} = $1 AND ${COLUMNS.ID} != $2`,
          [data.property_number, id]
        );

        if (existingProperty.rows.length > 0) {
          throw this.createApiError(400, ERROR_MESSAGES.DUPLICATE_PROPERTY_NUMBER);
        }
      }

      const result = await pool.query(
        `UPDATE ${TABLES.PROPERTIES} 
         SET ${COLUMNS.PROPERTY_NUMBER} = COALESCE($1, ${COLUMNS.PROPERTY_NUMBER}), 
             ${COLUMNS.PROPERTY_TYPE_ID} = COALESCE($2, ${COLUMNS.PROPERTY_TYPE_ID}), 
             ${COLUMNS.WARD_ID} = COALESCE($3, ${COLUMNS.WARD_ID}), 
             ${COLUMNS.OWNER_ID} = COALESCE($4, ${COLUMNS.OWNER_ID}), 
             property_address_id = COALESCE($5, property_address_id), 
             ${COLUMNS.AREA} = COALESCE($6, ${COLUMNS.AREA}), 
             ${COLUMNS.BUILT_UP_AREA} = COALESCE($7, ${COLUMNS.BUILT_UP_AREA}) 
         WHERE ${COLUMNS.ID} = $8 
         RETURNING *`,
        [
          data.property_number,
          data.property_type_id,
          data.ward_id,
          data.owner_id,
          data.property_address_id,
          data.area,
          data.built_up_area,
          id
        ]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating property:', error);
      throw error;
    }
  }

  /**
   * Deletes a property from the database.
   * @param {number} id - The ID of the property to delete
   * @returns {Promise<boolean>} True if the property was deleted, false otherwise
   * @throws {ApiError} If tax assessments exist for the property
   */
  public async deleteProperty(id: number): Promise<boolean> {
    // Check for related tax assessments
    const taxAssessments = await TaxCollectionModel.getInstance().getTaxAssessmentsByProperty(id);
    // Check if any financial year has assessments
    const hasAssessments = Object.values(taxAssessments).some(yearAssessments => yearAssessments.length > 0);

    if (hasAssessments) {
      throw new ApiError(400, 'Cannot delete property: tax assessments exist for this property.');
    }
    try {
      const result = await pool.query(
        `DELETE FROM ${TABLES.PROPERTIES} WHERE ${COLUMNS.ID} = $1`,
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Error deleting property:', error);
      throw error;
    }
  }
} 