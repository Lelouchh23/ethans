<?php
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Load Supabase API helper (also loads config.php)
require_once 'supabase-api.php';

// Get the access code from the request
$input = json_decode(file_get_contents('php://input'), true);
$accessCode = isset($input['accessCode']) ? trim($input['accessCode']) : '';

// Master access code from secure config
if ($accessCode !== MASTER_ACCESS_CODE) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid access code'
    ]);
    exit();
}

// Access code verified - fetch admin/owner account from database
try {
    // Query for admin or owner role user
    $adminUser = $supabase->getAdminOrOwnerUser();
    
    if (!$adminUser) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'No admin account found in database'
        ]);
        exit();
    }
    
    // Remove admin from lockout if they were locked out
    $supabase->removeLockout($adminUser['id']);
    
    // Clear any failed login attempts
    $supabase->clearFailedAttempts($adminUser['username']);
    
    // Set up session for the admin user
    session_regenerate_id(true);
    $_SESSION['user_id'] = $adminUser['id'];
    $_SESSION['role_id'] = $adminUser['role_id'];
    
    // Log the master unlock login
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $logData = [
            'user_id' => $adminUser['id'],
            'role_label' => $adminUser['role_name'] ?? 'admin',
            'action' => 'Master Unlock Login',
            'reference' => 'Emergency Access - Lockout Cleared',
            'status' => 'Success',
            'ip_address' => $ip,
            'created_at' => date('Y-m-d H:i:s')
        ];
        $supabase->insert('activity_logs', $logData);
    } catch (Exception $e) {
        // Silently fail logging
    }
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Access granted',
        'user' => [
            'id' => $adminUser['id'],
            'username' => $adminUser['username'],
            'role_id' => $adminUser['role_id'],
            'role_name' => $adminUser['role_name'] ?? 'admin',
            'full_name' => $adminUser['full_name'] ?? ''
        ]
    ]);
    
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
