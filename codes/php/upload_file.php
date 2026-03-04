<?php
/**
 * File Upload Handler for Supabase Storage
 * Handles image uploads for menu items
 */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Supabase configuration
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

$SUPABASE_URL = defined('SUPABASE_URL') ? SUPABASE_URL : (getenv('SUPABASE_URL') ?: '');
$SUPABASE_KEY = defined('SUPABASE_ANON_KEY') ? SUPABASE_ANON_KEY : (getenv('SUPABASE_ANON_KEY') ?: '');
$BUCKET_NAME = 'menu-images'; // Supabase Storage bucket name

if (empty($SUPABASE_URL) || empty($SUPABASE_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => 'Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in config.php or environment variables.']);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
    ];
    
    $errorCode = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
    $errorMsg = $errorMessages[$errorCode] ?? 'Unknown upload error';
    
    http_response_code(400);
    echo json_encode(['error' => $errorMsg]);
    exit;
}

$file = $_FILES['image'];

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP']);
    exit;
}

// Validate file size (max 5MB)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Maximum size is 5MB']);
    exit;
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'menu_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;

// Read file contents
$fileContents = file_get_contents($file['tmp_name']);
if ($fileContents === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to read uploaded file']);
    exit;
}

// Upload to Supabase Storage
$uploadUrl = $SUPABASE_URL . '/storage/v1/object/' . $BUCKET_NAME . '/' . $filename;

$ch = curl_init($uploadUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $fileContents,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'apikey: ' . $SUPABASE_KEY,
        'Content-Type: ' . $mimeType,
        'x-upsert: true'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Upload failed: ' . $curlError]);
    exit;
}

// Check if upload was successful
if ($httpCode >= 200 && $httpCode < 300) {
    // Generate public URL for the uploaded image
    $publicUrl = $SUPABASE_URL . '/storage/v1/object/public/' . $BUCKET_NAME . '/' . $filename;
    
    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'url' => $publicUrl,
        'size' => $file['size'],
        'type' => $mimeType
    ]);
} else {
    // Parse error response from Supabase
    $errorData = json_decode($response, true);
    $errorMessage = $errorData['message'] ?? $errorData['error'] ?? 'Upload failed';
    
    // If bucket doesn't exist, save locally as fallback
    if (strpos($response, 'Bucket not found') !== false || $httpCode === 404) {
        // Fallback: Save to local uploads directory
        $uploadsDir = __DIR__ . '/../resources/uploads/';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0755, true);
        }
        
        $localPath = $uploadsDir . $filename;
        if (move_uploaded_file($file['tmp_name'], $localPath)) {
            echo json_encode([
                'success' => true,
                'filename' => $filename,
                'url' => 'resources/uploads/' . $filename,
                'size' => $file['size'],
                'type' => $mimeType,
                'storage' => 'local'
            ]);
            exit;
        }
    }
    
    http_response_code(500);
    echo json_encode([
        'error' => $errorMessage,
        'details' => $response
    ]);
}
?>
