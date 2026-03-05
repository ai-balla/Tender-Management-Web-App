<?php
// app/api/auth.php
require_once 'utils.php';

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (!$username || !$password) {
        jsonResponse(['success' => false, 'message' => 'اسم المستخدم وكلمة المرور مطلوبان'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND status = 'active'");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['full_name'] = $user['full_name'];

        // Update last login
        $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

        logActivity('تسجيل دخول', 'تسجيل دخول ناجح للمستخدم: ' . $user['username']);

        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'full_name' => $user['full_name']
            ]
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'بيانات الدخول غير صحيحة أو الحساب معطل'], 401);
    }
} elseif ($action === 'logout') {
    logActivity('تسجيل خروج', 'تسجيل خروج المستخدم');
    session_destroy();
    jsonResponse(['success' => true]);
} elseif ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'role' => $_SESSION['role'],
                'full_name' => $_SESSION['full_name']
            ]
        ]);
    } else {
        jsonResponse(['success' => false], 401);
    }
} else {
    jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
}
