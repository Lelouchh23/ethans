<?php
header('Content-Type: application/json');
require_once 'config.php';

$email = $_POST['email'] ?? '';

if (!$email) {
    echo json_encode(['status' => 'error', 'message' => 'No email provided']);
    exit;
}

$result = $supabase->select('users', ['email' => 'eq.' . $email]);

if (!empty($result) && !isset($result['error'])) {
    echo json_encode([
        'status' => 'ok',
        'name'   => $result[0]['full_name']
    ]);
} else {
    echo json_encode(['status' => 'not_found']);
}