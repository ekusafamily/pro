-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Add missing columns to 'sales' table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid FLOAT8;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_ref TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'cash';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount FLOAT8;

-- 2. FIX CHECK CONSTRAINT to allow 'mpesa'
-- Use a DO block to handle constraints safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_sale_type_check') THEN
        ALTER TABLE sales DROP CONSTRAINT sales_sale_type_check;
    END IF;
END $$;

ALTER TABLE sales ADD CONSTRAINT sales_sale_type_check CHECK (sale_type IN ('cash', 'credit', 'mpesa'));

-- 3. Verify they exist (Optional, just for display)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales';
