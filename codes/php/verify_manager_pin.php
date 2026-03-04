<?php
/**
 * Verify Manager PIN for sensitive operations
 * Validates PIN against admin or manager accounts
 */

header('Content-Type: application/json');

require_once 'supabase-api.php';

try {
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    $pin = $input['pin'] ?? '';
    
    if (empty($pin)) {
        echo json_encode(['success' => false, 'message' => 'PIN is required']);
        exit;
    }

    $roles = $supabase->select('roles');
    if (!is_array($roles) || isset($roles['error'])) {
        echo json_encode(['success' => false, 'message' => 'Failed to load roles']);
        exit;
    }

    $allowedRoleIds = [];
    foreach ($roles as $role) {
        $roleName = strtolower(trim($role['name'] ?? ''));
        if (in_array($roleName, ['admin', 'manager', 'owner'], true)) {
            $allowedRoleIds[] = $role['id'];
        }
    }

    if (empty($allowedRoleIds)) {
        echo json_encode(['success' => false, 'message' => 'No manager/admin roles found']);
        exit;
    }

    $managers = [];
    foreach ($allowedRoleIds as $roleId) {
        $users = $supabase->select('users', [
            'role_id' => 'eq.' . $roleId,
            'status' => 'eq.active'
        ]);

        if (is_array($users) && !isset($users['error'])) {
            foreach ($users as $user) {
                $managers[] = $user;
            }
        }
    }
    
    // Check PIN against each manager
    foreach ($managers as $manager) {
        // Check against manager_pin field if it exists
        if (!empty($manager['manager_pin']) && $pin === $manager['manager_pin']) {
            echo json_encode([
                'success' => true, 
                'manager_name' => $manager['full_name'],
                'manager_id' => $manager['id']
            ]);
            exit;
        }
        
        // Also check against password hash
        if (!empty($manager['password_hash']) && password_verify($pin, $manager['password_hash'])) {
            echo json_encode([
                'success' => true, 
                'manager_name' => $manager['full_name'],
                'manager_id' => $manager['id']
            ]);
            exit;
        }
    }
    
    // No match found
    echo json_encode(['success' => false, 'message' => 'Invalid manager PIN or password']);
} catch (Exception $e) {
    error_log('Manager PIN verification error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
