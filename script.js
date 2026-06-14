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
hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  document.body.classList.toggle('menu-open', isOpen);
  // Animacja hamburgera
  hamburger.classList.toggle('active', isOpen);
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
    hamburger.classList.remove('active');
  });
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

// ===== FADE IN ON SCROLL =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.bio-grid, .section-title, .gallery-grid, .event-item, .track-card').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

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

      // Platform icons — only show if link exists
      const platforms = [];
      if (t.spotify) platforms.push(`
        <a href="${t.spotify}" target="_blank" rel="noopener" aria-label="Spotify" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        </a>`);
      if (t.youtube) platforms.push(`
        <a href="${t.youtube}" target="_blank" rel="noopener" aria-label="YouTube" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </a>`);
      if (t.beatport) platforms.push(`
        <a href="${t.beatport}" target="_blank" rel="noopener" aria-label="Beatport" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm-1.2 17.4H7.2V6.6h3.6c1.6 0 2.8.4 3.7 1.1.9.7 1.3 1.8 1.3 3.1 0 .9-.2 1.6-.6 2.2-.4.6-.9 1-1.6 1.3l2.8 3.1h-2.5l-2.5-2.9h-.6v2.9zm0-4.9h.5c.7 0 1.3-.2 1.7-.5.4-.3.6-.8.6-1.4 0-.6-.2-1.1-.6-1.4-.4-.3-.9-.5-1.7-.5h-.5v3.8z"/></svg>
        </a>`);

      return `
        <div class="track-card" onclick="window.open('${spotifyUrl}','_blank')" style="cursor:pointer" role="button" tabindex="0" aria-label="${t.title} on Spotify">
          <img src="${t.cover || 'images/covers/placeholder.jpg'}" alt="${t.title}" loading="lazy" decoding="async">
          <div class="track-info-overlay">
            <div class="track-title">${t.title}</div>
            <div class="track-date">${dateStr}</div>
          </div>
          <div class="track-overlay">
            <div class="track-platforms">${platforms.join('')}</div>
          </div>
        </div>
      `;
    }).join('');

    // Observe new cards for fade-in
    grid.querySelectorAll('.track-card').forEach(el => {
      el.classList.add('fade-in');
      observer.observe(el);
    });

  } catch (e) {
    console.warn('tracks.json not found');
  }
}

// ===== LOAD EVENTS =====
async function loadEvents() {
  try {
    const res = await fetch('events.json');
    const events = await res.json();
    const list = document.getElementById('eventsList');
    const empty = document.getElementById('eventsEmpty');
    if (!list) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = events.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
      list.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    const upcoming = sorted;

    const monthsPl = ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAŹ','LIS','GRU'];
    const monthsEn = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

    list.innerHTML = upcoming.map(e => {
      const d = new Date(e.date);
      const day = d.getDate();
      const mPl = monthsPl[d.getMonth()];
      const mEn = monthsEn[d.getMonth()];
      const year = d.getFullYear();
      const linkHtml = e.link
        ? `<a href="${e.link}" target="_blank" rel="noopener" class="event-link" data-pl="Dołącz" data-en="Join">Dołącz</a>`
        : '';
      const isPast = new Date(e.date) < today;
      return `
        <div class="event-item fade-in${isPast ? ' event-past' : ''}">
          <div class="event-date">
            <div class="event-day">${String(day).padStart(2,'0')}</div>
            <div class="event-month" data-pl="${mPl}" data-en="${mEn}">${currentLang==='pl'?mPl:mEn}</div>
            <div class="event-year">${year}</div>
          </div>
          <div class="event-info">
            <h3>${e.name}</h3>
            <div class="event-location">${e.location}</div>
            ${e.stage?`<div class="event-stage">${e.stage}</div>`:''}
          </div>
          ${linkHtml}
        </div>`;
    }).join('');

    list.querySelectorAll('.event-item').forEach(el => observer.observe(el));
    setLang(currentLang);

  } catch (e) {
    console.warn('events.json not found');
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
  loadTracks();
  loadEvents();
});

// ===== LAZY LOAD IMAGES =====
const imgObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const img = e.target;
      img.addEventListener('load', () => img.classList.add('loaded'));
      img.addEventListener('error', () => img.classList.add('loaded'));
      if (img.complete) img.classList.add('loaded');
      imgObserver.unobserve(img);
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('.gallery-item img').forEach(img => {
  imgObserver.observe(img);
});

// ===== LIGHTBOX =====
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

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop?.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// ===== GALLERY THUMBNAIL QUALITY =====
// Ładuj miniaturę (small) a przy kliknięciu pełne zdjęcie
document.querySelectorAll('.gallery-item').forEach(item => {
  const img = item.querySelector('img');
  if (!img) return;
  const fullSrc = img.src || img.getAttribute('src');
  // Dodaj wsrv.nl resize dla miniatur - 400px szerokości
  const src = img.getAttribute('src');
  if (src && src.startsWith('images/')) {
    // lokalne pliki - nie można resizować bez backendu
    // ale możemy ustawić sizes dla przeglądarki
    img.setAttribute('sizes', '(max-width: 600px) 50vw, 25vw');
  }
  // Przy kliknięciu lightbox pokaże pełne zdjęcie
  item.setAttribute('onclick', `openLightbox('${src}')`);
});

// ===== INTRO OVERLAY + AUDIO =====
function enterSite() {
  const overlay = document.getElementById('introOverlay');
  const audio = document.getElementById('bgAudio');
  const ctrl = document.getElementById('audioCtrl');

  document.body.classList.remove('locked');
  overlay.classList.add('hidden');

  if (audio) {
    audio.volume = 0;
    audio.play().then(() => {
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol = Math.min(vol + 0.02, 0.6);
        audio.volume = vol;
        document.getElementById('volumeSlider').value = Math.round(vol * 100);
        if (vol >= 0.6) clearInterval(fadeIn);
      }, 80);
      if (ctrl) ctrl.style.display = 'flex';
    }).catch(e => {
      console.log('Audio blocked:', e);
      if (ctrl) ctrl.style.display = 'flex';
    });
  }
}

// ===== AUDIO CONTROLS =====
let isMuted = false;
let lastVolume = 0.6;

function toggleMute() {
  const audio = document.getElementById('bgAudio');
  const iconSound = document.getElementById('iconSound');
  const iconMute = document.getElementById('iconMute');
  const slider = document.getElementById('volumeSlider');
  if (!audio) return;
  isMuted = !isMuted;
  audio.muted = isMuted;
  iconSound.style.display = isMuted ? 'none' : 'block';
  iconMute.style.display = isMuted ? 'block' : 'none';
  slider.value = isMuted ? 0 : Math.round(lastVolume * 100);
}

function setVolume(val) {
  const audio = document.getElementById('bgAudio');
  const iconSound = document.getElementById('iconSound');
  const iconMute = document.getElementById('iconMute');
  if (!audio) return;
  const v = val / 100;
  audio.volume = v;
  lastVolume = v > 0 ? v : lastVolume;
  isMuted = v === 0;
  audio.muted = isMuted;
  iconSound.style.display = isMuted ? 'none' : 'block';
  iconMute.style.display = isMuted ? 'block' : 'none';
}

// Init overlay
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('locked');

  // Też zamknij overlay klawiszem Enter/Space
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('introOverlay');
    if (!overlay.classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')) {
      enterSite();
    }
  });
});

// ===== ANIMOWANE LICZNIKI =====
function animateCounter(el, target, suffix, duration) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing - zwalnia pod koniec
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);

    // Formatuj liczbę
    let display;
    if (target >= 1000000) {
      display = (current / 1000000).toFixed(current >= target ? 0 : 1) + 'M';
    } else if (target >= 1000) {
      display = (current / 1000).toFixed(current >= target ? 0 : 0) + 'K';
    } else {
      display = current;
    }
    el.textContent = display + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = el.getAttribute('data-final');
    }
  }
  requestAnimationFrame(update);
}

// Obserwuj hero stats i uruchom gdy widoczne
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const nums = document.querySelectorAll('.stat-num[data-target]');
      nums.forEach(el => {
        const target = parseInt(el.getAttribute('data-target'));
        const suffix = el.getAttribute('data-suffix') || '';
        animateCounter(el, target, suffix, 2000);
      });
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);
