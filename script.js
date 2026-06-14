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
});

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      const offset = document.getElementById('navbar').offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== FOOTER YEAR =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== FADE IN ON SCROLL =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.bio-grid, .section-title, .gallery-grid').forEach(el => {
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

    grid.innerHTML = tracks.slice(0, 12).map(t => {
      const platforms = [];
      if (t.spotify) platforms.push(`<a href="${t.spotify}" target="_blank" rel="noopener" aria-label="Spotify"><svg viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg></a>`);
      if (t.youtube) platforms.push(`<a href="${t.youtube}" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>`);
      if (t.beatport) platforms.push(`<a href="${t.beatport}" target="_blank" rel="noopener" aria-label="Beatport"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8c.995 0 1.8.805 1.8 1.8S12.995 8.4 12 8.4s-1.8-.805-1.8-1.8S11.005 4.8 12 4.8zm4.8 13.2H7.2v-1.8l2.4-2.4V10.2H12v3.6l2.4 2.4v1.8z"/></svg></a>`);

      const dateStr = t.date ? new Date(t.date).toLocaleDateString('en', { month: 'short', year: 'numeric' }).toUpperCase() : '';

      return `
        <div class="track-card">
          <img src="${t.cover || 'images/covers/placeholder.jpg'}" alt="${t.title}" loading="lazy">
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
  } catch (e) {
    console.warn('tracks.json not found, skipping tracks section');
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

    const upcoming = events
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcoming.length === 0) {
      list.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }

    const months = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'];
    const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    list.innerHTML = upcoming.map(e => {
      const d = new Date(e.date);
      const day = d.getDate();
      const monthPl = months[d.getMonth()];
      const monthEn = monthsEn[d.getMonth()];
      const year = d.getFullYear();

      const linkHtml = e.link
        ? `<a href="${e.link}" target="_blank" rel="noopener" class="event-link" data-pl="Dołącz" data-en="Join">Dołącz</a>`
        : '';

      return `
        <div class="event-item">
          <div class="event-date">
            <div class="event-day">${String(day).padStart(2, '0')}</div>
            <div class="event-month" data-pl="${monthPl}" data-en="${monthEn}">${currentLang === 'pl' ? monthPl : monthEn}</div>
            <div class="event-year">${year}</div>
          </div>
          <div class="event-info">
            <h3>${e.name}</h3>
            <div class="event-location">${e.location}</div>
            ${e.stage ? `<div class="event-stage" style="font-size:12px;color:var(--accent);margin-top:4px;">${e.stage}</div>` : ''}
          </div>
          ${linkHtml}
        </div>
      `;
    }).join('');

    // Re-apply lang to newly created elements
    setLang(currentLang);

  } catch (e) {
    console.warn('events.json not found, skipping events section');
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
  loadTracks();
  loadEvents();
});
