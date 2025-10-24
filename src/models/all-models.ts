/**
 * Comprehensive Model Definitions
 * Based on reference Sequelize models
 */

// ==================== TENANT & USER MODELS ====================

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface User {
  id: number;
  tenant_id: number;
  username: string;
  password_hash: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface UserRole {
  id: number;
  tenant_id: number;
  user_id: number;
  role_id: number;
  created_at: Date;
}

// ==================== PROPERTY MODELS ====================

export interface Ward {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  description?: string;
  created_at: Date;
}

export interface PropertyType {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface PropertyAddress {
  id: number;
  tenant_id: number;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: Date;
}

export interface Property {
  id: number;
  tenant_id: number;
  property_type_id: number;
  owner_id: number;
  ward_id: number;
  property_address_id: number;
  area: number;
  built_up_area?: number;
  property_number: string;
  created_at: Date;
}

// ==================== TAX MODELS ====================

export interface TaxType {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface TaxCalculationType {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  formula?: string;
  created_at: Date;
}

export interface TaxRate {
  id: number;
  tenant_id: number;
  tax_type_id: number;
  calculation_type_id: number;
  rate: number;
  effective_date: Date;
  expiry_date?: Date;
  created_at: Date;
}

export interface TaxContract {
  id: number;
  tenant_id: number;
  tax_type_id: number;
  tax_rate_id: number;
  start_date: Date;
  end_date: Date;
  max_duration: number;
  created_at: Date;
}

export interface TaxAssessment {
  id: number;
  tenant_id: number;
  property_id: number;
  tax_contract_id: number;
  assessment_date: Date;
  amount: number;
  status: string;
  created_at: Date;
}

export interface TaxPayment {
  id: number;
  tenant_id: number;
  assessment_id?: number;
  amount: number;
  payment_date: Date;
  payment_method: string;
  transaction_id?: string;
  status: string;
  receipt_id?: number;
  remarks?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
  deleted_by?: number;
}

export interface TaxReceipt {
  id: number;
  tenant_id: number;
  payment_id: number;
  receipt_number: string;
  receipt_date: Date;
  amount: number;
  issued_by: number;
  created_at: Date;
}

export interface MiscellaneousPayment {
  id: number;
  tenant_id: number;
  payer_id: number;
  amount: number;
  payment_date: Date;
  payment_method: string;
  description?: string;
  receipt_number?: string;
  created_at: Date;
}

// ==================== ACTIVITY MODELS ====================

export interface ActivityType {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface ActivityTemplate {
  id: number;
  tenant_id: number;
  activity_type_id: number;
  name: string;
  description?: string;
  default_duration?: number;
  created_at: Date;
}

export interface Activity {
  id: number;
  tenant_id: number;
  activity_type_id: number;
  template_id?: number;
  title: string;
  description?: string;
  scheduled_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
  deleted_by?: number;
}

export interface ActivityParticipant {
  id: number;
  tenant_id: number;
  activity_id: number;
  user_id: number;
  role?: string;
  attendance_status?: string;
  created_at: Date;
}

export interface ActivityReport {
  id: number;
  tenant_id: number;
  activity_id: number;
  report_content: string;
  submitted_by: number;
  submitted_at: Date;
  created_at: Date;
}

// ==================== MEETING MODELS ====================

export interface Meeting {
  id: number;
  tenant_id: number;
  activity_id?: number;
  meeting_type: string;
  agenda?: string;
  meeting_minutes?: string;
  attendee_count: number;
  expected_attendees: number;
  resolution_count: number;
  meeting_status: string;
  meeting_location?: string;
  meeting_date: Date;
  meeting_time: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface MeetingTemplate {
  id: number;
  tenant_id: number;
  name: string;
  meeting_type: string;
  default_agenda?: string;
  default_duration?: number;
  created_at: Date;
}

export interface MeetingAttendee {
  id: number;
  tenant_id: number;
  meeting_id: number;
  user_id: number;
  attendance_status: string;
  created_at: Date;
}

export interface MeetingTopic {
  id: number;
  tenant_id: number;
  meeting_id: number;
  topic: string;
  discussion?: string;
  order_index: number;
  created_at: Date;
}

export interface MeetingResolution {
  id: number;
  tenant_id: number;
  meeting_id: number;
  resolution_text: string;
  status: string;
  responsible_person?: number;
  due_date?: Date;
  created_at: Date;
}

// ==================== AUDIT & SYSTEM MODELS ====================

export interface AuditLog {
  id: number;
  tenant_id: number;
  user_id?: number;
  action: string;
  table_name: string;
  record_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// ==================== MODEL REGISTRY ====================

export const MODEL_REGISTRY = {
  // Tenant & User
  tenants: 'Tenant',
  users: 'User',
  roles: 'Role',
  user_roles: 'UserRole',
  
  // Property
  wards: 'Ward',
  property_types: 'PropertyType',
  property_addresses: 'PropertyAddress',
  properties: 'Property',
  
  // Tax
  tax_types: 'TaxType',
  tax_calculation_types: 'TaxCalculationType',
  tax_rates: 'TaxRate',
  tax_contracts: 'TaxContract',
  tax_assessments: 'TaxAssessment',
  tax_payments: 'TaxPayment',
  tax_receipts: 'TaxReceipt',
  miscellaneous_payments: 'MiscellaneousPayment',
  
  // Activity
  activity_types: 'ActivityType',
  activity_templates: 'ActivityTemplate',
  activities: 'Activity',
  activity_participants: 'ActivityParticipant',
  activity_reports: 'ActivityReport',
  
  // Meeting
  meetings: 'Meeting',
  meeting_templates: 'MeetingTemplate',
  meeting_attendees: 'MeetingAttendee',
  meeting_topics: 'MeetingTopic',
  meeting_resolutions: 'MeetingResolution',
  
  // System
  audit_logs: 'AuditLog',
} as const;

export type TableName = keyof typeof MODEL_REGISTRY;
