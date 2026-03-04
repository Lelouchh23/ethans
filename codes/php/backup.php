<?php
/**
 * Backup & Restore API
 * Handles database backups, restore, and settings management
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

try {
    switch ($action) {
        case 'list':
            listBackups();
            break;
        case 'create':
            createBackup();
            break;
        case 'download':
            downloadBackup();
            break;
        case 'delete':
            deleteBackup();
            break;
        case 'restore':
            restoreBackup();
            break;
        case 'get_settings':
            getSettings();
            break;
        case 'save_settings':
            saveSettings();
            break;
        case 'prune':
            pruneOldBackups();
            break;
        default:
            jsonResponse(['error' => 'Invalid action'], 400);
    }
} catch (Exception $e) {
    error_log("Backup API Error: " . $e->getMessage());
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
 * List all backups
 */
function listBackups() {
    global $supabase;
    
    $backups = $supabase->select('backups', ['order' => 'created_at.desc']);
    
    if (isset($backups['error'])) {
        jsonResponse(['error' => 'Failed to fetch backups'], 500);
    }
    
    jsonResponse(['success' => true, 'backups' => $backups]);
}

/**
 * Create a new backup
 * Supports formats: json, sql, zip
 */
function createBackup() {
    global $supabase;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $backupType = $input['backup_type'] ?? 'Manual';
    $backupFormat = $input['format'] ?? 'json';
    $includeMedia = $input['include_media'] ?? false;
    $createdBy = $input['created_by'] ?? null;
    
    // Generate backup filename based on format
    $timestamp = date('Y-m-d_His');
    
    // Create backup directory if not exists
    $backupDir = __DIR__ . '/../resources/backups/';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }
    
    // Tables to backup
    $tables = ['users', 'roles', 'menu_items', 'menu_categories', 'ingredients', 'ingredient_categories', 'recipes', 'sales', 'sale_items', 'activity_logs', 'units', 'system_settings', 'requests_tbl'];
    
    // Collect data from all tables
    $allData = [];
    foreach ($tables as $table) {
        $data = $supabase->select($table);
        // Check for error (local error key OR Supabase error response with 'code')
        if (!isset($data['error']) && !isset($data['code']) && is_array($data)) {
            $allData[$table] = $data;
        } else {
            // Log error but continue with other tables
            error_log("Backup: Failed to fetch table $table: " . json_encode($data));
            $allData[$table] = []; // Empty array for failed tables
        }
    }
    
    $result = null;
    $filename = '';
    $filePath = '';
    
    switch ($backupFormat) {
        case 'json':
            $result = createJsonBackup($backupDir, $timestamp, $allData, $backupType);
            break;
        case 'sql':
            $result = createSqlBackup($backupDir, $timestamp, $allData, $backupType);
            break;
        case 'zip':
            $result = createZipBackup($backupDir, $timestamp, $allData, $backupType, $includeMedia);
            break;
        default:
            jsonResponse(['error' => 'Invalid backup format'], 400);
    }
    
    if (!$result['success']) {
        jsonResponse(['error' => $result['error']], 500);
    }
    
    $filename = $result['filename'];
    $filePath = $result['filepath'];
    
    // Calculate file size
    $fileSize = filesize($filePath);
    $fileSizeFormatted = formatFileSize($fileSize);
    
    // Save backup record to database
    $backupRecord = [
        'filename' => $filename,
        'file_path' => 'resources/backups/' . $filename,
        'file_size' => $fileSizeFormatted,
        'backup_type' => $backupType . ' (' . strtoupper($backupFormat) . ')',
        'includes_media' => $includeMedia && $backupFormat === 'zip',
        'created_by' => $createdBy
    ];
    
    $dbResult = $supabase->insert('backups', $backupRecord);
    
    if (isset($dbResult['error'])) {
        jsonResponse([
            'success' => true,
            'warning' => 'Backup created but failed to save record',
            'filename' => $filename,
            'file_size' => $fileSizeFormatted
        ]);
    }
    
    // Apply retention policy
    applyRetentionPolicy();
    
    jsonResponse([
        'success' => true,
        'message' => 'Backup created successfully',
        'filename' => $filename,
        'file_size' => $fileSizeFormatted,
        'backup' => $result[0] ?? $backupRecord
    ]);
}

/**
 * Download a backup file
 */
function downloadBackup() {
    $filename = $_GET['file'] ?? '';
    
    // Security: sanitize filename to prevent path traversal
    $filename = basename($filename);
    
    if (empty($filename)) {
        jsonResponse(['error' => 'No filename specified'], 400);
    }
    
    $filePath = __DIR__ . '/../resources/backups/' . $filename;
    
    if (!file_exists($filePath)) {
        jsonResponse(['error' => 'Backup file not found'], 404);
    }
    
    // Send file for download
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache');
    
    readfile($filePath);
    exit;
}

/**
 * Delete a backup
 */
function deleteBackup() {
    global $supabase;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $backupId = $input['id'] ?? null;
    $filename = $input['filename'] ?? null;
    
    if (!$backupId && !$filename) {
        jsonResponse(['error' => 'Backup ID or filename required'], 400);
    }
    
    // Get backup record
    $filter = $backupId ? ['id' => 'eq.' . $backupId] : ['filename' => 'eq.' . $filename];
    $backups = $supabase->select('backups', $filter);
    
    if (empty($backups) || isset($backups['error'])) {
        jsonResponse(['error' => 'Backup not found'], 404);
    }
    
    $backup = $backups[0];
    
    // Delete file from disk
    $filePath = __DIR__ . '/../' . $backup['file_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    
    // Delete record from database
    $supabase->delete('backups', ['id' => 'eq.' . $backup['id']]);
    
    jsonResponse(['success' => true, 'message' => 'Backup deleted successfully']);
}

/**
 * Restore from a backup (supports JSON, SQL, ZIP formats)
 */
function restoreBackup() {
    global $supabase;
    
    $filename = '';
    $content = '';
    $filePath = '';
    
    // Check if file was uploaded
    if (isset($_FILES['backup_file'])) {
        $uploadedFile = $_FILES['backup_file'];
        
        if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(['error' => 'File upload failed'], 400);
        }
        
        $filename = $uploadedFile['name'];
        $filePath = $uploadedFile['tmp_name'];
        $content = file_get_contents($filePath);
    } else {
        // Use existing backup file
        $input = json_decode(file_get_contents('php://input'), true);
        $filename = basename($input['filename'] ?? '');
        
        if (empty($filename)) {
            jsonResponse(['error' => 'No backup file specified'], 400);
        }
        
        $filePath = __DIR__ . '/../resources/backups/' . $filename;
        
        if (!file_exists($filePath)) {
            jsonResponse(['error' => 'Backup file not found'], 404);
        }
        
        $content = file_get_contents($filePath);
    }
    
    // Determine format by extension
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    $restored = [];
    $errors = [];
    
    switch ($extension) {
        case 'json':
            $result = restoreFromJson($content);
            $restored = $result['restored'];
            $errors = $result['errors'];
            break;
            
        case 'sql':
            $result = restoreFromSql($content);
            $restored = $result['restored'];
            $errors = $result['errors'];
            break;
            
        case 'zip':
            $result = restoreFromZip($filePath);
            $restored = $result['restored'];
            $errors = $result['errors'];
            break;
            
        default:
            jsonResponse(['error' => 'Unsupported backup format. Use .json, .sql, or .zip'], 400);
    }
    
    if (!empty($errors)) {
        jsonResponse([
            'success' => true,
            'warning' => 'Restore completed with some errors',
            'restored_tables' => $restored,
            'errors' => $errors
        ]);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Restore completed successfully',
        'format' => $extension,
        'restored_tables' => $restored
    ]);
}

/**
 * Restore from JSON backup
 */
function restoreFromJson($content) {
    global $supabase;
    
    $backupData = json_decode($content, true);
    
    if (!$backupData || !isset($backupData['tables'])) {
        return ['restored' => [], 'errors' => ['Invalid JSON backup format']];
    }
    
    $restored = [];
    $errors = [];
    
    foreach ($backupData['tables'] as $table => $records) {
        if (!is_array($records)) continue;
        
        foreach ($records as $record) {
            // Skip if record has an ID and already exists
            if (isset($record['id'])) {
                $existing = $supabase->select($table, ['id' => 'eq.' . $record['id']]);
                if (!empty($existing) && !isset($existing['error'])) {
                    continue;
                }
            }
            
            $result = $supabase->insert($table, $record);
            if (isset($result['error'])) {
                $errors[] = "Failed to restore record in $table";
            }
        }
        $restored[] = $table;
    }
    
    return ['restored' => array_unique($restored), 'errors' => $errors];
}

/**
 * Restore from SQL backup
 * Note: For Supabase REST API, we parse INSERT statements and execute via API
 */
function restoreFromSql($content) {
    global $supabase;
    
    $restored = [];
    $errors = [];
    
    // Parse INSERT statements
    preg_match_all('/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/i', $content, $matches, PREG_SET_ORDER);
    
    foreach ($matches as $match) {
        $table = $match[1];
        $columns = array_map('trim', explode(',', $match[2]));
        $valuesStr = $match[3];
        
        // Parse values (handle quoted strings, NULL, numbers)
        $values = parseInsertValues($valuesStr);
        
        if (count($columns) !== count($values)) {
            $errors[] = "Column/value mismatch in $table";
            continue;
        }
        
        $record = array_combine($columns, $values);
        
        // Skip if record exists
        if (isset($record['id'])) {
            $existing = $supabase->select($table, ['id' => 'eq.' . $record['id']]);
            if (!empty($existing) && !isset($existing['error'])) {
                continue;
            }
        }
        
        $result = $supabase->insert($table, $record);
        if (isset($result['error'])) {
            $errors[] = "Failed to restore record in $table";
        }
        
        if (!in_array($table, $restored)) {
            $restored[] = $table;
        }
    }
    
    return ['restored' => $restored, 'errors' => $errors];
}

/**
 * Parse SQL INSERT values string
 */
function parseInsertValues($valuesStr) {
    $values = [];
    $current = '';
    $inQuote = false;
    $quoteChar = '';
    
    for ($i = 0; $i < strlen($valuesStr); $i++) {
        $char = $valuesStr[$i];
        
        if (!$inQuote && ($char === "'" || $char === '"')) {
            $inQuote = true;
            $quoteChar = $char;
        } elseif ($inQuote && $char === $quoteChar) {
            // Check for escaped quote
            if ($i + 1 < strlen($valuesStr) && $valuesStr[$i + 1] === $quoteChar) {
                $current .= $char;
                $i++;
            } else {
                $inQuote = false;
            }
        } elseif (!$inQuote && $char === ',') {
            $values[] = parseSqlValue(trim($current));
            $current = '';
            continue;
        } else {
            $current .= $char;
        }
    }
    
    if ($current !== '') {
        $values[] = parseSqlValue(trim($current));
    }
    
    return $values;
}

/**
 * Parse individual SQL value
 */
function parseSqlValue($val) {
    $val = trim($val);
    
    if (strtoupper($val) === 'NULL') return null;
    if (strtoupper($val) === 'TRUE') return true;
    if (strtoupper($val) === 'FALSE') return false;
    if (is_numeric($val)) return $val + 0;
    
    // Remove surrounding quotes
    if ((substr($val, 0, 1) === "'" && substr($val, -1) === "'") ||
        (substr($val, 0, 1) === '"' && substr($val, -1) === '"')) {
        $val = substr($val, 1, -1);
        // Unescape quotes
        $val = str_replace("''", "'", $val);
        $val = str_replace('""', '"', $val);
    }
    
    return $val;
}

/**
 * Restore from ZIP backup
 */
function restoreFromZip($zipPath) {
    global $supabase;
    
    if (!class_exists('ZipArchive')) {
        return ['restored' => [], 'errors' => ['ZipArchive extension not available']];
    }
    
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== TRUE) {
        return ['restored' => [], 'errors' => ['Failed to open ZIP file']];
    }
    
    $restored = [];
    $errors = [];
    
    // Try to restore from JSON first (preferred)
    $jsonContent = $zip->getFromName('data.json');
    if ($jsonContent !== false) {
        $result = restoreFromJson($jsonContent);
        $restored = array_merge($restored, $result['restored']);
        $errors = array_merge($errors, $result['errors']);
    }
    
    // Restore media files if present
    $mediaDir = __DIR__ . '/../resources/uploads/';
    if (!is_dir($mediaDir)) {
        mkdir($mediaDir, 0755, true);
    }
    
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);
        if (strpos($filename, 'uploads/') === 0 && $filename !== 'uploads/') {
            $destFile = $mediaDir . basename($filename);
            $content = $zip->getFromIndex($i);
            if ($content !== false) {
                file_put_contents($destFile, $content);
            }
        }
    }
    
    if (strpos($zip->getFromName('manifest.json'), 'uploads') !== false) {
        $restored[] = 'media_files';
    }
    
    $zip->close();
    
    return ['restored' => array_unique($restored), 'errors' => $errors];
}

/**
 * Get backup settings
 */
function getSettings() {
    global $supabase;
    
    $settings = $supabase->select('backup_settings', ['id' => 'eq.1']);
    
    if (empty($settings) || isset($settings['error'])) {
        // Return defaults if no settings exist
        jsonResponse([
            'success' => true,
            'settings' => [
                'schedule' => 'Weekly',
                'retention_count' => 10,
                'include_media' => true
            ]
        ]);
    }
    
    jsonResponse(['success' => true, 'settings' => $settings[0]]);
}

/**
 * Save backup settings
 */
function saveSettings() {
    global $supabase;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $settings = [
        'schedule' => $input['schedule'] ?? 'Weekly',
        'retention_count' => intval($input['retention_count'] ?? 10),
        'include_media' => $input['include_media'] ?? true,
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    // Check if settings exist
    $existing = $supabase->select('backup_settings', ['id' => 'eq.1']);
    
    if (empty($existing) || isset($existing['error'])) {
        // Insert new settings
        $settings['id'] = 1;
        $result = $supabase->insert('backup_settings', $settings);
    } else {
        // Update existing settings
        $result = $supabase->update('backup_settings', $settings, ['id' => 'eq.1']);
    }
    
    if (isset($result['error'])) {
        jsonResponse(['error' => 'Failed to save settings'], 500);
    }
    
    jsonResponse(['success' => true, 'message' => 'Settings saved successfully']);
}

/**
 * Prune old backups based on retention policy
 */
function pruneOldBackups() {
    global $supabase;
    
    // Get retention setting
    $settings = $supabase->select('backup_settings', ['id' => 'eq.1']);
    $retentionCount = 10; // Default
    
    if (!empty($settings) && !isset($settings['error'])) {
        $retentionCount = intval($settings[0]['retention_count'] ?? 10);
    }
    
    if ($retentionCount === 0) {
        jsonResponse(['success' => true, 'message' => 'Retention policy set to keep all backups']);
    }
    
    // Get all backups ordered by date
    $backups = $supabase->select('backups', ['order' => 'created_at.desc']);
    
    if (empty($backups) || isset($backups['error'])) {
        jsonResponse(['success' => true, 'message' => 'No backups to prune']);
    }
    
    $deleted = 0;
    
    // Delete backups beyond retention count
    if (count($backups) > $retentionCount) {
        $toDelete = array_slice($backups, $retentionCount);
        
        foreach ($toDelete as $backup) {
            // Delete file
            $filePath = __DIR__ . '/../' . $backup['file_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            // Delete record
            $supabase->delete('backups', ['id' => 'eq.' . $backup['id']]);
            $deleted++;
        }
    }
    
    jsonResponse([
        'success' => true,
        'message' => "Pruned $deleted old backup(s)",
        'deleted_count' => $deleted
    ]);
}

/**
 * Apply retention policy (called after creating backup)
 */
function applyRetentionPolicy() {
    global $supabase;
    
    $settings = $supabase->select('backup_settings', ['id' => 'eq.1']);
    $retentionCount = 10;
    
    if (!empty($settings) && !isset($settings['error'])) {
        $retentionCount = intval($settings[0]['retention_count'] ?? 10);
    }
    
    if ($retentionCount === 0) return;
    
    $backups = $supabase->select('backups', ['order' => 'created_at.desc']);
    
    if (count($backups) > $retentionCount) {
        $toDelete = array_slice($backups, $retentionCount);
        
        foreach ($toDelete as $backup) {
            $filePath = __DIR__ . '/../' . $backup['file_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            $supabase->delete('backups', ['id' => 'eq.' . $backup['id']]);
        }
    }
}

/**
 * Format file size to human readable
 */
function formatFileSize($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}

/**
 * Create JSON backup (fastest - just data and paths as strings)
 */
function createJsonBackup($backupDir, $timestamp, $allData, $backupType) {
    $filename = "backup_{$timestamp}.json";
    $filePath = $backupDir . $filename;
    
    $backupData = [
        'format' => 'json',
        'created_at' => date('Y-m-d H:i:s'),
        'backup_type' => $backupType,
        'tables' => $allData
    ];
    
    $jsonData = json_encode($backupData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if (file_put_contents($filePath, $jsonData) === false) {
        return ['success' => false, 'error' => 'Failed to write JSON backup file'];
    }
    
    return ['success' => true, 'filename' => $filename, 'filepath' => $filePath];
}

/**
 * Create SQL backup (INSERT statements - no images, just paths)
 */
function createSqlBackup($backupDir, $timestamp, $allData, $backupType) {
    $filename = "backup_{$timestamp}.sql";
    $filePath = $backupDir . $filename;
    
    $sql = "-- Ethan's Cafe Backup\n";
    $sql .= "-- Created: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Type: {$backupType}\n";
    $sql .= "-- Format: SQL (INSERT statements)\n\n";
    $sql .= "SET session_replication_role = 'replica'; -- Disable triggers for restore\n\n";
    
    foreach ($allData as $table => $records) {
        if (empty($records)) continue;
        
        $sql .= "-- Table: {$table}\n";
        $sql .= "-- Records: " . count($records) . "\n";
        
        foreach ($records as $record) {
            $columns = array_keys($record);
            $values = array_map(function($val) {
                if ($val === null) return 'NULL';
                if (is_bool($val)) return $val ? 'TRUE' : 'FALSE';
                if (is_numeric($val)) return $val;
                // Escape single quotes and wrap in quotes
                return "'" . str_replace("'", "''", $val) . "'";
            }, array_values($record));
            
            $sql .= "INSERT INTO {$table} (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ") ON CONFLICT (id) DO NOTHING;\n";
        }
        $sql .= "\n";
    }
    
    $sql .= "SET session_replication_role = 'origin'; -- Re-enable triggers\n";
    
    if (file_put_contents($filePath, $sql) === false) {
        return ['success' => false, 'error' => 'Failed to write SQL backup file'];
    }
    
    return ['success' => true, 'filename' => $filename, 'filepath' => $filePath];
}

/**
 * Create ZIP backup (includes JSON, SQL, and image files)
 */
function createZipBackup($backupDir, $timestamp, $allData, $backupType, $includeMedia) {
    $filename = "backup_{$timestamp}.zip";
    $filePath = $backupDir . $filename;
    
    // Check if ZipArchive is available
    if (!class_exists('ZipArchive')) {
        return ['success' => false, 'error' => 'ZipArchive extension not available'];
    }
    
    $zip = new ZipArchive();
    if ($zip->open($filePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        return ['success' => false, 'error' => 'Failed to create ZIP file'];
    }
    
    // Create JSON backup content
    $jsonData = [
        'format' => 'zip',
        'created_at' => date('Y-m-d H:i:s'),
        'backup_type' => $backupType,
        'includes_media' => $includeMedia,
        'tables' => $allData
    ];
    $zip->addFromString('data.json', json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    // Create SQL backup content
    $sql = "-- Ethan's Cafe Backup (from ZIP)\n";
    $sql .= "-- Created: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Type: {$backupType}\n\n";
    $sql .= "SET session_replication_role = 'replica';\n\n";
    
    foreach ($allData as $table => $records) {
        if (empty($records) || !is_array($records)) continue;
        
        $sql .= "-- Table: {$table}\n";
        foreach ($records as $record) {
            // Skip if record is not a proper associative array
            if (!is_array($record) || empty($record)) continue;
            
            $columns = array_keys($record);
            $values = array_map(function($val) {
                if ($val === null) return 'NULL';
                if (is_bool($val)) return $val ? 'TRUE' : 'FALSE';
                if (is_numeric($val)) return $val;
                return "'" . str_replace("'", "''", $val) . "'";
            }, array_values($record));
            
            $sql .= "INSERT INTO {$table} (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ") ON CONFLICT (id) DO NOTHING;\n";
        }
        $sql .= "\n";
    }
    $sql .= "SET session_replication_role = 'origin';\n";
    $zip->addFromString('data.sql', $sql);
    
    // Add media files if requested
    if ($includeMedia) {
        $mediaDir = __DIR__ . '/../resources/uploads/';
        if (is_dir($mediaDir)) {
            $files = scandir($mediaDir);
            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..' && is_file($mediaDir . $file)) {
                    $zip->addFile($mediaDir . $file, 'uploads/' . $file);
                }
            }
        }
    }
    
    // Add manifest
    $manifest = [
        'version' => '1.0',
        'created_at' => date('Y-m-d H:i:s'),
        'backup_type' => $backupType,
        'includes_media' => $includeMedia,
        'files' => [
            'data.json' => 'JSON data export',
            'data.sql' => 'SQL INSERT statements',
            'uploads/' => $includeMedia ? 'Media files' : 'Not included'
        ]
    ];
    $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
    
    $zip->close();
    
    if (!file_exists($filePath)) {
        return ['success' => false, 'error' => 'Failed to create ZIP backup'];
    }
    
    return ['success' => true, 'filename' => $filename, 'filepath' => $filePath];
}
