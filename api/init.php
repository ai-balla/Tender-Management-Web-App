<?php
// app/api/init.php
require_once 'utils.php';

// Allow only authenticated users
checkAuth();

$db = getDB();

// 1. Fetch Users
$users = $db->query("SELECT id, username, full_name, email, role, status, last_login, created_at FROM users")->fetchAll();

// 2. Fetch Settings
$settings_raw = $db->query("SELECT setting_key, setting_value FROM settings")->fetchAll();
$settings = [];
foreach ($settings_raw as $row) {
    $settings[$row['setting_key']] = $row['setting_value'];
}
$settings['name'] = $settings['company_name'] ?? 'مجموعة عرب MD الطبية';
$settings['name_en'] = $settings['company_name_en'] ?? 'Arab MD Group';

// 3. Fetch Tenders & BOQ & Files
$tenders_raw = $db->query("SELECT * FROM tenders")->fetchAll();
$tenders = [];

foreach ($tenders_raw as $t) {
    // Cast numeric types
    $t['submitted_price'] = $t['submitted_price'] ? (float) $t['submitted_price'] : null;
    $t['cost'] = $t['cost'] ? (float) $t['cost'] : null;
    $t['profit'] = $t['profit'] ? (float) $t['profit'] : null;
    $t['vat'] = $t['vat'] ? (float) $t['vat'] : null;

    // Fetch BOQ Costs
    $stmtCost = $db->prepare("SELECT id, item_name as item, qty, unit_price, notes FROM tender_costs WHERE tender_id = ?");
    $stmtCost->execute([$t['id']]);
    $costs = $stmtCost->fetchAll();

    foreach ($costs as &$c) {
        $c['qty'] = (float) $c['qty'];
        $c['unit_price'] = (float) $c['unit_price'];
    }

    $t['costs'] = $costs;

    // Fetch Files
    $stmtFiles = $db->prepare("SELECT file_name FROM tender_files WHERE tender_id = ?");
    $stmtFiles->execute([$t['id']]);
    $files = $stmtFiles->fetchAll(PDO::FETCH_COLUMN); // Array of file names

    $t['files'] = $files;

    $tenders[] = $t;
}

// 4. Fetch Logs (Last 50)
$logs = $db->query("
    SELECT l.id, u.full_name as user_name, l.action, l.description, l.created_at as timestamp 
    FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.id DESC LIMIT 50
")->fetchAll();

jsonResponse([
    'success' => true,
    'data' => [
        'users' => $users,
        'settings' => $settings,
        'tenders' => $tenders,
        'logs' => $logs
    ]
]);
