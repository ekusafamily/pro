-- Supabase Schema for Smart Retail Management System (SRMS)

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'distributor', 'customer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    avatar_url TEXT,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    unit TEXT,
    manufacturer TEXT,
    price FLOAT8 NOT NULL DEFAULT 0,
    buying_price FLOAT8 NOT NULL DEFAULT 0,
    stock INT4 NOT NULL DEFAULT 0,
    low_stock_alert INT4 NOT NULL DEFAULT 5,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    address TEXT,
    amount_owed FLOAT8 NOT NULL DEFAULT 0,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'unpaid')),
    loyalty_points INT4 DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Distributors Table
CREATE TABLE IF NOT EXISTS distributors (
    distributor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    kra_pin TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    main_products TEXT,
    total_owed FLOAT8 NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sales Table
CREATE TABLE IF NOT EXISTS sales (
    sale_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ DEFAULT NOW(),
    product_id UUID REFERENCES products(product_id),
    user_id UUID REFERENCES users(user_id),
    quantity INT4 NOT NULL,
    total_price FLOAT8 NOT NULL,
    sale_type TEXT NOT NULL DEFAULT 'cash' CHECK (sale_type IN ('cash', 'credit')),
    payment_ref TEXT,
    amount_paid FLOAT8,
    change_amount FLOAT8,
    customer_id UUID REFERENCES customers(customer_id),
    loyalty_points INT4 DEFAULT 0
);

-- 7. Stock In Table
CREATE TABLE IF NOT EXISTS stock_ins (
    stock_in_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_no TEXT UNIQUE NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    distributor_id UUID REFERENCES distributors(distributor_id),
    product_id UUID REFERENCES products(product_id),
    qty_received INT4 NOT NULL,
    qty_accepted INT4 NOT NULL,
    qty_rejected INT4 NOT NULL DEFAULT 0,
    unit_cost FLOAT8 NOT NULL,
    total_cost FLOAT8 NOT NULL,
    rejection_reason TEXT,
    delivery_note_no TEXT,
    invoice_no TEXT,
    batch_no TEXT,
    mfg_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    prev_stock INT4,
    new_stock INT4,
    received_by TEXT
);

-- 8. Stock Batches Table
CREATE TABLE IF NOT EXISTS stock_batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(product_id),
    quantity INT4 NOT NULL,
    mfg_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    batch_no TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    reference_id TEXT,
    message TEXT NOT NULL,
    seen BOOLEAN DEFAULT FALSE,
    date TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Initial Data (Admin Account)
INSERT INTO users (username, full_name, role, status, password)
VALUES ('admin', 'System Administrator', 'admin', 'active', '123123')
ON CONFLICT (username) DO NOTHING;

-- 12. Storage Setup
-- Note: This requires the storage extension to be active.
-- If these fail, please create a bucket named 'product-images' manually in the Supabase Dashboard and set it to Public.

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow All Uploads" ON storage.objects;
CREATE POLICY "Allow All Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow All Updates" ON storage.objects;
CREATE POLICY "Allow All Updates" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow All Deletes" ON storage.objects;
CREATE POLICY "Allow All Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

