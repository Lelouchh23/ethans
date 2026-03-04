-- Ethan's Cafe Sales & Inventory System
-- Full PostgreSQL/Supabase schema + compatibility migrations + starter data
-- Generated from backend and frontend code usage analysis (March 2026)

BEGIN;

-- =========================================================
-- 1) CORE AUTH & ACCESS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    permissions TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_name_lower ON public.roles (LOWER(name));

CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    manager_pin VARCHAR(50),
    role_id INTEGER REFERENCES public.roles(id),
    status VARCHAR(30) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    email VARCHAR(255),
    phone VARCHAR(20),
    ip_address VARCHAR(64),
    ip_addresss TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_not_null ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

CREATE TABLE IF NOT EXISTS public.account_requests (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    requested_role_id INTEGER REFERENCES public.roles(id),
    status VARCHAR(30) DEFAULT 'Pending',
    requested_at TIMESTAMP DEFAULT NOW(),
    reviewed_by INTEGER REFERENCES public.users(id),
    reviewed_at TIMESTAMP,
    notes TEXT,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_account_requests_status ON public.account_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_requests_username ON public.account_requests(username);

CREATE TABLE IF NOT EXISTS public.temp_accounts (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES public.roles(id),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    ip_address VARCHAR(64),
    reason TEXT,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_temp_accounts_status ON public.temp_accounts(status);
CREATE INDEX IF NOT EXISTS idx_temp_accounts_expires_at ON public.temp_accounts(expires_at);

CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.account_lockout (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    lockout_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON public.password_reset_otps(expires_at);

-- =========================================================
-- 2) MENU & INVENTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS public.menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS public.menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id INTEGER REFERENCES public.menu_categories(id),
    description VARCHAR(255),
    recipe INTEGER NOT NULL DEFAULT 0,
    price_reference NUMERIC(12,2),
    status VARCHAR(30),
    image_path VARCHAR(500),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON public.menu_items(status);

CREATE TABLE IF NOT EXISTS public.ingredient_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id INTEGER REFERENCES public.ingredient_categories(id),
    unit_id INTEGER REFERENCES public.units(id),
    current_quantity NUMERIC(12,2),
    low_stock_threshold NUMERIC(12,2),
    status VARCHAR(30),
    expiry_date DATE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON public.ingredients(category_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_unit_id ON public.ingredients(unit_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_expiry_date ON public.ingredients(expiry_date);

CREATE TABLE IF NOT EXISTS public.recipes (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES public.menu_items(id),
    ingredient_id INTEGER REFERENCES public.ingredients(id),
    qty_per_sale NUMERIC(12,3),
    unit_id INTEGER REFERENCES public.units(id)
);

CREATE INDEX IF NOT EXISTS idx_recipes_menu_item_id ON public.recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON public.recipes(ingredient_id);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER REFERENCES public.ingredients(id),
    change_qty NUMERIC(12,2),
    transaction_type VARCHAR(80),
    reason VARCHAR(255),
    performed_by INTEGER REFERENCES public.users(id),
    prev_qty NUMERIC(12,2),
    new_qty NUMERIC(12,2),
    "timestamp" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_id ON public.inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_timestamp ON public.inventory_transactions("timestamp");

-- =========================================================
-- 3) SALES, RECEIPTS, HELD ORDERS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.sales (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(120),
    sale_datetime TIMESTAMP,
    staff_id INTEGER REFERENCES public.users(id),
    total_items INTEGER,
    total_amount NUMERIC(12,2),
    notes TEXT,
    status VARCHAR(30) DEFAULT 'completed',
    adjusted_total NUMERIC(12,2),
    adjusted_by INTEGER REFERENCES public.users(id),
    adjusted_at TIMESTAMP,
    adjustment_reason TEXT,
    created_at TIMESTAMP,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
    order_type VARCHAR(50) DEFAULT 'walk-in',
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percent NUMERIC(8,2) DEFAULT 0,
    coupon_code VARCHAR(100),
    coupon_value NUMERIC(12,2) DEFAULT 0,
    taxes NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sales_staff_id ON public.sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_datetime ON public.sales(sale_datetime);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES public.sales(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES public.menu_items(id),
    quantity INTEGER,
    unit_price NUMERIC(12,2) DEFAULT 0,
    item_name VARCHAR(255),
    category_name VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_menu_item_id ON public.sale_items(menu_item_id);

CREATE TABLE IF NOT EXISTS public.held_orders (
    id SERIAL PRIMARY KEY,
    hold_ref VARCHAR(120) NOT NULL,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
    order_type VARCHAR(50) DEFAULT 'walk-in',
    items_json TEXT NOT NULL,
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percent NUMERIC(8,2) DEFAULT 0,
    coupon_code VARCHAR(100),
    coupon_value NUMERIC(12,2) DEFAULT 0,
    taxes NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    staff_id INTEGER REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(30) DEFAULT 'active',
    restored_at TIMESTAMP,
    restored_by INTEGER REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_held_orders_status ON public.held_orders(status);
CREATE INDEX IF NOT EXISTS idx_held_orders_expires_at ON public.held_orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_held_orders_staff_id ON public.held_orders(staff_id);

-- =========================================================
-- 4) NOTIFICATIONS, LOGS, REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    role_label VARCHAR(80),
    action VARCHAR(255),
    reference VARCHAR(255),
    status VARCHAR(50),
    ip_address VARCHAR(64),
    created_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    action_type VARCHAR(120) NOT NULL,
    target_table VARCHAR(120) NOT NULL,
    target_id INTEGER,
    description TEXT,
    reason TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

CREATE TABLE IF NOT EXISTS public.requests_tbl (
    id SERIAL PRIMARY KEY,
    type VARCHAR(120),
    requester_id INTEGER REFERENCES public.users(id),
    target_id INTEGER,
    payload TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP,
    handled_by INTEGER REFERENCES public.users(id),
    handled_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requests_tbl_status ON public.requests_tbl(status);
CREATE INDEX IF NOT EXISTS idx_requests_tbl_requester_id ON public.requests_tbl(requester_id);

-- =========================================================
-- 5) BACKUP & SYSTEM SETTINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.backups (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size VARCHAR(50),
    backup_type TEXT DEFAULT 'Manual',
    includes_media BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups(created_at);

CREATE TABLE IF NOT EXISTS public.backup_settings (
    id INTEGER PRIMARY KEY,
    schedule TEXT DEFAULT 'Weekly',
    retention_count INTEGER DEFAULT 10,
    include_media BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(120) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP
);

-- =========================================================
-- 6) COMPATIBILITY MIGRATIONS (SAFE TO RUN MULTIPLE TIMES)
-- =========================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_pin VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ip_addresss TEXT;

ALTER TABLE public.account_requests ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.account_requests ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) DEFAULT 'Walk-in Customer';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'walk-in';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(8,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(100);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS coupon_value NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS taxes NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);

-- =========================================================
-- 7) STARTER DATA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.roles (id, name, permissions) VALUES
    (1, 'admin', 'all'),
    (2, 'staff', 'pos,inventory,receipts'),
    (3, 'manager', 'pos,inventory,reports,approvals'),
    (4, 'owner', 'all')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    permissions = EXCLUDED.permissions;

INSERT INTO public.users (
    full_name,
    username,
    password_hash,
    manager_pin,
    role_id,
    status,
    email,
    created_at,
    updated_at
) VALUES
    (
        'System Admin',
        'admin',
        crypt('Admin123!', gen_salt('bf')),
        '1234',
        1,
        'active',
        'admin@ethans.local',
        NOW(),
        NOW()
    ),
    (
        'Staff',
        'staff1',
        crypt('Staff123!', gen_salt('bf')),
        NULL,
        2,
        'active',
        'staff1@ethans.local',
        NOW(),
        NOW()
    )
ON CONFLICT (username) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    manager_pin = EXCLUDED.manager_pin,
    role_id = EXCLUDED.role_id,
    status = EXCLUDED.status,
    email = EXCLUDED.email,
    updated_at = NOW();

INSERT INTO public.backup_settings (id, schedule, retention_count, include_media, updated_at)
VALUES (1, 'Weekly', 10, TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET
    schedule = EXCLUDED.schedule,
    retention_count = EXCLUDED.retention_count,
    include_media = EXCLUDED.include_media,
    updated_at = NOW();

INSERT INTO public.system_settings (key, value, updated_at) VALUES
    ('restaurant_name', 'Ethan''s Caffe & Restaurant', NOW()),
    ('restaurant_address', '123 Street Block, City Name', NOW()),
    ('restaurant_contact', '+63 123 456 7890', NOW()),
    ('restaurant_tin', '000-111-222-333', NOW()),
    ('enable_discount', 'true', NOW()),
    ('enable_coupon', 'true', NOW()),
    ('hold_order_expiry_hours', '5', NOW()),
    ('auto_print_receipt', 'false', NOW()),
    ('low_stock_threshold', '10', NOW()),
    ('expiry_warning_days', '7', NOW()),
    ('enable_email_notifications', 'false', NOW()),
    ('allow_partial_refund', 'true', NOW()),
    ('refund_time_limit_hours', '24', NOW()),
    ('require_reason_for_void', 'true', NOW()),
    ('tax_rate', '12', NOW()),
    ('currency_symbol', 'P', NOW()),
    ('auto_logout_minutes', '30', NOW()),
    ('require_manager_void', 'true', NOW()),
    ('allow_order_modification', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

COMMIT;

-- =========================================================
-- 8) COMMON QUERY SNIPPETS USED BY THE SYSTEM
-- =========================================================

-- 8.1 Active users with role
-- SELECT u.id, u.username, u.full_name, u.status, r.name AS role_name
-- FROM public.users u
-- LEFT JOIN public.roles r ON r.id = u.role_id
-- WHERE u.status = 'active'
-- ORDER BY u.full_name;

-- 8.2 Pending account requests
-- SELECT ar.*, r.name AS requested_role_name
-- FROM public.account_requests ar
-- LEFT JOIN public.roles r ON r.id = ar.requested_role_id
-- WHERE ar.status = 'Pending'
-- ORDER BY ar.requested_at DESC;

-- 8.3 Low-stock ingredients
-- SELECT i.id, i.name, i.current_quantity, i.low_stock_threshold, u.name AS unit_name
-- FROM public.ingredients i
-- LEFT JOIN public.units u ON u.id = i.unit_id
-- WHERE COALESCE(i.current_quantity, 0) <= COALESCE(i.low_stock_threshold, 0)
-- ORDER BY i.name;

-- 8.4 Expiring ingredients (next 7 days)
-- SELECT id, name, expiry_date
-- FROM public.ingredients
-- WHERE expiry_date IS NOT NULL
--   AND expiry_date <= (CURRENT_DATE + INTERVAL '7 days')
-- ORDER BY expiry_date ASC;

-- 8.5 Daily sales summary
-- SELECT DATE(sale_datetime) AS sale_date,
--        COUNT(*) AS total_transactions,
--        SUM(COALESCE(total_amount,0)) AS total_revenue
-- FROM public.sales
-- WHERE status = 'completed'
-- GROUP BY DATE(sale_datetime)
-- ORDER BY sale_date DESC;

-- 8.6 Unread notifications per user
-- SELECT user_id, COUNT(*) AS unread_count
-- FROM public.notifications
-- WHERE is_read = FALSE
-- GROUP BY user_id;

-- 8.7 Expired held orders
-- SELECT *
-- FROM public.held_orders
-- WHERE status = 'active' AND expires_at < NOW();

-- 8.8 Cleanup expired sessions
-- DELETE FROM public.user_sessions
-- WHERE expires_at < NOW() OR is_active = FALSE;
