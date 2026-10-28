/* ===========================================================
   MAGNETICMARK – Landing Page Wydania (release.js)
   =========================================================== */

(function renderRelease() {
  document.getElementById('eyebrowText').textContent = RELEASE.eyebrow;
  document.getElementById('titleText').textContent = RELEASE.title;
  document.getElementById('coverImg').src = RELEASE.cover;
  document.getElementById('coverImg').alt = RELEASE.title + ' - cover';
  document.title = RELEASE.title + ' | MagneticMark';

  // Tytuł w popupie mailowym - brany z konfiguracji, nie z HTML-a, żeby
  // przy kopiowaniu folderu na nowe wydanie nie został stary tytuł.
  const popupTitle = document.getElementById('popupTitle');
  if (popupTitle) popupTitle.textContent = RELEASE.title;

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

/* ===========================================================
   WŁASNE IDENTYFIKATORY (odpowiednik link_id / owner z Toneden)
   - OWNER_ID: stałe, to samo na KAŻDYM wydaniu/stronie MagneticMark
   - LINK_ID: unikalne dla tego konkretnego wydania

   Dotychczasowe LINK_ID:
     3507254 – Teckno Lady
     3507300 – Rave For Me
     3507400 – Fish Bang
     3507500 – A Love That Save Me
   Kolejne wydania: +100 (następne wolne: 3507500).
   Ta sama wartość MUSI być też w index.html przy fbq('track','PageView').
   =========================================================== */
const OWNER_ID = 69827222;
const LINK_ID  = 3507500;

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

function getCampaignParams() {
  const incoming = new URLSearchParams(window.location.search);
  const keys = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const params = {};
  keys.forEach((key) => {
    if (incoming.has(key)) params[key] = incoming.get(key);
  });
  return params;
}

function getSessionId() {
  const key = 'mm_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ===== CONVERSIONS API (CAPI) =====
// Wysyła do obu Pixeli (27127010080316320 i 8169582049794791) przez Edge Function
const CAPI_ENDPOINT = 'https://igtyglcyithqpvgimgif.supabase.co/functions/v1/meta-capi';
const CAPI_PIXEL_IDS = ['27127010080316320', '8169582049794791'];

function getFbp() {
  const m = document.cookie.match(/_fbp=([^;]+)/);
  return m ? m[1] : '';
}

function getFbc() {
  const c = document.cookie.match(/_fbc=([^;]+)/);
  if (c) return c[1];
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (fbclid) return 'fb.1.' + Date.now() + '.' + fbclid;
  return '';
}

// ===== PERSISTENT ANON ID =====
function getAnonId() {
  if (window.__mm_anon_id) return window.__mm_anon_id;
  const KEY = 'mm_uid';
  const m = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=([^;]*)'));
  if (m) return (window.__mm_anon_id = decodeURIComponent(m[1]));
  const id = 'mm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  const exp = new Date(); exp.setFullYear(exp.getFullYear() + 1);
  document.cookie = KEY + '=' + encodeURIComponent(id) + '; expires=' + exp.toUTCString() + '; path=/; SameSite=Lax';
  return (window.__mm_anon_id = id);
}
// ===== END PERSISTENT ANON ID =====

function sendCAPI(eventName, eventId, extra) {
  try {
    fetch(CAPI_ENDPOINT, {
      method: 'POST',
      keepalive: true,   // zdarzenia apki wychodzą, gdy strona schodzi w tło
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        event_name:       eventName,
        event_id:         eventId,
        event_source_url: window.location.href,
        fbp:              getFbp(),
        fbc:              getFbc(),
        external_id:      getAnonId(),
        pixel_ids:        CAPI_PIXEL_IDS,
      }, extra || {})),
    }).catch(function() {});
  } catch(e) {}
}
// ===== END CAPI =====

// ===== Pomiar: czy otworzyła się aplikacja Spotify (tylko statystyki, Meta bez zmian) =====
// app_open: strona schowała się w tło bez przeładowania (aplikacja na wierzchu)
// app_none: przejście na wersję w przeglądarce (Android: browser_fallback_url) albo link
//           "Open in browser" (iPhone nie przechodzi sam do przeglądarki)
// app_unknown: w przeglądarce Instagrama/Facebooka nic się nie stało przez 30 s
//           (okienko "Otworzyć w Spotify?" i Anuluj)
// Pomiar tylko obserwuje: otwieranie aplikacji i powrót do przeglądarki działają bez niego.
// Do Meta (pixel + CAPI, do grup odbiorców i optymalizacji) idą tylko pewne przypadki:
//   SpotifyAppOpen   aplikacja się otworzyła
//   NoSpotifyApp     tylko Android: telefon sam przeszedł na wersję w przeglądarce, czyli
//                    nie ma apki (iPhone nie daje pewnego sygnału braku apki, więc nie)
//   QualifiedListen  30 s w aplikacji (Spotify liczy stream od 30 s). Większość nie wraca na
//                    stronę, więc liczy licznik od otwarcia apki: Android zwykle wysyła po 30 s
//                    w tle, iPhone usypia stronę i wysyła przy powrocie (bez powrotu przepada).
//                    Ten sam sygnał z tła zapisujemy u nas jako app_listen (seconds 30).
const QUALIFIED_LISTEN_SECONDS = 30;
const FREEZE_GAP_MS = 4000;                 // przerwa w liczniku = strona zamrożona w tle
const RAF_STALL_MS = 1500;                  // tyle bez rysowania = strona w tle
const NAVIGATION_GRACE_MS = 500;            // przeładowanie w tym czasie = brak apki
const VISIBILITY_CONFIRM_MS = 2000;         // krócej w tle = mignięcie okienka, nie apka
const NO_APP_WINDOW_MS = 5000;              // przeładowanie później = zamknięcie, nie brak apki
const FREEZE_WATCH_MS = 10 * 60 * 1000;     // bez wyjścia do apki w tym czasie przestajemy pilnować;
                                            // po wyjściu pilnujemy powrotu bez limitu (wraca nawet po dobie)
function sendMetaAppEvent(name, params) {
  const evId = name.toLowerCase() + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const data = Object.assign({ link_id: LINK_ID, owner: OWNER_ID }, params || {});
  if (typeof fbq !== 'undefined') fbq('trackCustom', name, data, { eventID: evId });
  sendCAPI(name, evId, data);
}
// app_return: powrót z aplikacji, seconds = czas w Spotify (odtworzenie liczy się od 30 s)
let mmAppTracking = false;
function trackAppOpen(mobileUrl) {
  if (mmAppTracking || typeof window.mmStat !== 'function') return;
  mmAppTracking = true;
  const stat = window.mmStat;
  const inApp = (typeof detectInAppBrowser === 'function') ? detectInAppBrowser() : null;
  const started = Date.now();
  // iPhone i Instagram pokazują okienko "Otworzyć w Spotify?", więc czekamy dłużej na decyzję
  const windowMs = (inApp || /iPhone|iPad|iPod/i.test(navigator.userAgent)) ? 30000 : 6000;
  let decided = null, hiddenAt = 0, navigated = false, returned = false;
  let listenSent = false, listenTimer = null;
  // signal: sygnał z tła (strona żyje 30 s po wyjściu, bez powrotu), zapisywany jako app_listen;
  // przy powrocie po 30 s+ wystarcza app_return z czasem
  function sendListen(secs, signal) {
    if (listenSent) return;
    listenSent = true;
    sendMetaAppEvent('QualifiedListen', { seconds: secs });
    if (signal) stat('app_listen', { seconds: secs, detail: signal }, true);
  }

  function decide(kind, extra) {
    if (decided && !(kind === 'open' && decided === 'unknown')) return false;
    decided = kind;
    stat('app_' + kind, extra || null, true);
    if (kind === 'open') {
      sendMetaAppEvent('SpotifyAppOpen');
      listenTimer = setTimeout(function() {    // dalej w Spotify po 30 s
        if (document.visibilityState === 'hidden') sendListen(QUALIFIED_LISTEN_SECONDS, 'timer');
      }, Math.max(0, QUALIFIED_LISTEN_SECONDS * 1000 - (Date.now() - hiddenAt)));
    }
    return true;
  }
  window.addEventListener('pagehide', function() {
    navigated = true;
    if (decided) return;
    // Android bez apki przeładowuje stronę od razu; późniejsze wyjście (zamknięcie przeglądarki
    // Instagrama) nic nie mówi o apce, więc nie jest brakiem apki.
    if (Date.now() - started > NO_APP_WINDOW_MS) return;
    // Android bez apki: przeładowanie na https; iPhone: link przeszedł na stronę Spotify
    // (brak apki albo Instagram nie oddał linku apce), bez NoSpotifyApp
    decide('none', isIOS() ? { detail: 'ios_web' } : null);
    if (/android/i.test(navigator.userAgent)) sendMetaAppEvent('NoSpotifyApp');
  });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      if (decided || Date.now() - started > windowMs) return;
      const thisHide = Date.now();
      hiddenAt = thisHide;
      // Krótkie mignięcie (iPhone: okienko Instagrama "Otworzyć w Spotify?") to nie apka.
      // Apka = strona dalej w tle po VISIBILITY_CONFIRM_MS i bez przeładowania.
      setTimeout(function() {
        if (!navigated && hiddenAt === thisHide && document.visibilityState === 'hidden') {
          decide('open', { detail: 'visibility' });
        }
      }, VISIBILITY_CONFIRM_MS);
    } else if (hiddenAt && Date.now() - hiddenAt < VISIBILITY_CONFIRM_MS) {
      hiddenAt = 0;                           // mignięcie: dalej czekamy na prawdziwe wyjście
    } else if (decided === 'open' && !returned && hiddenAt) {
      returned = true;
      const secs = Math.round((Date.now() - hiddenAt) / 1000);
      stat('app_return', { seconds: secs, detail: 'visibility' }, true);
      clearTimeout(listenTimer);
      if (secs >= QUALIFIED_LISTEN_SECONDS) sendListen(secs);
    }
  });

  setTimeout(function() {                     // pomoc dla tych, którym nic się nie otworzyło
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return;   // iPhone ma okienko wyboru
    if (!decided && document.visibilityState === 'visible') showOpenInBrowser(mobileUrl, decide);
  }, 3000);
  setTimeout(function() {
    if (!decided && document.visibilityState === 'visible') decide('unknown');
  }, windowMs);
  window.mmAppDecide = decide;

  // Wyjście do Spotify wykrywamy trzema sygnałami i zapisujemy, który zadziałał (detail):
  //   visibility  strona zgłosiła zejście w tło (Android, Safari; iPhone w Instagramie tego nie robi)
  //   raf     strona przestała się rysować (requestAnimationFrame stoi dłużej niż RAF_STALL_MS);
  //           iPhone przestaje rysować od razu po wyjściu z Instagrama, kod jeszcze chwilę działa
  //   freeze  licznik co 0,5 s miał przerwę dłuższą niż FREEZE_GAP_MS (strona zamrożona)
  // Czas w Spotify liczymy od ostatniej narysowanej klatki do ponownego rysowania.
  // Android bez apki przeładowuje stronę do przeglądarki: sygnał liczy się dopiero, gdy przez
  // NAVIGATION_GRACE_MS nie było przeładowania (pagehide), tak jak przy visibility.
  {
    let lastFrame = Date.now();
    let lastTick = Date.now();
    let awayAt = 0;
    let awaySignal = null;
    let rafId = 0;
    const frame = function() { lastFrame = Date.now(); rafId = requestAnimationFrame(frame); };
    rafId = requestAnimationFrame(frame);

    const stop = function() { clearInterval(watch); cancelAnimationFrame(rafId); };
    const goneAway = function(at, signal) {
      awayAt = at;
      awaySignal = signal;
      setTimeout(function() {
        if (navigated) return;                 // przeładowanie do przeglądarki, nie apka
        window.mmAppSeen = true;               // bez okienka wyboru, jest w Spotify
        decide('open', { detail: signal });
      }, NAVIGATION_GRACE_MS);
    };
    const watch = setInterval(function() {
      const now = Date.now();
      const tickGap = now - lastTick;
      lastTick = now;
      if (!awayAt) {
        if (tickGap > FREEZE_GAP_MS) goneAway(now - tickGap, 'freeze');
        else if (now - lastFrame > RAF_STALL_MS) goneAway(lastFrame, 'raf');
        else return;
      }
      if (navigated) { stop(); return; }
      // jeszcze w Spotify, a kod działa: 30 s mija bez powrotu
      if (now - lastFrame > RAF_STALL_MS && tickGap <= FREEZE_GAP_MS) {
        if (decided === 'open' && now - awayAt >= QUALIFIED_LISTEN_SECONDS * 1000) {
          sendListen(QUALIFIED_LISTEN_SECONDS, 'watch');
        }
        return;
      }
      // znowu rysuje (albo właśnie odmrożona): powrót na stronę
      if (returned || (now - lastFrame > RAF_STALL_MS && tickGap <= FREEZE_GAP_MS)) return;
      if (decided !== 'open') return;
      returned = true;
      stop();
      const secs = Math.round((now - awayAt) / 1000);
      clearTimeout(listenTimer);
      stat('app_return', { seconds: secs, detail: awaySignal }, true);
      if (secs >= QUALIFIED_LISTEN_SECONDS) sendListen(secs);
      const choice = document.getElementById('appChoice');
      if (choice) choice.remove();
    }, 500);
    setTimeout(function() { if (!awayAt) stop(); }, FREEZE_WATCH_MS);
  }
}

function showOpenInBrowser(mobileUrl, decide) {
  if (document.getElementById('openInBrowser')) return;
  const btn = document.getElementById('spotifyBtn');
  if (!btn) return;
  const a = document.createElement('a');
  a.id = 'openInBrowser';
  a.className = 'open-in-browser';
  a.href = mobileUrl;
  a.textContent = 'Spotify not opening? Open it in your browser';
  a.addEventListener('click', function() { if (decide) decide('none'); });
  btn.insertAdjacentElement('afterend', a);
}

// iPhone: wybór po IOS_CHOICE_DELAY_MS (2 s), gdy nic nie wskazuje, że Spotify się otworzył.
// U kogoś, kto jest już w Spotify, okienko pojawia się w tle, a po powrocie licznik
// zamrożenia (trackAppOpen) od razu je usuwa. Na razie nieużywane (patrz handleLinkClick).
const IOS_CHOICE_DELAY_MS = 2000;
function showAppChoice(appUrl, browserUrl) {
  if (document.getElementById('appChoice')) return;
  const btn = document.getElementById('spotifyBtn');
  if (!btn) return;
  const box = document.createElement('div');
  box.id = 'appChoice';
  box.className = 'app-choice';
  const p = document.createElement('p');
  p.textContent = 'Spotify not opening?';
  const openApp = document.createElement('a');
  openApp.className = 'app-choice-btn app-choice-primary';
  openApp.href = appUrl;
  openApp.textContent = 'Open in Spotify app';
  const openWeb = document.createElement('a');
  openWeb.className = 'app-choice-btn';
  openWeb.href = browserUrl;
  openWeb.textContent = 'Open in browser';
  openWeb.addEventListener('click', function() {
    if (typeof window.mmAppDecide === 'function') window.mmAppDecide('none');
  });
  box.append(p, openApp, openWeb);
  btn.insertAdjacentElement('afterend', box);
}

// Telefon (2026-10-26): aplikacja Spotify na telefonie ignoruje utwór, gdy link ma kontekst
// artysty (?context=spotify:artist:...), i gra pierwszy utwór z profilu. Na PC działa.
// Dlatego na telefonie: link z LINK_DO_WKLEJENIA.js (RELEASE_LINK_MOBILE, np. utwór
// w kontekście playlisty), a bez niego sam utwór bez parametru context.
function getMobileUrl(url) {
  if (RELEASE.mobileLinkUrl) return buildForwardedUrl(RELEASE.mobileLinkUrl);
  const u = new URL(url);
  u.searchParams.delete('context');
  return u.toString();
}

function isPhone() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function handleLinkClick(e) {
  // iPhone: przycisk jest zwykłym linkiem do open.spotify.com (ustawiony w DOMContentLoaded)
  // i przeglądarka sama za nim idzie; reszta telefonów i PC sterowana skryptem.
  const iosLink = isPhone() && isIOS();
  if (!iosLink) e.preventDefault();
  const el = e.currentTarget;
  const url = buildForwardedUrl(el.dataset.link);

  // Generuj eventId PRZED blokiem fbq, żeby użyć go też w CAPI
  const eventId = 'release_' + RELEASE.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + Date.now();

  if (typeof fbq !== 'undefined') {
    const eventData = Object.assign(
      {
        content_type: 'product',
        content_name: RELEASE.platform || 'spotify',
        content_category: 'stream',
        link_id: LINK_ID,
        owner: OWNER_ID
      },
      getCampaignParams(),
      { session_id: getSessionId() }
    );
    fbq('track', 'ViewContent', eventData, { eventID: eventId });
  }

  // CAPI — ten sam eventId, oba Pixele
  sendCAPI('ViewContent', eventId, { link_id: LINK_ID, owner: OWNER_ID });

  // Mobile → otwórz aplikację Spotify; desktop → nowa karta + popup
  if (isPhone()) {
    const mobileUrl = getMobileUrl(url);
    trackAppOpen(mobileUrl);
    deferEmailPopupAfterAppClick();
    if (/android/i.test(navigator.userAgent)) {
      // ten sam link https, ale wymuszony w pakiecie Spotify; bez aplikacji przeglądarka sama
      // przechodzi na browser_fallback_url (przeładowanie strony, rozpoznawane po pagehide)
      window.location.href = 'intent://' + mobileUrl.replace(/^https:\/\//, '') +
        '#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=' +
        encodeURIComponent(mobileUrl) + ';end';
    }
    // iPhone: nic więcej. Test Marka w przeglądarce Instagrama (2026-10-28): adres spotify:track:
    // ze skryptu i z linku daje stronę błędu, spotify:// otwiera apkę z okienkiem zgody, a zwykły
    // link do open.spotify.com otwiera apkę, a bez apki pokazuje stronę Spotify. Dlatego przycisk
    // na iPhonie to prawdziwy link do open.spotify.com, bez przejść ze skryptu.
  } else {
    window.open(url, '_blank', 'noopener');
    clearTimeout(emailPopupTimer);
    setTimeout(showEmailPopup, 350);
  }
}

// Popup z mailem po kliknięciu na telefonie: nie w trakcie otwierania apki (zasłaniał przycisk
// i link do przeglądarki), tylko po powrocie ze Spotify albo 20 s po kliknięciu, jeśli nikt
// nie wyszedł ze strony.
const POPUP_AFTER_APP_CLICK_MS = 20000;
let mmAppClicked = false;
function deferEmailPopupAfterAppClick() {
  if (mmAppClicked) return;
  mmAppClicked = true;
  clearTimeout(emailPopupTimer);
  let wasHidden = false;
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) { wasHidden = true; return; }
    if (wasHidden) setTimeout(showEmailPopup, 600);   // wrócił ze Spotify
  });
  setTimeout(function() {
    if (!wasHidden && !document.hidden) showEmailPopup();
  }, POPUP_AFTER_APP_CLICK_MS);
}

document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('spotifyBtn');
  if (isPhone() && isIOS()) btn.href = getMobileUrl(buildForwardedUrl(RELEASE.linkUrl));
  btn.addEventListener('click', handleLinkClick);
});

// ===== PŁYWAJĄCE KULE ŚWIATŁA W TLE =====
function initBgOrbs() {
  const colors = ['rgba(58,91,255,0.5)', 'rgba(122,44,255,0.45)', 'rgba(250,5,193,0.35)'];
  const container = document.body;
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

function initParallaxGlow() {
  const glow = document.querySelector('.ambient-glow');
  if (!glow) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('mousemove', (e) => {
    const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
    const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;
    glow.style.transform = `translate(calc(-50% + ${xPercent * 30}px), calc(-50% + ${yPercent * 30}px))`;
  });
}

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
  document.addEventListener('DOMContentLoaded', () => { initBgOrbs(); initParallaxGlow(); initCoverTilt(); });
} else {
  initBgOrbs(); initParallaxGlow(); initCoverTilt();
}

// ===== CUSTOM CURSOR =====
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
  const TIP_OFFSET_X = 4, TIP_OFFSET_Y = 2;
  let mouseX = -100, mouseY = -100, lastX = -100, lastY = -100, points = [], cursorVisible = false;
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    core.style.left = mouseX + 'px'; core.style.top = mouseY + 'px';
    if (!cursorVisible) { core.style.display = 'block'; cursorVisible = true; document.body.classList.add('has-custom-cursor'); }
    const tipX = mouseX + TIP_OFFSET_X, tipY = mouseY + TIP_OFFSET_Y;
    const dist = Math.hypot(tipX - lastX, tipY - lastY);
    const steps = Math.min(Math.max(Math.floor(dist / 4), 1), 12);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push({ x: lastX + (tipX - lastX) * t, y: lastY + (tipY - lastY) * t, life: 1 });
    }
    if (points.length > 60) points.splice(0, points.length - 60);
    lastX = tipX; lastY = tipY;
  });
  function hideCursor() { core.style.display = 'none'; cursorVisible = false; points = []; }
  function showCursor() { core.style.display = 'block'; cursorVisible = true; document.body.classList.add('has-custom-cursor'); }
  document.documentElement.addEventListener('mouseleave', hideCursor);
  document.documentElement.addEventListener('mouseenter', showCursor);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideCursor(); });
  function drawTrail() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = 0; i < points.length; i++) {
      const p = points[i]; p.life -= 0.05; if (p.life <= 0) continue;
      const radius = 4 * p.life + 1;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.2);
      grad.addColorStop(0, 'rgba(255,60,193,' + (p.life * 0.55) + ')');
      grad.addColorStop(1, 'rgba(122,44,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    points = points.filter(p => p.life > 0);
    requestAnimationFrame(drawTrail);
  }
  drawTrail();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCursor);
} else { initCustomCursor(); }

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

  msg.style.color = 'rgba(184,180,220,0.6)';
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
      msg.textContent = "✓ You're in! Thanks 🎺";
      localStorage.setItem('mm_popup_subscribed', '1');
      // Lead — browser pixel + CAPI do obu Pixeli
      const leadEventId = 'lead_popup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      if (typeof fbq !== 'undefined') fbq('track', 'Lead', { content_name: 'Email Signup', content_category: 'Newsletter', link_id: LINK_ID, owner: OWNER_ID }, { eventID: leadEventId });
      // Hashed email w CAPI Lead
      const normalizedEmail = email.toLowerCase().trim();
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedEmail))
          .then(function(buf) {
            const em = Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
            sendCAPI('Lead', leadEventId, { em: em, link_id: LINK_ID, owner: OWNER_ID });
          })
          .catch(function() { sendCAPI('Lead', leadEventId, { link_id: LINK_ID, owner: OWNER_ID }); });
      } else {
        sendCAPI('Lead', leadEventId, { link_id: LINK_ID, owner: OWNER_ID });
      }
      setTimeout(() => { window.location.href = 'https://magneticmarkdj.com'; }, 1800);
    } else { throw new Error(); }
  })
  .catch(() => { msg.style.color = '#ff4466'; msg.textContent = 'Something went wrong. Please try again.'; });
}

// Trigger: 10 sekund na stronie + CAPI PageView
window.addEventListener('load', function() {
  // CAPI PageView — ten sam eventID co browser pixel (deduplication)
  var pvEventId = window.__mm_pv_id || ('pv_fallback_' + Date.now());
  sendCAPI('PageView', pvEventId, { link_id: LINK_ID, owner: OWNER_ID });

  if (localStorage.getItem('mm_popup_subscribed') || mmAppClicked) return;
  emailPopupTimer = setTimeout(showEmailPopup, 10000);
});

window.resetPopup = function() {
  localStorage.removeItem('mm_popup_subscribed');
  emailPopupShown = false;
};
