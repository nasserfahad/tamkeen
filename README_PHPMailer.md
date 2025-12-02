# Company Profile Forms – Backend + Frontend (PHP + PHPMailer)

This setup provides a minimal company profile landing with two forms and full validation:

- Student Form: `father_name`, `relationship`, `phone_number`, `type_disability`, `email`, `nationality`
- Employment Form: `full_name`, `email`, `cv_file` (PDF/DOC/DOCX, max 5MB)

## Directory Structure

```
Tamken_Website/
├─ index.html                  # Sample page with both forms
├─ script.js                   # Client-side validation + fetch submission
├─ student.php                 # Student form backend handler
├─ employment.php              # Employment form backend handler (with uploads)
├─ email_template_user.html    # HTML template for confirmation emails
├─ email_template_admin.html   # HTML template for admin notifications
├─ uploads/                    # CV uploads (writeable)
└─ vendor/                     # Composer dependencies (PHPMailer)
```

## Requirements

- PHP 8.1+
- Composer (to install PHPMailer)
- SMTP credentials (host, port, username, password, security: tls/ssl)
- Protected `config.php` (do **not** commit real passwords)

## Install Dependencies

Run in project directory:

```bash
composer require phpmailer/phpmailer
```

This creates `vendor/` and an autoloader used by `student.php` and `employment.php`.

## Configure SMTP (environment variables)

Preferred: set environment variables (export in shell or via hosting panel). Avoid hardcoding secrets.

```bash
export SMTP_HOST="smtp.yourhost.com"
export SMTP_PORT=587
export SMTP_USER="no-reply@yourdomain.com"
export SMTP_PASS="your-strong-password"
export SMTP_SECURE="tls"           # or ssl
export FROM_EMAIL="no-reply@yourdomain.com"
export FROM_NAME="Your Brand"
export ADMIN_EMAIL="admin@yourdomain.com"
export BRAND_NAME="Your Brand"
export BRAND_COLOR="#253676"
export BRAND_LOGO="https://yourdomain.com/logo.png"
```

On shared hosting (A2 Hosting etc.), if env vars are not available, create a non-committed `.env` outside web root and load it. **Never** commit `.env`. You can also move `config.php` outside public root:

Example structure:

```
project_root/
	secure-config/config.php   # real config (protected)
	public/
		student.php
		employment.php
		v1.html
```

Then in handler: `require __DIR__ . '/../secure-config/config.php';`

## Run Locally

```bash
php -S 127.0.0.1:8000
```

Then open http://127.0.0.1:8000/index.html

Forms submit to `student.php` and `employment.php` in the same folder.

## Security Notes

- Inputs sanitized (`strip_tags`, remove control chars) then escaped in email HTML.
- File uploads validated by extension **and** MIME (`finfo`) plus max size (5MB).
- Filenames sanitized to safe chars and timestamped; stored under `uploads/` (recommend separate purge policy).
- CORS now restricted by `allowed_origins` list in `config.php`; remove wildcard in production.
- `config.php` blocks direct access (403) and never prints secrets; place outside web root for extra protection.
- Avoid logging raw SMTP password or full stack traces to user responses.

## Optional Database Integration (examples in comments)

Both handlers contain commented `PDO` snippets showing how to insert rows into `student_applications` and `employment_applications` tables.

## Editing Email Templates

- Templates use placeholders like `{{brand_name}}`, `{{brand_color}}`, `{{brand_logo_url}}`, `{{subject}}`, `{{intro}}`, `{{details}}`, `{{footer_note}}`, `{{year}}`.
- Update brand styles by environment variables or by editing replacements in the PHP files.

## Client-side Validation

- `script.js` validates required fields, email format, phone pattern (`05XXXXXXXX`), safe text, and CV file type/size before submission.
- Errors are shown inline under each field; submit is prevented until valid.

## Deployment Notes (A2 Hosting / shared hosting)

- Upload application (or only `public/` if restructured) plus `vendor/`.
- Ensure `uploads/` exists and is writable (775). Add an `.htaccess` to block script execution:
  ```
  <FilesMatch "\.(php|phtml|phps)$">
  	Deny from all
  </FilesMatch>
  Options -Indexes
  ```
- Prefer environment variables; if not available, require a config file outside web root.
- Back up `config.php` with permission 600 when feasible; rotate SMTP password periodically.
