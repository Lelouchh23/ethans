<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'supabase-api.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['user_id'] ?? null;
$currentPassword = $data['current_password'] ?? '';
$newPassword = $data['new_password'] ?? '';

// Validation
if (!$userId) {
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

if (empty($currentPassword)) {
    echo json_encode(['error' => 'Current password is required']);
    exit;
}

if (empty($newPassword)) {
    echo json_encode(['error' => 'New password is required']);
    exit;
}

if (strlen($newPassword) < 6) {
    echo json_encode(['error' => 'New password must be at least 6 characters']);
    exit;
}

try {
    // Fetch user to verify current password
    $user = $supabase->select('users', ['id' => 'eq.' . $userId]);
    
    if (empty($user) || isset($user['error'])) {
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    $user = $user[0];
    
    // Verify current password
    if (!password_verify($currentPassword, $user['password_hash'])) {
        echo json_encode(['error' => 'Current password is incorrect']);
        exit;
    }
    
    // Hash new password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password
    $result = $supabase->update('users', 
        [
            'password_hash' => $hashedPassword,
            'updated_at' => date('Y-m-d H:i:s')
        ],
        ['id' => 'eq.' . $userId]
    );
    
    if (isset($result['error'])) {
        echo json_encode(['error' => 'Failed to update password: ' . $result['error']]);
        exit;
    }
    
    echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
