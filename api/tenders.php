<?php
// app/api/tenders.php
require_once 'utils.php';
checkAuth();
$db = getDB();

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

if ($action === 'save') {
    // Determine if it's Edit or Create based on presence of ID
    $id = $data['id'] ?? null;

    // Clean inputs
    $title = $data['title'];
    $reference = $data['reference'];
    $tender_number = $data['tender_number'] ?? '';
    $bcd = !empty($data['bcd']) ? $data['bcd'] : null;
    $duration = $data['duration'] ?? '';
    $procedure = $data['procedure_type'] ?? '';
    $category = $data['category'] ?? 'Other';
    $submitted_price = !empty($data['submitted_price']) ? $data['submitted_price'] : null;
    $cost = !empty($data['cost']) ? $data['cost'] : null;
    $eitmad = $data['eitmad_link'] ?? '';
    $remarks = $data['remarks'] ?? '';

    // Calculate defaults
    $profit = ($submitted_price && $cost) ? ($submitted_price - $cost) : null;
    $vat = $submitted_price ? ($submitted_price * 0.15) : null;

    if ($id) {
        $stmt = $db->prepare("UPDATE tenders SET title=?, reference=?, tender_number=?, bcd=?, duration=?, procedure_type=?, category=?, submitted_price=?, cost=?, profit=?, vat=?, eitmad_link=?, remarks=? WHERE id=?");
        $stmt->execute([$title, $reference, $tender_number, $bcd, $duration, $procedure, $category, $submitted_price, $cost, $profit, $vat, $eitmad, $remarks, $id]);
        logActivity('تعديل مناقصة', "تعديل مناقصة: $title");
        jsonResponse(['success' => true, 'id' => $id]);
    } else {
        $stmt = $db->prepare("INSERT INTO tenders (title, reference, tender_number, bcd, duration, procedure_type, category, status, submitted_price, cost, profit, vat, eitmad_link, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$title, $reference, $tender_number, $bcd, $duration, $procedure, $category, $submitted_price, $cost, $profit, $vat, $eitmad, $remarks]);
        $newId = $db->lastInsertId();
        logActivity('إضافة مناقصة', "إضافة مناقصة جديدة: $title");
        jsonResponse(['success' => true, 'id' => $newId]);
    }

} elseif ($action === 'change_status') {
    $id = $data['id'] ?? '';
    $status = $data['status'] ?? '';
    if (!$id || !$status)
        jsonResponse(['success' => false], 400);

    $stmt = $db->prepare("UPDATE tenders SET status=? WHERE id=?");
    $stmt->execute([$status, $id]);
    logActivity('تغيير حالة', "تغيير حالة المناقصة #$id إلى $status");
    jsonResponse(['success' => true]);

} elseif ($action === 'delete') {
    $id = $data['id'] ?? '';
    if (!$id)
        jsonResponse(['success' => false], 400);

    // Deleting the tender natively cascades to costs and files because of our ON DELETE CASCADE config
    $stmt = $db->prepare("DELETE FROM tenders WHERE id=?");
    $stmt->execute([$id]);
    logActivity('حذف مناقصة', "تم حذف المناقصة #$id");
    jsonResponse(['success' => true]);

} elseif ($action === 'import') {
    // Array of tenders
    $tenders = $data['tenders'] ?? [];
    $count = 0;

    $stmt = $db->prepare("INSERT INTO tenders (title, reference, tender_number, bcd, duration, procedure_type, category, status, submission_date, submitted_price, cost, profit, eitmad_link, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $db->beginTransaction();
    try {
        foreach ($tenders as $t) {
            $stmt->execute([
                $t['title'],
                $t['reference'],
                $t['tender_number'] ?? '',
                !empty($t['bcd']) ? $t['bcd'] : null,
                $t['duration'] ?? '',
                $t['procedure_type'] ?? '',
                $t['category'] ?? 'Other',
                $t['status'] ?? 'draft',
                !empty($t['submission_date']) ? $t['submission_date'] : null,
                !empty($t['submitted_price']) ? $t['submitted_price'] : null,
                !empty($t['cost']) ? $t['cost'] : null,
                !empty($t['profit']) ? $t['profit'] : null,
                $t['eitmad_link'] ?? '',
                $t['remarks'] ?? ''
            ]);
            $count++;
        }
        $db->commit();
        logActivity('استيراد مناقصات', "تم استيراد $count مناقصة عبر CSV");
        jsonResponse(['success' => true, 'count' => $count]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
