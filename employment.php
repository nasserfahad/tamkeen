<?php
// employment.php — Employment form handler (full_name, email, cv_file)
// Requirements: PHPMailer via Composer.

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json; charset=UTF-8');
// Load central config
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(['success' => false, 'message' => 'الملف config.php غير موجود.'], 500);
}
$config = require $configFile;

// Restrict CORS to allowed origins
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
if ($origin && in_array($origin, $config['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: ' . $config['allowed_origins'][0]);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$autoload = __DIR__ . '/vendor/autoload.php';
if (!is_file($autoload)) {
    respond(['success' => false, 'message' => 'لم يتم إعداد PHPMailer. يرجى تثبيته عبر Composer.'], 500);
}
require_once $autoload;

// $config now provided by config.php; never expose smtp_pass.

function clean_text(string $v): string
{
    $v = trim($v);
    $v = preg_replace('/[\x00-\x1F\x7F]/u', '', $v) ?? '';
    return strip_tags($v);
}

function load_template(string $file, array $vars): string
{
    $tpl = @file_get_contents($file) ?: '';
    foreach ($vars as $k => $v) {
        $tpl = str_replace('{{' . $k . '}}', $v, $tpl);
    }
    return $tpl;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(['success' => false, 'message' => 'طريقة الطلب غير مدعومة. استخدم POST.'], 405);
}

// Validate fields (accept alternate names: applicant_name, name)
$name = clean_text((string) ($_POST['full_name'] ?? $_POST['applicant_name'] ?? $_POST['name'] ?? ''));
$email = clean_text((string) ($_POST['email'] ?? ''));
if ($name === '')
    respond(['success' => false, 'message' => 'حقل الإسم إجباري.'], 400);
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL))
    respond(['success' => false, 'message' => 'صيغة البريد الإلكتروني غير صالحة.'], 400);

// Validate file
if (!isset($_FILES['cv_file'])) {
    respond(['success' => false, 'message' => 'يرجى إرفاق السيرة الذاتية.'], 400);
}
$file = $_FILES['cv_file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    respond(['success' => false, 'message' => 'حدث خطأ أثناء رفع الملف.'], 400);
}
$max = 5 * 1024 * 1024; // 5MB
if (($file['size'] ?? 0) > $max) {
    respond(['success' => false, 'message' => 'يتجاوز حجم الملف 5MB.'], 400);
}
$allowed = ['pdf' => 'application/pdf', 'doc' => 'application/msword', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
$ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
if (!isset($allowed[$ext])) {
    respond(['success' => false, 'message' => 'نوع الملف غير مدعوم. مسموح: PDF, DOC, DOCX'], 400);
}
// MIME verification using finfo
$finfo = new finfo(FILEINFO_MIME_TYPE);
$realMime = $finfo->file($file['tmp_name']);
if ($realMime !== $allowed[$ext]) {
    respond(['success' => false, 'message' => 'نوع الملف لا يتطابق مع الامتداد.'], 400);
}

// Store safely in uploads/
$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0775, true)) {
    respond(['success' => false, 'message' => 'تعذر إنشاء مجلد الرفع.'], 500);
}
if (!is_writable($uploadDir)) {
    respond(['success' => false, 'message' => 'مجلد الرفع غير قابل للكتابة.'], 500);
}
$base = preg_replace('/[^A-Za-z0-9._-]/u', '_', basename((string) $file['name']));
$storedName = time() . '_' . $base;
$destPath = $uploadDir . $storedName;
if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    respond(['success' => false, 'message' => 'تعذر حفظ الملف المرفوع.'], 500);
}

// Details for emails
$detailsHtml = '<ul style="list-style:square;line-height:1.8;">'
    . '<li><strong>الإسم:</strong> ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><strong>البريد الإلكتروني:</strong> ' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><strong>المرفق:</strong> ' . htmlspecialchars($storedName, ENT_QUOTES, 'UTF-8') . '</li>'
    . '</ul>';

$common = [
    'brand_name' => $config['brand_name'],
    'brand_color' => $config['brand_color'],
    'brand_logo_url' => $config['brand_logo'],
    'year' => date('Y'),
];
$userSubject = 'تم استلام طلبكم - التوظيف';
$adminSubject = 'طلب توظيف جديد';

$userHtml = load_template(__DIR__ . '/email_template_user.html', $common + [
    'subject' => $userSubject,
    'intro' => 'نشكر لكم تواصلكم وسيتم التواصل معكم قريبًا.',
    'details' => $detailsHtml,
    'footer_note' => 'هذه رسالة آلية، لا ترد عليها.'
]);
$adminHtml = load_template(__DIR__ . '/email_template_admin.html', $common + [
    'subject' => $adminSubject,
    'intro' => 'تم استلام طلب توظيف عبر الموقع:',
    'details' => $detailsHtml,
]);

try {
    // Confirmation to user
    $m1 = new PHPMailer(true);
    $m1->isSMTP();
    $m1->Host = $config['smtp_host'];
    $m1->Port = $config['smtp_port'];
    $m1->SMTPAuth = true;
    $m1->Username = $config['smtp_user'];
    $m1->Password = $config['smtp_pass'];
    $m1->SMTPSecure = $config['smtp_secure'];
    $m1->CharSet = 'UTF-8';
    $m1->setFrom($config['from_email'], $config['from_name']);
    $m1->addAddress($email);
    $m1->isHTML(true);
    $m1->Subject = $userSubject;
    $m1->Body = $userHtml;
    $m1->AltBody = 'تم استلام طلب التوظيف.';
    $m1->send();

    // عند الاطلاق يجب ازالة التأخير هذا فقط للاغراض الاختبار!!==============================
    sleep(11); // تأخير ثانية واحدة قبل إرسال إيميل الإدمن

    // Admin notification with attachment
    $m2 = new PHPMailer(true);
    $m2->isSMTP();
    $m2->Host = $config['smtp_host'];
    $m2->Port = $config['smtp_port'];
    $m2->SMTPAuth = true;
    $m2->Username = $config['smtp_user'];
    $m2->Password = $config['smtp_pass'];
    $m2->SMTPSecure = $config['smtp_secure'];
    $m2->CharSet = 'UTF-8';
    $m2->setFrom($config['from_email'], $config['from_name']);
    $m2->addAddress($config['admin_email']);
    $m2->isHTML(true);
    $m2->Subject = $adminSubject;
    $m2->Body = $adminHtml;
    $m2->AltBody = 'طلب توظيف جديد.';
    $m2->addAttachment($destPath, $storedName);
    $m2->send();

    // Optional DB insert (commented)
    // $pdo = new PDO('mysql:host=HOST;dbname=DB;charset=utf8mb4','USER','PASS');
    // $stmt = $pdo->prepare('INSERT INTO employment_applications (full_name, email, cv_path, created_at) VALUES (?,?,?,NOW())');
    // $stmt->execute([$name, $email, $storedName]);

    respond(['success' => true, 'message' => 'تم إرسال الطلب بنجاح.']);
} catch (Exception $e) {
    respond(['success' => false, 'message' => 'تعذر إرسال البريد. تحقق من إعدادات SMTP.'], 500);
}
