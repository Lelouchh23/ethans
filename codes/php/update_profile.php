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
$fullName = trim($data['full_name'] ?? '');
$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');

// Validation
if (!$userId) {
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

if (empty($fullName)) {
    echo json_encode(['error' => 'Full name is required']);
    exit;
}

if (empty($username)) {
    echo json_encode(['error' => 'Username is required']);
    exit;
}

// Validate username format (alphanumeric, underscores, 3-30 chars)
if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
    echo json_encode(['error' => 'Username must be 3-30 characters (letters, numbers, underscores only)']);
    exit;
}

// Validate email format if provided
if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

try {
    // Check if username is already taken by another user
    $existingUser = $supabase->select('users', [
        'username' => 'eq.' . $username,
        'id' => 'neq.' . $userId
    ]);
    
    if (!empty($existingUser) && !isset($existingUser['error'])) {
        echo json_encode(['error' => 'Username is already taken']);
        exit;
    }
    
    // Check if email is already taken by another user (if email provided)
    if (!empty($email)) {
        $existingEmail = $supabase->select('users', [
            'email' => 'eq.' . $email,
            'id' => 'neq.' . $userId
        ]);
        
        if (!empty($existingEmail) && !isset($existingEmail['error'])) {
            echo json_encode(['error' => 'Email is already registered to another account']);
            exit;
        }
    }
    
    // Build update data
    $updateData = [
        'full_name' => $fullName,
        'username' => $username,
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    if (!empty($email)) {
        $updateData['email'] = $email;
    }
    
    // Phone column may not exist in older databases, so we try to add it
    if (!empty($phone)) {
        $updateData['phone'] = $phone;
    }
    
    // Update user profile
    $result = $supabase->update('users', $updateData, ['id' => 'eq.' . $userId]);
    
    if (isset($result['error'])) {
        echo json_encode(['error' => 'Failed to update profile: ' . $result['error']]);
        exit;
    }
    
    // Fetch updated user data to return
    $updatedUser = $supabase->select('users', ['id' => 'eq.' . $userId]);
    
    if (!empty($updatedUser) && !isset($updatedUser['error'])) {
        echo json_encode([
            'success' => true, 
            'message' => 'Profile updated successfully',
            'user' => $updatedUser[0]
        ]);
    } else {
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    }
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
