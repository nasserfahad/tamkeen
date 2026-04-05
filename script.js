// # script.js — Main JavaScript for Tamken website
// # cahange the form action from https://formspree.io/f/mzdvnqwd to student.php / employment.php.
// # This script handles:
// # - Form validation for student and employment forms
// # - AJAX submission to our PHP endpoints
// # - Mobile menu toggle and responsive header behavior
// # - Image lightbox functionality

// Note: This script assumes you have the appropriate HTML structure and CSS classes as outlined in the README and HTML files.

// # Security and Performance Notes:
// 1. Always validate and sanitize inputs on the server side (see student.php and employment.php).
// 2. Use HTTPS in production to secure form submissions.
// 3. Consider adding CAPTCHA or rate limiting if you experience spam submissions.
// 4. For better performance, you can minify this script and serve it with proper caching headers.

// wish you luck programmer :)



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

    [[father, 'إسم ولي الأمر'], [rel, 'صلة القرابة'], [type, 'نوع الإعاقة'], [nat, 'الجنسية']].forEach(([inp, label]) => {
      const v = (inp.value || '').trim();
      clearError(inp);
      if (!v) {
        setError(inp, `حقل ${label} إجباري.`);
        ok = false;
      } else if (!isSafeText(v)) {
        setError(inp, 'النص يحتوي على محارف غير آمنة.');
        ok = false;
      }
    });

    if (phone) {
      clearError(phone);
      const pv = phone.value.trim();
      if (!pv) {
        setError(phone, 'حقل رقم الجوال إجباري.');
        ok = false;
      } else if (!/^05\d{8}$/.test(pv)) {
        setError(phone, 'رقم الجوال يجب أن يبدأ بـ 05 ويتبعه 8 أرقام.');
        ok = false;
      }
    }

    if (email) {
      clearError(email);
      const ev = email.value.trim();
      if (!ev) {
        setError(email, 'حقل البريد الإلكتروني إجباري.');
        ok = false;
      } else if (!isValidEmail(ev)) {
        setError(email, 'صيغة البريد الإلكتروني غير صحيحة.');
        ok = false;
      }
    }

    return ok;
  }

  function validateEmployment(form) {
    let ok = true;
    const name = form.querySelector('[name="full_name"]');
    const email = form.querySelector('[name="email"]');
    const file = form.querySelector('[name="cv_file"]');

    [[name, 'الإسم الكامل']].forEach(([inp, label]) => {
      const v = (inp.value || '').trim();
      clearError(inp);
      if (!v) {
        setError(inp, `حقل ${label} إجباري.`);
        ok = false;
      } else if (!isSafeText(v)) {
        setError(inp, 'النص يحتوي على محارف غير آمنة.');
        ok = false;
      }
    });

    clearError(email);
    const ev = (email.value || '').trim();
    if (!ev) {
      setError(email, 'حقل البريد الإلكتروني إجباري.');
      ok = false;
    } else if (!isValidEmail(ev)) {
      setError(email, 'صيغة البريد الإلكتروني غير صحيحة.');
      ok = false;
    }

    // ملاحظة: هذا التحقق يفترض أنك ما زلت تستخدم رفع ملف CV
    // إذا Formspree عندك لا يدعم رفع الملفات، قلّي وأحوّله إلى رابط CV بدل ملف.
    if (file) {
      clearError(file);
      const f = file.files[0];
      if (!f) {
        setError(file, 'يرجى إرفاق السيرة الذاتية.');
        ok = false;
      } else {
        const max = 5 * 1024 * 1024;
        const allowed = ['pdf', 'doc', 'docx'];
        const ext = f.name.split('.').pop().toLowerCase();

        if (!allowed.includes(ext)) {
          setError(file, 'نوع الملف غير مدعوم.');
          ok = false;
        }
        if (f.size > max) {
          setError(file, 'يتجاوز حجم الملف 5MB.');
          ok = false;
        }
      }
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
  // Submit form (Formspree version)
  // ───────────────────────
  async function submitForm(form, endpoint) {
    const btn = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    if (status) status.textContent = '';

    setButtonLoading(btn, true);

    try {
      const fd = new FormData(form);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: fd,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          (data && (data.error || data.message)) ||
          'تعذر إرسال الطلب. تأكد من إعدادات Formspree.';
        throw new Error(msg);
      }

      showToast('تم إرسال الطلب بنجاح.', 'success');
      form.reset();

      // إذا كان فورم التوظيف: رجّع اسم الملف الظاهر
      const fileNameEl = form.querySelector('.file-name');
      if (fileNameEl) fileNameEl.textContent = 'لم يتم تحديد أي ملف';
    } catch (err) {
      showToast(err.message || 'تعذر إرسال الطلب.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  // ───────────────────────
  // Mobile Menu
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
  // UI Functions
  // ───────────────────────
  window.showPage = function (pageId) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    const match = document.querySelector(`.nav-link[onclick*="${pageId}"]`);
    if (match) match.classList.add('active');

    if (window.innerWidth <= 768) window.closeMobileMenu();
    window.scrollTo(0, 0);
  };

  // Hide/Show header on scroll (Mobile only)
  let lastScrollY = window.pageYOffset;
  const header = document.querySelector('.header');
  const threshold = 80;

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  window.addEventListener('scroll', () => {
    if (!isMobile()) {
      header && header.classList.remove('hide');
      return;
    }
    const currentY = window.pageYOffset;
    if (currentY > lastScrollY && currentY > threshold) {
      header && header.classList.add('hide');
    } else if (currentY < lastScrollY) {
      header && header.classList.remove('hide');
    }
    lastScrollY = currentY;
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) header && header.classList.remove('hide');
  });

  // Switch student/employment forms
  window.showStudentForm = function () {
    const s = document.getElementById('student-form');
    const e = document.getElementById('employment-form');
    if (s) s.style.display = 'block';
    if (e) e.style.display = 'none';
  };

  window.showEmploymentForm = function () {
    const s = document.getElementById('student-form');
    const e = document.getElementById('employment-form');
    if (s) s.style.display = 'none';
    if (e) e.style.display = 'block';
  };

  // File preview
  const cvUpload = document.getElementById('cv-upload-emp');
  if (cvUpload) {
    cvUpload.addEventListener('change', (e) => {
      const fileName = e.target.files[0] ? e.target.files[0].name : 'لم يتم اختيار ملف';
      const label = e.target.parentElement.querySelector('.file-name');
      if (label) label.textContent = fileName;
    });
  }

  // ───────────────────────
  // Form listeners
  // ───────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const student = document.getElementById('studentForm');
    const employment = document.getElementById('employmentForm');
    const videoCarousel = document.getElementById('videoCarousel');

    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || '').replace('#', '');
    const requestedPage = hash || params.get('page');

    // افتح الصفحة الصحيحة عند الدخول برابط مباشر (مثل #services)
    if (requestedPage && document.getElementById(requestedPage)) {
      showPage(requestedPage);
    }

    if (student) {
      student.addEventListener('submit', function (e) {
        e.preventDefault();
        student.querySelectorAll('.field-error').forEach((n) => (n.textContent = ''));
        if (!validateStudent(student)) return;

        // ✅ Formspree (طلاب)
        submitForm(student, 'student.php');
      });
    }

    if (employment) {
      employment.addEventListener('submit', function (e) {
        e.preventDefault();
        employment.querySelectorAll('.field-error').forEach((n) => (n.textContent = ''));
        if (!validateEmployment(employment)) return;

        // ✅ Formspree (توظيف)
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

    const lightbox = document.getElementById('imageLightbox');
    const lightboxImg = lightbox ? lightbox.querySelector('.image-lightbox__img') : null;
    const closeBtn = lightbox ? lightbox.querySelector('.lightbox__close') : null;

    function openLightbox(src, alt) {
      if (!lightbox || !lightboxImg) return;
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.classList.add('show');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    }

    function closeLightbox() {
      if (!lightbox || !lightboxImg) return;
      lightbox.classList.remove('show');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.src = '';
      document.body.classList.remove('no-scroll');
    }

    if (closeBtn && lightbox) {
      closeBtn.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('show')) closeLightbox();
      });
    }

    document.querySelectorAll('.service-media-card img').forEach((img) => {
      img.addEventListener('click', () => openLightbox(img.src, img.alt));
    });
  });
})();
