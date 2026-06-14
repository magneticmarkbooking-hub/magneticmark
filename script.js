/* ===========================
   MAGNETICMARK – script.js
   =========================== */

// ===== LANGUAGE =====
let currentLang = localStorage.getItem('mm-lang') || 'pl';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('mm-lang', lang);
  document.getElementById('langToggle').textContent = lang === 'pl' ? 'EN' : 'PL';
  document.querySelectorAll('[data-pl]').forEach(el => {
    const val = el.getAttribute('data-' + lang);
    if (val) el.innerHTML = val;
  });
  document.documentElement.lang = lang;
}

document.getElementById('langToggle').addEventListener('click', () => {
  setLang(currentLang === 'pl' ? 'en' : 'pl');
});

// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

function closeMenu() {
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

hamburger.addEventListener('click', () => {
  const isOpen = !navLinks.classList.contains('open');
  if (isOpen) {
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('menu-open');
    navLinks.classList.add('open');
    hamburger.setAttribute('aria-expanded', true);
    const spans = hamburger.querySelectorAll('span');
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    closeMenu();
  }
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => closeMenu());
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      const offset = navbar.offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== FOOTER YEAR =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== FADE IN ON SCROLL (bez gallery-grid!) =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

// Celowo NIE dodajemy gallery-grid do observera - to powodowało reload zdjęć
document.querySelectorAll('.bio-grid, .section-title, .event-item, .track-card').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ===== ANIMOWANE LICZNIKI =====
// Uruchamiane TYLKO przez enterSite() - nie przez scroll
let countersStarted = false;

function animateCounter(el, target, suffix, duration) {
  // Ustaw 0 natychmiast przed startem animacji
  el.textContent = '0' + suffix;
  const finalText = el.getAttribute('data-final') || (target + suffix);

  // Małe opóźnienie żeby "0" było widoczne przez chwilę
  setTimeout(() => {
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Wolniejszy easing - liniowy na początku
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
  // Natychmiast ustaw 0 na wszystkich licznikach
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const suffix = el.getAttribute('data-suffix') || '';
    el.textContent = '0' + suffix;
  });
  // Potem zacznij animację z lekkim opóźnieniem
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
  // Wolniejsza sekwencja
  setTimeout(() => { trumpet.style.transform = 'scale(0.5) rotate(-20deg)'; }, 0);
  setTimeout(() => { trumpet.style.transform = 'scale(2) rotate(-10deg)'; }, 600);
  setTimeout(() => { trumpet.style.transform = 'scale(0.95) rotate(5deg)'; }, 1200);
  setTimeout(() => { trumpet.style.transform = 'scale(1) rotate(0deg)'; }, 1600);
}

// ===== GALLERY BLUR + CACHE FIX =====
function initGallery() {
  document.querySelectorAll('.gallery-item img').forEach(img => {
    if (img.dataset.galleryInit) return;
    img.dataset.galleryInit = '1';

    // Zmień loading na eager - przeglądarka nie wyrzuci z pamięci
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

  // Prefetch wszystkich zdjęć galerii do pamięci cache
  document.querySelectorAll('.gallery-item img').forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      const preload = new Image();
      preload.src = src;
    }
  });
}

// ===== GALLERY LIGHTBOX =====
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

function setupGalleryClicks() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    const img = item.querySelector('img');
    if (!img) return;
    item.onclick = () => openLightbox(img.getAttribute('src'));
  });
}

// ===== LOAD TRACKS =====
async function loadTracks() {
  try {
    const res = await fetch('tracks.json');
    const tracks = await res.json();
    const grid = document.getElementById('tracksGrid');
    if (!grid) return;

    grid.innerHTML = tracks.slice(0, 10).map(t => {
      const spotifyUrl = t.spotify || 'https://open.spotify.com/artist/7qnCu8Un2e3gvg1ELX3HNg';
      const dateStr = t.date ? new Date(t.date).toLocaleDateString('en', { month: 'short', year: 'numeric' }).toUpperCase() : '';

      const platforms = [];
      if (t.spotify) platforms.push(`<a href="${t.spotify}" target="_blank" rel="noopener" aria-label="Spotify" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg></a>`);
      if (t.youtube) platforms.push(`<a href="${t.youtube}" target="_blank" rel="noopener" aria-label="YouTube" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>`);
      if (t.beatport) platforms.push(`<a href="${t.beatport}" target="_blank" rel="noopener" aria-label="Beatport" onclick="event.stopPropagation()"><svg viewBox="550 415 220 200" fill="white"><path d="M715.4,539.8c0,28.1-22.5,50.8-51.1,50.8c-28.5,0-50.8-22.2-50.8-50.8c0-13.5,5.1-25.4,13.3-34.4l-34.5,34.4l-18.1-18l38.9-38.4c5.3-5.3,8-12.1,8-19.6v-48.1h25.5v48.1c0,14.8-5.3,27.3-15.5,37.5l-1.1,1.1c9-8.2,21.3-13.2,34.4-13.2C693.3,489.3,715.4,512.1,715.4,539.8z M692.3,539.8c0-15.1-12.6-27.3-28-27.3c-15.4,0-27.7,12.8-27.7,27.3c0,14.5,12.3,27.6,27.7,27.6C679.8,567.4,692.3,554.4,692.3,539.8z"/></svg></a>`);

      return `<div class="track-card" onclick="window.open('${spotifyUrl}','_blank')" style="cursor:pointer" role="button" tabindex="0" aria-label="${t.title} on Spotify">
          <img src="${t.cover || ''}" alt="${t.title}" loading="lazy" decoding="async">
          <div class="track-info-overlay"><div class="track-title">${t.title}</div><div class="track-date">${dateStr}</div></div>
          <div class="track-overlay"><div class="track-platforms">${platforms.join('')}</div></div>
        </div>`;
    }).join('');
  } catch (e) { console.warn('tracks.json not found'); }
}

// ===== LOAD EVENTS =====
async function loadEvents() {
  try {
    const res = await fetch('events.json');
    const events = await res.json();
    const list = document.getElementById('eventsList');
    const empty = document.getElementById('eventsEmpty');
    if (!list) return;

    const today = new Date(); today.setHours(0,0,0,0);
    const sorted = events.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!sorted.length) { list.style.display='none'; if(empty) empty.style.display='block'; return; }

    const mPl=['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAŹ','LIS','GRU'];
    const mEn=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

    list.innerHTML = sorted.map(e => {
      const d = new Date(e.date);
      const isPast = d < today;
      const linkHtml = e.link ? `<a href="${e.link}" target="_blank" rel="noopener" class="event-link" data-pl="Dołącz" data-en="Join">Dołącz</a>` : '';
      return `<div class="event-item${isPast?' event-past':''}">
          <div class="event-date">
            <div class="event-day">${String(d.getDate()).padStart(2,'0')}</div>
            <div class="event-month" data-pl="${mPl[d.getMonth()]}" data-en="${mEn[d.getMonth()]}">${currentLang==='pl'?mPl[d.getMonth()]:mEn[d.getMonth()]}</div>
            <div class="event-year">${d.getFullYear()}</div>
          </div>
          <div class="event-info"><h3>${e.name}</h3><div class="event-location">${e.location}</div>${e.stage?`<div class="event-stage">${e.stage}</div>`:''}</div>
          ${linkHtml}
        </div>`;
    }).join('');
    setLang(currentLang);
  } catch(e) { console.warn('events.json not found'); }
}

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop?.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// ===== AUDIO CONTROLS =====
let isMuted = false;
let lastVolume = 0.6;

function toggleMute() {
  const audio = document.getElementById('bgAudio');
  if (!audio) return;
  isMuted = !isMuted;
  audio.muted = isMuted;
  document.getElementById('iconSound').style.display = isMuted ? 'none' : 'block';
  document.getElementById('iconMute').style.display = isMuted ? 'block' : 'none';
  const slider = document.getElementById('volumeSlider');
  if (slider) slider.value = isMuted ? 0 : Math.round(lastVolume * 100);
}

function setVolume(val) {
  const audio = document.getElementById('bgAudio');
  if (!audio) return;
  const v = val / 100;
  audio.volume = v;
  lastVolume = v > 0 ? v : lastVolume;
  isMuted = v === 0;
  audio.muted = isMuted;
  document.getElementById('iconSound').style.display = isMuted ? 'none' : 'block';
  document.getElementById('iconMute').style.display = isMuted ? 'block' : 'none';
}

// ===== INTRO OVERLAY + AUDIO =====
function enterSite() {
  const overlay = document.getElementById('introOverlay');
  const audio = document.getElementById('bgAudio');

  document.body.classList.remove('locked');
  overlay.classList.add('hidden');

  // Liczniki startują po wejściu
  setTimeout(startCounters, 500);
  // Trąbka popup
  setTimeout(animateTrumpet, 1200);

  if (audio) {
    audio.volume = 0;
    audio.play().then(() => {
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol = Math.min(vol + 0.02, 0.6);
        audio.volume = vol;
        const slider = document.getElementById('volumeSlider');
        if (slider) slider.value = Math.round(vol * 100);
        if (vol >= 0.6) clearInterval(fadeIn);
      }, 80);
    }).catch(e => console.log('Audio:', e));
  }
}


// ===== LOAD PRESS =====
async function loadPress() {
  try {
    const res = await fetch('press.json');
    const articles = await res.json();
    const grid = document.getElementById('pressGrid');
    if (!grid) return;

    grid.innerHTML = articles.map(a => {
      const date = new Date(a.date).toLocaleDateString(
        currentLang === 'pl' ? 'pl-PL' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
      const excerpt = currentLang === 'pl' ? a.excerpt_pl : a.excerpt_en;
      return `
        <article class="press-card">
          <div class="press-tag">${a.tag}</div>
          <div class="press-content">
            <p class="press-date">${date}</p>
            <h3 class="press-title">${a.title}</h3>
            <p class="press-excerpt">${excerpt}</p>
          </div>
          <a href="${a.url}" target="_blank" rel="noopener" class="press-link" data-pl="Czytaj artykuł" data-en="Read article">
            Czytaj artykuł
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </article>`;
    }).join('');
  } catch(e) { console.warn('press.json not found'); }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
  document.body.classList.add('locked');
  loadTracks();
  loadEvents();
  initGallery();
  setupGalleryClicks();
  loadPress();

  // Klawiatura na overlay
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('introOverlay');
    if (overlay && !overlay.classList.contains('hidden') &&
        (e.key === 'Enter' || e.key === ' ')) {
      enterSite();
    }
  });
});
