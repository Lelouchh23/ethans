<?php
// User Status Management - Track active/inactive status of users

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set header for JSON response
header('Content-Type: application/json');

// Include Supabase API helper
require_once 'supabase-api.php';

// Initialize Supabase API (global $supabase is already created in supabase-api.php)
global $supabase;

// Get request method
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    if ($method === 'GET') {
        // Fetch all users with their status
        $table = $_GET['table'] ?? 'users';
        
        // Only allow fetching users table
        if ($table !== 'users') {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            exit;
        }

        // Check if user is logged in
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        // Get all users with selected fields
        $users = $supabase->select('users', ['select' => 'id,username,full_name,status,last_login,updated_at']);
        
        if (!is_array($users) || isset($users['error'])) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch users']);
            exit;
        }

        http_response_code(200);
        echo json_encode($users);
        exit;

    } elseif ($method === 'POST' || $method === 'PUT') {
        // Update user status (active/inactive)
        
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        // Get user ID and new status from request
        $userId = $input['user_id'] ?? null;
        $status = $input['status'] ?? null;

        if (!$userId || !$status) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing user_id or status']);
            exit;
        }

        // Validate status value
        if (!in_array($status, ['active', 'inactive'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status. Must be "active" or "inactive"']);
            exit;
        }

        // Get current timestamp
        $now = date('Y-m-d H:i:s');

        // Update user status
        $updateData = [
            'status' => $status,
            'updated_at' => $now
        ];

        // If marking as active, also update last_login
        if ($status === 'active') {
            $updateData['last_login'] = $now;
        }

        $result = $supabase->update('users', $updateData, ['id' => 'eq.' . $userId]);

        if (!is_array($result) || isset($result['error'])) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update user status']);
            exit;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "User status updated to {$status}",
            'user_id' => $userId,
            'status' => $status,
            'timestamp' => $now
        ]);
        exit;

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
    exit;
}
?>
