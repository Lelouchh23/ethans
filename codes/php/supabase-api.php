<?php
/**
 * Supabase REST API Helper
 * Provides functions to interact with Supabase without direct PostgreSQL
 */

// Load secure configuration
require_once __DIR__ . '/config.php';

class SupabaseAPI {
    private $projectUrl;
    private $anonKey;
    
    public function __construct() {
        $this->projectUrl = SUPABASE_URL;
        // Use service key if available for RLS bypass, otherwise anon key
        $this->anonKey = defined('SUPABASE_SERVICE_KEY') ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
    }

    /**
     * Make a REST API request to Supabase
     */
    private function request($method, $table, $query = null, $data = null) {
        $url = $this->projectUrl . '/rest/v1/' . $table;
        
        if ($query) {
            $url .= '?' . http_build_query($query);
        }

        $ch = curl_init($url);
        $headers = [
            'Authorization: Bearer ' . $this->anonKey,
            'Content-Type: application/json',
            'apikey: ' . $this->anonKey,
            'Prefer: return=representation'
        ];

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers
        ]);

        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("Supabase API Error: " . $error);
            return ['error' => $error];
        }

        if ($response === false || $response === '') {
            return $httpCode === 200 || $httpCode === 201 ? [] : ['error' => "HTTP $httpCode"];
        }

        $decoded = json_decode($response, true);
        return $decoded ?? ['error' => 'Invalid response'];
    }

    /**
     * SELECT query
     */
    public function select($table, $filters = []) {
        $query = [];
        foreach ($filters as $key => $value) {
            $query[$key] = $value;
        }
        $query['limit'] = 1000;
        return $this->request('GET', $table, $query);
    }

    /**
     * INSERT query
     */
    public function insert($table, $data) {
        return $this->request('POST', $table, null, $data);
    }

    /**
     * UPDATE query
     */
    public function update($table, $data, $filters = []) {
        $query = [];
        foreach ($filters as $key => $value) {
            $query[$key] = $value;
        }
        return $this->request('PATCH', $table, $query, $data);
    }

    /**
     * DELETE query
     */
    public function delete($table, $filters = []) {
        $query = [];
        foreach ($filters as $key => $value) {
            $query[$key] = $value;
        }
        return $this->request('DELETE', $table, $query);
    }

    /**
     * Get user with role information
     */
    public function getUserWithRole($username) {
        $result = $this->select('users', ['username' => 'eq.' . $username]);
        if (is_array($result) && count($result) > 0) {
            $user = $result[0];
            // Get role info if role_id exists
            if (isset($user['role_id'])) {
                $roles = $this->select('roles', ['id' => 'eq.' . $user['role_id']]);
                if (is_array($roles) && count($roles) > 0) {
                    $user['role_name'] = $roles[0]['name'] ?? 'unknown';
                }
            }
            return $user;
        }
        return null;
    }

    /**
     * Get user by ID with role information
     */
    public function getUserById($userId) {
        $result = $this->select('users', ['id' => 'eq.' . $userId]);
        if (is_array($result) && count($result) > 0) {
            $user = $result[0];
            // Get role info if role_id exists
            if (isset($user['role_id'])) {
                $roles = $this->select('roles', ['id' => 'eq.' . $user['role_id']]);
                if (is_array($roles) && count($roles) > 0) {
                    $user['role_name'] = $roles[0]['name'] ?? 'unknown';
                }
            }
            return $user;
        }
        return null;
    }

    /**
     * Get admin or owner user for master unlock
     */
    public function getAdminOrOwnerUser() {
        // First get the role IDs for admin and owner
        $roles = $this->select('roles', ['name' => 'in.(admin,owner)']);
        
        if (!is_array($roles) || count($roles) === 0) {
            // Fallback: try to get by common role names
            $roles = $this->select('roles');
            if (!is_array($roles)) return null;
        }
        
        $adminRoleIds = [];
        foreach ($roles as $role) {
            $roleName = strtolower($role['name'] ?? '');
            if ($roleName === 'admin' || $roleName === 'owner') {
                $adminRoleIds[] = $role['id'];
            }
        }
        
        if (empty($adminRoleIds)) return null;
        
        // Get a user with admin or owner role
        foreach ($adminRoleIds as $roleId) {
            $users = $this->select('users', ['role_id' => 'eq.' . $roleId, 'status' => 'eq.active']);
            if (is_array($users) && count($users) > 0) {
                $user = $users[0];
                // Add role name
                foreach ($roles as $role) {
                    if ($role['id'] == $user['role_id']) {
                        $user['role_name'] = $role['name'];
                        break;
                    }
                }
                return $user;
            }
        }
        
        // If no active admin found, try without status filter
        foreach ($adminRoleIds as $roleId) {
            $users = $this->select('users', ['role_id' => 'eq.' . $roleId]);
            if (is_array($users) && count($users) > 0) {
                $user = $users[0];
                foreach ($roles as $role) {
                    if ($role['id'] == $user['role_id']) {
                        $user['role_name'] = $role['name'];
                        break;
                    }
                }
                return $user;
            }
        }
        
        return null;
    }

    /**
     * Check if user is locked out
     */
    public function isUserLockedOut($userId) {
        $result = $this->select('account_lockout', ['user_id' => 'eq.' . $userId]);
        return is_array($result) && count($result) > 0;
    }

    /**
     * Lock out a user
     */
    public function lockoutUser($userId) {
        // Check if already locked out
        if ($this->isUserLockedOut($userId)) {
            return true;
        }
        
        $data = [
            'user_id' => $userId,
            'lockout_at' => date('c') // ISO 8601 format
        ];
        
        $result = $this->insert('account_lockout', $data);
        return !isset($result['error']);
    }

    /**
     * Remove user from lockout
     */
    public function removeLockout($userId) {
        return $this->delete('account_lockout', ['user_id' => 'eq.' . $userId]);
    }

    /**
     * Get failed login attempts for a user (from session or temporary storage)
     * Returns count of failed attempts
     */
    public function getFailedAttempts($username) {
        $result = $this->select('login_attempts', ['username' => 'eq.' . $username]);
        if (is_array($result) && count($result) > 0) {
            return $result[0];
        }
        return null;
    }

    /**
     * Record/update failed login attempt
     */
    public function recordFailedAttempt($username, $attemptCount, $lastAttemptAt) {
        $existing = $this->getFailedAttempts($username);
        
        $data = [
            'username' => $username,
            'attempt_count' => $attemptCount,
            'last_attempt_at' => $lastAttemptAt
        ];
        
        if ($existing) {
            return $this->update('login_attempts', $data, ['username' => 'eq.' . $username]);
        } else {
            return $this->insert('login_attempts', $data);
        }
    }

    /**
     * Clear failed attempts for a user
     */
    public function clearFailedAttempts($username) {
        return $this->delete('login_attempts', ['username' => 'eq.' . $username]);
    }
}

$supabase = new SupabaseAPI();
?>
