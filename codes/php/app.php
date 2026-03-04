<?php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header("Cache-Control: no-store, no-cache, must-revalidate");

session_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load Supabase API helper
require_once 'supabase-api.php';

function log_php_error($msg) {
	$logfile = __DIR__ . '/app_error.log';
	$entry = date('Y-m-d H:i:s') . ' ' . $msg . "\n";
	file_put_contents($logfile, $entry, FILE_APPEND);
}

// ---------------------------
// Security check
// ---------------------------
$_SESSION['user_id'] = 1;
$_SESSION['role_id'] = 1; // Admin

$user_id = $_SESSION['user_id'] ?? null;
$role_id = $_SESSION['role_id'] ?? null;

if (!$user_id) {
    ob_end_clean();
    echo json_encode(['error' => 'Unauthorized: You must log in']);
    exit();
}

// Restrict sensitive tables to Admins only
$adminOnlyTables = ['users', 'roles', 'system_settings'];
$table = $_GET['table'] ?? $_POST['table'] ?? null;

if (in_array($table, $adminOnlyTables) && $role_id != 1) {
    ob_end_clean();
    echo json_encode(['error' => 'Permission denied: Admin only']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true) ?: [];

log_php_error('Request: ' . $method . ' ' . ($table ?? 'NO_TABLE') . ' | Data: ' . json_encode($data));

// Table whitelist and columns
$TABLES = [
	'roles' => ['id', 'name', 'permissions'],
	'users' => ['id', 'email', 'full_name', 'username', 'password_hash', 'role_id', 'status', 'last_login', 'created_at', 'updated_at', 'deleted_at', 'ip_address'],
	'account_requests' => ['id', 'full_name', 'username', 'email', 'password_hash', 'requested_role_id', 'status', 'requested_at', 'reviewed_by', 'reviewed_at', 'notes', 'ip_address'],
	'menu_categories' => ['id', 'name', 'description'],
	'menu_items' => ['id', 'name', 'category_id', 'description', 'recipe', 'price_reference', 'status', 'image_path', 'created_at', 'updated_at'],
	'ingredient_categories' => ['id', 'name'],
	'units' => ['id', 'name'],
	'ingredients' => ['id', 'name', 'category_id', 'unit_id', 'current_quantity', 'low_stock_threshold', 'status', 'expiry_date', 'created_at', 'updated_at'],
	'recipes' => ['id', 'menu_item_id', 'ingredient_id', 'qty_per_sale', 'unit_id'],
	'sales' => ['id', 'receipt_no', 'sale_datetime', 'staff_id', 'total_items', 'total_amount', 'notes', 'status', 'adjusted_total', 'adjusted_by', 'adjusted_at', 'adjustment_reason', 'created_at', 'customer_name', 'order_type', 'discount_amount', 'discount_percent', 'coupon_code', 'coupon_value', 'taxes', 'subtotal'],
	'sale_items' => ['id', 'sale_id', 'menu_item_id', 'quantity', 'unit_price', 'item_name', 'category_name'],
	'inventory_transactions' => ['id', 'ingredient_id', 'change_qty', 'transaction_type', 'reason', 'performed_by', 'prev_qty', 'new_qty', 'timestamp'],
	'activity_logs' => ['id', 'user_id', 'role_label', 'action', 'reference', 'status', 'ip_address', 'created_at'],
	'requests_tbl' => ['id', 'type', 'requester_id', 'target_id', 'payload', 'status', 'created_at', 'handled_by', 'handled_at'],
	'backups' => ['id', 'filename', 'file_path', 'file_size', 'backup_type', 'includes_media', 'created_by', 'created_at'],
	'backup_settings' => ['id', 'schedule', 'retention_count', 'include_media', 'updated_at'],
	'system_settings' => ['key', 'value', 'updated_at'],
	'temp_accounts' => ['id', 'role_id', 'username', 'password_hash', 'ip_address', 'reason', 'created_by', 'created_at', 'expires_at', 'status'],
	'account_lockout' => ['id', 'user_id', 'lockout_at'],
	'login_attempts' => ['id', 'username', 'attempt_count', 'last_attempt_at'],
	'notifications' => ['id', 'user_id', 'action_type', 'target_table', 'target_id', 'description', 'reason', 'is_read', 'created_at'],
	'held_orders' => ['id', 'hold_ref', 'customer_name', 'order_type', 'items_json', 'subtotal', 'discount_amount', 'discount_percent', 'coupon_code', 'coupon_value', 'taxes', 'total_amount', 'staff_id', 'notes', 'created_at', 'expires_at', 'status', 'restored_at', 'restored_by']
];

// Get table name from query string or body
$table = $_GET['table'] ?? $data['table'] ?? null;
if (!$table || !isset($TABLES[$table])) {
	ob_end_clean();
	echo json_encode(["error" => "Invalid or missing table name"]); 
	exit;
}
$COLUMNS = $TABLES[$table];

switch($method) {
	case 'POST':
		$filtered = array_intersect_key($data, array_flip($COLUMNS));
		// Hash password for users and account_requests
		if (($table === 'users' || $table === 'account_requests') && isset($filtered['password_hash'])) {
			$filtered['password_hash'] = password_hash($filtered['password_hash'], PASSWORD_DEFAULT);
		}
		// Provide default value for required fields
		if ($table === 'menu_items' && !isset($filtered['recipe'])) {
			$filtered['recipe'] = 0;
		}
		try {
			$result = $supabase->insert($table, $filtered);
			ob_end_clean();
			if (isset($result['error'])) {
				http_response_code(400);
				echo json_encode($result);
			} else {
				echo json_encode(["message" => "Added successfully", "data" => $result]);
			}
		} catch (Exception $e) {
			log_php_error('POST error: ' . $e->getMessage());
			ob_end_clean();
			http_response_code(500);
			echo json_encode(["error" => $e->getMessage()]);
		}
		break;

	case 'GET':
		try {
			$filters = [];
			foreach ($_GET as $key => $value) {
				if ($key !== 'table' && in_array($key, $COLUMNS)) {
					$filters[$key] = 'eq.' . $value;
				}
			}
			$result = $supabase->select($table, $filters);
			ob_end_clean();
			if (isset($result['error'])) {
				http_response_code(400);
				echo json_encode($result);
			} else {
				echo json_encode($result);
			}
		} catch (Exception $e) {
			log_php_error('GET error: ' . $e->getMessage());
			ob_end_clean();
			http_response_code(500);
			echo json_encode(["error" => $e->getMessage()]);
		}
		break;

	case 'PUT':
		if (!isset($data['id']) && !isset($data['key'])) {
			ob_end_clean();
			echo json_encode(["error" => "Missing id/key for update"]); 
			exit;
		}
		$idField = in_array('id', $COLUMNS) ? 'id' : 'key';
		$id = $data[$idField];
		unset($data[$idField]);
		$filtered = array_intersect_key($data, array_flip($COLUMNS));
		if (($table === 'users' || $table === 'account_requests') && isset($filtered['password_hash'])) {
			$filtered['password_hash'] = password_hash($filtered['password_hash'], PASSWORD_DEFAULT);
		}
		if ($table === 'menu_items' && !isset($filtered['recipe']) && count($filtered) > 0) {
			$filtered['recipe'] = 0;
		}
		try {
			$filter_params = [$idField => 'eq.' . $id];
			$result = $supabase->update($table, $filtered, $filter_params);
			ob_end_clean();
			if (isset($result['error'])) {
				http_response_code(400);
				echo json_encode($result);
			} else {
				echo json_encode(["message" => "Updated successfully"]);
			}
		} catch (Exception $e) {
			log_php_error('PUT error: ' . $e->getMessage());
			ob_end_clean();
			http_response_code(500);
			echo json_encode(["error" => $e->getMessage()]);
		}
		break;

	case 'DELETE':
		$idField = in_array('id', $COLUMNS) ? 'id' : 'key';
		if (!isset($data[$idField])) {
			ob_end_clean();
			echo json_encode(["error" => "Missing id/key for delete"]); 
			exit;
		}
		try {
			$filter_params = [$idField => 'eq.' . $data[$idField]];
			$result = $supabase->delete($table, $filter_params);
			ob_end_clean();
			if (isset($result['error'])) {
				http_response_code(400);
				echo json_encode($result);
			} else {
				echo json_encode(["message" => "Deleted successfully"]);
			}
		} catch (Exception $e) {
			log_php_error('DELETE error: ' . $e->getMessage());
			ob_end_clean();
			http_response_code(500);
			echo json_encode(["error" => $e->getMessage()]);
		}
		break;

	default:
		log_php_error('Unsupported method: ' . $method);
		ob_end_clean();
		http_response_code(405);
		echo json_encode(["error" => "Unsupported method"]);
}
?>
