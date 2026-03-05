<?php
// app/api/boq.php
require_once 'utils.php';
checkAuth();
$db = getDB();

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

if ($action === 'save_row') {
    // Saves a single BOQ item internally while editing
    $tender_id = $data['tender_id'] ?? null;
    $id = $data['id'] ?? null;
    if (!$tender_id)
        jsonResponse(['success' => false], 400);

    $qty = (float) ($data['qty'] ?? 1);
    $unit = (float) ($data['unit_price'] ?? 0);
    $total = $qty * $unit;

    if (isset($data['isNew']) && $data['isNew']) {
        // We use a specific temp ID flag or insert new
        $stmt = $db->prepare("INSERT INTO tender_costs (tender_id, item_name, qty, unit_price, total_price, notes) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$tender_id, $data['item'] ?? '', $qty, $unit, $total, $data['notes'] ?? '']);
        $newId = $db->lastInsertId();
        jsonResponse(['success' => true, 'id' => $newId]);
    } else if ($id) {
        $stmt = $db->prepare("UPDATE tender_costs SET item_name=?, qty=?, unit_price=?, total_price=?, notes=? WHERE id=? AND tender_id=?");
        $stmt->execute([$data['item'] ?? '', $qty, $unit, $total, $data['notes'] ?? '', $id, $tender_id]);
        jsonResponse(['success' => true]);
    }

} elseif ($action === 'delete_row') {
    $id = $data['id'] ?? null;
    $stmt = $db->prepare("DELETE FROM tender_costs WHERE id=?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);

} elseif ($action === 'save_grand') {
    // Updates the overall tender cost
    $tender_id = $data['tender_id'];
    $cost = $data['cost']; // Grand total

    // Recalculate profit if we know submitted price
    $stmt = $db->prepare("SELECT submitted_price FROM tenders WHERE id=?");
    $stmt->execute([$tender_id]);
    $tender = $stmt->fetch();

    $profit = null;
    if ($tender && $tender['submitted_price'] !== null) {
        $profit = (float) $tender['submitted_price'] - (float) $cost;
    }

    $u = $db->prepare("UPDATE tenders SET cost=?, profit=? WHERE id=?");
    $u->execute([$cost, $profit, $tender_id]);

    logActivity('تحديث BOQ', "تحديث قائمة الكميات وإجمالي التكلفة للمناقصة #$tender_id");
    jsonResponse(['success' => true]);

} elseif ($action === 'bulk_save') {
    $tender_id = $data['tender_id'];
    $costs = $data['costs'] ?? [];

    $db->beginTransaction();
    $stmtDel = $db->prepare("DELETE FROM tender_costs WHERE tender_id=?");
    $stmtDel->execute([$tender_id]);

    $stmtIns = $db->prepare("INSERT INTO tender_costs (tender_id, item_name, qty, unit_price, total_price, notes) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($costs as $c) {
        $qty = (float) ($c['qty'] ?? 1);
        $unit = (float) ($c['unit_price'] ?? 0);
        $stmtIns->execute([$tender_id, $c['item'] ?? '', $qty, $unit, $qty * $unit, $c['notes'] ?? '']);
    }
    $db->commit();
    jsonResponse(['success' => true]);
}
