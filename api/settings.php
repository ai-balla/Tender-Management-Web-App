<?php
// app/api/settings.php
require_once 'utils.php';
checkAuth();
$db = getDB();

$action = $_GET['action'] ?? '';

if ($action === 'save') {
    // We expect raw JSON body mapping key -> value
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data)
        jsonResponse(['success' => false], 400);

    $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");

    $db->beginTransaction();
    foreach ($data as $key => $value) {
        // Map frontend JSON keys to database keys
        $db_key = $key;
        if ($key === 'name')
            $db_key = 'company_name';
        if ($key === 'name_en')
            $db_key = 'company_name_en';

        // nulls or strings
        $stmt->execute([$db_key, $value, $value]);
    }
    $db->commit();

    logActivity('تحديث الإعدادات', 'تم تحديث إعدادات وشعار النظام');
    jsonResponse(['success' => true]);
}
