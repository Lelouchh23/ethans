<?php
/**
 * Logout API
 * Destroys the user's session in the database and clears cookies
 */

ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Credentials: true");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

session_start();
require_once 'supabase-api.php';
require_once 'session.php';

$token = getSessionToken();
$userId = $_SESSION['user_id'] ?? null;

// Get action (single logout or logout everywhere)
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
$logoutAll = isset($data['logout_all']) && $data['logout_all'] === true;

if ($logoutAll && $userId) {
    // Logout from all devices
    destroyAllUserSessions($supabase, $userId);
    
    // Log activity
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $supabase->insert('activity_logs', [
            'user_id' => $userId,
            'role_label' => 'user',
            'action' => 'Logged out from all devices',
            'reference' => 'Security Action',
            'status' => 'Success',
            'ip_address' => $ip,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {}
    
} else if ($token) {
    // Single device logout
    destroySession($supabase, $token);
    
    // Log activity
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $supabase->insert('activity_logs', [
            'user_id' => $userId,
            'role_label' => 'user',
            'action' => 'Logged out',
            'reference' => 'System',
            'status' => 'Success',
            'ip_address' => $ip,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {}
}

// Clear PHP session
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();

ob_end_clean();
echo json_encode([
    "success" => true,
    "message" => $logoutAll ? "Logged out from all devices" : "Logged out successfully"
]);
?>
