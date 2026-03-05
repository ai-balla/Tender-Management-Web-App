<?php
// app/api/users.php
require_once 'utils.php';
checkAuth();
$db = getDB();

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

if ($action === 'save') {
    // Only Admin/Manager can manage users (in a real app, enforce here)
    if ($_SESSION['role'] !== 'admin' && $_SESSION['role'] !== 'manager') {
        jsonResponse(['success' => false, 'message' => 'غير مصرح'], 403);
    }

    $id = $data['id'] ?? null;
    $username = $data['username'];
    $full_name = $data['full_name'];
    $email = $data['email'];
    $role = $data['role'];
    $status = $data['status'];
    $password = $data['password'] ?? '';

    if ($id) {
        // Update user
        if ($password) {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET username=?, full_name=?, email=?, role=?, status=?, password_hash=? WHERE id=?");
            $stmt->execute([$username, $full_name, $email, $role, $status, $hash, $id]);
        } else {
            $stmt = $db->prepare("UPDATE users SET username=?, full_name=?, email=?, role=?, status=? WHERE id=?");
            $stmt->execute([$username, $full_name, $email, $role, $status, $id]);
        }
        logActivity('تعديل مستخدم', "تعديل بيانات المستخدم: $full_name");
        jsonResponse(['success' => true, 'id' => $id]);

    } else {
        // Create user
        $hash = password_hash($password ?: 'password123', PASSWORD_DEFAULT);
        try {
            $stmt = $db->prepare("INSERT INTO users (username, password_hash, full_name, email, role, status) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$username, $hash, $full_name, $email, $role, $status]);
            $newId = $db->lastInsertId();
            logActivity('إضافة مستخدم', "إضافة مستخدم جديد: $full_name");
            jsonResponse(['success' => true, 'id' => $newId]);
        } catch (PDOException $e) {
            jsonResponse(['success' => false, 'message' => 'اسم المستخدم أو البريد الإلكتروني موجود مسبقاً'], 400);
        }
    }

} elseif ($action === 'toggle_status') {
    $id = $data['id'] ?? '';
    // Prevent locking out the main admin
    if ($id == 1)
        jsonResponse(['success' => false], 403);

    $stmt = $db->prepare("SELECT status FROM users WHERE id=?");
    $stmt->execute([$id]);
    $u = $stmt->fetch();

    $newStatus = $u['status'] === 'active' ? 'inactive' : 'active';
    $db->prepare("UPDATE users SET status=? WHERE id=?")->execute([$newStatus, $id]);

    logActivity('تغيير حالة حساب', "تغيير حالة المستخدم #$id إلى $newStatus");
    jsonResponse(['success' => true, 'status' => $newStatus]);

} elseif ($action === 'delete') {
    $id = $data['id'] ?? '';
    if ($id == 1)
        jsonResponse(['success' => false, 'message' => 'لا يمكن حذف المدير الرئيسي'], 403);
    if ($id == $_SESSION['user_id'])
        jsonResponse(['success' => false, 'message' => 'لا يمكنك حذف حسابك الخاص'], 403);

    $db->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
    logActivity('حذف مستخدم', "حذف المستخدم #$id");
    jsonResponse(['success' => true]);
}
