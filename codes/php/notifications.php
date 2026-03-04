<?php
/**
 * Notifications API
 * Handles CRUD operations for notifications table
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'supabase-api.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true) ?: [];

switch ($method) {
    case 'GET':
        getNotifications();
        break;
    case 'POST':
        createNotification($data);
        break;
    case 'PUT':
        markAsRead($data);
        break;
    case 'DELETE':
        deleteNotification($data);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getNotifications() {
    global $supabase;
    
    $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    
    $filters = ['order' => 'created_at.desc', 'limit' => $limit];
    
    if ($unreadOnly) {
        $filters['is_read'] = 'eq.false';
    }
    
    $result = $supabase->select('notifications', $filters);
    
    if (isset($result['error'])) {
        http_response_code(400);
        echo json_encode($result);
        return;
    }
    
    // Get user names for each notification
    $users = $supabase->select('users', ['select' => 'id,full_name,username']);
    $userMap = [];
    if (is_array($users) && !isset($users['error'])) {
        foreach ($users as $user) {
            $userMap[$user['id']] = $user['full_name'] ?? $user['username'];
        }
    }
    
    // Attach user names to notifications
    foreach ($result as &$notification) {
        $notification['user_name'] = $userMap[$notification['user_id']] ?? 'Unknown User';
    }
    
    echo json_encode(['success' => true, 'notifications' => $result]);
}

function createNotification($data) {
    global $supabase;
    
    $required = ['user_id', 'action_type', 'target_table', 'description'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }
    
    $notification = [
        'user_id' => intval($data['user_id']),
        'action_type' => $data['action_type'],
        'target_table' => $data['target_table'],
        'target_id' => $data['target_id'] ?? null,
        'description' => $data['description'],
        'reason' => $data['reason'] ?? null,
        'is_read' => false,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $result = $supabase->insert('notifications', $notification);
    
    if (isset($result['error'])) {
        http_response_code(400);
        echo json_encode($result);
        return;
    }
    
    echo json_encode(['success' => true, 'data' => $result]);
}

function markAsRead($data) {
    global $supabase;
    
    if (isset($data['mark_all'])) {
        // Mark all as read
        $notifications = $supabase->select('notifications', ['is_read' => 'eq.false']);
        if (is_array($notifications) && !isset($notifications['error'])) {
            foreach ($notifications as $n) {
                $supabase->update('notifications', ['is_read' => true], ['id' => 'eq.' . $n['id']]);
            }
        }
        echo json_encode(['success' => true, 'message' => 'All notifications marked as read']);
        return;
    }
    
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing notification id']);
        return;
    }
    
    $result = $supabase->update('notifications', ['is_read' => true], ['id' => 'eq.' . $data['id']]);
    
    if (isset($result['error'])) {
        http_response_code(400);
        echo json_encode($result);
        return;
    }
    
    echo json_encode(['success' => true]);
}

function deleteNotification($data) {
    global $supabase;
    
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing notification id']);
        return;
    }
    
    $result = $supabase->delete('notifications', ['id' => 'eq.' . $data['id']]);
    
    if (isset($result['error'])) {
        http_response_code(400);
        echo json_encode($result);
        return;
    }
    
    echo json_encode(['success' => true]);
}

// Function to get count of unread notifications
function getUnreadCount() {
    global $supabase;
    
    $result = $supabase->select('notifications', ['is_read' => 'eq.false', 'select' => 'id']);
    
    if (isset($result['error'])) {
        return 0;
    }
    
    return count($result);
}

// Get active users (from user_sessions)
function getActiveUsers() {
    global $supabase;
    
    $sessions = $supabase->select('user_sessions', [
        'is_active' => 'eq.true',
        'select' => 'id,user_id,ip_address,user_agent,created_at,last_activity'
    ]);
    
    if (isset($sessions['error']) || !is_array($sessions)) {
        return [];
    }
    
    // Filter out expired sessions
    $activeSessions = array_filter($sessions, function($s) {
        $expiresAt = strtotime($s['expires_at'] ?? '+1 hour');
        return $expiresAt > time();
    });
    
    // Get user details
    $users = $supabase->select('users', ['select' => 'id,full_name,username,role_id']);
    $userMap = [];
    if (is_array($users) && !isset($users['error'])) {
        foreach ($users as $user) {
            $userMap[$user['id']] = $user;
        }
    }
    
    // Get roles
    $roles = $supabase->select('roles', ['select' => 'id,name']);
    $roleMap = [];
    if (is_array($roles) && !isset($roles['error'])) {
        foreach ($roles as $role) {
            $roleMap[$role['id']] = $role['name'];
        }
    }
    
    // Combine data
    $result = [];
    foreach ($activeSessions as $session) {
        $user = $userMap[$session['user_id']] ?? null;
        if ($user) {
            $result[] = [
                'session_id' => $session['id'],
                'user_id' => $session['user_id'],
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'role' => $roleMap[$user['role_id']] ?? 'Unknown',
                'ip_address' => $session['ip_address'],
                'user_agent' => $session['user_agent'],
                'login_time' => $session['created_at'],
                'last_activity' => $session['last_activity']
            ];
        }
    }
    
    return $result;
}

// Handle special endpoints
if (isset($_GET['action'])) {
    switch ($_GET['action']) {
        case 'unread_count':
            echo json_encode(['count' => getUnreadCount()]);
            exit;
        case 'active_users':
            echo json_encode(['success' => true, 'users' => getActiveUsers()]);
            exit;
    }
}
