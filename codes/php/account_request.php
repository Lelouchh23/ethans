<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

// Load Supabase API helper
require_once __DIR__ . '/supabase-api.php';

global $supabase;

$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit();
}

$fullName  = trim($data['full_name'] ?? '');
$username  = trim($data['username'] ?? '');
$email     = trim($data['email'] ?? '');
$password  = trim($data['password'] ?? '');
$roleId    = intval($data['requested_role_id'] ?? 0);
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

// Validate required fields
if (empty($fullName) || empty($username) || empty($email) || empty($password) || !$roleId) {
    http_response_code(400);
    echo json_encode(["error" => "Please fill in all required fields"]);
    exit();
}

// Validate Gmail/Email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid Gmail/Email format."]);
    exit();
}

// Validate lengths
if (strlen($username) > 100 || strlen($fullName) > 255 || strlen($email) > 255) {
    http_response_code(400);
    echo json_encode(["error" => "Input too long"]);
    exit();
}

// Validate username format
if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid username format. Only letters, numbers, and underscores allowed."]);
    exit();
}

// Validate password length
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["error" => "Password must be at least 6 characters"]);
    exit();
}

// Check username uniqueness in users table
$existingUsers = $supabase->select('users', ['username' => 'eq.' . $username]);
if (is_array($existingUsers) && !isset($existingUsers['error']) && count($existingUsers) > 0) {
    http_response_code(409);
    echo json_encode(["error" => "Username already exists. Please choose a different username."]);
    exit();
}

// Check username uniqueness in account_requests table (pending requests)
$existingRequests = $supabase->select('account_requests', ['username' => 'eq.' . $username, 'status' => 'eq.Pending']);
if (is_array($existingRequests) && !isset($existingRequests['error']) && count($existingRequests) > 0) {
    http_response_code(409);
    echo json_encode(["error" => "A pending request with this username already exists."]);
    exit();
}

// Validate role exists and is not admin
$roles = $supabase->select('roles', ['id' => 'eq.' . $roleId]);
if (!is_array($roles) || isset($roles['error']) || count($roles) === 0) {
    http_response_code(403);
    echo json_encode(["error" => "Invalid role requested."]);
    exit();
}
$role = $roles[0];
if (strtolower($role['name'] ?? '') === 'admin' || strtolower($role['name'] ?? '') === 'owner') {
    http_response_code(403);
    echo json_encode(["error" => "Unauthorized role requested."]);
    exit();
}

// Hash password
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

// Insert account request
$requestData = [
    'full_name' => $fullName,
    'username' => $username,
    'email' => $email,
    'password_hash' => $passwordHash,
    'requested_role_id' => $roleId,
    'status' => 'Pending',
    'requested_at' => date('Y-m-d H:i:s'),
    'ip_address' => $ipAddress
];

$result = $supabase->insert('account_requests', $requestData);

if (isset($result['error'])) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to submit account request"]);
    exit();
}

echo json_encode(["success" => true, "message" => "Account request submitted successfully."]);