<?php
// app/api/files.php
require_once 'utils.php';
checkAuth();
$db = getDB();

$action = $_GET['action'] ?? '';

if ($action === 'upload') {
    // Expected to receive via POST with enctype="multipart/form-data" 
    // And a field `tender_id`
    $tender_id = $_POST['tender_id'] ?? '';

    if (!$tender_id || empty($_FILES['files']['name'][0])) {
        jsonResponse(['success' => false, 'message' => 'No tender selected or no files uploaded'], 400);
    }

    $uploadDir = BASE_PATH . '/uploads/tenders/' . $tender_id . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $uploadedCount = 0;
    $stmt = $db->prepare("INSERT INTO tender_files (tender_id, file_name, file_path, file_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)");

    $db->beginTransaction();
    try {
        for ($i = 0; $i < count($_FILES['files']['name']); $i++) {
            $name = basename($_FILES['files']['name'][$i]);
            $tmp = $_FILES['files']['tmp_name'][$i];
            $size = $_FILES['files']['size'][$i];
            $type = pathinfo($name, PATHINFO_EXTENSION);

            // Clean filename
            $safeName = preg_replace("/[^a-zA-Z0-9.\-_]/", "", $name);
            $safeName = time() . '_' . $safeName; // Prevent overrides

            $dest = $uploadDir . $safeName;

            if (move_uploaded_file($tmp, $dest)) {
                $db_path = 'uploads/tenders/' . $tender_id . '/' . $safeName;
                $stmt->execute([$tender_id, $name, $db_path, $type, $size, $_SESSION['user_id']]);
                $uploadedCount++;
            }
        }
        $db->commit();
        logActivity('رفع ملفات', "تم رفع $uploadedCount ملف للمناقصة #$tender_id");
        jsonResponse(['success' => true, 'count' => $uploadedCount]);

    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
