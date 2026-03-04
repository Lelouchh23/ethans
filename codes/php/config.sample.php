<?php
/**
 * SECURE CONFIGURATION TEMPLATE
 * ============================================
 * Copy this file to config.php and fill in your actual values.
 * 
 * IMPORTANT: 
 * - config.php should NEVER be committed to version control
 * - This template file (config.sample.php) is safe to commit
 */

// Supabase Configuration
define('SUPABASE_URL', 'https://your-project.supabase.co');
define('SUPABASE_ANON_KEY', 'your-anon-key-here');

// For production: Use service_role key (bypasses RLS)
// define('SUPABASE_SERVICE_KEY', 'your-service-role-key-here');

// Master Unlock Access Code
// Generate a strong unique code for your deployment
define('MASTER_ACCESS_CODE', 'YOUR-SECURE-CODE-HERE');

// Frontend Unlock Sequence (triggers overlay in index.html)
// Client-side only - actual auth is validated server-side
define('FRONTEND_UNLOCK_SEQUENCE', 'YOUR-SEQUENCE-HERE');

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'ethans_cafe');
define('DB_USER', 'root');
define('DB_PASS', '');
