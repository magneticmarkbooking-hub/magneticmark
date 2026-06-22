/* ===========================================================
   MAGNETICMARK – Landing Page Wydania (release.js)
   =========================================================== */

(function renderRelease() {
  document.getElementById('eyebrowText').textContent = RELEASE.eyebrow;
  document.getElementById('titleText').textContent = RELEASE.title;
  document.getElementById('coverImg').src = RELEASE.cover;
  document.getElementById('coverImg').alt = RELEASE.title + ' - cover';
  document.title = RELEASE.title + ' | MagneticMark';

  const spotifyBtn = document.getElementById('spotifyBtn');
  spotifyBtn.dataset.link = RELEASE.linkUrl;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', RELEASE.description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', RELEASE.title + ' | MagneticMark');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', RELEASE.description);
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute('content', RELEASE.coverRaw || RELEASE.cover);
})();

// Klik na przycisk: odpalamy nasze Meta Piksele (główny 27127010080316320
// i Tonden/fanlink 8169582049794791 - oba zainicjowane w <head>) z eventem
// ViewContent, JEDNYM wywołaniem fbq (bez podania ID, fbq wysyła event do
// wszystkich zainicjowanych Pixeli na raz). Potem przechodzimy WPROST na
// link docelowy (np. Spotify) - bez przystanku na fanlink.tv. Oba Piksele
// łapią dane (IP, User Agent, fbp, fbc) bezpośrednio tutaj, na tej stronie.
//
// Parametry zdarzenia (content_type/content_name/content_category) są
// ustawione tak, żeby jak najbardziej odpowiadały temu, co wcześniej
// wysyłał Tonden/fanlink dla tego samego kliknięcia:
//   content_type: "product"  (Tonden też używał "product")
//   content_name: nazwa platformy, np. "spotify" (Tonden: content_name=spotify)
//   content_category: "stream"  (Tonden też używał "stream")
//
// Dodatkowo wysyłamy jako custom_data parametry kampanii (utm_*, fbclid,
// gclid) i lekki session_id - przydatne gdybyś kiedyś chciał rozbić raporty
// w Meta po konkretnej kampanii/źródle ruchu, nie tylko po samym kliknięciu.
//
// CZEGO NIE wysyłamy i czemu:
// - event_time, page URL, referrer - Pixel zbiera to sam automatycznie przy
//   każdym evencie, ręczne dorzucanie tego przez fbq() nic by nie zmieniło
//   (to nie są parametry, które standardowy klientowy Pixel akceptuje).
// - user_id - ta strona nie ma logowania, nie ma czego wysłać; dodanie pola
//   "na zapas" tylko zaśmieciłoby dane fałszywymi/pustymi wartościami.
//
// Dla bezpieczeństwa dodajemy unikalny eventID - gdybyś kiedyś wrócił do
// wysyłania ruchu przez fanlink.tv i tam też skonfigurował ten sam eventID
// dla ViewContent, Meta automatycznie wykryje duplikat i zliczy zdarzenie
// tylko raz (deduplikacja po stronie Meta).
//
// WAŻNE dla jakości dopasowania zdarzeń (Event Match Quality): jeśli ktoś
// trafia tutaj z reklamy Meta, w URL tej strony jest parametr "fbclid" -
// to on pozwala Facebookowi dopasować kliknięcie do konkretnej osoby.
// Doklejamy go (i ewentualne parametry utm_*) do linku docelowego - nie
// szkodzi nawet jeśli link prowadzi na Spotify, a daje elastyczność, gdyby
// kiedyś docelowa strona też miała własny tracking.
function buildForwardedUrl(baseUrl) {
  const incoming = new URLSearchParams(window.location.search);
  const keysToForward = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const forwarded = new URLSearchParams();
  keysToForward.forEach((key) => {
    if (incoming.has(key)) forwarded.set(key, incoming.get(key));
  });
  const query = forwarded.toString();
  if (!query) return baseUrl;
  return baseUrl + (baseUrl.includes('?') ? '&' : '?') + query;
}

// Zbiera parametry kampanii z URL tej strony, do wysłania jako custom_data
// w evencie Pixela (osobno od buildForwardedUrl, które robi to samo dla
// linku wyjściowego - tu zostają jako dane analityczne w samym evencie).
function getCampaignParams() {
  const incoming = new URLSearchParams(window.location.search);
  const keys = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const params = {};
  keys.forEach((key) => {
    if (incoming.has(key)) params[key] = incoming.get(key);
  });
  return params;
}

// Lekki identyfikator sesji - losowy, trzymany w sessionStorage (czyli żyje
// tylko do zamknięcia karty/przeglądarki). Nie jest to "session_id" w sensie
// systemu logowania - to tylko sposób na odróżnienie "ta sama osoba kliknęła
// dwa razy w tej samej wizycie" od dwóch różnych wizyt, gdyby kiedyś to było
// przydatne w analizie.
function getSessionId() {
  const key = 'mm_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

function handleLinkClick(e) {
  e.preventDefault();
  const el = e.currentTarget;
  const url = buildForwardedUrl(el.dataset.link);

  if (typeof fbq !== 'undefined') {
    const eventId = 'release_' + RELEASE.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + Date.now();
    const eventData = Object.assign(
      {
        content_type: 'product',
        content_name: RELEASE.platform || 'spotify',
        content_category: 'stream'
      },
      getCampaignParams(),
      { session_id: getSessionId() }
    );
    fbq('track', 'ViewContent', eventData, { eventID: eventId });
  }

  // Mobile → otwórz aplikację Spotify; desktop → nowa karta + popup
  const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  if (isMobile) {
    // Konwertuj https://open.spotify.com/artist/ID → spotify:artist:ID
    const spotifyUri = url.split('?')[0]
      .replace('https://open.spotify.com/', 'spotify:')
      .replace(/\//g, ':');
    window.location.href = spotifyUri;
    // Fallback jeśli aplikacja nie zainstalowana
    setTimeout(function() {
      if (!document.hidden) window.location.href = url;
    }, 2000);
  } else {
    window.open(url, '_blank', 'noopener');
    clearTimeout(emailPopupTimer);
    setTimeout(showEmailPopup, 350);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('spotifyBtn').addEventListener('click', handleLinkClick);
});

// ===== PŁYWAJĄCE KULE ŚWIATŁA W TLE =====
function initBgOrbs() {
  const colors = ['rgba(123,47,255,0.5)', 'rgba(0,136,255,0.45)', 'rgba(255,215,0,0.3)'];
  const container = document.body;
  // Pozycje w narożnikach/bokach ekranu - centralny pas (gdzie jest karta)
  // zostaje wolny, żeby kuleczki nie nakładały się na tekst i przycisk.
  const zones = [
    { left: [2, 18],  top: [4, 26] },
    { left: [78, 96], top: [4, 26] },
    { left: [2, 16],  top: [62, 86] },
    { left: [80, 96], top: [60, 84] },
    { left: [4, 20],  top: [38, 52] }
  ];
  zones.forEach((zone, i) => {
    const orb = document.createElement('div');
    orb.className = 'bg-orb';
    const size = 70 + Math.random() * 150;
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb.style.left = (zone.left[0] + Math.random() * (zone.left[1] - zone.left[0])) + 'vw';
    orb.style.top = (zone.top[0] + Math.random() * (zone.top[1] - zone.top[0])) + 'vh';
    orb.style.background = colors[i % colors.length];
    orb.style.animationDuration = (9 + Math.random() * 8) + 's';
    orb.style.animationDelay = (Math.random() * -10) + 's';
    container.appendChild(orb);
  });
}

// ===== PARALLAX GLOW - delikatna reakcja na ruch myszy (tylko desktop fine pointer) =====
function initParallaxGlow() {
  const glow = document.querySelector('.ambient-glow');
  if (!glow) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.addEventListener('mousemove', (e) => {
    const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
    const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;
    const moveX = xPercent * 30;
    const moveY = yPercent * 30;
    glow.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  });
}

// ===== CARD TILT - delikatny 3D tilt na cover, tylko desktop =====
function initCoverTilt() {
  const frame = document.querySelector('.cover-frame');
  const wrap = document.querySelector('.cover-wrap');
  if (!frame || !wrap) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  wrap.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    frame.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  });
  wrap.addEventListener('mouseleave', () => {
    frame.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initBgOrbs();
    initParallaxGlow();
    initCoverTilt();
  });
} else {
  initBgOrbs();
  initParallaxGlow();
  initCoverTilt();
}

// ===== CUSTOM CURSOR - identyczny mechanizm jak na magneticmarkdj.com =====
function initCustomCursor() {
  const canvas = document.getElementById('cursorTrailCanvas');
  const core = document.getElementById('customCursorCore');
  if (!canvas || !core) return;

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const TIP_OFFSET_X = 4;
  const TIP_OFFSET_Y = 2;

  let mouseX = -100, mouseY = -100;
  let lastX = -100, lastY = -100;
  let points = [];
  let cursorVisible = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    core.style.left = mouseX + 'px';
    core.style.top = mouseY + 'px';

    if (!cursorVisible) {
      core.style.display = 'block';
      cursorVisible = true;
      document.body.classList.add('has-custom-cursor');
    }

    const tipX = mouseX + TIP_OFFSET_X;
    const tipY = mouseY + TIP_OFFSET_Y;

    const dist = Math.hypot(tipX - lastX, tipY - lastY);
    const steps = Math.min(Math.max(Math.floor(dist / 4), 1), 12);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push({
        x: lastX + (tipX - lastX) * t,
        y: lastY + (tipY - lastY) * t,
        life: 1
      });
    }
    if (points.length > 60) points.splice(0, points.length - 60);
    lastX = tipX;
    lastY = tipY;
  });

  function hideCursor() {
    core.style.display = 'none';
    cursorVisible = false;
    points = [];
  }
  function showCursor() {
    core.style.display = 'block';
    cursorVisible = true;
    document.body.classList.add('has-custom-cursor');
  }

  document.documentElement.addEventListener('mouseleave', hideCursor);
  document.documentElement.addEventListener('mouseenter', showCursor);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideCursor();
  });

  function drawTrail() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.life -= 0.05;
      if (p.life <= 0) continue;
      const radius = 4 * p.life + 1;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.2);
      grad.addColorStop(0, 'rgba(170,100,255,' + (p.life * 0.55) + ')');
      grad.addColorStop(1, 'rgba(123,47,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    points = points.filter(p => p.life > 0);
    requestAnimationFrame(drawTrail);
  }
  drawTrail();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCursor);
} else {
  initCustomCursor();
}

// ===== EMAIL POPUP =====
let emailPopupShown = false;
let emailPopupTimer = null;

function showEmailPopup() {
  if (emailPopupShown || localStorage.getItem('mm_popup_subscribed')) return;
  const popup = document.getElementById('emailPopup');
  if (!popup) return;
  popup.classList.add('open');
  emailPopupShown = true;
  setTimeout(() => { const inp = document.getElementById('popupEmail'); if (inp) inp.focus(); }, 150);
}

function closeEmailPopup() {
  const popup = document.getElementById('emailPopup');
  if (popup) popup.classList.remove('open');
  window.location.href = 'https://magneticmarkdj.com';
}

function submitEmailPopup() {
  const email = document.getElementById('popupEmail').value.trim();
  const msg   = document.getElementById('popupMsg');

  if (!email || !email.includes('@')) {
    msg.style.color = '#ff4466';
    msg.textContent = 'Enter a valid email address.';
    return;
  }

  msg.style.color = 'rgba(170,170,204,0.6)';
  msg.textContent = 'Saving...';

  const supaUrl = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : '';
  const supaKey = (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '';
  if (!supaUrl || !supaKey) { msg.style.color = '#ff4466'; msg.textContent = 'Configuration error.'; return; }

  fetch(supaUrl + '/rest/v1/email_signups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': supaKey, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ email: email })
  })
  .then(res => {
    if (res.status === 201 || res.status === 409) {
      msg.style.color = '#44ff88';
      msg.textContent = "\u2713 You're in! Thanks \uD83C\uDFBA";
      localStorage.setItem('mm_popup_subscribed', '1');
      if (typeof fbq !== 'undefined') fbq('track', 'Lead', { content_name: 'Email Signup', content_category: 'Newsletter' });
      setTimeout(() => { window.location.href = 'https://magneticmarkdj.com'; }, 1800);
    } else { throw new Error(); }
  })
  .catch(() => { msg.style.color = '#ff4466'; msg.textContent = 'Something went wrong. Please try again.'; });
}

// Trigger: 10 sekund na stronie
window.addEventListener('load', function() {
  if (localStorage.getItem('mm_popup_subscribed')) return;
  emailPopupTimer = setTimeout(showEmailPopup, 10000);
});

// Debug
window.resetPopup = function() {
  localStorage.removeItem('mm_popup_subscribed');
  emailPopupShown = false;
};
