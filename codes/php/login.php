<?php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");

session_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load Supabase API helper
require_once 'supabase-api.php';

// Cooldown times in seconds for each attempt
$COOLDOWN_TIMES = [
    1 => 10,    // 1st failed attempt: 10 seconds
    2 => 30,    // 2nd failed attempt: 30 seconds
    3 => 60,    // 3rd failed attempt: 1 minute
    4 => 120,   // 4th failed attempt: 2 minutes
    5 => -1     // 5th attempt: permanent lockout
];

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

// Only accept JSON content type
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') === false) {
    http_response_code(415);
    echo json_encode(["error" => "Unsupported Media Type"]);
    exit();
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

// Validate JSON
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit();
}

$username = trim($data['username'] ?? '');
$password = trim($data['password'] ?? '');

// Basic input validation
if (empty($username) || empty($password)) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(["error" => "Missing username or password"]);
    exit();
}

// Limit input length to prevent abuse
if (strlen($username) > 100 || strlen($password) > 255) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(["error" => "Input too long"]);
    exit();
}

// Sanitize username (alphanumeric + underscore only)
if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(["error" => "Invalid username format"]);
    exit();
}

// Use Supabase API to get user
$user = $supabase->getUserWithRole($username);
$isTempAccount = false;

// If not found in users, check temp_accounts
if (!$user) {
    $tempAccounts = $supabase->select('temp_accounts', ['username' => 'eq.' . $username]);
    if (is_array($tempAccounts) && !isset($tempAccounts['error']) && count($tempAccounts) > 0) {
        $tempAccount = $tempAccounts[0];
        
        // Check if temp account is active and not expired
        $status = $tempAccount['status'] ?? '';
        $expiresAt = $tempAccount['expires_at'] ?? null;
        $isExpired = $expiresAt ? strtotime($expiresAt) < time() : false;
        
        if ($status === 'active' && !$isExpired) {
            // Get role info
            $roleId = $tempAccount['role_id'];
            $roles = $supabase->select('roles', ['id' => 'eq.' . $roleId]);
            $roleName = 'staff';
            if (is_array($roles) && !isset($roles['error']) && count($roles) > 0) {
                $roleName = strtolower($roles[0]['name'] ?? 'staff');
            }
            
            // Build user object from temp account
            $user = [
                'id' => $tempAccount['id'],
                'username' => $tempAccount['username'],
                'password_hash' => $tempAccount['password_hash'],
                'role_id' => $roleId,
                'role_name' => $roleName,
                'full_name' => $tempAccount['username'],
                'is_temp' => true
            ];
            $isTempAccount = true;
        } elseif ($status === 'revoked') {
            ob_end_clean();
            http_response_code(403);
            echo json_encode([
                "error" => "Account revoked",
                "locked" => true,
                "message" => "This temporary account has been revoked."
            ]);
            exit();
        } elseif ($isExpired) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode([
                "error" => "Account expired",
                "locked" => true,
                "message" => "This temporary account has expired."
            ]);
            exit();
        }
    }
}

// Check if user is locked out (only if user exists and is not a temp account)
if ($user && !$isTempAccount) {
    $isLockedOut = $supabase->isUserLockedOut($user['id']);
    if ($isLockedOut) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode([
            "error" => "Account is locked",
            "locked" => true,
            "message" => "Your account has been locked due to too many failed login attempts. Please contact an administrator."
        ]);
        exit();
    }
}

// Check for existing failed attempts and cooldown
$failedAttempts = $supabase->getFailedAttempts($username);
if ($failedAttempts) {
    $attemptCount = (int)$failedAttempts['attempt_count'];
    $lastAttemptAt = strtotime($failedAttempts['last_attempt_at']);
    $now = time();
    
    // Get cooldown time for current attempt count
    $cooldownTime = $COOLDOWN_TIMES[$attemptCount] ?? 0;
    
    if ($cooldownTime > 0) {
        $timeSinceLastAttempt = $now - $lastAttemptAt;
        $remainingCooldown = $cooldownTime - $timeSinceLastAttempt;
        
        if ($remainingCooldown > 0) {
            ob_end_clean();
            http_response_code(429);
            echo json_encode([
                "error" => "Too many attempts",
                "cooldown" => true,
                "remaining_seconds" => $remainingCooldown,
                "message" => "Please wait " . $remainingCooldown . " seconds before trying again."
            ]);
            exit();
        }
    }
}

// Always verify password even if user not found (prevent timing attacks)
$dummyHash = '$2y$10$invalidhashfortimingprotection000000000000000000000000';
$hashToVerify = $user ? $user['password_hash'] : $dummyHash;
$passwordValid = password_verify($password, $hashToVerify);

// Compatibility fallback for hashes generated via PostgreSQL pgcrypto crypt()
if (!$passwordValid && $user && !empty($hashToVerify)) {
    $cryptResult = crypt($password, $hashToVerify);
    if (is_string($cryptResult) && hash_equals($hashToVerify, $cryptResult)) {
        $passwordValid = true;
    }
}

if (!$user || !$passwordValid) {
    // Handle failed login attempt
    $currentAttemptCount = $failedAttempts ? (int)$failedAttempts['attempt_count'] + 1 : 1;
    $nowTimestamp = date('c');
    
    // Record the failed attempt (log any errors)
    $recordResult = $supabase->recordFailedAttempt($username, $currentAttemptCount, $nowTimestamp);
    error_log("Login attempt recorded for $username: count=$currentAttemptCount, result=" . json_encode($recordResult));
    
    // Check if this triggers a lockout (5th attempt)
    if ($currentAttemptCount >= 5 && $user) {
        $lockoutResult = $supabase->lockoutUser($user['id']);
        error_log("Lockout triggered for user {$user['id']}: " . json_encode($lockoutResult));
        $supabase->clearFailedAttempts($username);
        
        // Log the lockout
        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $logData = [
                'user_id' => $user['id'],
                'role_label' => $user['role_name'] ?? 'unknown',
                'action' => 'Account Locked',
                'reference' => 'Brute Force Protection',
                'status' => 'Warning',
                'ip_address' => $ip,
                'created_at' => date('Y-m-d H:i:s')
            ];
            $supabase->insert('activity_logs', $logData);
        } catch (Exception $e) {}
        
        ob_end_clean();
        http_response_code(403);
        echo json_encode([
            "error" => "Account locked",
            "locked" => true,
            "message" => "Your account has been locked due to too many failed login attempts. Please contact an administrator."
        ]);
        exit();
    }
    
    // Return error with cooldown info
    $cooldownTime = $COOLDOWN_TIMES[$currentAttemptCount] ?? 0;
    $attemptsRemaining = 5 - $currentAttemptCount;
    
    ob_end_clean();
    http_response_code(401);
    echo json_encode([
        "error" => "Invalid username or password",
        "attempts_remaining" => $attemptsRemaining,
        "cooldown_seconds" => $cooldownTime > 0 ? $cooldownTime : null,
        "message" => $attemptsRemaining > 0 
            ? "Invalid credentials. $attemptsRemaining attempt(s) remaining. Wait $cooldownTime seconds before retrying."
            : "Invalid credentials."
    ]);
    exit();
}

// Successful login - clear failed attempts
$supabase->clearFailedAttempts($username);

// Regenerate session ID to prevent session fixation
session_regenerate_id(true);

$_SESSION['user_id'] = $user['id'];
$_SESSION['role_id'] = $user['role_id'];
$_SESSION['is_temp'] = $isTempAccount;

// Create database session
require_once 'session.php';
$dbSession = createSession($supabase, $user['id']);
$sessionToken = isset($dbSession['token']) ? $dbSession['token'] : null;

// Log successful login for "My Activity"
try {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $logData = [
        'user_id' => $isTempAccount ? null : $user['id'],
        'role_label' => ($isTempAccount ? 'temp_' : '') . ($user['role_name'] ?? 'unknown'),
        'action' => 'Logged in' . ($isTempAccount ? ' (Temp Account)' : ''),
        'reference' => $isTempAccount ? 'Temp Account: ' . $user['username'] : 'System',
        'status' => 'Success',
        'ip_address' => $ip,
        'created_at' => date('Y-m-d H:i:s')
    ];
    $supabase->insert('activity_logs', $logData);
} catch (Exception $e) {
    // Silently fail logging if it errors out
}

ob_end_clean();
echo json_encode([
    "success"      => true,
    "session_id"   => session_id(),
    "session_token" => $sessionToken,
    "id"           => $user['id'],
    "username"     => $user['username'],
    "role_id"      => $user['role_id'],
    "role_name"    => $user['role_name'] ?? 'unknown',
    "full_name"    => $user['full_name'] ?? '',
    "email"        => $user['email'] ?? '',
    "phone"        => $user['phone'] ?? '',
    "is_temp"      => $isTempAccount
]);
?>