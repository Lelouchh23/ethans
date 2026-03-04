<?php
// qr_login.php - Handles QR code quick login
header('Content-Type: application/json');
require_once 'config.php';
require_once 'session.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => true, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$qrData = $input['qr_data'] ?? '';

if (!$qrData) {
    echo json_encode(['error' => true, 'message' => 'No QR data received']);
    exit;
}

// Parse QR JSON
// Expected format: {"quick_login":true,"userId":14,"username":"staff"}
$parsed = json_decode($qrData, true);

if (!$parsed || !isset($parsed['quick_login']) || !$parsed['quick_login']) {
    echo json_encode(['error' => true, 'message' => 'Invalid QR code format']);
    exit;
}

$userId   = intval($parsed['userId']   ?? 0);
$username = trim($parsed['username']   ?? '');

if (!$userId || !$username) {
    echo json_encode(['error' => true, 'message' => 'QR code missing required fields']);
    exit;
}

try {
    // Fetch user by both userId AND username for security
    $users = $supabase->select('users', [
        'id'       => 'eq.' . $userId,
        'username' => 'eq.' . $username
    ]);

    if (empty($users) || isset($users['error'])) {
        echo json_encode(['error' => true, 'message' => 'QR code is invalid or user not found']);
        exit;
    }

    $user = $users[0];

    // Check account status
    if (($user['status'] ?? '') !== 'active') {
        echo json_encode(['error' => true, 'message' => 'Account is inactive. Contact administrator.']);
        exit;
    }

    // Fetch role name
    $roleName = 'staff';
    if (!empty($user['role_id'])) {
        $roles = $supabase->select('roles', ['id' => 'eq.' . $user['role_id']]);
        if (!empty($roles) && !isset($roles['error'])) {
            $roleName = $roles[0]['name'] ?? 'staff';
        }
    }

    // Build user object (same structure as login.php)
    $userData = [
        'id'        => $user['id'],
        'username'  => $user['username'],
        'full_name' => $user['full_name'],
        'email'     => $user['email'] ?? '',
        'role_id'   => $user['role_id'],
        'role_name' => $roleName,
        'status'    => $user['status'],
    ];

    // Create session using existing session handler
    if (function_exists('createSession')) {
        createSession($userData);
    } elseif (session_status() === PHP_SESSION_NONE) {
        session_start();
        $_SESSION['user'] = $userData;
        $_SESSION['authenticated'] = true;
    }

    echo json_encode([
        'error' => false,
        'user'  => $userData
    ]);

} catch (Exception $e) {
    error_log('QR login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => 'Server error. Please try again.']);
}