<?php
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Load Supabase API helper
require_once 'supabase-api.php';

// GET request - List locked accounts
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'list') {
        try {
            // Get all locked accounts with user details
            $lockedAccounts = $supabase->select('account_lockout');
            
            if (!is_array($lockedAccounts) || isset($lockedAccounts['error'])) {
                ob_end_clean();
                echo json_encode(['success' => true, 'accounts' => []]);
                exit();
            }
            
            $accountsWithDetails = [];
            foreach ($lockedAccounts as $lockout) {
                // Get user details
                $users = $supabase->select('users', ['id' => 'eq.' . $lockout['user_id']]);
                if (is_array($users) && count($users) > 0) {
                    $user = $users[0];
                    
                    // Get role name
                    $roleName = 'unknown';
                    if (isset($user['role_id'])) {
                        $roles = $supabase->select('roles', ['id' => 'eq.' . $user['role_id']]);
                        if (is_array($roles) && count($roles) > 0) {
                            $roleName = $roles[0]['name'] ?? 'unknown';
                        }
                    }
                    
                    $accountsWithDetails[] = [
                        'id' => $lockout['id'],
                        'user_id' => $lockout['user_id'],
                        'lockout_at' => $lockout['lockout_at'],
                        'username' => $user['username'] ?? 'N/A',
                        'full_name' => $user['full_name'] ?? 'N/A',
                        'role_name' => $roleName
                    ];
                }
            }
            
            ob_end_clean();
            echo json_encode(['success' => true, 'accounts' => $accountsWithDetails]);
            exit();
            
        } catch (Exception $e) {
            ob_end_clean();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            exit();
        }
    }
}

// POST request - Unlock account
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $userId = $input['user_id'] ?? null;
    
    if ($action === 'unlock' && $userId) {
        try {
            // Remove from lockout table
            $result = $supabase->removeLockout($userId);
            
            // Clear any failed attempts
            $users = $supabase->select('users', ['id' => 'eq.' . $userId]);
            if (is_array($users) && count($users) > 0) {
                $username = $users[0]['username'];
                $supabase->clearFailedAttempts($username);
                
                // Log the unlock action
                $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
                $adminUser = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
                
                $logData = [
                    'user_id' => $adminUser ?? $userId,
                    'role_label' => 'admin',
                    'action' => 'Account Unlocked',
                    'reference' => 'User: ' . $username,
                    'status' => 'Success',
                    'ip_address' => $ip,
                    'created_at' => date('Y-m-d H:i:s')
                ];
                $supabase->insert('activity_logs', $logData);
            }
            
            ob_end_clean();
            echo json_encode(['success' => true, 'message' => 'Account unlocked successfully']);
            exit();
            
        } catch (Exception $e) {
            ob_end_clean();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to unlock account: ' . $e->getMessage()]);
            exit();
        }
    }
    
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action or missing user_id']);
    exit();
}

ob_end_clean();
http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
