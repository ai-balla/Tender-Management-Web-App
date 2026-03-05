<?php
// app/api/utils.php

// Show errors during development
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Base directory path
define('BASE_PATH', realpath(__DIR__ . '/../'));

require_once BASE_PATH . '/config/database.php';

session_start();

function jsonResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function checkAuth()
{
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
    }
}

function getDB()
{
    $db = new Database();
    return $db->getConnection();
}

function logActivity($action, $description)
{
    if (!isset($_SESSION['user_id']))
        return;
    $db = getDB();
    if (!$db)
        return;

    $stmt = $db->prepare("INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)");
    $stmt->execute([$_SESSION['user_id'], $action, $description, $_SERVER['REMOTE_ADDR'] ?? '']);
}
