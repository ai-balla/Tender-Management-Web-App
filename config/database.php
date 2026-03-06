<?php
/**
 * Tender Management System - Database Connection
 * Requires PHP 8.0+
 */

// Simple .env parser for basic setups without Composer/vlucas
function loadEnv($path = __DIR__ . '/../../.env')
{
    if (!file_exists($path)) {
        // Fallback to one directory up just in case
        if (file_exists(__DIR__ . '/../.env')) {
            $path = __DIR__ . '/../.env';
        } else {
            return false;
        }
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0)
            continue;
        list($name, $value) = explode('=', $line, 2);

        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
    return true;
}

// Ensure .env is loaded
loadEnv();

class Database
{
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $conn;

    public function __construct()
    {
        $this->host = getenv('DB_HOST') ?: '127.0.0.1';
        $this->db_name = getenv('DB_DATABASE') ?: '';
        $this->username = getenv('DB_USERNAME') ?: '';
        $this->password = getenv('DB_PASSWORD') ?: '';
        $this->port = getenv('DB_PORT') ?: '3306';
    }

    public function getConnection()
    {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            $this->conn = new PDO($dsn, $this->username, $this->password, $options);

        } catch (PDOException $exception) {
            // Keep this secure in production (don't print password)
            if (getenv('APP_DEBUG') === 'true') {
                echo "Connection error: " . $exception->getMessage();
            } else {
                echo json_encode(["status" => "error", "message" => "Database connection failed."]);
            }
            exit;
        }

        return $this->conn;
    }
}