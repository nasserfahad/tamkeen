<?php
// config.php
// Central configuration loader. Protects sensitive values and prevents direct web access.
// SECURITY NOTES:
// 1. If possible move this file outside the public web root and adjust require path.
// 2. Never echo secrets; only expose non-sensitive values.
// 3. Prefer environment variables (.env not committed) over hardcoding.
// 4. Guard against direct access: if requested directly, return 403.

declare(strict_types=1);

if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    http_response_code(403);
    exit('Forbidden');
}

// Allowed origins for CORS (edit for production). Use explicit domains; avoid '*'.
$allowedOrigins = [
    'https://tamkeen-edu.sa',
    'https://www.tamkeen-edu.sa',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:5500',
];




return [
    'smtp_host' => getenv('SMTP_HOST') ?: 'ojoor.sa', // mail.example.sa SMTP host
    'smtp_port' => (int) (getenv('SMTP_PORT') ?: 587), // 587 SMTP port
    'smtp_user' => getenv('SMTP_USER') ?: 'info@tamkeen-edu.sa',
    'smtp_pass' => getenv('SMTP_PASS') ?: 'Tamkeen@1',
    'smtp_secure' => getenv('SMTP_SECURE') ?: 'tls',
    'from_email' => getenv('FROM_EMAIL') ?: 'no-reply@tamkeen-edu.sa',
    'from_name' => getenv('FROM_NAME') ?: 'Tamkeen',
    'admin_email' => getenv('ADMIN_EMAIL') ?: 'info@tamkeen-edu.sa',
    'brand_name' => getenv('BRAND_NAME') ?: 'Tamkeen',
    'brand_color' => getenv('BRAND_COLOR') ?: '#253676',
    'brand_logo' => getenv('BRAND_LOGO') ?: 'https://i.ibb.co/9k9dJ9Kx/Screenshot-2025-08-20-at-21-43-10.png',
    'allowed_origins' => $allowedOrigins,
];