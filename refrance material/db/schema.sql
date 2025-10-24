-- Users and Roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id),
    role_id INTEGER REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

create table tax_calculation_types(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tax calculation types
INSERT INTO tax_calculation_types (name, description) VALUES 
('fixed', 'Fixed amount calculation - same amount regardless of property value'),
('variable', 'Variable calculation - amount varies based on property area, value, or other factors');

-- Tax Management
CREATE TABLE tax_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tax_calculation_type_id INTEGER REFERENCES tax_calculation_types(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample tax types
INSERT INTO tax_types (name, description, tax_calculation_type_id) VALUES 
('Property Tax', 'Annual property tax based on property value', 2),
('Registration Fee', 'One-time property registration fee', 1);

CREATE TABLE tax_rates (
    id SERIAL PRIMARY KEY,
    tax_type_id INTEGER REFERENCES tax_types(id),
    rate DECIMAL(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tax_contracts (
    id SERIAL PRIMARY KEY,
    tax_type_id INTEGER REFERENCES tax_types(id),
    tax_rate_id INTEGER REFERENCES tax_rates(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_duration INTEGER NOT NULL, -- in months
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_duration CHECK (max_duration <= 12)
);

-- Ward Management
CREATE TABLE wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Addresses (renamed from ward_addresses)
CREATE TABLE property_addresses (
    id SERIAL PRIMARY KEY,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Management
CREATE TABLE property_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    property_type_id INTEGER REFERENCES property_types(id),
    owner_id INTEGER REFERENCES users(id),
    ward_id INTEGER REFERENCES wards(id),
    property_address_id INTEGER REFERENCES property_addresses(id),
    area DECIMAL(10,2) NOT NULL,
    built_up_area DECIMAL(10,2),
    property_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax Collection
CREATE TABLE tax_assessments (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    tax_contract_id INTEGER REFERENCES tax_contracts(id),
    assessment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tax_payments (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES tax_assessments(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_id INTEGER REFERENCES tax_receipts(id)
);

create table tax_receipts(
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    receipt_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Management
CREATE TABLE activity_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_templates (
    id SERIAL PRIMARY KEY,
    activity_type_id INTEGER REFERENCES activity_types(id),
    name VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    activity_type_id INTEGER REFERENCES activity_types(id),
    template_id INTEGER REFERENCES activity_templates(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notification_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    notification_type_id INTEGER REFERENCES notification_types(id),
    name VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    notification_type_id INTEGER REFERENCES notification_types(id),
    template_id INTEGER REFERENCES notification_templates(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    scheduled_date TIMESTAMP,
    sent_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    notification_type_id INTEGER REFERENCES notification_types(id),
    subscription_type VARCHAR(50) NOT NULL,
    parameters JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tax_types_tax_calculation_type_id ON tax_types(tax_calculation_type_id);
CREATE INDEX idx_tax_rates_tax_type_id ON tax_rates(tax_type_id);
CREATE INDEX idx_tax_contracts_tax_type_id ON tax_contracts(tax_type_id);
CREATE INDEX idx_tax_contracts_tax_rate_id ON tax_contracts(tax_rate_id);
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_ward_id ON properties(ward_id);
CREATE INDEX idx_properties_property_address_id ON properties(property_address_id);
CREATE INDEX idx_property_addresses_pincode ON property_addresses(pincode);
CREATE INDEX idx_property_addresses_city ON property_addresses(city);
CREATE INDEX idx_tax_assessments_property_id ON tax_assessments(property_id);
CREATE INDEX idx_tax_assessments_tax_contract_id ON tax_assessments(tax_contract_id);
CREATE INDEX idx_tax_payments_assessment_id ON tax_payments(assessment_id);
CREATE INDEX idx_activities_activity_type_id ON activities(activity_type_id);
CREATE INDEX idx_activities_template_id ON activities(template_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_notification_type_id ON notifications(notification_type_id);
CREATE INDEX idx_notifications_template_id ON notifications(template_id);
CREATE INDEX idx_notification_subscriptions_notification_type_id ON notification_subscriptions(notification_type_id);
CREATE INDEX idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);

-- Trigger function to automatically update assessment status when payment status changes
CREATE OR REPLACE FUNCTION update_assessment_status_on_payment_change()
RETURNS TRIGGER AS $$
DECLARE
    assessment_amount DECIMAL(10,2);
    total_paid DECIMAL(10,2);
    new_status VARCHAR(20);
BEGIN
    -- Only proceed if payment status was changed to 'completed' or if a completed payment was updated/deleted
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') OR
       (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
       (TG_OP = 'UPDATE' AND OLD.status = 'completed') OR
       (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        
        -- Get the assessment amount
        SELECT amount INTO assessment_amount
        FROM tax_assessments
        WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);
        
        -- Calculate total paid for this assessment
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM tax_payments
        WHERE assessment_id = COALESCE(NEW.assessment_id, OLD.assessment_id)
        AND status = 'completed';
        
        -- Determine new assessment status based on payment completion
        IF total_paid >= assessment_amount THEN
            new_status := 'paid';
        ELSIF total_paid > 0 THEN
            new_status := 'partially_paid';
        ELSE
            new_status := 'pending';
        END IF;
        
        -- Update the assessment status
        UPDATE tax_assessments
        SET status = new_status
        WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);
        
        -- Log the change for debugging
        RAISE NOTICE 'Assessment % status updated to: % (Total paid: %, Assessment amount: %)',
                     COALESCE(NEW.assessment_id, OLD.assessment_id), new_status, total_paid, assessment_amount;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations on tax_payments
CREATE TRIGGER trigger_update_assessment_on_payment_insert
    AFTER INSERT ON tax_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_status_on_payment_change();

-- Create trigger for UPDATE operations on tax_payments
CREATE TRIGGER trigger_update_assessment_on_payment_update
    AFTER UPDATE ON tax_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_status_on_payment_change();

-- Create trigger for DELETE operations on tax_payments (to handle payment cancellations)
CREATE TRIGGER trigger_update_assessment_on_payment_delete
    AFTER DELETE ON tax_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_status_on_payment_change();