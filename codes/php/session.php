<?php
/**
 * Session Management API
 * Handles database-based session validation and user retrieval
 * 
 * Actions:
 * - GET ?action=check - Check if user is logged in, return user data
 * - GET ?action=validate - Just validate session (returns boolean)
 * - POST ?action=refresh - Refresh session expiry
 */

ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Credentials: true");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

require_once 'supabase-api.php';

// Session configuration
define('SESSION_DURATION_HOURS', 8); // Sessions last 8 hours
define('SESSION_COOKIE_NAME', 'ethans_session');

/**
 * Generate a secure random token
 */
function generateSessionToken() {
    return bin2hex(random_bytes(32));
}

/**
 * Get session token from cookie or header
 */
function getSessionToken() {
    // Check cookie first
    if (isset($_COOKIE[SESSION_COOKIE_NAME])) {
        return $_COOKIE[SESSION_COOKIE_NAME];
    }
    
    // Check Authorization header
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
        if (strpos($auth, 'Bearer ') === 0) {
            return substr($auth, 7);
        }
    }
    
    return null;
}

/**
 * Create a new session in the database
 */
function createSession($supabase, $userId) {
    $token = generateSessionToken();
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 255);
    $now = date('Y-m-d H:i:s');
    $expiresAt = date('Y-m-d H:i:s', strtotime('+' . SESSION_DURATION_HOURS . ' hours'));
    
    $sessionData = [
        'user_id' => $userId,
        'session_token' => $token,
        'ip_address' => $ip,
        'user_agent' => $userAgent,
        'created_at' => $now,
        'expires_at' => $expiresAt,
        'last_activity' => $now,
        'is_active' => true
    ];
    
    $result = $supabase->insert('user_sessions', $sessionData);
    
    if (isset($result['error'])) {
        return ['error' => $result['error']];
    }
    
    // Set cookie
    $cookieExpiry = time() + (SESSION_DURATION_HOURS * 3600);
    setcookie(SESSION_COOKIE_NAME, $token, [
        'expires' => $cookieExpiry,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    return ['token' => $token, 'expires_at' => $expiresAt];
}

/**
 * Validate session and get user data
 */
function validateSession($supabase, $token) {
    if (!$token) {
        return null;
    }
    
    // Get session from database
    $sessions = $supabase->select('user_sessions', [
        'session_token' => 'eq.' . $token,
        'is_active' => 'eq.true'
    ]);
    
    if (!is_array($sessions) || isset($sessions['error']) || count($sessions) === 0) {
        return null;
    }
    
    $session = $sessions[0];
    
    // Check if expired
    if (strtotime($session['expires_at']) < time()) {
        // Mark session as inactive
        $supabase->update('user_sessions', ['is_active' => false], ['id' => 'eq.' . $session['id']]);
        return null;
    }
    
    // Get user data
    $user = $supabase->getUserById($session['user_id']);
    
    if (!$user) {
        return null;
    }
    
    // Update last activity
    $supabase->update('user_sessions', [
        'last_activity' => date('Y-m-d H:i:s')
    ], ['id' => 'eq.' . $session['id']]);
    
    return [
        'session' => $session,
        'user' => $user
    ];
}

/**
 * Destroy a session
 */
function destroySession($supabase, $token) {
    if (!$token) {
        return false;
    }
    
    // Mark session as inactive
    $result = $supabase->update('user_sessions', [
        'is_active' => false
    ], ['session_token' => 'eq.' . $token]);
    
    // Clear cookie
    setcookie(SESSION_COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    // Destroy PHP session too
    session_destroy();
    
    return true;
}

/**
 * Destroy all sessions for a user (logout everywhere)
 */
function destroyAllUserSessions($supabase, $userId) {
    return $supabase->update('user_sessions', [
        'is_active' => false
    ], ['user_id' => 'eq.' . $userId]);
}

// Only process API requests if this file is accessed directly (not included)
if (basename($_SERVER['SCRIPT_FILENAME']) === 'session.php') {
    // Get action
    $action = $_GET['action'] ?? 'check';
    $token = getSessionToken();

    switch ($action) {
        case 'check':
            // Check session and return user data
            $result = validateSession($supabase, $token);
            
            if (!$result) {
                ob_end_clean();
                http_response_code(401);
                echo json_encode([
                    'authenticated' => false,
                    'error' => 'Not authenticated'
                ]);
                exit();
            }
            
            ob_end_clean();
            echo json_encode([
                'authenticated' => true,
                'user' => [
                    'id' => $result['user']['id'],
                    'username' => $result['user']['username'],
                    'full_name' => $result['user']['full_name'],
                    'role_id' => $result['user']['role_id'],
                    'role_name' => $result['user']['role_name'] ?? 'unknown',
                    'status' => $result['user']['status']
                ],
                'session' => [
                    'expires_at' => $result['session']['expires_at'],
                    'last_activity' => $result['session']['last_activity']
                ]
            ]);
            break;
            
        case 'validate':
            // Just check if authenticated
            $result = validateSession($supabase, $token);
            
            ob_end_clean();
            echo json_encode([
                'authenticated' => $result !== null,
                'role_id' => $result ? $result['user']['role_id'] : null
            ]);
            break;
            
        case 'refresh':
            // Refresh session expiry
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                ob_end_clean();
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit();
            }
            
            $result = validateSession($supabase, $token);
            
            if (!$result) {
                ob_end_clean();
                http_response_code(401);
                echo json_encode(['error' => 'Not authenticated']);
                exit();
            }
            
            // Extend expiry
            $newExpiry = date('Y-m-d H:i:s', strtotime('+' . SESSION_DURATION_HOURS . ' hours'));
            $supabase->update('user_sessions', [
                'expires_at' => $newExpiry,
                'last_activity' => date('Y-m-d H:i:s')
            ], ['id' => 'eq.' . $result['session']['id']]);
            
            // Update cookie expiry
            $cookieExpiry = time() + (SESSION_DURATION_HOURS * 3600);
            setcookie(SESSION_COOKIE_NAME, $token, [
                'expires' => $cookieExpiry,
                'path' => '/',
                'secure' => isset($_SERVER['HTTPS']),
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            
            ob_end_clean();
            echo json_encode([
                'success' => true,
                'expires_at' => $newExpiry
            ]);
            break;
            
        default:
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
}
?>
