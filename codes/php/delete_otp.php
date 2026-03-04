<?php
header('Content-Type: application/json');
require_once 'supabase-api.php';

$email = trim($_POST['email'] ?? '');

if ($email !== '') {
    $result = $supabase->delete('password_reset_otps', ['email' => 'eq.' . $email]);
    if (isset($result['error'])) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete OTP']);
        exit;
    }
}

echo json_encode(['status' => 'ok']);