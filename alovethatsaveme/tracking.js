/* ===========================================================
   MAGNETICMARK – Tracking statystyk (tracking.js)
   ===========================================================
   Wysyła zdarzenia "view" (wejście na stronę) i "click" (kliknięcie
   przycisku) do bazy Supabase, żeby panel statystyk pod
   magneticmarkdj.com/stats/<wydanie>/ mógł je później wyświetlić.

   Działa NIEZALEŻNIE od Meta Pixela (release.js) - to osobny,
   równoległy system, tylko dla Twojego własnego podglądu statystyk.
   Jeśli Supabase nie odpowie (np. brak internetu, limit, błąd), strona
   działa dalej normalnie - to nie blokuje ani nie spowalnia niczego
   widocznego dla odwiedzającego.
   =========================================================== */

// Wykrywa typ urządzenia na podstawie szerokości ekranu - prosta,
// niezawodna metoda, bez analizy User Agent (która bywa zwodnicza).
function detectDeviceType() {
  return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
}

// Wykrywa, czy strona jest otwarta w wewnętrznej przeglądarce aplikacji
// (Instagram, Facebook, TikTok) - te aplikacje dopisują własny znacznik
// do User Agent, kiedy otwierają linki "w środku" aplikacji.
function detectInAppBrowser() {
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV/i.test(ua)) return 'facebook';
  if (/TikTok/i.test(ua)) return 'tiktok';
  return null;
}

// Ten sam mechanizm session_id co w release.js - zostaje stabilny
// przez całą wizytę (tę samą kartę/sesję przeglądarki).
function getOrCreateSessionId() {
  const key = 'mm_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Pyta darmowe API (ipapi.co) o kraj na podstawie IP odwiedzającego.
// Zwraca Promise z kodem kraju (np. "PL") albo null, jeśli się nie uda
// (limit zapytań, brak internetu, błąd serwisu - strona ma działać dalej
// nawet bez tej informacji).
async function detectCountry() {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.country_code || null;
  } catch (err) {
    return null;
  }
}

// Wysyła jedno zdarzenie do Supabase. eventType: 'view' albo 'click'.
async function sendStatEvent(eventType) {
  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.indexOf('PLACEHOLDER') === 0) {
    return; // Supabase jeszcze nie skonfigurowany - nic nie wysyłamy
  }
  if (typeof RELEASE_SLUG === 'undefined') {
    return; // brak identyfikatora wydania - nie wiadomo do czego przypisać zdarzenie
  }

  const incoming = new URLSearchParams(window.location.search);
  const country = await detectCountry();

  const payload = {
    release_slug: RELEASE_SLUG,
    event_type: eventType,
    country: country,
    device_type: detectDeviceType(),
    in_app_browser: detectInAppBrowser(),
    utm_source: incoming.get('utm_source'),
    utm_medium: incoming.get('utm_medium'),
    utm_campaign: incoming.get('utm_campaign'),
    session_id: getOrCreateSessionId()
  };

  try {
    await fetch(SUPABASE_URL + '/rest/v1/release_events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Cicho ignorujemy błędy - statystyki nie mogą wpływać na działanie strony
  }
}

// Wyświetlenie - wysyłane automatycznie przy wczytaniu strony
document.addEventListener('DOMContentLoaded', function() {
  sendStatEvent('view');
});

// Kliknięcie - podpięte pod przycisk, NIEZALEŻNIE od release.js
// (które obsługuje Meta Pixel) - oba nasłuchują na to samo kliknięcie,
// bez kolizji między sobą.
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('spotifyBtn');
  if (btn) {
    btn.addEventListener('click', function() {
      sendStatEvent('click');
    });
  }
});
