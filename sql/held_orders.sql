-- ============================================
-- Held Orders Table
-- Stores orders on hold with expiration
-- ============================================

-- Create sequence for held_orders
CREATE SEQUENCE IF NOT EXISTS held_orders_id_seq;

-- Create held_orders table
CREATE TABLE IF NOT EXISTS public.held_orders (
    id integer NOT NULL DEFAULT nextval('held_orders_id_seq'::regclass),
    hold_ref character varying NOT NULL, -- e.g., HOLD-1234567890
    customer_name character varying DEFAULT 'Walk-in Customer',
    order_type character varying DEFAULT 'walk-in', -- 'dine-in' or 'walk-in'
    items_json text NOT NULL, -- JSON array of cart items
    subtotal numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    discount_percent numeric DEFAULT 0,
    coupon_code character varying,
    coupon_value numeric DEFAULT 0,
    taxes numeric DEFAULT 0,
    total_amount numeric DEFAULT 0,
    staff_id integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL, -- default 5 hours from creation
    status character varying DEFAULT 'active', -- 'active', 'restored', 'expired', 'cancelled'
    restored_at timestamp without time zone,
    restored_by integer,
    CONSTRAINT held_orders_pkey PRIMARY KEY (id),
    CONSTRAINT held_orders_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id),
    CONSTRAINT held_orders_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES public.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_held_orders_status ON public.held_orders(status);
CREATE INDEX IF NOT EXISTS idx_held_orders_expires_at ON public.held_orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_held_orders_staff_id ON public.held_orders(staff_id);

-- ============================================
-- Update sales table to include more details
-- ============================================

-- Add customer_name and order_type columns to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name character varying DEFAULT 'Walk-in Customer';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS order_type character varying DEFAULT 'walk-in';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS coupon_code character varying;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS coupon_value numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS taxes numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;

-- ============================================
-- Update sale_items table to include price
-- ============================================

ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS item_name character varying;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS category_name character varying;

-- ============================================
-- System Settings for Discount/Coupon Toggle
-- ============================================

-- Insert or update all system settings (UPSERT)
INSERT INTO public.system_settings (key, value, updated_at) VALUES 
    -- Restaurant Profile
    ('restaurant_name', 'Ethan''s Caffe & Restaurant', NOW()),
    ('restaurant_address', '123 Street Block, City Name', NOW()),
    ('restaurant_contact', '+63 123 456 7890', NOW()),
    ('restaurant_tin', '000-111-222-333', NOW()),
    
    -- POS/Cashier Settings
    ('enable_discount', 'true', NOW()),
    ('enable_coupon', 'true', NOW()),
    ('hold_order_expiry_hours', '5', NOW()),
    ('auto_print_receipt', 'false', NOW()),
    
    -- Inventory Settings
    ('low_stock_threshold', '10', NOW()),
    ('expiry_warning_days', '7', NOW()),
    
    -- Notification Settings
    ('enable_email_notifications', 'false', NOW()),
    
    -- Refund/Void Settings
    ('allow_partial_refund', 'true', NOW()),
    ('refund_time_limit_hours', '24', NOW()),
    ('require_reason_for_void', 'true', NOW()),
    
    -- Transaction Settings
    ('tax_rate', '12', NOW()),
    ('currency_symbol', 'P', NOW()),
    ('auto_logout_minutes', '30', NOW()),
    ('require_manager_void', 'true', NOW()),
    ('allow_order_modification', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
