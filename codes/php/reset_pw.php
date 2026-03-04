<?php
header('Content-Type: application/json');
require_once 'config.php';

$email       = $_POST['email']       ?? '';
$newPassword = $_POST['newPassword'] ?? '';

if (!$email || !$newPassword) {
    echo json_encode(['status' => 'error', 'message' => 'Missing email or password.']);
    exit;
}

if (strlen($newPassword) < 6) {
    echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters.']);
    exit;
}

$passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

$result = $supabase->update('users',
    ['password_hash' => $passwordHash],
    ['email'         => 'eq.' . $email]
);

if (!isset($result['error'])) {
    // Clean up used OTPs
    $supabase->delete('password_reset_otps', ['email' => 'eq.' . $email]);
    echo json_encode(['status' => 'ok']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update password.']);
}