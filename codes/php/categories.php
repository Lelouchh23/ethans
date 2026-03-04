<?php
/**
 * Categories API
 * Handles menu categories and ingredient categories management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'supabase-api.php';

$supabase = new SupabaseAPI();

// Get action from request
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$type = $_GET['type'] ?? '';

try {
    switch ($action) {
        case 'list':
            listCategories($type);
            break;
        case 'get':
            getCategory();
            break;
        case 'create':
            createCategory();
            break;
        case 'update':
            updateCategory();
            break;
        case 'delete':
            deleteCategory();
            break;
        default:
            jsonResponse(['error' => 'Invalid action'], 400);
    }
} catch (Exception $e) {
    error_log("Categories API Error: " . $e->getMessage());
    jsonResponse(['error' => $e->getMessage()], 500);
}

/**
 * Send JSON response
 */
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

/**
 * List categories by type (menu or ingredient)
 */
function listCategories($type) {
    global $supabase;
    
    // Determine table based on type
    $table = $type === 'ingredient' ? 'ingredient_categories' : 'menu_categories';
    $itemTable = $type === 'ingredient' ? 'ingredients' : 'menu_items';
    $foreignKey = $type === 'ingredient' ? 'category_id' : 'category_id';
    
    // Get categories
    $categories = $supabase->select($table, ['order' => 'name.asc']);
    
    if (isset($categories['error'])) {
        jsonResponse(['error' => 'Failed to fetch categories'], 500);
    }
    
    // Get item counts for each category
    $items = $supabase->select($itemTable);
    $itemCounts = [];
    
    if (is_array($items) && !isset($items['error'])) {
        foreach ($items as $item) {
            $catId = $item[$foreignKey] ?? null;
            if ($catId) {
                $itemCounts[$catId] = ($itemCounts[$catId] ?? 0) + 1;
            }
        }
    }
    
    // Add item count to each category
    foreach ($categories as &$cat) {
        $cat['item_count'] = $itemCounts[$cat['id']] ?? 0;
    }
    
    jsonResponse(['success' => true, 'categories' => $categories]);
}

/**
 * Get single category
 */
function getCategory() {
    global $supabase;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? null;
    $type = $input['type'] ?? $_GET['type'] ?? 'menu';
    
    if (!$id) {
        jsonResponse(['error' => 'Category ID required'], 400);
    }
    
    $table = $type === 'ingredient' ? 'ingredient_categories' : 'menu_categories';
    $category = $supabase->select($table, ['id' => 'eq.' . $id]);
    
    if (empty($category) || isset($category['error'])) {
        jsonResponse(['error' => 'Category not found'], 404);
    }
    
    jsonResponse(['success' => true, 'category' => $category[0]]);
}

/**
 * Create new category
 */
function createCategory() {
    global $supabase;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $type = $input['type'] ?? 'menu';
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    
    if (empty($name)) {
        jsonResponse(['error' => 'Category name is required'], 400);
    }
    
    $table = $type === 'ingredient' ? 'ingredient_categories' : 'menu_categories';
    
    // Check for duplicate name
    $existing = $supabase->select($table, ['name' => 'eq.' . $name]);
    if (!empty($existing) && !isset($existing['error'])) {
        jsonResponse(['error' => 'A category with this name already exists'], 400);
    }
    
    // ingredient_categories only has: id, name
    // menu_categories has: id, name, description
    if ($type === 'ingredient') {
        $categoryData = ['name' => $name];
    } else {
        $categoryData = [
            'name' => $name,
            'description' => $description ?: null
        ];
    }
    
    $result = $supabase->insert($table, $categoryData);
    
    if (isset($result['error'])) {
        jsonResponse(['error' => 'Failed to create category'], 500);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Category created successfully',
        'category' => $result[0] ?? $categoryData
    ]);
}

/**
 * Update existing category
 */
function updateCategory() {
    global $supabase;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id = $input['id'] ?? null;
    $type = $input['type'] ?? 'menu';
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    
    if (!$id) {
        jsonResponse(['error' => 'Category ID is required'], 400);
    }
    
    if (empty($name)) {
        jsonResponse(['error' => 'Category name is required'], 400);
    }
    
    $table = $type === 'ingredient' ? 'ingredient_categories' : 'menu_categories';
    
    // Check for duplicate name (excluding current category)
    $existing = $supabase->select($table, ['name' => 'eq.' . $name]);
    if (!empty($existing) && !isset($existing['error'])) {
        foreach ($existing as $cat) {
            if ($cat['id'] != $id) {
                jsonResponse(['error' => 'A category with this name already exists'], 400);
            }
        }
    }
    
    // ingredient_categories only has: id, name
    // menu_categories has: id, name, description
    if ($type === 'ingredient') {
        $updateData = ['name' => $name];
    } else {
        $updateData = [
            'name' => $name,
            'description' => $description ?: null
        ];
    }
    
    $result = $supabase->update($table, $updateData, ['id' => 'eq.' . $id]);
    
    if (isset($result['error'])) {
        jsonResponse(['error' => 'Failed to update category'], 500);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Category updated successfully'
    ]);
}

/**
 * Delete category
 */
function deleteCategory() {
    global $supabase;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id = $input['id'] ?? null;
    $type = $input['type'] ?? 'menu';
    
    if (!$id) {
        jsonResponse(['error' => 'Category ID is required'], 400);
    }
    
    $table = $type === 'ingredient' ? 'ingredient_categories' : 'menu_categories';
    $itemTable = $type === 'ingredient' ? 'ingredients' : 'menu_items';
    
    // Check if category has items
    $items = $supabase->select($itemTable, ['category_id' => 'eq.' . $id]);
    if (!empty($items) && !isset($items['error']) && count($items) > 0) {
        jsonResponse([
            'error' => 'Cannot delete category with associated items. Please reassign or delete the items first.',
            'item_count' => count($items)
        ], 400);
    }
    
    // Delete category
    $result = $supabase->delete($table, ['id' => 'eq.' . $id]);
    
    if (isset($result['error'])) {
        jsonResponse(['error' => 'Failed to delete category'], 500);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Category deleted successfully'
    ]);
}
