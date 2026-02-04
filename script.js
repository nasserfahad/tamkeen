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

    function setButtonLoading(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('is-loading');
        } else {
            btn.disabled = false;
            btn.classList.remove('is-loading');
        }
    }

    function ensureToastContainer() {
        let el = document.getElementById('toast-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast-container';
            el.className = 'toast-container';
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        return el;
    }

    function showToast(message, type) {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast--${type || 'info'}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        const hide = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 250);
        };

        setTimeout(hide, 3600);
        toast.addEventListener('click', hide);
    }

    // ───────────────────────
    // Submit form
    // ───────────────────────
    async function submitForm(form, endpoint) {
        const btn = form.querySelector('button[type="submit"]');

        const status = form.querySelector('.form-status');
        if (status) status.textContent = '';
        setButtonLoading(btn, true);

        try {
            const fd = new FormData(form);
            const res = await fetch(endpoint, { method: 'POST', body: fd });
            const json = await res.json().catch(() => ({ success: false }));

            if (!res.ok || !json.success) throw new Error(json.message || `فشل الإرسال`);

            showToast(json.message || 'تم الإرسال بنجاح.', 'success');
            form.reset();
        } catch (err) {
            showToast(err.message || 'تعذر إرسال الطلب.', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    }

    // ───────────────────────
    // Mobile Menu (NEW)
    // ───────────────────────
    const toggleBtn = document.querySelector('.menu-toggle');
    const nav = document.getElementById('mainNav');

    window.closeMobileMenu = function () {
        if (!nav) return;
        nav.classList.remove('is-open');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    };

    function toggleMobileMenu() {
        if (!nav) return;
        const isOpen = nav.classList.toggle('is-open');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(isOpen));
    }

    if (toggleBtn && nav) {
        toggleBtn.addEventListener('click', toggleMobileMenu);

        // إغلاق عند الضغط خارج القائمة
        document.addEventListener('click', (e) => {
            const inside = nav.contains(e.target) || toggleBtn.contains(e.target);
            if (!inside) window.closeMobileMenu();
        });

        // إغلاق عند الرجوع لشاشة كبيرة
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) window.closeMobileMenu();
        });
    }

    // ───────────────────────
    // UI Functions (from script 2)
    // ───────────────────────
    window.showPage = function (pageId) {
        document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
        const target = document.getElementById(pageId);
        if (target) target.classList.add("active");

        document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));

        const match = document.querySelector(`.nav-link[onclick*="${pageId}"]`);
        if (match) match.classList.add("active");

        // NEW: اقفل القائمة بعد اختيار صفحة على الجوال
        if (window.innerWidth <= 768) window.closeMobileMenu();

        window.scrollTo(0, 0);
    };

    // Hide/Show header on scroll (Mobile only)
    let lastScrollY = window.pageYOffset;
    const header = document.querySelector(".header");
    const threshold = 80; // متى يبدأ الإخفاء

    function isMobile() {
        return window.matchMedia("(max-width: 768px)").matches;
    }

    window.addEventListener("scroll", () => {
        if (!isMobile()) {
            // على الديسكتوب: الهيدر دائمًا ظاهر
            header.classList.remove("hide");
            return;
        }

        const currentY = window.pageYOffset;

        // إذا المستخدم ينزل
        if (currentY > lastScrollY && currentY > threshold) {
            header.classList.add("hide");
        }
        // إذا المستخدم يطلع
        else if (currentY < lastScrollY) {
            header.classList.remove("hide");
        }

        lastScrollY = currentY;
    });

    // إذا تغيّر حجم الشاشة من جوال ↔ ديسكتوب
    window.addEventListener("resize", () => {
        if (!isMobile()) {
            // نضمن أن الهيدر يظهر دائمًا في الديسكتوب
            header.classList.remove("hide");
        }
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
        const videoCarousel = document.getElementById('videoCarousel');
<<<<<<< HEAD
        const params = new URLSearchParams(window.location.search);
        const hash = (window.location.hash || '').replace('#', '');
        const requestedPage = hash || params.get('page');

        // افتح الصفحة الصحيحة عند الدخول برابط مباشر (مثل #services)
        if (requestedPage && document.getElementById(requestedPage)) {
            showPage(requestedPage);
        }
=======
>>>>>>> bb24d7f232c320c9c985df08d6ddb1525704f6d0

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

        // Pause any playing video when sliding to another item
        if (videoCarousel) {
            videoCarousel.addEventListener('slide.bs.carousel', () => {
                videoCarousel.querySelectorAll('video').forEach((vid) => {
                    if (!vid.paused) vid.pause();
                    vid.currentTime = 0;
                });
            });
        }

    });

})();
