<?php
// Router for PHP development server
// Prioritizes static files and PHP requests, only routes HTML to index.html

// Get the requested path without query string
$url_path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Decode URL-encoded characters (like %20 for spaces)
$url_path = urldecode($url_path);
$file_path = __DIR__ . $url_path;

// 0. Handle favicon.ico - serve logo image without 404
if (strpos($url_path, '/favicon.ico') !== false) {
    // Serve the logo as favicon
    $logo_path = __DIR__ . '/resources/ethans logo.jpg';
    if (file_exists($logo_path)) {
        header('Content-Type: image/jpeg');
        header('Cache-Control: public, max-age=604800');
        readfile($logo_path);
        return true;
    }
    // If logo doesn't exist, return empty 200 to prevent 404
    http_response_code(200);
    return true;
}

// 1. Serve static files directly (don't intercept them)
if (file_exists($file_path) && is_file($file_path)) {
    // Let PHP dev server handle the static file with correct MIME type
    return false;
}

// 2. If requesting a directory with index.html, serve that
if (is_dir($file_path)) {
    if (file_exists($file_path . '/index.html')) {
        require $file_path . '/index.html';
        return true;
    }
}

// 3. For non-existent files in /codes, route to index.html (SPA routing)
// But NOT for API requests (anything in /php directory)
if (strpos($url_path, '/codes/php/') !== 0 && 
    strpos($url_path, '/codes/') === 0 && 
    !preg_match('/\.[a-z0-9]+$/i', $url_path)) {
    // It's a route, not a static file
    require __DIR__ . '/index.html';
    return true;
}

// 4. Root requests (/) should serve index.html
if ($url_path === '/' || $url_path === '/index.html') {
    $index_path = __DIR__ . '/index.html';
    if (file_exists($index_path)) {
        require $index_path;
        return true;
    }
}

// 5. Otherwise, let the server handle it or return 404
if (!file_exists($file_path)) {
    http_response_code(404);
    return true;
}

return false;
?>
