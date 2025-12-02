'use strict';

(function () {

    // ───────────────────────
    // Utility functions
    // ───────────────────────
    function getErrorEl(input) {
        let el = input.parentElement.querySelector('.field-error');
        if (!el) {
            el = document.createElement('div');
            el.className = 'field-error';
            el.style.color = '#d62828';
            el.style.fontSize = '13px';
            el.style.marginTop = '6px';
            input.parentElement.appendChild(el);
        }
        return el;
    }

    function clearError(input) {
        const el = input.parentElement.querySelector('.field-error');
        if (el) el.textContent = '';
        input.classList.remove('invalid');
    }

    function setError(input, message) {
        const el = getErrorEl(input);
        el.textContent = message || '';
        if (message) input.classList.add('invalid');
    }

    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
    }

    function isSafeText(val) {
        return !/[<>]/.test(val);
    }

    // ───────────────────────
    // Form validation
    // ───────────────────────
    function validateStudent(form) {
        let ok = true;

        const father = form.querySelector('[name="father_name"]');
        const rel = form.querySelector('[name="relationship"]');
        const phone = form.querySelector('[name="phone_number"]');
        const type = form.querySelector('[name="type_disability"]');
        const email = form.querySelector('[name="email"]');
        const nat = form.querySelector('[name="nationality"]');

        [[father, 'إسم ولي الأمر'], [rel, 'صلة القرابة'], [type, 'نوع الإعاقة'], [nat, 'الجنسية']]
            .forEach(([inp, label]) => {
                const v = (inp.value || '').trim();
                clearError(inp);
                if (!v) { setError(inp, `حقل ${label} إجباري.`); ok = false; }
                else if (!isSafeText(v)) { setError(inp, 'النص يحتوي على محارف غير آمنة.'); ok = false; }
            });

        if (phone) {
            clearError(phone);
            const pv = phone.value.trim();
            if (!pv) { setError(phone, 'حقل رقم الجوال إجباري.'); ok = false; }
            else if (!/^05\d{8}$/.test(pv)) { setError(phone, 'رقم الجوال يجب أن يبدأ بـ 05 ويتبعه 8 أرقام.'); ok = false; }
        }

        if (email) {
            clearError(email);
            const ev = email.value.trim();
            if (!ev) { setError(email, 'حقل البريد الإلكتروني إجباري.'); ok = false; }
            else if (!isValidEmail(ev)) { setError(email, 'صيغة البريد الإلكتروني غير صحيحة.'); ok = false; }
        }

        return ok;
    }

    function validateEmployment(form) {
        let ok = true;
        const name = form.querySelector('[name="full_name"]');
        const email = form.querySelector('[name="email"]');
        const file = form.querySelector('[name="cv_file"]');

        [[name, 'الإسم الكامل']].forEach(([inp, label]) => {
            const v = inp.value.trim();
            clearError(inp);
            if (!v) { setError(inp, `حقل ${label} إجباري.`); ok = false; }
            else if (!isSafeText(v)) { setError(inp, 'النص يحتوي على محارف غير آمنة.'); ok = false; }
        });

        clearError(email);
        const ev = email.value.trim();
        if (!ev) { setError(email, 'حقل البريد الإلكتروني إجباري.'); ok = false; }
        else if (!isValidEmail(ev)) { setError(email, 'صيغة البريد الإلكتروني غير صحيحة.'); ok = false; }

        clearError(file);
        const f = file.files[0];
        if (!f) { setError(file, 'يرجى إرفاق السيرة الذاتية.'); ok = false; }
        else {
            const max = 5 * 1024 * 1024;
            const allowed = ['pdf', 'doc', 'docx'];
            const ext = f.name.split('.').pop().toLowerCase();
            if (!allowed.includes(ext)) { setError(file, 'نوع الملف غير مدعوم.'); ok = false; }
            if (f.size > max) { setError(file, 'يتجاوز حجم الملف 5MB.'); ok = false; }
        }

        return ok;
    }

    // ───────────────────────
    // Submit form
    // ───────────────────────
    async function submitForm(form, endpoint) {
        const status = form.querySelector('.form-status');
        const btn = form.querySelector('button[type="submit"]');

        if (status) {
            status.textContent = 'جاري الإرسال...';
            status.style.color = '#0a7f6f';
        }
        if (btn) btn.disabled = true;

        try {
            const fd = new FormData(form);
            const res = await fetch(endpoint, { method: 'POST', body: fd });
            const json = await res.json().catch(() => ({ success: false }));

            if (!res.ok || !json.success) throw new Error(json.message || `فشل الإرسال`);

            if (status) status.textContent = json.message || 'تم الإرسال بنجاح.';
            form.reset();
        } catch (err) {
            if (status) {
                status.textContent = err.message || 'تعذر إرسال الطلب.';
                status.style.color = '#d62828';
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // ───────────────────────
    // UI Functions (from script 2)
    // ───────────────────────
    window.showPage = function (pageId) {
        document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
        document.getElementById(pageId).classList.add("active");

        document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));

        const match = document.querySelector(`.nav-link[onclick*="${pageId}"]`);
        if (match) match.classList.add("active");

        window.scrollTo(0, 0);
    };

    // Hide/Show header on scroll
    let lastScrollTop = 0;
    const header = document.querySelector(".header");

    window.addEventListener("scroll", () => {
        const sc = window.pageYOffset || document.documentElement.scrollTop;
        if (sc > lastScrollTop && sc > 80) header.classList.add("hide");
        else header.classList.remove("hide");
        lastScrollTop = sc <= 0 ? 0 : sc;
    });

    // Switch student/employment forms
    window.showStudentForm = function () {
        document.getElementById("student-form").style.display = "block";
        document.getElementById("employment-form").style.display = "none";
    };

    window.showEmploymentForm = function () {
        document.getElementById("student-form").style.display = "none";
        document.getElementById("employment-form").style.display = "block";
    };

    // File preview
    const cvUpload = document.getElementById("cv-upload-emp");
    if (cvUpload) {
        cvUpload.addEventListener("change", (e) => {
            const fileName = e.target.files[0] ? e.target.files[0].name : "لم يتم اختيار ملف";
            e.target.parentElement.querySelector(".file-name").textContent = fileName;
        });
    }

    // ───────────────────────
    // Form listeners
    // ───────────────────────
    document.addEventListener('DOMContentLoaded', () => {

        const student = document.getElementById('studentForm');
        const employment = document.getElementById('employmentForm');

        if (student) {
            student.addEventListener("submit", function (e) {
                e.preventDefault();
                student.querySelectorAll(".field-error").forEach((n) => (n.textContent = ""));
                if (!validateStudent(student)) return;
                submitForm(student, 'student.php');
            });
        }

        if (employment) {
            employment.addEventListener("submit", function (e) {
                e.preventDefault();
                employment.querySelectorAll(".field-error").forEach((n) => (n.textContent = ""));
                if (!validateEmployment(employment)) return;
                submitForm(employment, 'employment.php');
            });
        }

    });

})();