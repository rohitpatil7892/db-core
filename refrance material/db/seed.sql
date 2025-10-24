-- Clear existing data (optional)
TRUNCATE TABLE users, roles, user_roles, tax_contracts, tax_rates, tax_types, properties, wards, tax_assessments, tax_payments RESTART IDENTITY CASCADE;

-- Insert Roles
INSERT INTO roles (name, description) VALUES
('Admin', 'System Administrator'),
('Citizen', 'Regular Citizen User')
RETURNING id;

-- Insert Users
WITH inserted_users AS (
  INSERT INTO users (username, password_hash, email, full_name, phone) VALUES
  ('admin', 'hashed_password', 'admin@grampanchayat.gov', 'Admin User', '9123456789'),
  ('rohit', 'hashed_password', 'rohit@example.com', 'Rohit Patil', '9876543210')
  RETURNING id
)
INSERT INTO user_roles (user_id, role_id) VALUES
((SELECT id FROM inserted_users LIMIT 1), 1),
((SELECT id FROM inserted_users OFFSET 1 LIMIT 1), 2);

-- Insert Tax Calculation Types
INSERT INTO tax_calculation_types (name, description) VALUES
('Area-Based', 'Tax calculated based on property area'),
('Flat-Rate', 'Fixed tax amount')
RETURNING id;

-- Insert Tax Types
WITH tax_types AS (
  INSERT INTO tax_types (name, description, tax_calculation_type_id) VALUES
  ('Property Tax', 'Annual property tax', 1),
  ('Water Tax', 'Monthly water usage tax', 2)
  RETURNING id
)
-- Insert Tax Rates
INSERT INTO tax_rates (tax_type_id, rate, effective_from, effective_to) VALUES
((SELECT id FROM tax_types LIMIT 1), 2.5, '2024-01-01', '2024-12-31'),
((SELECT id FROM tax_types OFFSET 1 LIMIT 1), 150, '2024-01-01', '2024-12-31'),
-- Add tax rates for fiscal year 2025-2026
((SELECT id FROM tax_types LIMIT 1), 3.0, '2025-04-01', '2026-03-31'),
((SELECT id FROM tax_types OFFSET 1 LIMIT 1), 175, '2025-04-01', '2026-03-31');

-- Insert Tax Contracts
INSERT INTO tax_contracts (tax_type_id, tax_rate_id, start_date, end_date, max_duration) VALUES
(1, 1, '2024-01-01', '2024-12-31', 12),
(2, 2, '2024-01-01', '2024-12-31', 12);

-- Insert Wards
INSERT INTO wards (name, code, description) VALUES
('Ward A', 'WA-01', 'Main residential ward'),
('Ward B', 'WB-01', 'Commercial ward')
RETURNING id;

-- Insert Ward Addresses
INSERT INTO ward_addresses (ward_id, address_line1, city, state, pincode) VALUES
(1, 'Main Road', 'Pune', 'Maharashtra', '411001'),
(2, 'Market Street', 'Pune', 'Maharashtra', '411002');

-- Insert Property Types
INSERT INTO property_types (name, description) VALUES
('Residential', 'Private residences'),
('Commercial', 'Business properties');

-- Insert Properties
INSERT INTO properties (property_type_id, owner_id, ward_id, address_id, area, property_number) VALUES
(1, 2, 1, 1, 1200, 'PROP-001'),
(2, 2, 2, 2, 500, 'PROP-002');

-- Insert Tax Assessments
INSERT INTO tax_assessments (property_id, tax_contract_id, assessment_date, amount, status) VALUES
(1, 1, '2024-01-15', 3000, 'PENDING'),
(2, 2, '2024-01-15', 1800, 'PAID');

-- Insert Tax Receipts and Payments
WITH receipts AS (
  INSERT INTO tax_receipts (amount, receipt_date) VALUES
  (1800, '2024-01-20')
  RETURNING id
)
INSERT INTO tax_payments (assessment_id, amount, payment_date, payment_method, status, receipt_id) VALUES
(2, 1800, '2024-01-20', 'Online', 'COMPLETED', (SELECT id FROM receipts));

-- Insert Activities
INSERT INTO activity_types (name, description) VALUES
('Tax Payment Reminder', 'Reminder for pending tax payments'),
('Public Meeting', 'Community gathering');

INSERT INTO activity_templates (activity_type_id, name, template_content) VALUES
(1, 'Tax Reminder', 'Dear {name}, your tax of {amount} is due by {date}');

INSERT INTO activities (activity_type_id, template_id, title, scheduled_date, status) VALUES
(1, 1, 'Q1 Tax Reminders', '2024-03-31', 'PENDING');

-- Insert Notifications
INSERT INTO notification_types (name, description) VALUES
('SMS', 'Text message notifications'),
('Email', 'Email notifications');

INSERT INTO notification_templates (notification_type_id, name, template_content) VALUES
(1, 'Payment Confirmation', 'Your payment of {amount} was successful. Ref: {receipt}'); 