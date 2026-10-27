/* ===========================================================
   MAGNETICMARK – Tracking statystyk (tracking.js)
   ===========================================================
   Wysyła zdarzenia do bazy Supabase (tabela release_events), żeby panel
   statystyk magneticmarkdj.com/<wydanie>/stats/ mógł je wyświetlić.
   Działa NIEZALEŻNIE od Meta Pixela (release.js) i nie zmienia tego,
   co dostaje Meta.

   Zdarzenia:
     view         wejście na stronę (dopiero gdy strona jest widoczna 1 s,
                  żeby wstępne ładowanie strony przez Instagram/Facebook
                  nie liczyło się jako wejście)
     click        kliknięcie przycisku Spotify (tylko prawdziwy dotyk)
     leave        wyjście bez kliknięcia, seconds = czas na stronie
     app_open     telefon: otworzyła się aplikacja Spotify
     app_none     telefon: brak aplikacji, otwarta przeglądarka
     app_unknown  telefon: nic się nie stało przez 30 s (np. Anuluj
                  w okienku "Otworzyć w Spotify?")
     app_return   powrót z aplikacji na stronę, seconds = czas w Spotify
                  (Spotify liczy odtworzenie od 30 s)
   Wysyłane w release.js: app_* (tam jest otwieranie aplikacji).

   Jeśli Supabase nie odpowie, strona działa dalej normalnie.
   =========================================================== */

// Wykrywa typ urządzenia na podstawie szerokości ekranu.
function detectDeviceType() {
  return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
}

// System: android, ios, windows, mac, linux, other.
// iPad z iPadOS udaje Maca, rozpoznany po ekranie dotykowym.
function detectOS() {
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Macintosh/i.test(ua)) return navigator.maxTouchPoints > 1 ? 'ios' : 'mac';
  if (/Windows/i.test(ua)) return 'windows';
  if (/CrOS|Linux/i.test(ua)) return 'linux';
  return 'other';
}

// Wewnętrzna przeglądarka aplikacji (Instagram, Facebook, TikTok).
function detectInAppBrowser() {
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV/i.test(ua)) return 'facebook';
  if (/TikTok/i.test(ua)) return 'tiktok';
  return null;
}

// Ten sam session_id co w release.js, stały przez całą wizytę.
function getOrCreateSessionId() {
  const key = 'mm_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Kraj z Cloudflare (/cdn-cgi/trace na tej samej domenie): darmowo i bez limitu
// (ipapi.co miał limit około 1000 zapytań dziennie). Raz na sesję, potem z pamięci.
let countryPromise = null;
function detectCountry() {
  if (countryPromise) return countryPromise;
  const cached = sessionStorage.getItem('mm_country');
  if (cached) return (countryPromise = Promise.resolve(cached === '-' ? null : cached));
  countryPromise = fetch('/cdn-cgi/trace', { signal: AbortSignal.timeout(2500) })
    .then((r) => (r.ok ? r.text() : ''))
    .then((txt) => {
      const m = /(?:^|\n)loc=([A-Z]{2})/.exec(txt);
      const c = m && m[1] !== 'XX' ? m[1] : null;
      sessionStorage.setItem('mm_country', c || '-');
      return c;
    })
    .catch(() => null);
  return countryPromise;
}

// Kraj, jeśli już jest w pamięci sesji (do zdarzeń, które muszą wyjść natychmiast).
function knownCountry() {
  const c = sessionStorage.getItem('mm_country');
  return c && c !== '-' ? c : null;
}

function buildStatPayload(eventType, extra, country) {
  const incoming = new URLSearchParams(window.location.search);
  return Object.assign({
    release_slug: RELEASE_SLUG,
    event_type: eventType,
    country: country,
    device_type: detectDeviceType(),
    os: detectOS(),
    in_app_browser: detectInAppBrowser(),
    utm_source: incoming.get('utm_source'),
    utm_medium: incoming.get('utm_medium'),
    utm_campaign: incoming.get('utm_campaign'),
    utm_content: incoming.get('utm_content'),
    utm_term: incoming.get('utm_term'),
    session_id: getOrCreateSessionId()
  }, extra || {});
}

function statsReady() {
  return !(typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.indexOf('PLACEHOLDER') === 0 ||
           typeof RELEASE_SLUG === 'undefined');
}

// Wysyłka. now=true: bez czekania na kraj, z keepalive, bo strona właśnie
// schodzi w tło albo się zamyka (inaczej telefon uśpi stronę przed wysłaniem).
async function sendStatEvent(eventType, extra, now) {
  if (!statsReady()) return;
  const country = now ? knownCountry() : await detectCountry();
  const payload = buildStatPayload(eventType, extra, country);
  try {
    let res = await postStat(payload);
    // Baza bez kolumny detail (SQL jeszcze nieuruchomiony): to samo zdarzenie bez niej.
    if (res.status === 400 && 'detail' in payload) {
      const noDetail = Object.assign({}, payload);
      delete noDetail.detail;
      res = await postStat(noDetail);
    }
    // Baza bez nowych kolumn (SQL jeszcze nieuruchomiony): view i click idą
    // jeszcze raz w starym formacie, żeby nie zgubić podstawowych statystyk.
    if (res.status === 400 && (eventType === 'view' || eventType === 'click')) {
      const legacy = Object.assign({}, payload);
      ['os', 'utm_content', 'utm_term', 'seconds', 'detail'].forEach((k) => delete legacy[k]);
      await postStat(legacy);
    }
  } catch (err) {
    // statystyki nie mogą wpływać na działanie strony
  }
}

function postStat(body) {
  return fetch(SUPABASE_URL + '/rest/v1/release_events', {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });
}
window.mmStat = sendStatEvent;

// ===== Wejście, kliknięcie, wyjście =====
let mmVisibleSince = null;   // od kiedy strona jest widoczna (do czasu na stronie)
let mmViewSent = false;
let mmClicked = false;
let mmLeaveSent = false;

function trySendView() {
  if (mmViewSent || document.visibilityState !== 'visible' || document.prerendering) return;
  if (!mmVisibleSince) mmVisibleSince = Date.now();
  setTimeout(function() {
    if (mmViewSent || document.visibilityState !== 'visible') return;
    mmViewSent = true;
    sendStatEvent('view');
  }, 1000);
}

function sendLeave() {
  if (!mmViewSent || mmClicked || mmLeaveSent) return;
  mmLeaveSent = true;
  const secs = Math.round((Date.now() - (mmVisibleSince || Date.now())) / 1000);
  sendStatEvent('leave', { seconds: secs }, true);
}

document.addEventListener('DOMContentLoaded', function() {
  detectCountry();   // pobierz kraj od razu, żeby był w pamięci na zdarzenia "natychmiastowe"
  trySendView();
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') trySendView();
    else sendLeave();
  });
  window.addEventListener('pagehide', sendLeave);
  if (document.prerendering) document.addEventListener('prerenderingchange', trySendView);

  const btn = document.getElementById('spotifyBtn');
  if (btn) {
    btn.addEventListener('click', function(e) {
      if (!e.isTrusted || mmClicked) return;   // tylko prawdziwe kliknięcie, raz na wizytę
      mmClicked = true;
      sendStatEvent('click', null, true);
    });
  }
});
