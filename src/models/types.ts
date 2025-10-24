/**
 * Database Model Types
 * Based on the gram panchayat schema
 */

export interface User {
  id: number;
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
  name: string;
  description?: string;
  created_at: Date;
}

export interface UserRole {
  user_id: number;
  role_id: number;
}

export interface TaxCalculationType {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface TaxType {
  id: number;
  name: string;
  description?: string;
  tax_calculation_type_id: number;
  created_at: Date;
}

export interface TaxRate {
  id: number;
  tax_type_id: number;
  rate: number;
  effective_from: Date;
  effective_to: Date;
  created_at: Date;
}

export interface TaxContract {
  id: number;
  tax_type_id: number;
  tax_rate_id: number;
  start_date: Date;
  end_date: Date;
  max_duration: number;
  created_at: Date;
}

export interface Ward {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at: Date;
}

export interface PropertyAddress {
  id: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  created_at: Date;
}

export interface PropertyType {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface Property {
  id: number;
  property_type_id: number;
  owner_id: number;
  ward_id: number;
  property_address_id: number;
  area: number;
  built_up_area?: number;
  property_number: string;
  created_at: Date;
}

export interface TaxAssessment {
  id: number;
  property_id: number;
  tax_contract_id: number;
  assessment_date: Date;
  amount: number;
  status: string;
  created_at: Date;
}

export interface TaxPayment {
  id: number;
  assessment_id: number;
  amount: number;
  payment_date: Date;
  payment_method: string;
  transaction_id?: string;
  status: string;
  created_at: Date;
  receipt_id?: number;
}

export interface TaxReceipt {
  id: number;
  amount: number;
  receipt_date: Date;
  created_at: Date;
}

export interface ActivityType {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface ActivityTemplate {
  id: number;
  activity_type_id: number;
  name: string;
  template_content: string;
  created_at: Date;
}

export interface Activity {
  id: number;
  activity_type_id: number;
  template_id: number;
  title: string;
  description?: string;
  scheduled_date: Date;
  status: string;
  created_at: Date;
}

export interface NotificationType {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface NotificationTemplate {
  id: number;
  notification_type_id: number;
  name: string;
  template_content: string;
  created_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  notification_type_id: number;
  template_id: number;
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
  subscription_type: string;
  parameters?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
}
