/* ===========================
   MAGNETICMARK – script.js
   =========================== */

// ===== LANGUAGE =====
let currentLang = localStorage.getItem('mm-lang') || 'pl';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('mm-lang', lang);
  const langToggle = document.getElementById('langToggle');
  if (langToggle) langToggle.textContent = lang === 'pl' ? 'EN' : 'PL';
  document.querySelectorAll('[data-pl]').forEach(el => {
    const val = el.getAttribute('data-' + lang);
    if (val) el.innerHTML = val;
  });
  document.documentElement.lang = lang;
}

const langToggleBtn = document.getElementById('langToggle');
if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    setLang(currentLang === 'pl' ? 'en' : 'pl');
  });
}

// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

function closeMenu() {
  if (!navLinks || !hamburger) return;
  navLinks.classList.remove('open');
  hamburger.setAttribute('aria-expanded', false);
  hamburger.querySelectorAll('span').forEach(s => {
    s.style.transform = '';
    s.style.opacity = '';
  });
  const scrollY = parseInt(document.body.style.top || '0') * -1;
  document.body.classList.remove('menu-open');
  document.body.style.top = '';
  if (scrollY) window.scrollTo(0, scrollY);
}

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const isOpen = !navLinks.classList.contains('open');
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add('menu-open');
      navLinks.classList.add('open');
      hamburger.setAttribute('aria-expanded', true);
      const spans = hamburger.querySelectorAll('span');
      if (spans.length >= 3) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      }
    } else {
      closeMenu();
    }
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => closeMenu());
  });
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      const offset = navbar ? navbar.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== FOOTER YEAR =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== FADE IN ON SCROLL =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.bio-grid, .section-title, .event-item, .track-card').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ===== ANIMOWANE LICZNIKI =====
let countersStarted = false;

function animateCounter(el, target, suffix, duration) {
  el.textContent = '0' + suffix;
  const finalText = el.getAttribute('data-final') || (target + suffix);

  setTimeout(() => {
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 0.7
        ? progress * 0.7
        : 0.49 + (1 - Math.pow(1 - (progress - 0.7) / 0.3, 2)) * 0.51;
      const current = Math.floor(eased * target);

      let display;
      if (target >= 1000000) {
        display = Math.floor(current / 1000000) + 'M';
      } else if (target >= 1000) {
        display = Math.floor(current / 1000) + 'K';
      } else {
        display = current;
      }
      el.textContent = display + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = finalText;
      }
    }
    requestAnimationFrame(update);
  }, 200);
}

function startCounters() {
  if (countersStarted) return;
  countersStarted = true;
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const suffix = el.getAttribute('data-suffix') || '';
    el.textContent = '0' + suffix;
  });
  setTimeout(() => {
    document.querySelectorAll('.stat-num[data-target]').forEach(el => {
      const target = parseInt(el.getAttribute('data-target'));
      const suffix = el.getAttribute('data-suffix') || '';
      animateCounter(el, target, suffix, 3800);
    });
  }, 300);
}

// ===== TRĄBKA POPUP =====
function animateTrumpet() {
  const trumpet = document.querySelector('.stat-num:not([data-target])');
  if (!trumpet) return;
  trumpet.style.display = 'inline-block';
  trumpet.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
  setTimeout(() => { trumpet.style.transform = 'scale(0.5) rotate(-20deg)'; }, 0);
  setTimeout(() => { trumpet.style.transform = 'scale(2) rotate(-10deg)'; }, 600);
  setTimeout(() => { trumpet.style.transform = 'scale(0.95) rotate(5deg)'; }, 1200);
  setTimeout(() => { trumpet.style.transform = 'scale(1) rotate(0deg)'; }, 1600);
}

// ===== PRELOAD IMAGES =====
function preloadAllImages() {
  const gallerySrcs = [
    'images/15.jpg','images/11.jpg','images/7.jpg','images/6.jpg',
    'images/13.jpg','images/14.jpg','images/5.jpg','images/12.jpg',
    'images/hero.png','images/bio.jpg','images/contact.jpg'
  ];
  gallerySrcs.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// ===== GALLERY BLUR & LIGHTBOX =====
function initGallery() {
  document.querySelectorAll('.gallery-item img').forEach(img => {
    if (img.dataset.galleryInit) return;
    img.dataset.galleryInit = '1';

    img.loading = 'eager';
    img.classList.add('img-loading');

    function onLoad() {
      img.classList.remove('img-loading');
      img.classList.add('img-loaded');
    }

    if (img.complete && img.naturalWidth > 0) {
      onLoad();
    } else {
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onLoad, { once: true });
    }
  });
}

let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(src) {
  lightboxImages = Array.from(document.querySelectorAll('.gallery-item img')).map(i => i.getAttribute('src'));
  lightboxIndex = lightboxImages.indexOf(src);
  if (lightboxIndex === -1) { lightboxImages = [src]; lightboxIndex = 0; }
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (img) img.src = src;
  if (lb) lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateLightboxCounter();
}

function updateLightboxCounter() {
  const counter = document.getElementById('lightboxCounter');
  if (counter) counter.textContent = lightboxImages.length > 1 ? `${lightboxIndex + 1} / ${lightboxImages.length}` : '';
}

function lightboxNav(dir) {
  if (!lightboxImages.length) return;
  lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
  const img = document.getElementById('lightboxImg');
  if (img) {
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.15s ease';
    setTimeout(() => {
      img.src = lightboxImages[lightboxIndex];
      img.style.opacity = '1';
      updateLightboxCounter();
    }, 150);
  }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
});

function setupGalleryClicks() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    const img = item.querySelector('img');
    if (!img) return;
    item.onclick = () => openLightbox(img.getAttribute('src'));
  });
}

// ===== CUSTOM CURSOR (KOMPLETNE ROZWIĄZANIE NA PC + MOBILNE) =====
function initCustomCursor() {
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 
                        ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0);

  const canvas = document.getElementById('cursorTrailCanvas');
  const core = document.getElementById('customCursorCore');

  if (isTouchDevice) {
    // Mobilne: Czyścimy elementy, usuwamy klasę blokującą i upewniamy się, że kursor systemowy jest widoczny
    if (canvas) canvas.remove();
    if (core) core.remove();
    document.body.classList.remove('has-custom-cursor');
    document.body.style.cursor = 'default';
    
    // Dynamicznie wstrzykujemy styl wymuszający widoczność kursora mobilnego na wszelki wypadek
    const style = document.createElement('style');
    style.innerHTML = '* { cursor: auto !important; }';
    document.head.appendChild(style);
    return;
  }

  // Komputery: Sprawdzamy czy elementy istnieją, jeśli nie, to przerywamy
  if (!canvas || !core) return;

  const ctx = canvas.getContext('2d');
  let mouse = { x: 0, y: 0, moved: false };
  let points = [];
  const maxPoints = 20;

  // Włączamy custom kursor na PC
  document.body.classList.add('has-custom-cursor');
  core.style.opacity = '1';
  canvas.style.opacity = '1';
  document.body.style.cursor = 'none';

  // Wymuszamy ukrycie domyślnego kursora systemowego w CSS tylko na PC
  const stylePC = document.createElement('style');
  stylePC.innerHTML = 'body.has-custom-cursor, body.has-custom-cursor * { cursor: none !important; }';
  document.head.appendChild(stylePC);

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.moved = true;

    core.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    points.push({ x: mouse.x, y: mouse.y, age: 0 });
  }, { passive: true });

  window.__hideCustomCursor = function() {
    core.style.opacity = '0';
    canvas.style.opacity = '0';
  };
  window.__showCustomCursor = function() {
    if (document.body.classList.contains('over-iframe')) return;
    core.style.opacity = '1';
    canvas.style.opacity = '1';
  };

  document.addEventListener('mouseleave', window.__hideCustomCursor);
  document.addEventListener('mouseenter', window.__showCustomCursor);
  window.addEventListener('blur', window.__hideCustomCursor);
  window.addEventListener('focus', window.__showCustomCursor);

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.age++;

      const maxAge = maxPoints;
      const opacity = 1 - (p.age / maxAge);

      if (p.age >= maxAge) {
        points.splice(i, 1);
        i--;
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * opacity, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(170, 100, 255, ${opacity * 0.4})`;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }
  animate();
}

function attachIframeCursorHandoff(iframe) {
  if (iframe.dataset.cursorHandoffInit) return;
  iframe.dataset.cursorHandoffInit = '1';

  iframe.addEventListener('mouseenter', function() {
    document.body.classList.add('over-iframe');
    if (typeof window.__hideCustomCursor === 'function') window.__hideCustomCursor();
  });
  iframe.addEventListener('mouseleave', function() {
    document.body.classList.remove('over-iframe');
    if (typeof window.__showCustomCursor === 'function') window.__showCustomCursor();
  });
}

function initIframeCursorHandoff() {
  document.querySelectorAll('iframe').forEach(attachIframeCursorHandoff);
}

// ===== ENTER SITE & AUDIO =====
window.enterSite = function() {
  const intro = document.getElementById('introOverlay');
  if (intro) {
    intro.style.opacity = '0';
    intro.style.transition = 'opacity 0.8s ease';
    setTimeout(() => intro.remove(), 800);
  }

  const audio = document.getElementById('bgAudio');
  if (audio) {
    audio.play().then(() => {
      audio.muted = false;
    }).catch(err => console.log("Audio play blocked:", err));
  }

  startCounters();
  animateTrumpet();
};

document.addEventListener('DOMContentLoaded', () => {
  preloadAllImages();
  initGallery();
  setupGalleryClicks();
  initCustomCursor();
  initIframeCursorHandoff();
});
