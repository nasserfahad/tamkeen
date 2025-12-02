<?php
// student.php — Student form handler (father_name, relationship, phone_number, type_disability, email, nationality)
// Requirements: PHPMailer via Composer. See README section below.

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ---------- Basic headers and CORS (adjust origin for production) ----------
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
    header('Access-Control-Allow-Origin: ' . $config['allowed_origins'][0]); // default first
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

// ---------- Load Composer autoload (PHPMailer) ----------
$autoload = __DIR__ . '/vendor/autoload.php';
if (!is_file($autoload)) {
    respond(['success' => false, 'message' => 'لم يتم إعداد PHPMailer. يرجى تثبيته عبر Composer.'], 500);
}
require_once $autoload;

// $config now provided by config.php; never expose smtp_pass.

// ---------- Helpers ----------
function clean_text(string $v): string
{
    // Security: strip tags to prevent HTML injection into emails
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

// ---------- Validate input ----------
// Accept both canonical and alternate names (to match existing v1.html if customized)
$map = [
    'father_name' => ['father_name', 'guardian_name', 'parentName'],
    'relationship' => ['relationship', 'relation'],
    'phone_number' => ['phone_number', 'phone'],
    'type_disability' => ['type_disability', 'disability_type', 'disability'],
    'email' => ['email'],
    'nationality' => ['nationality'],
];
$labels = [
    'father_name' => 'إسم ولي الأمر',
    'relationship' => 'صلة القرابة',
    'phone_number' => 'رقم الجوال',
    'type_disability' => 'نوع الإعاقة',
    'email' => 'البريد الإلكتروني',
    'nationality' => 'الجنسية',
];
$data = [];
foreach ($map as $canon => $aliases) {
    $raw = '';
    foreach ($aliases as $k) {
        if (isset($_POST[$k])) {
            $raw = (string) $_POST[$k];
            break;
        }
    }
    $val = clean_text($raw);
    if ($val === '') {
        respond(['success' => false, 'message' => "حقل {$labels[$canon]} إجباري."], 400);
    }
    $data[$canon] = $val;
}
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    respond(['success' => false, 'message' => 'صيغة بريد إلكتروني غير صالحة.'], 400);
}
// Basic KSA-like phone format 05XXXXXXXX (10 digits)
if (!preg_match('/^05\d{8}$/', $data['phone_number'])) {
    respond(['success' => false, 'message' => 'رقم الجوال يجب أن يبدأ بـ 05 ويتبعه 8 أرقام.'], 400);
}

// ---------- Build email details HTML ----------
$detailsHtml = '<ul style="list-style:square;line-height:1.8;">'
    . '<li><strong>إسم ولي الأمر:</strong> ' . htmlspecialchars($data['father_name'], ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><strong>صلة القرابة:</strong> ' . htmlspecialchars($data['relationship'], ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><strong>رقم الجوال:</strong> ' . htmlspecialchars($data['phone_number'], ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><strong>نوع الإعاقة:</strong> ' . htmlspecialchars($data['type_disability'], ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><strong>البريد الإلكتروني:</strong> ' . htmlspecialchars($data['email'], ENT_QUOTES, 'UTF-8') . '</li>'
    . '<li><strong>الجنسية:</strong> ' . htmlspecialchars($data['nationality'], ENT_QUOTES, 'UTF-8') . '</li>'
    . '</ul>';

$commonTplVars = [
    'brand_name' => $config['brand_name'],
    'brand_color' => $config['brand_color'],
    'brand_logo_url' => $config['brand_logo'],
    'year' => date('Y'),
];

$userSubject = 'تم استلام طلبكم - الطلاب';
$adminSubject = 'طلب انضمام طالب جديد';

$userHtml = load_template(__DIR__ . '/email_template_user.html', $commonTplVars + [
    'subject' => $userSubject,
    'intro' => 'نشكر لكم تواصلكم وسيتم التواصل معكم قريبًا.',
    'details' => $detailsHtml,
    'footer_note' => 'هذه رسالة آلية، لا ترد عليها.'
]);
$adminHtml = load_template(__DIR__ . '/email_template_admin.html', $commonTplVars + [
    'subject' => $adminSubject,
    'intro' => 'تم استلام طلب انضمام طالب عبر الموقع:',
    'details' => $detailsHtml,
]);

// ---------- Send emails via PHPMailer ----------
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
    $m1->addAddress($data['email']);
    $m1->isHTML(true);
    $m1->Subject = $userSubject;
    $m1->Body = $userHtml;
    $m1->AltBody = 'تم استلام طلبكم.';
    $m1->send();

    // عند الاطلاق يجب ازالة التأخير هذا فقط للاغراض الاختبار!!==============================
    sleep(11); // تأخير ثانية واحدة قبل إرسال إيميل الإدمن


    // Notification to admin
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
    $m2->AltBody = 'طلب انضمام طالب جديد.';
    $m2->send();

    // Optional: Example DB insert (commented)
    // $pdo = new PDO('mysql:host=HOST;dbname=DB;charset=utf8mb4','USER','PASS');
    // $stmt = $pdo->prepare('INSERT INTO student_applications (father_name, relationship, phone_number, type_disability, email, nationality, created_at) VALUES (?,?,?,?,?,?,NOW())');
    // $stmt->execute([$data['father_name'], $data['relationship'], $data['phone_number'], $data['type_disability'], $data['email'], $data['nationality']]);

    respond(['success' => true, 'message' => 'تم إرسال الطلب بنجاح.']);
} catch (Exception $e) {
    respond(['success' => false, 'message' => 'تعذر إرسال البريد. تحقق من إعدادات SMTP.'], 500);
}
