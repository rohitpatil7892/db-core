-- Trigger function to update assessment status when payment status changes
CREATE OR REPLACE FUNCTION update_assessment_status_on_payment_change()
RETURNS TRIGGER AS $$
DECLARE
    assessment_amount DECIMAL(10,2);
    total_paid DECIMAL(10,2);
    new_status VARCHAR(20);
BEGIN
    -- Only proceed if payment status was changed to 'completed' or if a completed payment was updated
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') OR
       (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
       (TG_OP = 'UPDATE' AND OLD.status = 'completed') THEN
        
        -- Get the assessment amount
        SELECT amount INTO assessment_amount
        FROM tax_assessments
        WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);
        
        -- Calculate total paid for this assessment
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM tax_payments
        WHERE assessment_id = COALESCE(NEW.assessment_id, OLD.assessment_id)
        AND status = 'completed';
        
        -- Determine new assessment status
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
        
        -- Log the change
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