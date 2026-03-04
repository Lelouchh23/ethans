<?php
// Staff database connection helper (returns a PDO instance)

// Load secure configuration
require_once __DIR__ . '/../codes/php/config.php';

function getStaffDBConnection(): PDO
{
    $dsn = "mysql:host=" . DB_HOST . ";dbname=ethans_cafe_staff;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        throw new RuntimeException('Staff DB connection failed: ' . $e->getMessage());
    }
}

// Usage example:
// require_once __DIR__ . '/staff_db_connection.php';
// $pdo = getStaffDBConnection();
// $stmt = $pdo->query('SELECT * FROM staff LIMIT 1');
// $row = $stmt->fetch();
