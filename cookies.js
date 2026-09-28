/* ===========================================================
   ZGODY I COOKIES — magneticmarkdj.com
   ===========================================================

   Co ten plik robi:

   1. Blokuje Meta Pixel do czasu wyrażenia zgody.
   2. Pokazuje baner przy pierwszej wizycie.
   3. Trzyma pływającą ikonę (obok strzałki "do góry"), która
      otwiera panel ustawień — żeby zgodę dało się wycofać
      równie łatwo, jak się ją wyraziło.

   JAK DZIAŁA BLOKADA PIXELA
   ---------------------------------------------------------
   script.js woła fbq('track', ...) w dziesięciu miejscach.
   Zamiast wstawiać tam warunki, ten plik podmienia fbq na
   atrapę, która wywołania zapisuje do kolejki zamiast wysyłać.

   Po zgodzie: ładuje się prawdziwy fbevents.js, leci init
   i PageView, a kolejka jest odtwarzana — nic nie ginie.
   Po odmowie: kolejka jest kasowana, nic nie wychodzi.

   Dzięki temu w script.js zmienia się JEDNA linia (w sendCAPI),
   a nie dziesięć miejsc.

   WAŻNE: ten plik musi być wczytany PRZED script.js, inaczej
   script.js zdąży wywołać fbq zanim powstanie atrapa.

   Wersja zgody: podniesienie CONSENT_VERSION kasuje zapisane
   wybory i pyta wszystkich ponownie. Rób to, gdy dojdzie nowy
   cel przetwarzania — stara zgoda go nie obejmuje.
   =========================================================== */

(function () {
  'use strict';

  var PIXEL_ID        = '27127010080316320';
  var STORAGE_KEY     = 'mm-consent';
  var CONSENT_VERSION = 1;

  /* ---------- Teksty ---------- */

  var T = {
    bannerTitle: {
      pl: 'Pliki cookie',
      en: 'Cookies',
      de: 'Cookies'
    },
    bannerText: {
      pl: 'Strona używa plików cookie niezbędnych do jej działania. Za Twoją zgodą korzysta też z cookie marketingowych Meta, żeby mierzyć skuteczność reklam. Zgody nie musisz wyrażać — strona działa tak samo.',
      en: 'This site uses cookies necessary for it to work. With your consent it also uses Meta marketing cookies to measure advertising performance. Consent is not required — the site works the same either way.',
      de: 'Diese Seite verwendet für den Betrieb notwendige Cookies. Mit Ihrer Einwilligung nutzt sie zusätzlich Marketing-Cookies von Meta zur Messung der Werbewirkung. Die Einwilligung ist freiwillig — die Seite funktioniert in jedem Fall gleich.'
    },
    acceptAll:  { pl: 'Akceptuję wszystkie', en: 'Accept all',        de: 'Alle akzeptieren' },
    rejectAll:  { pl: 'Tylko niezbędne',     en: 'Necessary only',    de: 'Nur notwendige' },
    settings:   { pl: 'Ustawienia',          en: 'Settings',          de: 'Einstellungen' },
    save:       { pl: 'Zapisz wybór',        en: 'Save choice',       de: 'Auswahl speichern' },
    close:      { pl: 'Zamknij',             en: 'Close',             de: 'Schließen' },
    openLabel:  { pl: 'Ustawienia prywatności i cookies', en: 'Privacy and cookie settings', de: 'Datenschutz- und Cookie-Einstellungen' },

    modalTitle: { pl: 'Prywatność i cookies', en: 'Privacy and cookies', de: 'Datenschutz und Cookies' },

    necTitle: { pl: 'Niezbędne', en: 'Necessary', de: 'Notwendig' },
    necDesc: {
      pl: 'Potrzebne, żeby strona działała: zapamiętanie wybranego języka, zamknięcia okienka zapisu i Twojego wyboru zgód. Nie da się ich wyłączyć i nie służą do śledzenia.',
      en: 'Required for the site to work: remembering the chosen language, the dismissal of the signup box and your consent choice. They cannot be switched off and are not used for tracking.',
      de: 'Für den Betrieb erforderlich: Speichern der gewählten Sprache, des Schließens des Anmeldefensters und Ihrer Einwilligung. Sie lassen sich nicht abschalten und dienen nicht dem Tracking.'
    },
    alwaysOn: { pl: 'Zawsze włączone', en: 'Always on', de: 'Immer aktiv' },

    mktTitle: { pl: 'Marketing', en: 'Marketing', de: 'Marketing' },
    mktDesc: {
      pl: 'Meta Pixel i Conversions API. Zapisują cookie _fbp i _fbc oraz przesyłają do Meta informacje o wejściu na stronę i kliknięciach, żeby dało się ocenić, które reklamy działają. Bez tej zgody nic nie jest wysyłane do Meta.',
      en: 'Meta Pixel and Conversions API. They set the _fbp and _fbc cookies and send Meta information about visits and clicks so advertising performance can be assessed. Without this consent nothing is sent to Meta.',
      de: 'Meta Pixel und Conversions API. Sie setzen die Cookies _fbp und _fbc und übermitteln Meta Informationen über Besuche und Klicks, um die Werbewirkung zu bewerten. Ohne diese Einwilligung wird nichts an Meta gesendet.'
    },

    controller: {
      pl: 'Administratorem danych jest MagneticMark. Pytania i żądania dotyczące danych: management@magneticmarkdj.com',
      en: 'The data controller is MagneticMark. Questions and data requests: management@magneticmarkdj.com',
      de: 'Verantwortlicher ist MagneticMark. Fragen und Anfragen zu Daten: management@magneticmarkdj.com'
    },
    more: {
      pl: 'Szczegóły w Polityce prywatności.',
      en: 'Details in the Privacy Policy.',
      de: 'Einzelheiten in der Datenschutzerklärung.'
    },
    policyLink: { pl: 'Polityka prywatności', en: 'Privacy Policy', de: 'Datenschutzerklärung' },
    statusOn:  { pl: 'Marketing: włączony',  en: 'Marketing: on',  de: 'Marketing: aktiv' },
    statusOff: { pl: 'Marketing: wyłączony', en: 'Marketing: off', de: 'Marketing: inaktiv' }
  };

  function lang() {
    try {
      var l = localStorage.getItem('mm-lang');
      if (l === 'pl' || l === 'en' || l === 'de') return l;
    } catch (e) {}
    return 'pl';
  }

  /* Tworzy element z atrybutami data-pl/en/de, żeby przełącznik
     języka ze script.js tłumaczył go razem z resztą strony. */
  function t(tag, key, cls) {
    var el = document.createElement(tag);
    el.setAttribute('data-pl', T[key].pl);
    el.setAttribute('data-en', T[key].en);
    el.setAttribute('data-de', T[key].de);
    el.textContent = T[key][lang()];
    if (cls) el.className = cls;
    return el;
  }

  /* ---------- Pamięć zgody ---------- */

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.v !== CONSENT_VERSION) return null; // stara wersja = pytamy znowu
      return c;
    } catch (e) { return null; }
  }

  function writeConsent(marketing) {
    var c = { v: CONSENT_VERSION, marketing: !!marketing, ts: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }

  /* Stan czytany przez script.js (sendCAPI). */
  window.mmConsent = { marketing: false, decided: false };

  /* ---------- Atrapa fbq ---------- */

  var queue = [];
  var pixelLoaded = false;

  if (!window.fbq) {
    window.fbq = function () { queue.push(arguments); };
    window.fbq.queue = queue;
    window._mmFbqStub = true;
  }

  function loadPixel() {
    if (pixelLoaded) return;
    pixelLoaded = true;

    /* Oryginalny snippet Meta zaczyna się od "if (f.fbq) return;",
       więc najpierw trzeba usunąć atrapę, inaczej prawdziwy skrypt
       nie zainstaluje się w ogóle. */
    var pending = queue.slice();
    try { delete window.fbq; delete window._fbq; } catch (e) { window.fbq = undefined; window._fbq = undefined; }

    !function (f, b, e, v, n, t2, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t2 = b.createElement(e); t2.async = !0;
      t2.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t2, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');

    /* Odtworzenie zdarzeń zebranych zanim padła zgoda. */
    for (var i = 0; i < pending.length; i++) {
      try { window.fbq.apply(null, pending[i]); } catch (e) {}
    }
    queue.length = 0;
  }

  function apply(consent) {
    window.mmConsent.marketing = !!consent.marketing;
    window.mmConsent.decided = true;
    if (consent.marketing) {
      loadPixel();
    } else {
      queue.length = 0;   // nic nie wychodzi
      clearMetaCookies();
    }
    updateStatusLabel();
  }

  /* Po cofnięciu zgody kasujemy cookie, które Meta mogła ustawić
     wcześniej. Bez tego identyfikator zostaje w przeglądarce. */
  function clearMetaCookies() {
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var bare = host.replace(/^www\./, '');
    if (bare !== host) { domains.push(bare, '.' + bare); }
    ['_fbp', '_fbc'].forEach(function (name) {
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  /* ---------- Budowa interfejsu ---------- */

  var banner, modal, statusLabel, marketingInput;

  function buildBanner() {
    banner = document.createElement('div');
    banner.className = 'mm-cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');

    var box = document.createElement('div');
    box.className = 'mm-cc-banner-inner';

    var txt = document.createElement('div');
    txt.className = 'mm-cc-banner-text';
    txt.appendChild(t('h2', 'bannerTitle', 'mm-cc-h'));
    txt.appendChild(t('p', 'bannerText'));
    box.appendChild(txt);

    var row = document.createElement('div');
    row.className = 'mm-cc-banner-actions';

    /* Kolejność i waga przycisków: "Tylko niezbędne" wygląda
       dokładnie tak samo jak "Akceptuję wszystkie". Odmowa musi
       być równie łatwa jak zgoda — inaczej zgoda nie jest
       dobrowolna w rozumieniu RODO. */
    var bAccept = t('button', 'acceptAll', 'mm-cc-btn mm-cc-btn-primary');
    var bReject = t('button', 'rejectAll', 'mm-cc-btn mm-cc-btn-primary');
    var bSet    = t('button', 'settings',  'mm-cc-btn mm-cc-btn-ghost');

    bAccept.addEventListener('click', function () { apply(writeConsent(true));  hideBanner(); });
    bReject.addEventListener('click', function () { apply(writeConsent(false)); hideBanner(); });
    bSet.addEventListener('click', function () { hideBanner(); openModal(); });

    row.appendChild(bAccept);
    row.appendChild(bReject);
    row.appendChild(bSet);
    box.appendChild(row);

    banner.appendChild(box);
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('visible'); });
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('visible');
    setTimeout(function () { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; }, 300);
  }

  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'mm-cc-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    var panel = document.createElement('div');
    panel.className = 'mm-cc-panel';
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    panel.appendChild(t('h2', 'modalTitle', 'mm-cc-h'));

    /* Kategoria: niezbędne (bez możliwości wyłączenia) */
    var g1 = document.createElement('div'); g1.className = 'mm-cc-group';
    var h1 = document.createElement('div'); h1.className = 'mm-cc-group-head';
    h1.appendChild(t('h3', 'necTitle'));
    h1.appendChild(t('span', 'alwaysOn', 'mm-cc-always'));
    g1.appendChild(h1);
    g1.appendChild(t('p', 'necDesc'));
    panel.appendChild(g1);

    /* Kategoria: marketing (przełącznik) */
    var g2 = document.createElement('div'); g2.className = 'mm-cc-group';
    var h2 = document.createElement('div'); h2.className = 'mm-cc-group-head';
    h2.appendChild(t('h3', 'mktTitle'));

    var lab = document.createElement('label'); lab.className = 'mm-cc-switch';
    marketingInput = document.createElement('input');
    marketingInput.type = 'checkbox';
    marketingInput.checked = window.mmConsent.marketing;
    var slider = document.createElement('span'); slider.className = 'mm-cc-slider';
    lab.appendChild(marketingInput);
    lab.appendChild(slider);
    var sr = document.createElement('span'); sr.className = 'mm-cc-sr';
    sr.setAttribute('data-pl', T.mktTitle.pl); sr.setAttribute('data-en', T.mktTitle.en); sr.setAttribute('data-de', T.mktTitle.de);
    sr.textContent = T.mktTitle[lang()];
    lab.appendChild(sr);
    h2.appendChild(lab);

    g2.appendChild(h2);
    g2.appendChild(t('p', 'mktDesc'));
    panel.appendChild(g2);

    /* Administrator + kontakt */
    var foot = document.createElement('div'); foot.className = 'mm-cc-foot';
    foot.appendChild(t('p', 'controller', 'mm-cc-small'));

    var pMore = document.createElement('p'); pMore.className = 'mm-cc-small';
    var link = t('a', 'policyLink');
    link.href = '/polityka-prywatnosci.html';
    pMore.appendChild(link);
    foot.appendChild(pMore);
    panel.appendChild(foot);

    var row = document.createElement('div'); row.className = 'mm-cc-panel-actions';
    var bSave  = t('button', 'save',  'mm-cc-btn mm-cc-btn-primary');
    var bClose = t('button', 'close', 'mm-cc-btn mm-cc-btn-ghost');
    bSave.addEventListener('click', function () { apply(writeConsent(marketingInput.checked)); closeModal(); });
    bClose.addEventListener('click', closeModal);
    row.appendChild(bSave);
    row.appendChild(bClose);
    panel.appendChild(row);

    modal.appendChild(panel);
    modal.addEventListener('click', closeModal);
    document.body.appendChild(modal);
  }

  function openModal() {
    if (!modal) buildModal();
    marketingInput.checked = window.mmConsent.marketing;
    modal.classList.add('visible');
    document.addEventListener('keydown', escClose);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('visible');
    document.removeEventListener('keydown', escClose);
  }

  function escClose(e) { if (e.key === 'Escape') closeModal(); }

  /* Pływający przycisk — bliźniak strzałki "do góry". Widoczny
     zawsze, nie po przewinięciu: wycofanie zgody musi być
     dostępne w każdej chwili. */
  function buildButton() {
    var btn = document.createElement('button');
    btn.id = 'mmCookieBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', T.openLabel[lang()]);
    btn.setAttribute('data-pl-label', T.openLabel.pl);
    btn.setAttribute('data-en-label', T.openLabel.en);
    btn.setAttribute('data-de-label', T.openLabel.de);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true">' +
      '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z"/>' +
      '<circle cx="9"  cy="12" r="1" fill="currentColor" stroke="none"/>' +
      '<circle cx="14" cy="16" r="1" fill="currentColor" stroke="none"/>' +
      '<circle cx="8"  cy="16.5" r="0.9" fill="currentColor" stroke="none"/>' +
      '<circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none"/>' +
      '</svg>';
    btn.addEventListener('click', openModal);
    document.body.appendChild(btn);

    statusLabel = document.createElement('span');
    statusLabel.className = 'mm-cc-sr';
    statusLabel.id = 'mmConsentStatus';
    statusLabel.setAttribute('aria-live', 'polite');
    document.body.appendChild(statusLabel);
    updateStatusLabel();
  }

  function updateStatusLabel() {
    if (!statusLabel) return;
    var k = window.mmConsent.marketing ? 'statusOn' : 'statusOff';
    statusLabel.setAttribute('data-pl', T[k].pl);
    statusLabel.setAttribute('data-en', T[k].en);
    statusLabel.setAttribute('data-de', T[k].de);
    statusLabel.textContent = T[k][lang()];
  }

  /* ---------- Start ---------- */

  function init() {
    buildButton();
    var saved = readConsent();
    if (saved) {
      apply(saved);        // wybór już jest — respektujemy go po cichu
    } else {
      buildBanner();       // pierwsza wizyta albo nowa wersja zgody
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Publiczne API — przydatne do linku "zmień zgody" w stopce
     albo do sprawdzenia stanu z konsoli. */
  window.mmCookies = {
    open: openModal,
    state: function () { return readConsent(); },
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      location.reload();
    }
  };
})();
