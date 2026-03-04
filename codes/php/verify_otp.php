<?php
header('Content-Type: application/json');
require_once 'config.php';

$email = $_POST['email'] ?? '';
$otp   = $_POST['otp']   ?? '';

if (!$email || !$otp) {
    echo json_encode(['status' => 'error', 'message' => 'Missing email or OTP']);
    exit;
}

// Find OTP record
$result = $supabase->select('password_reset_otps', [
    'email'    => 'eq.' . $email,
    'otp_code' => 'eq.' . $otp
]);

if (empty($result) || isset($result['error'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid OTP.']);
    exit;
}

$record = $result[0];

if ($record['used']) {
    echo json_encode(['status' => 'error', 'message' => 'OTP already used.']);
    exit;
}

if (strtotime($record['expires_at']) < time()) {
    echo json_encode(['status' => 'error', 'message' => 'OTP expired.']);
    exit;
}

// Mark OTP as used
$supabase->update('password_reset_otps', 
    ['used' => true],
    ['id'   => 'eq.' . $record['id']]
);

echo json_encode(['status' => 'ok']);