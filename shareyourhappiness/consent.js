/* ===========================================================
   Cookies: informacja i rezygnacja (opt-out), wzorem Linkfire (2026-10-29).
   Ładowany w <head> PRZED anon ID i Meta Pixelem, bo one sprawdzają window.mmConsent.
   Domyślnie wszystko włączone. Wybór zapisany w localStorage (mm_consent):
     perf  statystyki strony (Supabase release_events, panel /stats/)
     ads   Meta Pixel, Conversions API, kolejka QualifiedListen, cookie mm_uid
   Napis siedzi w dolnym paddingu karty pod "All rights reserved", panel jest nakładką,
   więc wysokość strony się nie zmienia. Teksty po angielsku (strona wydania).
   =========================================================== */
(function() {
  var KEY = 'mm_consent';
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  var consent = {
    perf: !(saved && saved.perf === false),
    ads: !(saved && saved.ads === false)
  };
  window.mmConsent = consent;

  function expireCookie(name) {
    var past = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = name + past;
    document.cookie = name + past + '; domain=.' + location.hostname.replace(/^www\./, '');
  }

  function save(perf, ads) {
    try { localStorage.setItem(KEY, JSON.stringify({ perf: perf, ads: ads, at: Date.now() })); } catch (e) {}
    if (consent.ads && !ads) {
      // od razu: pixel milknie, identyfikatory reklamowe znikają z przeglądarki
      if (typeof fbq !== 'undefined') fbq('consent', 'revoke');
      ['_fbp', '_fbc', 'mm_uid'].forEach(expireCookie);
    }
    consent.perf = perf;
    consent.ads = ads;
    document.dispatchEvent(new Event('mm-consent'));   // napis pod stopką od razu z nowym stanem
  }

  function choiceRow(name, title, desc) {
    return '<div class="mmc-box">' +
      '<div class="mmc-q"><span>Allow <b>' + title + '</b> tracking?</span>' +
      '<label class="mmc-opt"><input type="radio" name="mmc-' + name + '" value="1"> Yes</label>' +
      '<label class="mmc-opt"><input type="radio" name="mmc-' + name + '" value="0"> No</label></div>' +
      '<p class="mmc-desc">' + desc + '</p></div>';
  }

  function buildPanel() {
    var panel = document.createElement('div');
    panel.id = 'mmConsentPanel';
    panel.className = 'mmc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'mmcTitle');
    panel.innerHTML =
      '<div class="mmc-inner">' +
        '<button type="button" class="mmc-close" aria-label="Close">×</button>' +
        '<h2 id="mmcTitle" class="mmc-title">Manage permissions</h2>' +
        '<p class="mmc-text">This page uses cookies and similar technologies. ' +
          'Both are on by default, you can switch them off at any time. Your choice is saved in this browser.</p>' +
        choiceRow('perf', 'Performance',
          'Statistics of how this page is used: views, clicks and whether the Spotify app opened. ' +
          'No name or email, only a random session ID.') +
        choiceRow('ads', 'Advertising',
          'Meta Pixel and Meta Conversions API measure the results of our ads on Facebook and Instagram. ' +
          'Meta may set cookies containing user identifiers. ' +
          '<a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener">Meta Privacy Policy</a>') +
        '<p class="mmc-text">Data controller: <b>MagneticMark</b>. ' +
          'Processors: Meta Platforms Ireland Ltd. (advertising), Supabase Inc. (statistics).</p>' +
        '<button type="button" class="mmc-save">Save privacy permissions</button>' +
      '</div>';
    document.body.appendChild(panel);

    function setRadios() {
      ['perf', 'ads'].forEach(function(name) {
        var value = consent[name] ? '1' : '0';
        panel.querySelectorAll('input[name="mmc-' + name + '"]').forEach(function(r) { r.checked = r.value === value; });
      });
    }
    function picked(name) {
      var r = panel.querySelector('input[name="mmc-' + name + '"]:checked');
      return !r || r.value === '1';
    }
    function close() { panel.classList.remove('is-open'); }

    panel.addEventListener('click', function(e) { if (e.target === panel) close(); });
    panel.querySelector('.mmc-close').addEventListener('click', close);
    panel.querySelector('.mmc-save').addEventListener('click', function() {
      save(picked('perf'), picked('ads'));
      close();
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });

    return function open() {
      setRadios();
      panel.classList.add('is-open');
    };
  }

  function addNote(open) {
    var card = document.querySelector('.release-card') || document.body;
    var note = document.createElement('p');
    note.className = 'mmc-note';
    note.innerHTML = 'You have <span class="mmc-state"></span> the use of cookies for this service.<br>' +
      '<button type="button" class="mmc-link">Click here</button> to manage your permissions.';
    note.querySelector('.mmc-link').addEventListener('click', open);
    // jak Linkfire; po rezygnacji z obu zgód "accepted" byłoby nieprawdą
    function render() {
      note.querySelector('.mmc-state').textContent = (consent.perf || consent.ads) ? 'accepted' : 'declined';
    }
    render();
    document.addEventListener('mm-consent', render);
    card.appendChild(note);
  }

  document.addEventListener('DOMContentLoaded', function() {
    addNote(buildPanel());
  });
})();
