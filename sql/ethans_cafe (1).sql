-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.account_lockout (
  id bigint NOT NULL DEFAULT nextval('account_lockout_id_seq'::regclass),
  user_id bigint NOT NULL UNIQUE,
  lockout_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_lockout_pkey PRIMARY KEY (id)
);
CREATE TABLE public.account_requests (
  id integer NOT NULL DEFAULT nextval('account_requests_id_seq'::regclass),
  full_name character varying NOT NULL,
  username character varying NOT NULL,
  password_hash character varying NOT NULL,
  requested_role_id integer,
  status character varying,
  requested_at timestamp without time zone,
  reviewed_by integer,
  reviewed_at timestamp without time zone,
  notes text,
  ip_address text,
  email text,
  CONSTRAINT account_requests_pkey PRIMARY KEY (id),
  CONSTRAINT account_requests_requested_role_id_fkey FOREIGN KEY (requested_role_id) REFERENCES public.roles(id),
  CONSTRAINT account_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.activity_logs (
  id integer NOT NULL DEFAULT nextval('activity_logs_id_seq'::regclass),
  user_id integer,
  role_label character varying,
  action character varying,
  reference character varying,
  status character varying,
  ip_address character varying,
  created_at timestamp without time zone,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.backup_settings (
  id integer NOT NULL DEFAULT 1,
  schedule text DEFAULT 'Weekly'::text,
  retention_count integer DEFAULT 10,
  include_media boolean DEFAULT true,
  updated_at timestamp without time zone,
  CONSTRAINT backup_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.backups (
  id integer NOT NULL DEFAULT nextval('backups_id_seq'::regclass),
  filename character varying NOT NULL,
  file_path character varying NOT NULL,
  file_size character varying,
  backup_type text DEFAULT 'Manual'::text,
  includes_media boolean DEFAULT false,
  created_by integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT backups_pkey PRIMARY KEY (id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.ingredient_categories (
  id integer NOT NULL DEFAULT nextval('ingredient_categories_id_seq'::regclass),
  name character varying NOT NULL,
  CONSTRAINT ingredient_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ingredients (
  id integer NOT NULL DEFAULT nextval('ingredients_id_seq'::regclass),
  name character varying NOT NULL,
  category_id integer,
  unit_id integer,
  current_quantity numeric,
  low_stock_threshold numeric,
  status character varying,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  expiry_date date,
  CONSTRAINT ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT ingredients_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ingredient_categories(id),
  CONSTRAINT ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.inventory_transactions (
  id integer NOT NULL DEFAULT nextval('inventory_transactions_id_seq'::regclass),
  ingredient_id integer,
  change_qty numeric,
  transaction_type character varying,
  reason character varying,
  performed_by integer,
  prev_qty numeric,
  new_qty numeric,
  timestamp timestamp without time zone,
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_transactions_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id),
  CONSTRAINT inventory_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id)
);
CREATE TABLE public.login_attempts (
  id bigint NOT NULL DEFAULT nextval('login_attempts_id_seq'::regclass),
  username character varying NOT NULL UNIQUE,
  attempt_count integer DEFAULT 1,
  last_attempt_at timestamp with time zone DEFAULT now(),
  CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.menu_categories (
  id integer NOT NULL DEFAULT nextval('menu_categories_id_seq'::regclass),
  name character varying NOT NULL,
  description character varying,
  CONSTRAINT menu_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.menu_items (
  id integer NOT NULL DEFAULT nextval('menu_items_id_seq'::regclass),
  name character varying NOT NULL,
  category_id integer,
  description character varying,
  price_reference numeric,
  status character varying,
  image_path character varying,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  recipe integer NOT NULL,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id)
);
CREATE TABLE public.notifications (
  id integer NOT NULL DEFAULT nextval('notifications_id_seq'::regclass),
  user_id integer,
  action_type character varying NOT NULL,
  target_table character varying NOT NULL,
  target_id integer,
  description text,
  reason text,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.recipes (
  id integer NOT NULL DEFAULT nextval('recipes_id_seq'::regclass),
  menu_item_id integer,
  ingredient_id integer,
  qty_per_sale numeric,
  unit_id integer,
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id),
  CONSTRAINT recipes_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
  CONSTRAINT recipes_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.requests_tbl (
  id integer NOT NULL DEFAULT nextval('requests_tbl_id_seq'::regclass),
  type character varying,
  requester_id integer,
  target_id integer,
  payload text,
  status character varying,
  created_at timestamp without time zone,
  handled_by integer,
  handled_at timestamp without time zone,
  CONSTRAINT requests_tbl_pkey PRIMARY KEY (id),
  CONSTRAINT requests_tbl_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id),
  CONSTRAINT requests_tbl_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.users(id)
);
CREATE TABLE public.roles (
  id integer NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
  name character varying NOT NULL,
  permissions text,
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sale_items (
  id integer NOT NULL DEFAULT nextval('sale_items_id_seq'::regclass),
  sale_id integer,
  menu_item_id integer,
  quantity integer,
  CONSTRAINT sale_items_pkey PRIMARY KEY (id),
  CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id),
  CONSTRAINT sale_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.sales (
  id integer NOT NULL DEFAULT nextval('sales_id_seq'::regclass),
  receipt_no character varying,
  sale_datetime timestamp without time zone,
  staff_id integer,
  total_items integer,
  notes text,
  created_at timestamp without time zone,
  status character varying DEFAULT 'completed'::character varying,
  adjusted_total numeric,
  adjusted_by integer,
  adjusted_at timestamp without time zone,
  adjustment_reason text,
  total_amount numeric,
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id),
  CONSTRAINT sales_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id)
);
CREATE TABLE public.system_settings (
  key character varying NOT NULL,
  value text,
  updated_at timestamp without time zone,
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.temp_accounts (
  id integer NOT NULL DEFAULT nextval('temp_accounts_id_seq'::regclass),
  role_id integer NOT NULL,
  username character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  ip_address character varying,
  reason text,
  created_by integer,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  status character varying DEFAULT 'active'::character varying,
  CONSTRAINT temp_accounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.units (
  id integer NOT NULL DEFAULT nextval('units_id_seq'::regclass),
  name character varying NOT NULL,
  CONSTRAINT units_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_sessions (
  id integer NOT NULL DEFAULT nextval('user_sessions_id_seq'::regclass),
  user_id integer NOT NULL,
  session_token character varying NOT NULL UNIQUE,
  ip_address character varying,
  user_agent character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  expires_at timestamp without time zone NOT NULL,
  last_activity timestamp without time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  full_name character varying NOT NULL,
  username character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  role_id integer,
  status character varying,
  last_login timestamp without time zone,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  email text,
  ip_addresss text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);