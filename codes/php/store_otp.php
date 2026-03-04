<?php
header('Content-Type: application/json');
require_once 'config.php';

$email = $_POST['email'] ?? '';
$otp   = $_POST['otp']   ?? '';

if (!$email || !$otp) {
    echo json_encode(['status' => 'error', 'message' => 'Missing email or OTP']);
    exit;
}

// Get user name
$user = $supabase->select('users', ['email' => 'eq.' . $email]);

if (empty($user) || isset($user['error'])) {
    echo json_encode(['status' => 'error', 'message' => 'User not found']);
    exit;
}

$name = $user[0]['full_name'];

// Delete old OTPs for this email
$supabase->delete('password_reset_otps', ['email' => 'eq.' . $email]);

// Set expiry (10 minutes from now)
$expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));

// Insert new OTP
$result = $supabase->insert('password_reset_otps', [
    'email'      => $email,
    'otp_code'   => $otp,
    'expires_at' => $expires_at
]);

if (!isset($result['error'])) {
    echo json_encode(['status' => 'ok', 'name' => $name]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to store OTP']);
}